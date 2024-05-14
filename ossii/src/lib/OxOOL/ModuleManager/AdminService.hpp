/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <OxOOL/OxOOL.h>
#include <OxOOL/Module/Map.h>

namespace Poco::Net
{
    class HTTPRequest;
} // namespace Poco::Net

class StreamSocket;

class AdminService final : public OxOOL::Module::Base
{
public:
    AdminService() {};
    ~AdminService() {};

    std::string getVersion() override;

    void initialize() override;

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override;

    void handleAdminMessage(const OxOOL::SendTextMessageFn& sendTextMessage,
                            const StringVector& tokens) override;

private:
    /// @brief api URI
    OxOOL::Module::Map maApiMap;

    /// @brief 登入處理
    /// @param request
    /// @param socket
    void login(const Poco::Net::HTTPRequest& request,
               const std::shared_ptr<StreamSocket>& socket);

    /// @brief 登出處理
    /// @param request
    /// @param socket
    void logout(const Poco::Net::HTTPRequest& request,
                const std::shared_ptr<StreamSocket>& socket);

    /// @brief 顯示首頁
    /// @param request
    /// @param socket
    void home(const Poco::Net::HTTPRequest& request,
              const std::shared_ptr<StreamSocket>& socket);
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
