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
#include <OxOOL/Module/Base.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/ConvertBroker.h>
#include <OxOOL/L10NTranslator.h>
#include <OxOOL/XMLConfig.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/Util.h>

#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/Exception.h>
#include <Poco/UUIDGenerator.h>
#include <Poco/SharedLibrary.h>
#include <Poco/String.h>
#include <Poco/SortedDirectoryIterator.h>
#include <Poco/String.h>
#include <Poco/StringTokenizer.h>
#include <Poco/JSON/Object.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Message.hpp>
#include <common/StringVector.hpp>
#include <common/Log.hpp>
#include <wsd/ClientSession.hpp>

#include "ModuleManager/ModuleLibrary.hpp"
#include "ModuleManager/ModuleAgent.hpp"
#include "ModuleManager/AdminService.hpp"
#include "ModuleManager/BrowserService.hpp"
#include "ModuleManager/ResourceService.hpp"

namespace OxOOL
{

ModuleManager::ModuleManager()
    : mbInitialized(false)
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

        std::string ID(detail.name + '_' + Poco::UUIDGenerator::defaultGenerator().createRandom().toString());
        // Important: remove all '-' in UUID
        // 重要、重要、重要，說三次 XDD
        // 因為 UUID 會放在訊息開頭配合模組指令，
        // 但 Message class 的 getForwardToken() 會檢查第一個 token 中是否有 '-'，
        // 若有就會把第一個 token 清空，造成模組指令不完整，解析不出來
        // 由此可知，第一個 token 千萬不要有 '-'，否則會出現難解的問題
        ID.erase(std::remove(ID.begin(), ID.end(), '-'), ID.end());

        OxOOL::Module::Ptr module = moduleLib->getModule();
        module->maId = ID; // 設定模組 ID

        // 檢查是否有 browser 目錄（需在模組目錄下有 browser 目錄，且 browser 目錄下還有 module.js 或者 l10n 目錄）
        if (Poco::File(documentRoot + "/browser/module.js").exists() ||
            Poco::File(documentRoot + "/browser/l10n").exists())
        {
            const std::string browserURI = mpBrowserService->maDetail.serviceURI + ID + "/"; // 用 UUID 作爲 URI，避免　URI 固定
            mpBrowserService->registerBrowserURI(browserURI); // 註冊 browser URI，讓 BrowserService 處理
            module->maBrowserURI = browserURI; // 設定模組的前端服務位址
        }

        // 檢查是否有後臺管理(需在模組目錄下有 admin 目錄，且 admin 目錄下還有 admin.html 及 admin.js)
        if (!detail.adminItem.empty() &&
            Poco::File(documentRoot + "/admin/admin.html").exists() &&
            Poco::File(documentRoot + "/admin/admin.js").exists())
        {
            module->maAdminURI = mpAdminService->maDetail.serviceURI + "module/" + ID + "/";
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

            // 重新導向
            OxOOL::HttpHelper::redirect(request, socket, OxOOL::ENV::ServiceRoot +  uri);
            return true;
        }
    }

    // 取得處理該 request 的模組
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

    // 是否要求連接 Admin websocket
    if (request.getURI().find("/oxool/adminws") == 0)
    {
        LOG_INF("Admin websocket request: " << request.getURI());
        const std::weak_ptr<StreamSocket> weakSocket =
            std::static_pointer_cast<StreamSocket>(disposition.getSocket());

        if (AdminSocketHandler::handleInitialRequest(weakSocket, request))
        {
            disposition.setMove([](const std::shared_ptr<Socket> &moveSocket) {
                // Hand the socket over to the Admin poll.
                Admin::instance().insertNewSocket(moveSocket);
            });
            return true;
        }
    }

    return false;
}

bool ModuleManager::handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                        const StringVector& tokens)
{
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

    return false; // 繼續傳給 online core 處理
}

void ModuleManager::handleAdminMessage(const SendTextMessageFn& sendTextMessage,
                                       const StringVector& tokens)
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

                // 交給 module 處理
                module->handleAdminMessage(sendTextMessage, moduleTokens);
            }
            return; // 無論如何，這個請訊息只能被模組處理，不需要再往下傳。
        }
    }

    // 非模組指令，交給 AdminService 處理
    mpAdminService->handleAdminMessage(sendTextMessage, tokens);
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

    Poco::replaceInPlace(mainContent, std::string("%SERVICE_ROOT%"), OxOOL::ENV::ServiceRoot);
    Poco::replaceInPlace(mainContent, std::string("%VERSION%"), OxOOL::ENV::VersionHash);

    std::string adminRoot = mpAdminService->maDetail.serviceURI;
    // 去掉最後的 '/'
    if (*adminRoot.rbegin() == '/')
        adminRoot.pop_back();
    Poco::replaceInPlace(mainContent, std::string("%ADMIN_ROOT%"), adminRoot);

    // 是否要求模組檔案
    const std::string realURI = mpAdminService->parseRealURI(request);
    // 判斷是否存取模組管理頁面，兩個 token 以上且第一個 token 爲 "module"
    const Poco::StringTokenizer tokens(realURI, "/",
        Poco::StringTokenizer::TOK_IGNORE_EMPTY|Poco::StringTokenizer::TOK_TRIM);

    if (tokens.count() > 1 && tokens[0] == "module")
    {
        // 找出是哪個模組
        const OxOOL::Module::Ptr module = getModuleById(tokens[1]); // 第二個是模組 ID
        if (module)
        {
            std::string adminModuleRoot = module->maAdminURI;
            // 去掉最後的 '/'
            if (*adminModuleRoot.rbegin() == '/')
                adminModuleRoot.pop_back();

            // 替換 %ADMIN_MODULE_ROOT%
            Poco::replaceInPlace(mainContent, std::string("%ADMIN_MODULE_ROOT%"), adminModuleRoot);
        }
    }

    Poco::Net::HTTPResponse response;
    // Ask UAs to block if they detect any XSS attempt
    response.add("X-XSS-Protection", "1; mode=block"); // XSS 防護
    // No referrer-policy
    response.add("Referrer-Policy", "no-referrer"); // 不傳送 referrer
    response.add("X-Content-Type-Options", "nosniff"); // 不傳送 content type
    response.set("Cache-Control", "no-cache, no-store, must-revalidate"); //
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

// TODO: 這裏被 ModuleAgent 呼叫，將來改為自動管理 agent，就可以刪除這個函式
void ModuleManager::cleanupDeadAgents()
{
    // 交給 module manager thread 執行清理工作，避免搶走 main thread
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
}

const std::vector<OxOOL::Module::Detail> ModuleManager::getAllModuleDetails() const
{
    std::vector<OxOOL::Module::Detail> details(maModuleMap.size());
    for (auto &it : maModuleMap)
    {
        details.emplace_back(it.second->getModule()->getDetail());
    }
    return details;
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
        Poco::JSON::Object::Ptr json = getModuleDetailJson(module, langTag);

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
        if (!module->maAdminURI.empty())
        {
            if (count > 0)
                jsonString.append(",");

            Poco::JSON::Object::Ptr json = getModuleDetailJson(module, langTag);
            std::ostringstream oss;
            json->stringify(oss);
            jsonString.append(oss.str());

            count ++;
        }
    }
    jsonString.append("]");

    return jsonString;
}

Poco::JSON::Object::Ptr ModuleManager::getModuleDetailJson(const OxOOL::Module::Ptr& module,
                                                           const std::string& langTag) const
{
    Poco::JSON::Object::Ptr json = new Poco::JSON::Object();
    OxOOL::Module::Detail detail = module->maDetail;

    // 若有指定語系，嘗試翻譯
    if (!langTag.empty())
    {
        OxOOL::L10NTranslator translator(langTag, module);

        detail.version = translator._(detail.version);
        detail.summary = translator._(detail.summary);
        detail.author = translator._(detail.author);
        detail.license = translator._(detail.license);
        detail.description = translator._(detail.description);
        detail.adminItem = translator._(detail.adminItem);
    }

    json->set("id", module->maId);
    json->set("adminURI", module->maAdminURI);
    json->set("browserURI", module->maBrowserURI);
    // 是否有 browser/module.js
    const std::string browserModuleJS = Poco::File(module->maRootPath + "/browser/module.js").exists()
                                      ? module->maBrowserURI + "module.js"
                                      : "";
    json->set("browserModuleJS", browserModuleJS);

    // 設定模組詳細資訊
    json->set("name", detail.name);
    json->set("serviceURI", detail.serviceURI);
    json->set("version", detail.version);
    json->set("summary", detail.summary);
    json->set("author", detail.author);
    json->set("license", detail.license);
    json->set("description", detail.description);
    json->set("adminPrivilege", detail.adminPrivilege);
    json->set("adminIcon", detail.adminIcon);
    json->set("adminItem", detail.adminItem);

    return json;
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

// 初始化內部模組
void ModuleManager::initializeInternalModules()
{
    // 1. BrowserService
    mpBrowserService = std::make_shared<BrowserService>();
    std::unique_ptr<ModuleLibrary> browserModuleLib = std::make_unique<ModuleLibrary>(mpBrowserService);

    // 設定 Browser service 詳細資訊
    mpBrowserService->maDetail.name = "BrowserService";
    mpBrowserService->maDetail.serviceURI = OxOOL::ENV::ServiceRoot + "/browser/module/"; // 接管所有模組的 browser 請求，意即所有模組的 browser 請求都會被這個模組處理
    mpBrowserService->maDetail.version = "1.0.0";
    mpBrowserService->maDetail.summary = "Front-end user file service.";
    mpBrowserService->maDetail.author = "OxOOL";
    mpBrowserService->maDetail.license = "MPL 2.0";
    mpBrowserService->maDetail.description = "";
    mpBrowserService->maDetail.adminPrivilege = false;
    mpBrowserService->maDetail.adminIcon = "";
    mpBrowserService->maDetail.adminItem = "";

    mpBrowserService->maId = "1"; // 固定 ID 爲 1
    maModuleMap[mpBrowserService->maId] = std::move(browserModuleLib);
    mpBrowserService->initialize();

    // 2. AdminService
    mpAdminService = std::make_shared<AdminService>();
    std::unique_ptr<ModuleLibrary> adminModuleLib = std::make_unique<ModuleLibrary>(mpAdminService);
    // 設定 Admin service 詳細資訊
    mpAdminService->maDetail.name = "AdminService";
    mpAdminService->maDetail.serviceURI = OxOOL::ENV::ServiceRoot + "/browser/dist/admin/"; // 接管所有模組的後臺管理請求，意即所有模組的後臺管理請求都會被這個模組處理
    mpAdminService->maDetail.version = "1.0.0";
    mpAdminService->maDetail.summary = "Admin console service.";
    mpAdminService->maDetail.author = "OxOOL";
    mpAdminService->maDetail.license = "MPL 2.0";
    mpAdminService->maDetail.description = "";
    mpAdminService->maDetail.adminPrivilege = false;
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

    // 3. ResourceService
    mpResourceService = std::make_shared<ResourceService>();
    std::unique_ptr<ModuleLibrary> resourceModuleLib = std::make_unique<ModuleLibrary>(mpResourceService);
    // 設定 Resource service 詳細資訊
    mpResourceService->maDetail.name = "ResourceService";
    mpResourceService->maDetail.serviceURI = OxOOL::ENV::ServiceRoot + "/oxool/resource/";
    mpResourceService->maDetail.version = "1.0.0";
    mpResourceService->maDetail.summary = "Resource service.";
    mpResourceService->maDetail.author = "OxOOL";
    mpResourceService->maDetail.license = "MPL 2.0";
    mpResourceService->maDetail.description = "";
    mpResourceService->maDetail.adminPrivilege = false;
    mpResourceService->maDetail.adminIcon = "";
    mpResourceService->maDetail.adminItem = "";

    mpResourceService->maId = "3"; // 固定 ID 爲 3
    maModuleMap[mpResourceService->maId] = std::move(resourceModuleLib);
    mpResourceService->initialize();
}

bool ModuleManager::isService(const Poco::Net::HTTPRequest& request,
                              const OxOOL::Module::Ptr& module) const
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

OxOOL::Module::Ptr ModuleManager::handleByWhichModule(const Poco::Net::HTTPRequest& request) const
{
    // 找出是哪個 module 要處理這個請求
    for (auto& it : maModuleMap)
    {
        OxOOL::Module::Ptr module = it.second->getModule();
        if (isService(request, module))
            return module;
    }
    return nullptr;
}

}; // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
