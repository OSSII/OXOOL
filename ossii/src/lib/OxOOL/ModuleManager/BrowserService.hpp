/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <OxOOL/OxOOL.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Log.hpp>
#include <net/Socket.hpp>

class BrowserService final : public OxOOL::Module::Base
{
public:
    BrowserService()
    {
    }

    ~BrowserService() {}

    void initialize() override
    {
        LOG_DBG("Module browser service initialized.");
    }

    std::string getVersion() override
    {
        return getDetail().version;
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

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
