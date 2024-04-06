/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <string>
#include <vector>
#include <iostream>
#include <fstream>
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

#include "ModuleManager/ModuleLibrary.hpp"
#include "ModuleManager/ModuleAgent.hpp"
#include "ModuleManager/AdminService.hpp"
#include "ModuleManager/BrowserService.hpp"

#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/Exception.h>
#include <Poco/UUIDGenerator.h>
#include <Poco/SharedLibrary.h>
#include <Poco/String.h>
#include <Poco/SortedDirectoryIterator.h>
#include <Poco/String.h>
#include <Poco/JSON/Object.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>
#include <Poco/Net/HTTPCookie.h>

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
    , mpBrowserService(nullptr)
    , mpAdminService(nullptr)
{
}

ModuleManager::~ModuleManager()
{
    maModuleMap.clear();
}

void ModuleManager::initialize()
{
    if (!mbInitialized)
    {
        // 初始化內部模組
        initializeInternalModules();

        // 載入外部模組
        loadModulesFromDirectory(OxOOL::ENV::ModuleConfigDir);
#if ENABLE_DEBUG
        dump();
#endif
        startThread();
        mbInitialized = true;
    }
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
        std::unique_ptr<ModuleLibrary> moduleLib = std::make_unique<ModuleLibrary>();

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
                if (!moduleLib->load(sharedLibrary.path()))
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
            moduleLib->useBaseModule();
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

        OxOOL::Module::Ptr module = moduleLib->getModule();
        module->maId = ID; // 設定模組 ID

        // 檢查是否有 browser 目錄（需在模組目錄下有 browser 目錄，且 browser 目錄下還有 module.js）
        if (Poco::File(documentRoot + "/browser/module.js").exists())
        {
            const std::string browserURI = mpBrowserService->maDetail.serviceURI + ID + "/"; // 用 UUID 作爲 URI，避免　URI 固定
            mpBrowserService->registerBrowserURI(browserURI); // 註冊 browser URI，讓 ModuleService 處理
            module->maBrowserURI = browserURI; // 設定模組的前端服務位址
#if ENABLE_DEBUG
            std::cout << "Browser URI: " << browserURI << std::endl;
#endif
        }

        // 檢查是否有後臺管理(需在模組目錄下有 admin 目錄，且 admin 目錄下還有 admin.html 及 admin.js)
        if (!detail.adminItem.empty() &&
            Poco::File(documentRoot + "/admin/admin.html").exists() &&
            Poco::File(documentRoot + "/admin/admin.js").exists())
        {
            //detail.adminServiceURI = "/browser/dist/admin/module/" + ID + "/";
            const std::string adminURI = mpAdminService->maDetail.serviceURI + "module/" + ID + "/";
            module->maAdminURI = adminURI; // 設定模組的後臺管理位址
        }

        // 設定模組詳細資訊
        detail.version = module->getVersion();
        module->maDetail = detail;
        // 紀錄這個模組的配置檔位置
        module->maConfigFile = configFile;
        // 設定模組文件絕對路徑
        module->maRootPath = documentRoot;

        std::unique_lock<std::mutex> modulesLock(maModulesMutex);
        maModuleMap[ID] = std::move(moduleLib);
        modulesLock.unlock();

        // 用執行緒執行模組的 initialize()，避免被卡住
        std::thread([module]() {
            module->initialize();
        }).detach();
    }

    return true;
}

bool ModuleManager::hasModule(const std::string& moduleName)
{
    // 先檢查是否是 ModuleService
    if (mpBrowserService->getDetail().name == moduleName)
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
    if (const OxOOL::Module::Ptr module = handleByWhichModule(request); module != nullptr)
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
            moduleAgent = std::make_shared<ModuleAgent>("Module Agent"); // 建立新的代理
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

std::string ModuleManager::handleAdminMessage(const StringVector& tokens)
{
    // 是否是給模組的指令，第一個 token 前有 <module ID> 字串
    if (tokens[0].at(0) == '<')
    {
        std::size_t pos = tokens[0].find('>');
        if (pos != std::string::npos)
        {
            const std::string moduleId = tokens[0].substr(1, pos - 1); // 取得 module ID
            const OxOOL::Module::Ptr module = getModuleById(moduleId);
            if (module)
            {
                const std::string command  = tokens[0].substr(pos + 1); // 取得 command(已經去除 module ID tag)
                StringVector moduleTokens;
                moduleTokens.push_back(command); // first token is the command.
                // 其餘的 token 是 module 的參數
                for (std::size_t i = 1; i < tokens.size(); ++i)
                    moduleTokens.push_back(tokens[i]);

                // 由於交給 module 處理，所以得到的結果，要加上 <module ID>
                return "<" + moduleId + ">" + module->handleAdminMessage(moduleTokens);
            }
            return ""; // 無論如何，這個請訊息只能被模組處理，不需要再往下傳。
        }
    }

    // 非模組指令，我們要自己處理
    if (tokens.equals(0, "getModuleList"))
    {
        return getAllModuleDetailsJsonString("en-US");
    }

    return ""; // 繼續傳給 online core 處理
}

void ModuleManager::preprocessAdminFile(const std::string& adminFile,
                                        const Poco::Net::HTTPRequest& request,
                                        const std::shared_ptr<StreamSocket>& socket)
{
    // 讀取檔案內容
    std::ifstream file(adminFile, std::ios::binary);
    std::stringstream content;
    content << file.rdbuf();
    file.close();
    std::string mainContent = content.str();

    std::string jwtToken;
    Poco::Net::NameValueCollection reqCookies;
    std::vector<Poco::Net::HTTPCookie> resCookies;

    for (size_t it = 0; it < resCookies.size(); ++it)
    {
        if (resCookies[it].getName() == "jwt")
        {
            jwtToken = resCookies[it].getValue();
            break;
        }
    }

    if (jwtToken.empty())
    {
        request.getCookies(reqCookies);
        if (reqCookies.has("jwt"))
        {
            jwtToken = reqCookies.get("jwt");
        }
    }

    const std::string escapedJwtToken = Util::encodeURIComponent(jwtToken, "'");
    Poco::replaceInPlace(mainContent, std::string("%JWT_TOKEN%"), escapedJwtToken);

    Poco::replaceInPlace(mainContent, std::string("%SERVICE_ROOT%"), OxOOL::ENV::ServiceRoot);
    Poco::replaceInPlace(mainContent, std::string("%VERSION_HASH%"), OxOOL::ENV::VersionHash);


    Poco::Net::HTTPResponse response;
    // Ask UAs to block if they detect any XSS attempt
    response.add("X-XSS-Protection", "1; mode=block");
    // No referrer-policy
    response.add("Referrer-Policy", "no-referrer");
    response.add("X-Content-Type-Options", "nosniff");
    response.set("Server", OxOOL::ENV::HttpServerString);
    response.set("Date", OxOOL::HttpHelper::getHttpTimeNow());

    response.setContentType("text/html; charset=utf-8");
    response.setChunkedTransferEncoding(false);

    std::ostringstream oss;
    response.write(oss);
    oss << mainContent;
    socket->send(oss.str());
    socket->shutdown();
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
    std::cout << "Module list:" << std::endl
              << "==========================" << std::endl;
    for (auto &it : maModuleMap)
    {
        const OxOOL::Module::Ptr module = it.second->getModule();
        std::cout << "Module: " << module->maId << std::endl
                  << "Name: " << module->maDetail.name << std::endl
                  << "Service URI: " << module->maDetail.serviceURI << std::endl
                  << "Browser URI: " << module->maBrowserURI << std::endl
                  << "Admin URI: " << module->maAdminURI << std::endl
                  << "Config file: " << module->maConfigFile << std::endl
                  << "Root path: " << module->maRootPath << std::endl;
        std::cout << "--------------------------" << std::endl;
    }
}

//------------------ Private mtehods ----------------------------------

void ModuleManager::pollingThread()
{
    LOG_DBG("Starting Module manager polling.");
    while (!SocketPoll::isStop() && !SigUtil::getTerminationFlag() && !SigUtil::getShutdownRequestFlag())
    {
        poll(SocketPoll::DefaultPollTimeoutMicroS);

    }
    maModuleMap.clear(); // Deconstruct all modules.
}

// 初始化內部模組
void ModuleManager::initializeInternalModules()
{
    // 1. BrowserService
    mpBrowserService = std::make_shared<BrowserService>();
    std::unique_ptr<ModuleLibrary> browserModuleLib = std::make_unique<ModuleLibrary>(mpBrowserService);

    // 設定 Browser service 詳細資訊
    mpBrowserService->maDetail.name = "BrowserService";
    mpBrowserService->maDetail.serviceURI = "/browser/module/"; // 接管所有模組的 browser 請求，意即所有模組的 browser 請求都會被這個模組處理
    mpBrowserService->maDetail.version = "1.0.0";
    mpBrowserService->maDetail.summary = "Front-end user file service.";
    mpBrowserService->maDetail.author = "OxOOL";
    mpBrowserService->maDetail.license = "MPL 2.0";
    mpBrowserService->maDetail.description = "";
    mpBrowserService->maDetail.adminPrivilege = false;
    mpBrowserService->maDetail.adminServiceURI = ""; // 接管所有系統的後臺管理
    mpBrowserService->maDetail.adminIcon = "";
    mpBrowserService->maDetail.adminItem = "";

    mpBrowserService->maId = "1"; // 固定 ID 爲 1
    maModuleMap[mpBrowserService->maId] = std::move(browserModuleLib);
    mpBrowserService->initialize();

    if (!std::getenv("ENABLE_ADMIN_SERVICE"))
        return;

    // 2. AdminService
    mpAdminService = std::make_shared<AdminService>();
    std::unique_ptr<ModuleLibrary> adminModuleLib = std::make_unique<ModuleLibrary>(mpAdminService);
    // 設定 Admin service 詳細資訊
    mpAdminService->maDetail.name = "AdminService";
    mpAdminService->maDetail.serviceURI = "/browser/dist/admin/"; // 接管所有模組的後臺管理請求，意即所有模組的後臺管理請求都會被這個模組處理
    mpAdminService->maDetail.version = "1.0.0";
    mpAdminService->maDetail.summary = "Admin console service.";
    mpAdminService->maDetail.author = "OxOOL";
    mpAdminService->maDetail.license = "MPL 2.0";
    mpAdminService->maDetail.description = "";
    mpAdminService->maDetail.adminPrivilege = false;
    mpAdminService->maDetail.adminServiceURI = ""; // 接管所有系統的後臺管理
    mpAdminService->maDetail.adminIcon = "";
    mpAdminService->maDetail.adminItem = "";

    mpAdminService->maId = "2"; // 固定 ID 爲 2
#if ENABLE_DEBUG
    mpAdminService->maRootPath = OxOOL::ENV::FileServerRoot + "/ossii/browser/admin/";
#else
    mpAdminService->maRootPath = OxOOL::ENV::FileServerRoot + "/admin/";
#endif
    maModuleMap[mpAdminService->maId] = std::move(adminModuleLib);
    mpAdminService->initialize();
}

bool ModuleManager::isService(const Poco::Net::HTTPRequest& request,
                              const OxOOL::Module::Ptr module) const
{
    // 不含查詢字串的實際請求位址
    const std::string requestURI = Poco::URI(request.getURI()).getPath();

    /* serviceURI 有兩種格式：
        一、 end point 格式：
            例如 /oxool/endpoint 最後非 '/' 結尾)
            此種格式用途單一，只有一個位址，適合簡單功能的 restful api

        二、 目錄格式，最後爲 '/' 結尾：
            例如 /oxool/drawio/
            此種格式，模組可自由管理 /oxool/drawio/ 之後所有位址，適合複雜的 restful api
        */
    // 取得該模組指定的 service uri, uri 長度至少 2 個字元
    if (std::string serviceURI = module->maDetail.serviceURI; serviceURI.length() > 1)
    {
        bool correctModule = false; // 預設該模組非正確模組

        // service uri 爲 end pointer(最後字元不是 '/')，表示 request uri 和 service uri 需相符
        if (*serviceURI.rbegin() != '/')
        {
            correctModule = (serviceURI == requestURI);
        }
        else
        {
            // 該位址可以為 "/endpoint" or "/endpoint/"
            std::string endpoint(serviceURI);
            endpoint.pop_back(); // 移除最後的 '/' 字元，轉成 /endpoint

            // 位址列開始爲 "/endpoint/" 或等於 "/endpoint"，視為正確位址
            correctModule = (requestURI.find(serviceURI, 0) == 0 || requestURI == endpoint);
        }

        return correctModule;
    }

    return false;
}

bool ModuleManager::isAdminService(const Poco::Net::HTTPRequest& request,
                                   const OxOOL::Module::Ptr module) const
{
    // 有管理界面 URI
    if (!module->maDetail.adminServiceURI.empty())
        return request.getURI().find(module->maDetail.adminServiceURI, 0) == 0;

    return false;
}

OxOOL::Module::Ptr ModuleManager::handleByWhichModule(const Poco::Net::HTTPRequest& request) const
{
    // 找出是哪個 module 要處理這個請求
    for (auto& it : maModuleMap)
    {
        OxOOL::Module::Ptr module = it.second->getModule();
        if (isService(request, module) || isAdminService(request, module))
            return module;
    }
    return nullptr;
}

}; // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
