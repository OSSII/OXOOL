/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <string>
#include <vector>

#include <OxOOL/Module/Base.h>

#include <net/Socket.hpp>

namespace Poco
{
namespace Net
{
    class HTTPRequest;
} // namespace Net
} // namespace Poco

class ClientSession;
class StringVector;
class Message;
class StreamSocket;
class SocketDisposition;
class ModuleLibrary;
class ModuleAgent;

class AdminService;
class BrowserService;

namespace OxOOL
{

class ModuleManager : public SocketPoll
{
    ModuleManager(const ModuleManager &) = delete;
    ModuleManager& operator = (const ModuleManager &) = delete;
    ModuleManager();

public:
    virtual ~ModuleManager();

    static ModuleManager& instance()
    {
        static ModuleManager mModuleManager;
        return mModuleManager;
    }

    void initialize();

    void stop() { joinThread(); }

    /// @brief 遞迴載入指定目錄下所有副檔名爲 .xml 的模組
    /// @param modulePath
    void loadModulesFromDirectory(const std::string& configPath);

    /// @brief 載入模組組態檔
    /// @param configFile 模組設定檔(.xml)絕對路徑
    /// @param userModuleFile 強制搭配的模組當檔案絕對路徑
    /// @return true: 成功
    bool loadModuleConfig(const std::string& configFile,
                          const std::string& userLibraryPath = std::string());

    /// @brief 以模組名稱查詢模組是否已經存在
    /// @param moduleName - 模組名稱
    /// @return true: 已存在, false: 不存在
    bool hasModule(const std::string& moduleName);

    /// @brief 以模組 UUID 查詢模組是否已經存在
    /// @param moduleUUID - 模組 UUID
    /// @return nullptr: 不存在，否則爲模組 class
    OxOOL::Module::Ptr getModuleById(const std::string& moduleUUID);

    /// @brief 以 xml config 絕對路徑，取得模組物件
    /// @param configFile
    /// @return nullptr: 不存在，否則爲模組 class
    OxOOL::Module::Ptr getModuleByConfigFile(const std::string& configFile);

    /// @brief 取得指定名稱的模組
    /// @param moduleName - 模組名稱
    /// @return nullptr: 不存在，否則爲模組 class
    OxOOL::Module::Ptr getModuleByName(const std::string& moduleName);

    /// @brief 傳遞 request 給相應的模組處理
    /// @param request
    /// @param disposition
    /// @return true: request 已被某個模組處理
    bool handleRequest(const Poco::Net::HTTPRequest& request,
                       SocketDisposition& disposition);

    /// @brief 傳遞 client message 給相應的模組處理
    /// @param clientSession - client session
    /// @param tokens - message tokens
    /// @return true: 不需要再傳遞 message, false: 繼續傳遞 message
    bool handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                             const StringVector& tokens);

    /// @brief 傳遞 KitToClient message 給所有模組，有興趣的模組自行處理
    /// @param clientSession
    /// @param payload
    /// @return true: 不需要再傳遞 payload, false: 繼續傳遞 payload
    bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                  const std::shared_ptr<Message>& payload);

    /// @brief 處理後臺管理訊息
    /// @param payload
    /// @return
    std::string handleAdminMessage(const StringVector& tokens);

    /// @brief 讀取模組後臺管理檔案，替換其中的變數
    /// @param adminFile - 後臺管理檔案絕對路徑
    /// @param request - HTTP 請求
    /// @param socket - 連線 socket
    void preprocessAdminFile(const std::string& adminFile,
                             const Poco::Net::HTTPRequest& request,
                             const std::shared_ptr<StreamSocket>& socket);

    /// @brief 處理模組後臺管理 Web socket 請求
    /// @param moduleName 模組名稱
    /// @param socket
    /// @param request
    /// @return true if we should give this socket to the Module manager poll.
    bool handleAdminWebsocketRequest(const std::string& moduleName,
                                     const std::weak_ptr<StreamSocket> &socket,
                                     const Poco::Net::HTTPRequest& request);

    /// @brief 清理已經不工作的 agents (代理執行緒一旦超時，就會結束執行緒，並觸發這個函式)
    void cleanupDeadAgents();

    /// @brief 取得所有模組詳細資訊列表
    /// @return
    const std::vector<OxOOL::Module::Detail> getAllModuleDetails() const;

    /// @brief 取得有模組資訊列表
    std::string getAllModuleDetailsJsonString(const std::string& langTag = std::string()) const;

    /// @brief 取得有後臺管理的模組資訊列表
    std::string getAdminModuleDetailsJsonString(const std::string& langTag = std::string()) const;

    /// @brief 列出所有的模組
    void dump();

private:
    void pollingThread() override;

    /// @brief 初始化內部模組
    void initializeInternalModules();

    /// @brief 請求是否是本模組處理
    /// @param request
    /// @return true 該要求屬於這個模組處理
    bool isService(const Poco::Net::HTTPRequest& request,
                   const OxOOL::Module::Ptr module) const;

    /// @brief 請求是否是本模組的管理介面處理
    /// @param request
    /// @return true 該要求屬於這個模組的管理介面處理
    bool isAdminService(const Poco::Net::HTTPRequest& request,
                        const OxOOL::Module::Ptr module) const;

    /// @brief
    /// @param request
    /// @return
    OxOOL::Module::Ptr handleByWhichModule(const Poco::Net::HTTPRequest& request) const;

    bool mbInitialized; // 是否已經初始化

    std::shared_ptr<BrowserService> mpBrowserService;
    std::shared_ptr<AdminService> mpAdminService;

    std::mutex maModulesMutex;
    std::map<std::string, std::unique_ptr<ModuleLibrary>> maModuleMap;

    std::mutex maAgentsMutex;
    std::vector<std::shared_ptr<ModuleAgent>> mpAgentsPool;
};

} // namespace OxOOL
