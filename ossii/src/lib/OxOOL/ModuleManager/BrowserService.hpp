/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

namespace OxOOL::module
{
    class Base;
} // namespace OxOOL::module

namespace Poco::Net
{
    class HTTPRequest;
} // namespace Poco::Net

class StreamSocket;

class BrowserService final : public OxOOL::Module::Base
{
public:
    BrowserService() {}

    ~BrowserService() {}

    void initialize() override;

    std::string getVersion() override;

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override;

    /// @brief 註冊 browser URI
    /// @param uri
    void registerBrowserURI(const std::string& uri);

private:
    // 已註冊的 browser URI
    std::vector<std::string> maRegisteredURI;

    /// @brief 檢查是否是有效的 browser URI
    bool isValidBrowserURI(const Poco::Net::HTTPRequest& request);

    std::mutex maModuleLocalizationCacheMutex; // 模組本地化語言 URI 快取的鎖
    std::map<std::string, std::string> maModuleLocalizationCache; // 模組本地化語言 URI 快取

    /// @brief 傳送模組本地化語言 URI 列表
    /// @param module - 模組
    /// @param request - HTTP 請求
    /// @param socket - 連線 socket
    void sendLocalizationList(const OxOOL::Module::Ptr module,
                              const std::shared_ptr<StreamSocket>& socket);

};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
