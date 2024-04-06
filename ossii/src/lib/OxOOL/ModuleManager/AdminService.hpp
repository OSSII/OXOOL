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

#include <Poco/StringTokenizer.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Log.hpp>
#include <net/Socket.hpp>

class AdminService final : public OxOOL::Module::Base
{
public:
    AdminService() {};
    ~AdminService() {};

    std::string getVersion() override
    {
        return getDetail().version;
    }

    void initialize() override
    {
        LOG_DBG("Admin service initialized.");
    }

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override
    {
        static OxOOL::ModuleManager &moduleManager = OxOOL::ModuleManager::instance();
        std::string realURI = parseRealURI(request); // 解析實際（已經去掉本 serviceURI 路徑）的 URI

        // 檢查是否以管理員身份登入，如果沒有，則重導至登入頁面 login.html
        /* if (!isAdminSession(request))
        {
            OxOOL::HttpHelper::redirect(request, socket, "/login.html");
            return;
        } */

        // 判斷是否存取模組管理頁面，兩個 token 以上且第一個 token 爲 "module"
        const Poco::StringTokenizer tokens(realURI, "/",
            Poco::StringTokenizer::TOK_IGNORE_EMPTY|Poco::StringTokenizer::TOK_TRIM);

        std::string rootPath;
        if (tokens.count() > 1 && tokens[0] == "module")
        {
            // 第二個是模組 ID
            const std::string moduleID = tokens[1];
            // 找出是哪個模組
            const OxOOL::Module::Ptr module = moduleManager.getModuleById(moduleID);
            // 模組不存在
            if (module == nullptr)
            {
                OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND,
                    socket, "Module not found.");
                return;
            }
            // 取得模組管理頁面的實際路徑
            rootPath = module->getDocumentRoot() + "/admin";
            // realURI 去掉 "/module/模組ID"
            realURI.erase(0, tokens[0].length() + tokens[1].length() + 2);

        } else {
            // 預設顯示模組管理頁面
            rootPath = getDocumentRoot();
        }

        Poco::Path requestFile(rootPath + realURI); // 要求的檔案的絕對路徑
        // 檔案不存在，或是目錄
        if (!Poco::File(requestFile).exists() || Poco::File(requestFile).isDirectory())
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND,
                socket, "File not found.");
            return;
        }

        // 取得副檔名
        const std::string ext = requestFile.getExtension();
        // 如果副檔名是 .html 或 .html，則需要 preprocessAdminFile() 處理
        if (ext == "html" || ext == "htm")
        {
            moduleManager.preprocessAdminFile(requestFile.toString(), request, socket);
        }
        else // 否則直接傳送檔案
        {
            sendFile(requestFile.toString(), request, socket);
        }
    }

private:

};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
