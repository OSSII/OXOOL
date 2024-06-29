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

#include <string_view>
#include <algorithm>
#include <mutex>

#include <OxOOL/OxOOL.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/DirectoryIterator.h>
#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

#include <common/Log.hpp>
#include <net/Socket.hpp>

#include "BrowserService.hpp"

void BrowserService::initialize()
{
    LOG_DBG("Module browser service initialized.");
}

std::string BrowserService::getVersion()
{
    return getDetail().version;
}

void BrowserService::handleRequest(const Poco::Net::HTTPRequest& request,
                                   const std::shared_ptr<StreamSocket>& socket)
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

    // 如果有兩個 token，且第二個是 "localizations"
    // 表示要取得模組的本地化檔列表，這不是真的檔案，而是一個模組 API
    if (tokens.size() == 2 && tokens[1] == "localizations")
    {
        sendLocalizationList(module, socket);
        return;
    }


    // 取得模組的 browser 目錄實際路徑
    const std::string moduleBrowserPath(module->getDocumentRoot() + "/browser");
    // 重定位到真正的檔案
    const std::string requestFile = moduleBrowserPath + realPath.substr(moduleID.size() + 1);
    // 傳送檔案
    sendFile(requestFile, request, socket);
}

void BrowserService::registerBrowserURI(const std::string& uri)
{
    // 是否已經註冊過
    if (std::find(maRegisteredURI.begin(), maRegisteredURI.end(), uri) == maRegisteredURI.end())
    {
        maRegisteredURI.emplace_back(uri);
    }
}

//---------------- private methods ----------------

bool BrowserService::isValidBrowserURI(const Poco::Net::HTTPRequest& request)
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

void BrowserService::sendLocalizationList(const OxOOL::Module::Ptr& module,
                                          const std::shared_ptr<StreamSocket>& socket)
{
    // 查是否有快取
    std::lock_guard<std::mutex> lock(maModuleLocalizationCacheMutex);
    const auto cacheIt = maModuleLocalizationCache.find(module->getId());
    if (cacheIt != maModuleLocalizationCache.end())
    {
        // 傳送 JSON 快取
        OxOOL::HttpHelper::sendResponseAndShutdown(socket, cacheIt->second,
            Poco::Net::HTTPResponse::HTTP_OK, "application/json; charset=utf-8");
        return;
    }

    // 取得模組的 l10n 目錄實際路徑
    const std::string moduleL10NPath(module->getDocumentRoot() + "/browser/l10n");
    const Poco::File dir(moduleL10NPath);
    // 檢查目錄是否存在
    if (!dir.exists() || !dir.isDirectory())
    {
        OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_NOT_FOUND,
            socket, "Localization directory not found.");
        return;
    }

    std::vector<std::string> jsonFiles;
    dir.list(jsonFiles);
    std::map <std::string, std::string> l10nMap;
    // 掃描目錄下所有的檔案
    for (const auto& jsonFile : jsonFiles)
    {
        // 取得檔名
        std::string_view fileName(jsonFile);
        // 檔名不是 .json 結尾的，不是本地化檔
        if (fileName.size() < 5 || fileName.substr(fileName.size() - 5) != ".json")
            continue;

        // 取得檔案名稱，去掉 .json
        std::string_view locale(fileName);
        locale.remove_suffix(5);

        // 加入到 map
        l10nMap.emplace(locale, fileName);
        // 如果 locale 是 zh-TW，也加入 zh-Hant 和 zh-tw
        if (locale == "zh-TW")
        {
            l10nMap.emplace("zh-Hant", fileName);
            l10nMap.emplace("zh-tw", fileName);
            l10nMap.emplace("zh-hk", fileName);
            l10nMap.emplace("zh-HK", fileName);
        }
        // 如果 locale 是 zh-CN，也加入 zh-Hans 和 zh-cn
        else if (locale == "zh-CN")
        {
            l10nMap.emplace("zh-Hans", fileName);
            l10nMap.emplace("zh-cn", fileName);
        }
    }

    // 轉成 JSON
    std::string json = "{";
    // 預設語言 en = false
    json += "\"en\": false,";
    for (const auto& jsonIt : l10nMap)
    {
        std::string fileURI = module->getBrowserURI() + "l10n/" + jsonIt.second;
        json += "\"" + jsonIt.first + "\": \"" + fileURI + "\",";
    }
    json.pop_back(); // 移除最後一個逗號
    json += "}";

    // 加入快取
    maModuleLocalizationCache.emplace(module->getId(), json);

    // 傳送 JSON 快取
    OxOOL::HttpHelper::sendResponseAndShutdown(socket, json,
        Poco::Net::HTTPResponse::HTTP_OK, "application/json; charset=utf-8");
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
