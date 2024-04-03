/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <map>
#include <chrono>
#include <memory>
#include <mutex>
#include <thread>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/ConvertBroker.h>
#include <OxOOL/XMLConfig.h>
#include <OxOOL/HttpHelper.h>

#include <Poco/Version.h>
#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/Exception.h>
#include <Poco/UUIDGenerator.h>
#include <Poco/SharedLibrary.h>
#include <Poco/SortedDirectoryIterator.h>
#include <Poco/String.h>
#include <Poco/JSON/Object.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Message.hpp>
#include <common/Protocol.hpp>
#include <common/StringVector.hpp>
#include <common/SigUtil.hpp>
#include <common/Log.hpp>
#include <common/Util.hpp>
#include <net/Socket.hpp>
#include <net/WebSocketHandler.hpp>
#include <wsd/ClientSession.hpp>
#include <wsd/Auth.hpp>

/// @brief 模組 Library 管理
class ModuleLibrary
{
public:
    ModuleLibrary() : mpModule(nullptr)
    {
    }

    ~ModuleLibrary()
    {
        // 釋放模組資源
        mpModule.reset();

        // 再卸載 Library，否則會 crash
        if (maLibrary.isLoaded())
            maLibrary.unload();
    }

    /// @brief 載入 Library
    /// @param path Library 絕對路徑
    /// @return
    bool load(const std::string& path)
    {
        try
        {
            maLibrary.load(path);
            if (maLibrary.hasSymbol(OXOOL_MODULE_ENTRY_SYMBOL))
            {
                auto moduleEntry = reinterpret_cast<OxOOLModuleEntry>(maLibrary.getSymbol(OXOOL_MODULE_ENTRY_SYMBOL));
                mpModule = moduleEntry(); // 取得模組
                LOG_DBG("Successfully loaded '" << path << "'.");
                return true;
            }
            else // 不是 OxOOL 模組物件就卸載
            {
                LOG_DBG("'" << path << "' is not a valid OxOOL module.");
                maLibrary.unload();
            }
        }
        // 已經載入過了
        catch(const Poco::LibraryAlreadyLoadedException& e)
        {
            LOG_ERR(path << "' has already been loaded.");
        }
        // 無法載入
        catch(const Poco::LibraryLoadException& e)
        {
            LOG_ERR(path << "' cannot be loaded.");
        }

        return false;
    }

    OxOOL::Module::Ptr getModule() const { return mpModule; }

    void useBaseModule()
    {
        mpModule = std::make_shared<OxOOL::Module::Base>();
    }

private:
    Poco::SharedLibrary maLibrary;
    OxOOL::Module::Ptr mpModule;
};

class ModuleAgent : public SocketPoll
{

public:
    ModuleAgent(const std::string& threadName) : SocketPoll(threadName)
    {
        purge();
        startThread();
    }

    ~ModuleAgent() {}

    static constexpr std::chrono::microseconds AgentTimeoutMicroS = std::chrono::seconds(60);

    void handleRequest(OxOOL::Module::Ptr module,
                       const Poco::Net::HTTPRequest& request,
                       SocketDisposition& disposition)
    {
        setBusy(true); // 設定忙碌狀態

        mpSavedModule = module;
        mpSavedSocket = std::static_pointer_cast<StreamSocket>(disposition.getSocket());
// Poco 版本小於 1.10，mRequest 必須 parse 才能產生
#if POCO_VERSION < 0x010A0000
        {
            (void)request;
            StreamSocket::MessageMap map;
            Poco::MemoryInputStream message(&mpSavedSocket->getInBuffer()[0],
                                            mpSavedSocket->getInBuffer().size());
            if (!mpSavedSocket->parseHeader("Client", message, mRequest, &map))
            {
                LOG_ERR("Create HTTPRequest fail! stop running");
                stopRunning();
                return;
            }
            mRequest.setURI(request.getURI());
        }
#else // 否則直接複製
        mRequest = request;
#endif

        disposition.setMove([=](const std::shared_ptr<Socket>& moveSocket)
        {
            insertNewSocket(moveSocket);
            startRunning();
        });
    }

    void pollingThread() override
    {
        while (SocketPoll::continuePolling() && !SigUtil::getTerminationFlag())
        {
            // 正在處理請求
            if (isBusy())
            {
                if ((mpSavedSocket != nullptr && mpSavedSocket->isClosed()) && !isModuleRunning())
                {
                    purge(); // 清理資料，恢復閒置狀態，可以再利用
                }
            }
            const int64_t rc = poll(AgentTimeoutMicroS);
            if (rc == 0) // polling timeout.
            {
                // 現在時間
                const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
                auto durationTime = std::chrono::duration_cast<std::chrono::microseconds>(now - mpLastIdleTime);
                // 閒置超過預設時間，就脫離迴圈
                if (durationTime >= AgentTimeoutMicroS)
                {
                    break;
                }
            }
            else if (rc > 0) // Number of Events signalled.
            {
                // 被 wakeup，紀錄目前時間
                mpLastIdleTime = std::chrono::steady_clock::now();
            }
            else // error
            {
                // do nothing.
            }
        }

        // 執行緒已經結束，觸發清理程序
        OxOOL::ModuleManager &manager = OxOOL::ModuleManager::instance();
        manager.cleanupDeadAgents();

        // 觸發 ConvertBroker 清理程序
        OxOOL::ConvertBroker::cleanup();
    }
    bool isIdle() const { return isAlive() && !isBusy(); }

private:
    /// @brief 從執行緒代理請求
    void startRunning()
    {
        // 讓 thread 執行，流程交還給 Main thread.
        // 凡是加進 Callback 執行的 function 都是在 agent thread 排隊執行
        addCallback([this]()
        {
            setModuleRunning(true);
            // client address equals to "::1", it means the client is localhost.
            if (mpSavedSocket->clientAddress() == "::1")
            {
                mpSavedSocket->setClientAddress("127.0.0.1");
            }
            // client address prefix is "::ffff:", it means the client is IPv4.
            else if (Util::startsWith(mpSavedSocket->clientAddress(), "::ffff:"))
            {
                const std::string ipv4ClientAddress = mpSavedSocket->clientAddress().substr(7);
                mpSavedSocket->setClientAddress(ipv4ClientAddress);
            }

            // 是否為 admin service
            const bool isAdminService = mpSavedModule->isAdminService(mRequest);

            // 不需要認證或已認證通過
            if (!mpSavedModule->needAdminAuthenticate(mRequest, mpSavedSocket, isAdminService))
            {
                // 依據 service uri 決定要給哪個 reauest 處理
                if (isAdminService)
                    mpSavedModule->handleAdminRequest(mRequest, mpSavedSocket); // 管理介面
                else
                    mpSavedModule->handleRequest(mRequest, mpSavedSocket); // Restful API
            }
            stopRunning();
        });
    }

    /// @brief 代理請求結束
    void stopRunning()
    {
        setModuleRunning(false); // 模組已經結束
        wakeup();  // 喚醒 thread.(就是 ModuleAgent::pollingThread() loop)
    }

    /// @brief 設定是否忙碌旗標
    /// @param onOff
    void setBusy(bool onOff) { mbBusy = onOff; }

    /// @brief 是否忙碌
    /// @return true: 是
    bool isBusy() const { return mbBusy; }

    /// @brief 設定模組是否執行中
    /// @param onOff
    void setModuleRunning(bool onOff)
    {
        mbModuleRunning = onOff;
    }

    /// @brief 模組是否正在執行
    /// @return true: 是
    bool isModuleRunning() const
    {
        return mbModuleRunning;
    }

    /// @brief 清除最近代理的資料，並恢復閒置狀態
    void purge()
    {
        // 觸發 ConvertBroker 清理程序
        OxOOL::ConvertBroker::cleanup();

        mpSavedModule = nullptr;
        mpSavedSocket = nullptr;
        setModuleRunning(false);
        setBusy(false);
        mpLastIdleTime = std::chrono::steady_clock::now(); // 紀錄最近閒置時間
    }

    /// @brief 最近閒置時間
    std::chrono::steady_clock::time_point mpLastIdleTime;

    /// @brief 與 Client 的 socket
    std::shared_ptr<StreamSocket> mpSavedSocket;

    /// @brief 要代理的模組
    OxOOL::Module::Ptr mpSavedModule;
    /// @brief HTTP Request
    Poco::Net::HTTPRequest mRequest;

    /// @brief 是否正在代理請求
    std::atomic<bool> mbBusy;
    /// @brief 模組正在處理代理送去的請求
    std::atomic<bool> mbModuleRunning;
};

class ModuleService final : public OxOOL::Module::Base
{
public:
    ModuleService()
    {
    }

    ~ModuleService() {}

    void initialize() override
    {
        LOG_DBG("ModuleService initialized.");
    }

    std::string getVersion() override
    {
        return "1.0";
    }

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override
    {
        static OxOOL::ModuleManager &moduleManager = OxOOL::ModuleManager::instance();

        // 避免亂 try 網址，需檢查是否是已註冊的 browser URI
        if (!isValidBrowserURI(request))
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_FORBIDDEN,
                socket, "Invalid Browser Module URI.");
            return;
        }

        const std::string realPath = parseRealURI(request);

        const StringVector tokens(StringVector::tokenize(realPath, '/'));
        // 至少要有兩個 token，第一個是模組ID，會重定位到該模組實際路徑的 browser 目錄
        if (tokens.size() < 2)
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_BAD_REQUEST,
                socket, "Invalid request.");
            return;
        }

        // 取得模組 ID
        const std::string moduleID = tokens[0];
        OxOOL::Module::Ptr module = moduleManager.getModuleById(moduleID);
        if (module == nullptr)
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND,
                socket, "Module not found.");
            return;
        }

        // 取得模組的 browser 目錄實際路徑
        const std::string moduleBrowserPath(module->getDocumentRoot() + "/browser");
        // 重定位到真正的檔案
        const std::string requestFile = moduleBrowserPath + realPath.substr(moduleID.size() + 1);
        // 傳送檔案
        sendFile(requestFile, request, socket);
    }

    void registerBrowserURI(const std::string& uri)
    {
        // 是否已經註冊過
        if (std::find(maRegisteredURI.begin(), maRegisteredURI.end(), uri) == maRegisteredURI.end())
        {
            maRegisteredURI.emplace_back(uri);
        }
    }

private: // private methods

    bool isValidBrowserURI(const Poco::Net::HTTPRequest& request)
    {
        const std::string uri = request.getURI();
        // 依序比對已註冊過的 browser URI
        for (const auto& it : maRegisteredURI)
        {
            // 如果 URI 是註冊過的 URI 開頭，就是合法的
            if (uri.find(it) == 0)
            {
                return true;
            }
        }
        return false;
    }

private: // private members

    std::vector<std::string> maRegisteredURI; // 已註冊的 browser URI

};

namespace OxOOL
{

/// @brief 處理模組 client 的 admin Websocket 請求和回覆
class ModuleAdminSocketHandler : public WebSocketHandler
{
public:
    ModuleAdminSocketHandler(const OxOOL::Module::Ptr& module,
                             const std::weak_ptr<StreamSocket>& socket,
                             const Poco::Net::HTTPRequest& request)
        : WebSocketHandler(socket.lock(), request)
        , mpModule(module)
        , mbIsAuthenticated(false)
    {
    }

    /// @brief 處理收到的 web socket 訊息，並傳送給模組處理
    /// @param payload
    void handleMessage(const std::vector<char> &payload) override
    {
        // FIXME: check fin, code etc.
        const std::string firstLine = OXOOLProtocol::getFirstLine(payload.data(), payload.size());

        const StringVector tokens(StringVector::tokenize(firstLine, ' '));
        LOG_DBG("Module:[" << mpModule->getDetail().name << "] Recv: " << firstLine << " tokens " << tokens.size());

        // 一定要有資料
        if (tokens.empty())
        {
            LOG_TRC("too few tokens");
            return;
        }

        if (tokens.equals(0, "auth"))
        {
            if (tokens.size() < 2)
            {
                LOG_DBG("Auth command without any token");
                sendMessage("InvalidAuthToken");
                shutdown();
                ignoreInput();
                return;
            }
            std::string jwtToken;
            OXOOLProtocol::getTokenString(tokens[1], "jwt", jwtToken);

            LOG_INF("Verifying JWT token: " << jwtToken);
            JWTAuth authAgent("admin", "admin", "admin");
            if (authAgent.verify(jwtToken))
            {
                LOG_TRC("JWT token is valid");
                mbIsAuthenticated = true;
                return;
            }
            else
            {
                LOG_DBG("Invalid auth token");
                sendMessage("InvalidAuthToken");
                shutdown();
                ignoreInput();
                return;
            }
        }

        // 未認證過就擋掉
        if (!mbIsAuthenticated)
        {
            LOG_DBG("Not authenticated - message is '" << firstLine << "' " <<
                    tokens.size() << " first: '" << tokens[0] << '\'');
            sendMessage("NotAuthenticated");
            shutdown();
            ignoreInput();
            return;
        }

        // 取得模組詳細資訊
        if (tokens.equals(0, "getModuleInfo"))
        {
            sendTextFrame("moduleInfo " + getModuleInfoJson());
        }
        else // 交給模組處理
        {
            const std::string result = mpModule->handleAdminMessage(tokens);
            // 傳回結果
            if (!result.empty())
                sendTextFrame(result);
            else // 紀錄收到未知指令
                LOG_WRN("Admin Module [" << mpModule->getDetail().name
                                        << "] received an unknown command: '"
                                        << firstLine);
        }
    }

private:
    /// @brief 送出文字給已認證過的 client.
    /// @param message 文字訊息
    /// @param flush The data will be sent out immediately, the default is false.
    void sendTextFrame(const std::string& message, bool flush = false)
    {
        if (mbIsAuthenticated)
        {
            LOG_DBG("Send admin module text frame '" << message << '\'');
            sendMessage(message.c_str(), message.size(), WSOpCode::Text, flush);
        }
        else
            LOG_WRN("Skip sending message to non-authenticated admin module client: '" << message << '\'');
    }

    /// @brief  取得模組詳細資訊
    /// @return JSON 字串
    std::string getModuleInfoJson()
    {
        std::ostringstream oss;
        mpModule->getAdminDetailJson()->stringify(oss);
        return oss.str();
    }

    /// @brief 模組 Class
    OxOOL::Module::Ptr mpModule;
    /// @brief 是否已認證過
    bool mbIsAuthenticated;
};


ModuleManager::ModuleManager()
    : SocketPoll("ModuleManager")
    , mbInitialized(false)
{
    mpModuleService = std::make_shared<ModuleService>();

    // 設定模組詳細資訊
    OxOOL::Module::Detail detail;
    detail.name = "ModuleService";
    detail.serviceURI = "/browser/module/"; // 接管所有模組的 browser 請求，意即所有模組的 browser 請求都會被這個模組處理
    detail.version = "1.0";
    detail.summary = "";
    detail.author = "OxOOL";
    detail.license = "MPL 2.0";
    detail.description = "";
    detail.adminPrivilege = false;
    //detail.adminServiceURI = "/browser/dist/admin/module/" + detail.name + "/";
    detail.adminIcon = "";
    detail.adminItem = "";
    mpModuleService->maDetail = detail;

    mpModuleService->initialize();
}

ModuleManager::~ModuleManager()
{
    maModuleMap.clear();
}

void ModuleManager::initialize()
{
    if (!mbInitialized)
    {
        loadModulesFromDirectory(OxOOL::ENV::ModuleConfigDir);
        startThread();
        mbInitialized = true;
    }
}

void ModuleManager::pollingThread()
{
    LOG_DBG("Starting Module manager polling.");
    while (!SocketPoll::isStop() && !SigUtil::getTerminationFlag() && !SigUtil::getShutdownRequestFlag())
    {
        poll(SocketPoll::DefaultPollTimeoutMicroS);

    }
    maModuleMap.clear(); // Deconstruct all modules.
}

void ModuleManager::loadModulesFromDirectory(const std::string& configPath)
{
    // 載入所有模組
    const Poco::File dir(configPath);
    if (dir.exists() && dir.isDirectory())
    {
        LOG_DBG("Load modules from Directory: " << configPath);
        // 掃描目錄下所有的檔案
        for (auto it = Poco::SortedDirectoryIterator(dir); it != Poco::SortedDirectoryIterator(); ++it)
        {
            // 如果是子目錄的話，遞迴載入子目錄下的模組
            if (it->isDirectory())
            {
                loadModulesFromDirectory(it->path());
            }
            // 否則載入該檔案
            else
            {
                loadModuleConfig(it->path()); // 載入模組組態檔
            }
        }
    }
}

bool ModuleManager::loadModuleConfig(const std::string& configFile,
                                     const std::string& userLibraryPath)
{
    // 副檔名不是 xml 不處理
    if (Poco::Path(configFile).getExtension() != "xml")
        return false;

    // 不是 OxOOL module config 不處理
    const OxOOL::XMLConfig config(configFile);
    if (!config.has("module"))
        return false;

    bool isModuleEnable = true;
    try
    {
        isModuleEnable = config.getBool("module[@enable]", true);
    }
    catch(const std::exception& e)
    {
        LOG_ERR(configFile << ": Parse error. [" << e.what() << "]");
        return false;
    }

    OxOOL::Module::Detail detail;
    // 模組啟用
    if (isModuleEnable)
    {
        const std::shared_ptr<ModuleLibrary> module = std::make_shared<ModuleLibrary>();

        // 讀取模組詳細資訊
        detail.name = config.getString("module.detail.name", "");
        detail.serviceURI = Poco::trim(config.getString("module.detail.serviceURI", ""));
        detail.summary = config.getString("module.detail.summary", "");
        detail.author = config.getString("module.detail.author", "");
        detail.license = config.getString("module.detail.license", "");
        detail.description = config.getString("module.detail.description", "");
        detail.adminPrivilege = config.getBool("module.detail.adminPrivilege", false);
        detail.adminIcon = config.getString("module.detail.adminIcon", "");
        detail.adminItem = config.getString("module.detail.adminItem", "");

        // .so 檔案的絕對路徑
        std::string soFilePath;
        // 模組相關檔案存放的絕對路徑
        // 該路徑下的 html 目錄存放呈現給外部閱覽的檔案，admin 目錄下，存放後臺管理相關檔案
        std::string documentRoot;
#if ENABLE_DEBUG
        // config file 所在路徑
        documentRoot = Poco::Path(configFile).makeParent().toString();
        if (*documentRoot.rbegin() == '/')
            documentRoot.pop_back(); // 去掉最後 '/' 字元
        soFilePath = documentRoot + "/.libs";
#else
        soFilePath = OxOOL::ENV::ModuleDir;
        documentRoot = OxOOL::ENV::ModuleDataDir + "/" + detail.name;
#endif

        // 指定自訂的模組路徑，有最終覆寫權
        if (!userLibraryPath.empty())
        {
            soFilePath = userLibraryPath;
            documentRoot = Poco::Path(userLibraryPath).makeParent().toString();
            if (*documentRoot.rbegin() == '/')
                documentRoot.pop_back(); // 去掉最後 '/' 字元
        }

        // 有指定載入模組檔案
        if (const std::string loadFile = config.getString("module.load", ""); !loadFile.empty())
        {
            const std::string soFile = soFilePath + "/" + loadFile;
            const Poco::File sharedLibrary(soFile);
            // 模組檔案存在
            if (sharedLibrary.exists() && sharedLibrary.isFile())
            {
                // 模組開發階段可能需要重複載入相同 Class Librery
                // 所以需要檢查是否重複載入
                std::unique_lock<std::mutex> modulesLock(maModulesMutex);
                // 檢查是否已經載入過，找出相同的配置檔
                for (auto& it : maModuleMap)
                {
                    if (it.second->getModule()->maConfigFile == configFile)
                    {
                        maModuleMap.erase(it.first);
#if ENABLE_DEBUG
                        std::cout << "Module: " << detail.name << " already loaded. unload it." << std::endl;
#endif
                        break;
                    }
                }
                modulesLock.unlock();

                // 模組載入失敗
                if (!module->load(sharedLibrary.path()))
                {
                    LOG_ERR("Can not load module:" << soFile);
                    return false;
                }
            }
            else // 模組檔案不合法
            {
                LOG_ERR(soFile << " is not found.");
                return false;
            }
        }
        else // 沒有指定載入模組，就用基本模組
        {
            module->useBaseModule();
        }

        std::string ID = Poco::UUIDGenerator::defaultGenerator().createRandom().toString();
        // Important: remove all '-' in UUID
        // 重要、重要、重要，說三次 XDD
        // 因為 UUID 會放在訊息開頭配合模組指令，
        // 但 Message class 的 getForwardToken() 會檢查第一個 token 中是否有 '-'，
        // 若有就會把第一個 token 清空，造成模組指令不完整，解析不出來
        // 由此可知，第一個 token 千萬不要有 '-'，否則會出現難解的問題
        ID.erase(std::remove(ID.begin(), ID.end(), '-'), ID.end());
#if ENABLE_DEBUG
        std::cout << "Module: " << detail.name << ", UUID: " << ID << std::endl;
#endif

        // 檢查是否有 browser 目錄（需在模組目錄下有 browser 目錄，且 browser 目錄下還有 module.js）
        if (Poco::File(documentRoot + "/browser/module.js").exists())
        {
            const std::string browserURI = mpModuleService->maDetail.serviceURI + ID + "/"; // 用 UUID 作爲 URI，避免　URI 固定
            mpModuleService->registerBrowserURI(browserURI); // 註冊 browser URI，讓 ModuleService 處理
            module->getModule()->maId = ID; // 設定模組 ID
            module->getModule()->maBrowserURI = browserURI; // 設定模組的前端服務位址
#if ENABLE_DEBUG
            std::cout << "Browser URI: " << browserURI << std::endl;
#endif
        }

        // 檢查是否有後臺管理(需在模組目錄下有 admin 目錄，且 admin 目錄下還有 admin.html 及 admin.js)
        if (!detail.adminItem.empty() &&
            Poco::File(documentRoot + "/admin/admin.html").exists() &&
            Poco::File(documentRoot + "/admin/admin.js").exists())
        {
            detail.adminServiceURI = "/browser/dist/admin/module/" + detail.name + "/";
        }

        // 設定模組詳細資訊
        detail.version = module->getModule()->getVersion();
        module->getModule()->maDetail = detail;
        // 紀錄這個模組的配置檔位置
        module->getModule()->maConfigFile = configFile;
        // 設定模組文件絕對路徑
        module->getModule()->maRootPath = documentRoot;

        std::unique_lock<std::mutex> modulesLock(maModulesMutex);
        maModuleMap[ID] = module;
        modulesLock.unlock();

        // 用執行緒執行模組的 initialize()，避免被卡住
        std::thread([module]() {
            module->getModule()->initialize();
        }).detach();
    }

    return true;
}

bool ModuleManager::hasModule(const std::string& moduleName)
{
    // 先檢查是否是 ModuleService
    if (mpModuleService->getDetail().name == moduleName)
    {
        return true;
    }

    // 逐筆過濾
    for (auto& it : maModuleMap)
    {
        if (it.second->getModule()->getDetail().name == moduleName)
        {
            return true;
        }
    }
    return false;
}

OxOOL::Module::Ptr ModuleManager::getModuleById(const std::string& moduleUUID)
{
    if (maModuleMap.find(moduleUUID) != maModuleMap.end())
    {
        return maModuleMap[moduleUUID]->getModule();
    }
    return nullptr;
}

OxOOL::Module::Ptr ModuleManager::getModuleByConfigFile(const std::string& configFile)
{
    // 逐筆過濾
    for (auto& it : maModuleMap)
    {
        if (it.second->getModule()->maConfigFile == configFile)
        {
            return it.second->getModule();
        }
    }
    return nullptr;
}

OxOOL::Module::Ptr ModuleManager::getModuleByName(const std::string& moduleName)
{
    // 逐筆過濾
    for (auto& it : maModuleMap)
    {
        if (it.second->getModule()->getDetail().name == moduleName)
        {
            return it.second->getModule();
        }
    }
    return nullptr;
}

bool ModuleManager::handleRequest(const Poco::Net::HTTPRequest& request,
                                  SocketDisposition& disposition)
{
    // 進到這裡的 Poco::Net::HTTPRequest 的 URI 已經被改寫，
    // 去掉 service root 了(如果 oxoolwsd.xml 有指定的話)

    // 檢查是否請求 /loleaflet/ 位址，這是 4.0 版前用的 FireServer，新版一律改用 /browser/
    // 如果是舊版，就重新導向到新的 /browser/ 位址，單純置換 /loleaflet/ 爲 /browser/
    {
        static const std::string loleaflet("/loleaflet/");
        static const std::string browser("/browser/");

        // 如果是 /loleaflet/ 開頭，就改成 /browser/
        if (std::string::size_type pos = request.getURI().find(loleaflet); pos == 0)
        {
            std::string uri = request.getURI();
            uri.replace(pos, loleaflet.size(), browser);

            const std::shared_ptr<StreamSocket> socket =
                std::static_pointer_cast<StreamSocket>(disposition.getSocket());
            std::string serviceRoot = OxOOL::HttpHelper::getServiceRoot();

            // 重新導向
            OxOOL::HttpHelper::redirect(request, socket, serviceRoot +  uri);
            return true;
        }
    }

    // 1. 優先處理一般 request
    // 取得處理該 request 的模組，可能是 serverURI 或 adminServerURI(如果有的話)
    if (const OxOOL::Module::Ptr module = handleByModule(request); module != nullptr)
    {
        std::unique_lock<std::mutex> agentsLock(maAgentsMutex);
        // 尋找可用的模組代理
        std::shared_ptr<ModuleAgent> moduleAgent = nullptr;
        for (auto &it : mpAgentsPool)
            {
            if (it->isIdle())
            {
                moduleAgent = it;
                break;
            }
        }
        // 沒有找到空閒的代理
        if (moduleAgent == nullptr)
        {
            moduleAgent = std::make_shared<ModuleAgent>("Module Agent");
            mpAgentsPool.emplace_back(moduleAgent);
        }
        agentsLock.unlock();
        moduleAgent->handleRequest(module, request, disposition);

        return true;
    }

    // 2. 再看看是否爲後臺模組管理要求升級 Websocket
    // URL: /oxool/adminws/<模組名稱>
    std::vector<std::string> segments;
    Poco::URI(request.getURI()).getPathSegments(segments);
    if (segments.size() == 3 &&
        segments[0] == "oxool" &&
        segments[1] == "adminws")
    {
        LOG_INF("Admin module request: " << request.getURI());
        const std::string& moduleName = segments[2];

        // 轉成 std::weak_ptr
        const std::weak_ptr<StreamSocket> socketWeak =
              std::static_pointer_cast<StreamSocket>(disposition.getSocket());
        if (handleAdminWebsocketRequest(moduleName, socketWeak, request))
        {
            disposition.setMove([this](const std::shared_ptr<Socket> &moveSocket)
            {
                // Hand the socket over to self poll.
                insertNewSocket(moveSocket);
            });
            return true;
        }
    }

    return false;
}

bool ModuleManager::handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                        const StringVector& tokens)
{
#if ENABLE_DEBUG
    std::string firstLine;
    for (std::size_t count = 0; count < tokens.size(); ++count)
    {
        if (count > 0)
            firstLine.append(" ");

        firstLine.append(tokens[count]);
    }
#endif // ENABLE_DEBUG
    // 檢查是否來自 module client 的請求，用 <module ID> 來區分。
    if (tokens[0].at(0) == '<')
    {
        std::size_t pos = tokens[0].find('>');
        if (pos != std::string::npos)
        {
            const std::string moduleId = tokens[0].substr(1, pos - 1); // 取得 module ID
            const OxOOL::Module::Ptr module = getModuleById(moduleId);
            if (module)
            {
#if ENABLE_DEBUG
            {
                std::cout << "\033[1;33mClient Message from: "
                    << clientSession->getUserId() << "(" << clientSession->getUserName() << ")\033[0m" << std::endl;

                std::cout << "Message: \"" << firstLine << "\"" << std::endl;
                std::cout << "---------------------------------" << std::endl;
            }
#endif // ENABLE_DEBUG
                const std::string command  = tokens[0].substr(pos + 1); // 取得 command(已經去除 module ID tag)
                StringVector moduleTokens;
                moduleTokens.push_back(command); // first token is the command.
                // 其餘的 token 是 module 的參數。
                for (std::size_t i = 1; i < tokens.size(); ++i)
                    moduleTokens.push_back(tokens[i]);

                // 交給 module 處理。
                module->handleClientMessage(clientSession, moduleTokens);
            }
            return true; // 無論如何，這個請訊息只能被模組處理，不需要再往下傳。
        }
    }
#if ENABLE_DEBUG
    {
        std::cout << "\033[1;32mClient Message from: "
            << clientSession->getUserId() << "(" << clientSession->getUserName() << ")\033[0m" << std::endl;
        std::cout << "Message: \"" << firstLine << "\"" << std::endl;
        std::cout << "---------------------------------" << std::endl;
    }
#endif // ENABLE_DEBUG

    // 介入這個請求，先把模組列表送給 client，攔截 load 指令
    if (tokens.equals(0, "load") )
    {
        // 尚未載入文件
        if (clientSession->getDocURL().empty())
        {
            std::string lang("en-US"); // 預設語言
            // 先找出 lang=? 的參數
            for (std::size_t i = 1; i < tokens.size(); ++i)
            {

                if (tokens[i].find("lang=") == 0)
                {
                    lang = tokens[i].substr(5);
                    if (lang == "en")
                        lang = "en-US";

                    break;
                }
            }
            clientSession->sendTextFrame("modules: " + getAllModuleDetailsJsonString(lang));
        }
    }

    return false;
}

bool ModuleManager::handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                             const std::shared_ptr<Message>& payload)
{
    std::map<std::string, bool> handledModules;
    // 依序交給所有模組處理
    for (auto& it : maModuleMap)
    {
        bool handled = it.second->getModule()->handleKitToClientMessage(clientSession, payload);
        // 紀錄抹組處理狀況
        handledModules[it.second->getModule()->getDetail().name] = handled;
    }

#if ENABLE_DEBUG
    {
        std::cout << "Kit Message to "
                << clientSession->getUserId() << "(" << clientSession->getUserName() << ")" << std::endl;
        std::cout << "Payload: " << "\"" << payload->firstLine() << "\"" << std::endl;
        std::cout << "Handled by modules: " << std::endl;
        for (auto& it : handledModules)
        {
            std::cout << it.first << ": " << (it.second ? "Yes" : "No") << std::endl;
        }
        std::cout << "---------------------------------" << std::endl;
    }
#endif // ENABLE_DEBUG

    return false; // 繼續傳給 online core 處理
}

bool ModuleManager::handleAdminWebsocketRequest(const std::string& moduleName,
                                                const std::weak_ptr<StreamSocket> &socketWeak,
                                                const Poco::Net::HTTPRequest& request)
{
    // 禁用後臺管理
    if (!OxOOL::ENV::AdminEnabled)
    {
        LOG_ERR("Request for disabled admin console");
        return false;
    }

    // Socket 不存在
    const std::shared_ptr<StreamSocket> socket = socketWeak.lock();
    if (!socket)
    {
        LOG_ERR("Invalid socket while reading initial request.");
        return false;
    }

    // 沒有指定名稱的模組
    const OxOOL::Module::Ptr module = getModuleByName(moduleName);
    if (module == nullptr)
    {
        LOG_ERR("No module named '" << moduleName << "'");
        return false;
    }

    const std::string& requestURI = request.getURI();
    const StringVector pathTokens(StringVector::tokenize(requestURI, '/'));
    // 要升級連線爲 Web socket
    if (request.find("Upgrade") != request.end() && Poco::icompare(request["Upgrade"], "websocket") == 0)
    {
        auto handler = std::make_shared<ModuleAdminSocketHandler>(module, socketWeak, request);
        socket->setHandler(handler);
        return true;
    }

    // 回應錯誤 http status code.
    OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_BAD_REQUEST, socket);
    return false;
}

void ModuleManager::cleanupDeadAgents()
{
    // 交給 module manager thread 執行清理工作，避免搶走 main thread
    addCallback([this]()
    {
        const std::unique_lock<std::mutex> agentsLock(maAgentsMutex);
        // 有 agents 才進行清理工作
        if (const int beforeClean = mpAgentsPool.size(); beforeClean > 0)
        {
            for (auto it = mpAgentsPool.begin(); it != mpAgentsPool.end();)
            {
                if (!it->get()->isAlive())
                {
                    mpAgentsPool.erase(it);
                    continue;
                }
                else
                {
                    ++it;
                }
            }
            const int afterClean = mpAgentsPool.size();
            LOG_DBG("Clean " << beforeClean - afterClean << " dead agents, leaving " << afterClean << ".");
        }
    });
}

const std::vector<OxOOL::Module::Detail> ModuleManager::getAllModuleDetails() const
{
    std::vector<OxOOL::Module::Detail> detials(maModuleMap.size());
    for (auto &it : maModuleMap)
    {
        detials.emplace_back(it.second->getModule()->getDetail());
    }
    return detials;
}

std::string ModuleManager::getAllModuleDetailsJsonString(const std::string& langTag) const
{
    std::string jsonString("[");
    std::size_t count = 0;
    for (auto &it : maModuleMap)
    {
        if (count > 0)
            jsonString.append(",");

        const OxOOL::Module::Ptr module = it.second->getModule();
        Poco::JSON::Object::Ptr json = module->getAdminDetailJson(langTag);

        std::ostringstream oss;
        json->stringify(oss);
        jsonString.append(oss.str());

        count ++;
    }
    jsonString.append("]");

    return jsonString;
}

std::string ModuleManager::getAdminModuleDetailsJsonString(const std::string& langTag) const
{
    std::string jsonString("[");
    std::size_t count = 0;
    for (auto &it : maModuleMap)
    {
        const OxOOL::Module::Ptr module = it.second->getModule();
        // 只取有後臺管理的模組
        if (!module->getDetail().adminServiceURI.empty())
        {
            if (count > 0)
                jsonString.append(",");

            auto json = module->getAdminDetailJson(langTag);
            std::ostringstream oss;
            json->stringify(oss);
            jsonString.append(oss.str());

            count ++;
        }
    }
    jsonString.append("]");

    return jsonString;
}

void ModuleManager::dump()
{
    // TODO: Do we need to implement this?
}

//------------------ Private mtehods ----------------------------------

OxOOL::Module::Ptr ModuleManager::handleByModule(const Poco::Net::HTTPRequest& request)
{
    // 是否請求模組管理服務
    if (mpModuleService->isService(request) || mpModuleService->isAdminService(request))
        return mpModuleService;

    // 找出是哪個 module 要處理這個請求
    for (auto& it : maModuleMap)
    {
        OxOOL::Module::Ptr module = it.second->getModule();
        if (module->isService(request) || module->isAdminService(request))
            return module;
    }
    return nullptr;
}

}; // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
