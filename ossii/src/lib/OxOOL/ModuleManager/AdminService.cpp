/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <OxOOL/OxOOL.h>
#include <OxOOL/Util.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/Module/Map.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/MemoryStream.h>
#include <Poco/StringTokenizer.h>
#include <Poco/Net/HTMLForm.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>
#include <Poco/Net/HTTPCookie.h>

#include <common/Log.hpp>
#include <net/Socket.hpp>
#include <wsd/Auth.hpp>

#include "AdminService.hpp"

std::string AdminService::getVersion()
{
    return getDetail().version;
}

void AdminService::initialize()
{
    // 設定 uri Map 的 root URI
    maApiMap.setServiceURI(getDetail().serviceURI);

    // 處理登入，只接受 POST
    maApiMap.set("/login", maApiMap.POST, CALLBACK(&AdminService::login));
    // 處理登出，只接受 GET
    maApiMap.set("/logout", maApiMap.GET, CALLBACK(&AdminService::logout));
    // 主頁面，只接受 GET
    maApiMap.set("/", maApiMap.GET, CALLBACK(&AdminService::home));

    LOG_DBG("Admin service initialized.");
}

void AdminService::handleRequest(const Poco::Net::HTTPRequest& request,
                                 const std::shared_ptr<StreamSocket>& socket)
{
    static OxOOL::ModuleManager &moduleManager = OxOOL::ModuleManager::instance();

    // 被登記的程序處理了，就結束
    if (maApiMap.handled(request, socket))
        return;

    std::string realURI = parseRealURI(request); // 解析實際（已經去掉本 serviceURI 路徑）的 URI

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

    }
    else
    {
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

    // 取得檔名
    const std::string endPoint = requestFile.getFileName();
    // 如果副檔名是 .html 或 .html，需檢查是否已登入
    if (endPoint == "admin.html")
    {
        // 未登入則轉到首頁
        if (!OxOOL::Util::isAdminLoggedIn(request))
        {
            OxOOL::HttpHelper::redirect(request, socket,
                OxOOL::ENV::ServiceRoot + getDetail().serviceURI);
            return;
        }

        moduleManager.preprocessAdminFile(endPoint, request, socket);
    }
    else // 否則直接傳送檔案
    {
        sendFile(requestFile.toString(), request, socket);
    }
}


void AdminService::login(const Poco::Net::HTTPRequest& request,
                         const std::shared_ptr<StreamSocket>& socket)
{
    const std::string fullPath = OxOOL::ENV::ServiceRoot + getDetail().serviceURI;
    // 處理登入
    Poco::MemoryInputStream message(&socket->getInBuffer()[0],
                                    socket->getInBuffer().size());

    const Poco::Net::HTMLForm form(request, message);
    const std::string account = form.get("account", "");
    const std::string password  = form.get("password", "");

    OxOOL::HttpHelper::KeyValueMap extraHeader;

    // 檢查帳號密碼是否正確
    if (OxOOL::Util::isConfigAuthOk(account, password))
    {
        // authentication passed, generate and set the cookie
        JWTAuth authAgent("admin", "admin", "admin");
        const std::string jwtToken = authAgent.getAccessToken();

        Poco::Net::HTTPCookie cookie("jwt", jwtToken);
        cookie.setPath(fullPath);
        cookie.setSecure(OxOOL::ENV::SSLEnabled);

        extraHeader["Set-Cookie"] = cookie.toString();
    }

    // 轉到首頁
    OxOOL::HttpHelper::redirect(request, socket, fullPath, extraHeader);
}

void AdminService::logout(const Poco::Net::HTTPRequest& request,
                          const std::shared_ptr<StreamSocket>& socket)
{
    const std::string fullPath = OxOOL::ENV::ServiceRoot + getDetail().serviceURI;
    // 清除 jwt cookie
    Poco::Net::HTTPCookie cookie("jwt", "");
    cookie.setPath(fullPath);
    cookie.setMaxAge(0);
    OxOOL::HttpHelper::KeyValueMap extraHeader;
    extraHeader["Set-Cookie"] = cookie.toString();

    // 轉到首頁
    OxOOL::HttpHelper::redirect(request, socket, fullPath, extraHeader);
}

void AdminService::home(const Poco::Net::HTTPRequest& request,
            const std::shared_ptr<StreamSocket>& socket)
{
    // 未登入則顯示登入頁面，登入則顯示管理頁面
    const std::string homePage = getDocumentRoot()
                                + (!OxOOL::Util::isAdminLoggedIn(request) ? "login.html" : "admin.html");
    OxOOL::ModuleManager::instance().preprocessAdminFile(homePage, request, socket);
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
