/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include "config.h"

#include <Poco/Net/HTTPRequest.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/Module/Map.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/common/Message.hpp>
#include <OxOOL/net/Socket.hpp>
#include <OxOOL/wsd/ClientSession.hpp>

#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

class %MODULE_NAME% : public OxOOL::Module::Base
{
public:
    /// @brief Module constructor.
    %MODULE_NAME%()
    {
        // Put your code here.
    }

    /// Module deconstructor.
    virtual ~%MODULE_NAME%()
    {
        // Put your code here.
    }

    /// @brief 傳回模組版號
    /// Returns the module version number.
    std::string getVersion() override
    {
        return PACKAGE_VERSION;
    }

    /// @brief 模組載入完畢後，初始化工作，只會在載入完畢後呼叫一次
    /// After the module is loaded, the initialization work will only be called once after
    /// the module is loaded.
    void initialize() override
    {
        // Here is the code for initialization, if any.
    }

#if ENABLE_API_SERVICE
    /// @brief 處理前端 Client 的請求
    /// Handle requests from the front-end Client.
    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override
    {
        bool handled = false; // Set to true if the request is handled.

        // Write your own code to handle the request.
        /* OxOOL::HttpHelper::sendResponseAndShutdown(socket, "<H1>Hello world.</H1>",
            Poco::Net::HTTPResponse::HTTP_OK, "text/html; charset=utf-8"); */


        // If you are serving static content, When necessary,
        // you can leave it to the base class to do it for you.
        if (!handled)
            OxOOL::Module::Base::handleRequest(request, socket);

    }
#endif // ENABLE_API_SERVICE

#if ENABLE_BROWSER
    /// @brief 處理前端 Client 模組傳送的 Web Socket 訊息
    ///        Handle messages from the front-end Client module.
    ///        If you want to handle the message from the client, you should override this function.
    /// @param sion
    /// @param tokens
    void handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                             const StringVector& tokens) override
    {
        if (tokens.equals(0, "ping"))
        {
            sendTextFrameToClient(clientSession, "pong");
        }
        else
        {
            sendTextFrameToClient(clientSession, "unknowncommand: " + tokens[0]);
        }
    }

    /// @brief 處理後臺 kit 傳送回來的訊息
    ///        Handle messages from the back-end kit.
    ///        If you want to handle the message from the kit, you should override this function.
    /// @param clientSession
    /// @param tokens
    /// @return true: 有處理, false: 沒有處理
    bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                  const std::shared_ptr<Message>& payload) override
    {
        return false; // Not handled.
    }
#endif // ENABLE_BROWSER

#if ENABLE_ADMIN
    /// @brief 處理控制臺 Websocket 的訊息
    /// Handle console Websocket messages.
    void handleAdminMessage(const OxOOL::SendTextMessageFn& sendTextMessage,
                            const StringVector& tokens) override
    {
        if (tokens.equals(0, "ping"))
        {
           sendAdminTextFrame(sendTextMessage, "pong");
        }

        sendAdminTextFrame(sendTextMessage, "unknowncommand: " + tokens[0]);
    }
#endif // ENABLE_ADMIN
};

OXOOL_MODULE_EXPORT(%MODULE_NAME%);

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
