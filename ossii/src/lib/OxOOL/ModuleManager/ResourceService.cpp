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

#include <functional>
#include <mutex>

#include <OxOOL/OxOOL.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/ResourceManager.h>
#include <OxOOL/Util.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/URI.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Log.hpp>
#include <net/Socket.hpp>

#include "ResourceService.hpp"

void ResourceService::initialize()
{
    LOG_DBG("Module Resource Service initialized.");
}

std::string ResourceService::getVersion()
{
    return getDetail().version;
}

void ResourceService::handleRequest(const Poco::Net::HTTPRequest& request,
                                    const std::shared_ptr<StreamSocket>& socket)
{
    static const std::string etagString = "\"" + OxOOL::ENV::VersionHash + "\"";
    std::string realPath = parseRealURI(request);
    // remove the leading '/'
    if (realPath[0] == '/')
        realPath = realPath.substr(1);

    // if the resource is not in the cache, load it
    if (maResourceCache.find(realPath) == maResourceCache.end())
    {
        const Poco::URI uri(realPath);
        std::string resource;
        std::string mimeType;
        // if the resource is not found, return 404
        if (!OxOOL::ResourceManager::instance().getResource(uri, resource, mimeType))
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND, socket, "Rescoure not found.");
            return;
        }

        // cache the resource
        std::lock_guard<std::mutex> lock(maMutex);
        ResourceInfo resourceInfo;
        resourceInfo.gzipedResource = OxOOL::Util::gzip(resource);
        resourceInfo.mimeType = mimeType;

        maResourceCache[realPath] = resourceInfo;
    }

    // get the resource from the cache
    const ResourceInfo& resourceInfo = maResourceCache[realPath];

    bool noCache = false;
#if ENABLE_DEBUG
    noCache = true;
#endif

    Poco::Net::HTTPResponse response(Poco::Net::HTTPResponse::HTTP_1_1, Poco::Net::HTTPResponse::HTTP_OK);
    response.set("Server", OxOOL::ENV::HttpServerString);
    response.set("Date", OxOOL::HttpHelper::getHttpTimeNow());
    response.setContentType(resourceInfo.mimeType);

    auto it = request.find("If-None-Match");
    if (it != request.end())
    {
        // if ETags match avoid re-sending the file.
        if (!noCache && it->second == etagString)
        {
            OxOOL::HttpHelper::sendResponseAndShutdown(socket, "", Poco::Net::HTTPResponse::HTTP_NOT_MODIFIED);
            return;
        }
    }

    // set cache control
    if (!noCache)
    {
        // 60 * 60 * 24 * 128 (days) = 11059200
        response.set("Cache-Control", "max-age=11059200");
        response.set("ETag", etagString);
    }
    response.add("X-Content-Type-Options", "nosniff");

    // check client support gzip
    const bool supportGzip = request.hasToken("Accept-Encoding", "gzip");
    std::string body;
    if (supportGzip)
    {
        response.set("Content-Encoding", "gzip");
        body = resourceInfo.gzipedResource;
    }
    else
    {
        LOG_INF("Client does not support gzip. send uncompressed resource.[" << realPath << "]");
        body = OxOOL::Util::gunzip(resourceInfo.gzipedResource);
    }
    response.setContentLength(body.size());
    response.set("Connection", "close");

    socket->send(response);
    socket->send(body);
    socket->shutdown();
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
