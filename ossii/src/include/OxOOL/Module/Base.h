/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once
#include <OxOOL/OxOOL.h>
#include <OxOOL/XMLConfig.h>

#include <memory>

#include <Poco/Net/HTTPRequest.h>
#include <Poco/MemoryStream.h>
#include <Poco/JSON/Object.h>

#define MODULE_METHOD_IS_ABSTRACT "@OxOOL::Module::Base"

class StringVector;
class StreamSocket;
class ClientSession;
class Message;

namespace OxOOL
{

class ModuleManager;

namespace Module
{

struct Detail
{
    std::string name;
    std::string serviceURI;
    std::string version;
    std::string summary;
    std::string author;
    std::string license;
    std::string description;
    bool adminPrivilege = false;
    std::string adminIcon; // 顯示在後臺的選項 icon(名稱請參閱 https://icons.getbootstrap.com/)
    std::string adminItem; // 顯示在後臺的選項名稱
};

class Base
{
public:
    Base() {}
    virtual ~Base() {}

    friend class OxOOL::ModuleManager;

    const Detail& getDetail() const { return maDetail; }

    /// @brief 以 JSON 格式傳回模組詳細資訊
    /// @return Poco::JSON::Object::Ptr
    Poco::JSON::Object::Ptr getAdminDetailJson(const std::string& langTag = std::string());

    /// @brief 傳回模組配置檔(XML)的位置
    /// @return
    const std::string& getConfigFile() const { return maConfigFile; }

    /// @brief 傳回操作配置檔的物件
    /// @return
    OxOOL::XMLConfig::Ptr getConfig();

    /// @brief 傳回模組在本機所在的絕對路徑
    /// @return
    const std::string& getDocumentRoot() const { return maRootPath; }

    /// @brief 需要管理員身份驗證
    /// @param request
    /// @param socket
    /// @param callByAdmin true 一定要檢查，預設 false，
    /// @return true: 是， false:不需要或已驗證通過
    bool needAdminAuthenticate(const Poco::Net::HTTPRequest& request,
                               const std::shared_ptr<StreamSocket>& socket,
                               const bool callByAdmin = false);
    /// @brief 取得模組版本編號
    virtual std::string getVersion();

    /// @brief 模組載入完畢後，初始化工作，只會在載入完畢後呼叫一次
    virtual void initialize() {}

    /// @brief 處理前端 Client 的請求
    ///        Handle requests from the front-end Client.
    /// @param request
    /// @param socket
    virtual void handleRequest(const Poco::Net::HTTPRequest& request,
                               const std::shared_ptr<StreamSocket>& socket);

    /// @brief 處理前端 Client 模組傳送的 Web Socket 訊息
    ///        Handle messages from the front-end Client module.
    ///        If you want to handle the message from the client, you should override this function.
    /// @param clientSession
    /// @param tokens
    virtual void handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                     const StringVector& tokens);

    /// @brief 處理後臺 kit 傳送回來的訊息
    ///        Handle messages from the back-end kit.
    ///        If you want to handle the message from the kit, you should override this function.
    /// @param clientSession
    /// @param tokens
    /// @return true: 有處理, false: 沒有處理
    virtual bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                          const std::shared_ptr<Message>& payload);

    /// @brief 處理控制臺 Websocket 的訊息
    /// @param tokens
    /// @return
    virtual std::string handleAdminMessage(const StringVector& tokens);

protected:

    /// @brief 取得模組 ID
    /// @return 模組 ID
    const std::string& getId() const { return maId; }

    /// @brief 傳送文字訊息給 Client
    /// @param clientSession - ClientSession 物件
    /// @param message - 訊息內容
    /// @return true: 成功， false: 失敗
    bool sendTextFrameToClient(const std::shared_ptr<ClientSession>& clientSession,
                               const std::string& message);

    /// @brief 回傳 "[module name]" 字串，方便給模組 LOG 用
    /// @return "[XXXXXXX]"
    std::string logTitle() const { return "[" + maDetail.name + "] "; }

    /// @brief 解析模組實際請求位址
    /// @param request
    /// @return 實際的請求位址
    std::string parseRealURI(const Poco::Net::HTTPRequest& request) const;

    /// @brief 傳送檔案
    /// @param requestFile
    /// @param request
    /// @param socket
    void sendFile(const std::string& requestFile,
                  const Poco::Net::HTTPRequest& request,
                  const std::shared_ptr<StreamSocket>& socket,
                  const bool callByAdmin = false);

private:
    std::string maId; // 模組 ID (每次載入都會不同)

    Detail maDetail; // 模組詳細資訊
    std::string maConfigFile; // 模組的配置檔完整路徑
    std::string maRootPath; // 模組文件絕對路徑
    std::string maBrowserURI; // 模組的前端服務位址，若模組有前端服務(browser/ 下有 module.js)，這裏會是 /browser/module/{maId}/
    std::string maAdminURI; // 模組的後臺管理位址，若模組有後臺管理(admin/ 下有 admin.js)，這裏會是 /browser/dist/admin/module/{maId}/
};

typedef std::shared_ptr<Base> Ptr;

} // namespace Module
} // namespace OxOOL

// Define a pointer type to the entry point.
typedef OxOOL::Module::Ptr (*OxOOLModuleEntry)();

#define OXOOL_MODULE_ENTRY_SYMBOL "oxoolModuleInfo"
#define OXOOL_MODULE_ENTRY_FUNC oxoolModuleInfo()

#define OXOOL_MODULE_EXPORT(ClassName) \
    extern "C" OxOOL::Module::Ptr OXOOL_MODULE_ENTRY_FUNC { return std::make_shared<ClassName>(); }

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
