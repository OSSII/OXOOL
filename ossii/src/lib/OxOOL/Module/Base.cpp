/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <string>
#include <memory>

#include <Poco/Net/NetException.h>
#include <Poco/URI.h>
#include <Poco/Path.h>
#include <Poco/File.h>

#include <OxOOL/Module/Base.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/ModuleManager.h>

#include <common/Message.hpp>
#include <common/Util.hpp>
#include <wsd/ClientSession.hpp>
#include <wsd/FileServer.hpp>

namespace OxOOL
{
namespace Module
{

OxOOL::XMLConfig::Ptr Base::getConfig()
{
    if (Poco::File(maConfigFile).exists())
    {
        return std::make_shared<OxOOL::XMLConfig>(maConfigFile);
    }
    return nullptr;
}

bool Base::needAdminAuthenticate(const Poco::Net::HTTPRequest& request,
                                 const std::shared_ptr<StreamSocket>& socket,
                                 const bool callByAdmin)
{
    bool needAuthenticate = false;
    // 該 Service URI 需要有管理者權限，或是被 admin Service URI 需要
    if (maDetail.adminPrivilege || callByAdmin)
    {
        const std::shared_ptr<Poco::Net::HTTPResponse> response
            = std::make_shared<Poco::Net::HTTPResponse>();

        try
        {
            if (!FileServerRequestHandler::isAdminLoggedIn(request, *response))
                throw Poco::Net::NotAuthenticatedException("Invalid admin login");
        }
        catch (const Poco::Net::NotAuthenticatedException& exc)
        {
            needAuthenticate = true;
            const OxOOL::HttpHelper::KeyValueMap extraHeader
                = { { "WWW-authenticate", "Basic realm=\"OxOffice Online\"" } };
            OxOOL::HttpHelper::sendErrorAndShutdown(
                Poco::Net::HTTPResponse::HTTP_UNAUTHORIZED, socket, "", "",
                extraHeader);
        }
    }
    return needAuthenticate;
}

std::string Base::getVersion()
{
    return PACKAGE_VERSION;
}

void Base::handleRequest(const Poco::Net::HTTPRequest& request,
                         const std::shared_ptr<StreamSocket>& socket)
{
    const std::string realURI = parseRealURI(request);

    Poco::Path requestFile(maRootPath + "/html" + realURI);
    if (requestFile.isDirectory())
        requestFile.append("index.html");

    sendFile(requestFile.toString(), request, socket);
}

void Base::handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                               const StringVector& tokens)
{
    // 跑到這裡，表示模組沒有實作 handleClientMessage()
    // 需通知 client 端，通知模組開發者
    const std::string error = "error: cmd=" + tokens[0] + " kind=Module_'"
                      + maDetail.name + "'_not_implemented_handleClientMessage()";
    clientSession->sendTextFrameAndLogError(error);
}


bool Base::handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                    const std::shared_ptr<Message>& payload)
{
    (void)clientSession; // avoid -Werror=unused-parameter
    (void)payload; // avoid -Werror=unused-parameter

    // Base class don't handle any message from kit
    // do nothing

    return false; // We don't handle this message
}

std::string Base::handleAdminMessage(const StringVector& tokens)
{
    (void)tokens; // avoid -Werror=unused-parameter
    return MODULE_METHOD_IS_ABSTRACT;
}

bool Base::sendTextFrameToClient(const std::shared_ptr<ClientSession>& clientSession,
                                 const std::string& message)
{
    // 在訊息前加上<模組 ID>，方便 client 端識別是給哪個模組的訊息
    return clientSession->sendTextFrame("<" + maId + ">" + message);
}

// PROTECTED METHODS
std::string Base::parseRealURI(const Poco::Net::HTTPRequest& request) const
{
    // 完整請求位址
    const std::string requestURI = Poco::URI(request.getURI()).getPath();

    std::string realURI = maDetail.serviceURI;

    // 模組 service uri 是否為 endpoint?(最後字元不是 '/')
    // 如果是 endpoint，表示要取得最右邊 '/' 之後的字串
    if (*maDetail.serviceURI.rbegin() != '/')
    {
        if (const std::size_t lastPathSlash = requestURI.rfind('/'); lastPathSlash != std::string::npos)
            realURI = requestURI.substr(lastPathSlash);
    }
    else
    {
        const std::size_t stripLength = maDetail.serviceURI.length();
        // 去掉前導的 serviceURI
        realURI = stripLength >= requestURI.length() ? "/" : requestURI.substr(stripLength - 1);
    }
    return realURI;
}

void Base::sendFile(const std::string& requestFile,
                    const Poco::Net::HTTPRequest& request,
                    const std::shared_ptr<StreamSocket>& socket,
                    const bool callByAdmin)
{
    if (Poco::File(requestFile).exists())
    {
        std::string mimeType = OxOOL::HttpHelper::getMimeType(requestFile);
        if (mimeType.empty())
            mimeType = "text/plane";

        const bool isHead = request.getMethod() == Poco::Net::HTTPRequest::HTTP_HEAD;
        // 是否令 client chche 該檔案，如果是 admin 或 URI 帶有 ? 查詢字元的位址，就不 cache
        const bool noCache = callByAdmin || request.getURI().find('?') != std::string::npos;

        OxOOL::HttpHelper::sendFileAndShutdown(socket, requestFile, mimeType, nullptr,
                                               noCache, false, isHead);
    }
    else
    {
        OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND, socket);
    }
}

} // namespace Module
} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
