/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * Copyright the OxOffice Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <iomanip>
#include <openssl/rand.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ENV.h>
#include <OxOOL/Util.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/Module/Map.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/XMLConfig.h>

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

#define pwdSaltLength 128
#define pwdIterations 10000
#define pwdHashLength 128

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

    // Get the file name
    const std::string endPoint = requestFile.getFileName();
    // if the endpoint is admin.html or admin.htm
    if (endPoint == "admin.html" || endPoint == "admin.htm")
    {
        // unauthenticated users are redirected to the login page
        if (!OxOOL::Util::isAdminLoggedIn(request))
        {
            OxOOL::HttpHelper::redirect(request, socket,
                OxOOL::HttpHelper::getServiceURI(getDetail().serviceURI));
            return;
        }
    }

    // Get the file extension
    const std::string extension = requestFile.getExtension();
    // css or html or htm
    if (extension == "css" || extension == "html" || extension == "htm")
        moduleManager.preprocessAdminFile(requestFile.toString(), request, socket);
    else // other file types directly send
        sendFile(requestFile.toString(), request, socket);
}

void AdminService::handleAdminMessage(const OxOOL::SendTextMessageFn& sendTextMessage,
                                      const StringVector& tokens)
{
    // TODO: 考慮加寫一個 Command Map 定義各個指令的處理程序
    // 例如：
    // maCommandMap.set("getModuleList", CALLBACK(&AdminService::getModuleList));
    // maCommandMap.set("getAdminModuleList", CALLBACK(&AdminService::getAdminModuleList));
    //
    // 或者使用 struce 的方式定義指令和處理程序
    // const MessageCommandMap maCommandMap = {
    //     {"getModuleList", &AdminService::getModuleList},
    //     {"getAdminModuleList", &AdminService::getAdminModuleList}
    // };
    // struct 結構如下：
    // struct MessageCommandMap {
    //     std::string command;
    //     std::function<std::string(const StringVector&)> callback;
    // };

    // 取得模組列表或有後臺管理介面的模組列表
    // tokens[0] 爲 "getModuleList" 或 "getAdminModuleList"
    // tokens[1] 爲語言，可有可無
    // 例如：
    // getModuleList [語言]
    // getAdminModuleList [語言]
    if (tokens.equals(0, "getModuleList") || tokens.equals(0, "getAdminModuleList"))
    {
        const std::string langTag = tokens.size() > 1 ? tokens[1] : ""; // 有指定語言
        if (tokens.equals(0, "getModuleList"))
            sendTextMessage("modules: "
                           + OxOOL::ModuleManager::instance().getAllModuleDetailsJsonString(langTag), false);
        else
            sendTextMessage("adminmodules: "
                           + OxOOL::ModuleManager::instance().getAdminModuleDetailsJsonString(langTag), false);
    }
    // 檢查管理帳號密碼是否與 oxoolwsd.xml 中的一致
    // 格式: isConfigAuthOk <帳號> <密碼>
    else if (tokens.equals(0, "isConfigAuthOk") && tokens.size() == 3)
    {
        std::string adminUser = OxOOL::Util::decodeURIComponent(tokens[1]);
        std::string adminPwd  = OxOOL::Util::decodeURIComponent(tokens[2]);

        if (OxOOL::isConfigAuthOk(tokens[1], tokens[2]))
            sendTextMessage("ConfigAuthOk", false);
        else
            sendTextMessage("ConfigAuthWrong", false);
    }
    // 變更管理帳號及密碼
    else if (tokens.equals(0, "setAdminPassword") && tokens.size() == 3)
    {
        OxOOL::XMLConfig config;
        config.load(OxOOL::ENV::ConfigFile);
        std::string adminUser = OxOOL::Util::decodeURIComponent(tokens[1]);
        std::string adminPwd  = OxOOL::Util::decodeURIComponent(tokens[2]);
        config.setString("admin_console.username", adminUser); // 帳號用明碼儲存
#if HAVE_PKCS5_PBKDF2_HMAC
        unsigned char pwdhash[pwdHashLength];
        unsigned char salt[pwdSaltLength];
        RAND_bytes(salt, pwdSaltLength);
        // Do the magic !
        PKCS5_PBKDF2_HMAC(adminPwd.c_str(), -1,
                          salt, pwdSaltLength,
                          pwdIterations,
                          EVP_sha512(),
                          pwdHashLength, pwdhash);

        std::stringstream stream;
        // Make salt randomness readable
        for (unsigned j = 0; j < pwdSaltLength; ++j)
            stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(salt[j]);
        const std::string saltHash = stream.str();

        // Clear our used hex stream to make space for password hash
        stream.str("");
        stream.clear();
        // Make the hashed password readable
        for (unsigned j = 0; j < pwdHashLength; ++j)
            stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(pwdhash[j]);
        const std::string passwordHash = stream.str();

        std::stringstream pwdConfigValue("pbkdf2.sha512.", std::ios_base::in | std::ios_base::out | std::ios_base::ate);
        pwdConfigValue << std::to_string(pwdIterations) << ".";
        pwdConfigValue << saltHash << "." << passwordHash;
        config.remove("admin_console.password");
        config.setString("admin_console.secure_password[@desc]",
                              "Salt and password hash combination generated using PBKDF2 with SHA512 digest.");
        config.setString("admin_console.secure_password", pwdConfigValue.str());
#else
        config.remove("admin_console.secure_password");
        config.setString("admin_console.password[@desc]", "The password is stored in plain code.");
        config.setString("admin_console.password", adminPwd);
#endif
        config.save(OxOOL::ENV::ConfigFile);
        sendTextMessage("setAdminPasswordOk", false);
    }
    else
    {
        sendTextMessage("Unknown command:" + tokens[0], false);
    }
}


void AdminService::login(const Poco::Net::HTTPRequest& request,
                         const std::shared_ptr<StreamSocket>& socket)
{
    const std::string fullPath = OxOOL::HttpHelper::getServiceURI(getDetail().serviceURI);
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
    const std::string fullPath = OxOOL::HttpHelper::getServiceURI(getDetail().serviceURI);
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
