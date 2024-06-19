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

#include <OxOOL/OxOOL.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/ResourceProvider.h>

#include <Poco/Util/Application.h>
#include <Poco/Path.h>
#include <Poco/File.h>
#include <Poco/URI.h>
#include <Poco/StringTokenizer.h>
#include <Poco/JSON/Object.h>

#include <common/Log.hpp>

#include "IconThemeProvider.hpp"


namespace OxOOL
{

IconTheme::IconTheme()
{
}

IconTheme::~IconTheme()
{
}

void IconTheme::initialize()
{
    // Get the path of the icon theme
    maLoIconThemePath = Poco::Path(ENV::LoTemplate, ICON_THEMES_RELATIVE_PATH);
    maLoIconThemePath.makeAbsolute();

    Poco::File iconThemePath(maLoIconThemePath);
    if (!iconThemePath.exists() || !iconThemePath.isDirectory())
    {
        LOG_ERR("Icon theme path does not exist or is not a directory: " << maLoIconThemePath.toString());
        return;
    }

    // 掃描目錄下所有的zip檔案
    std::vector<std::string> aZipFiles;
    iconThemePath.list(aZipFiles);
    // 遍歷所有zip檔案
    for (const auto& zipFile : aZipFiles)
    {
        // 標準的 zip 檔案名稱為 'images_" + name + ".zip'
        // 解析zip檔案名稱
        if (zipFile.find("images_") == 0 && zipFile.find(".zip") != std::string::npos)
        {
            // themeName: 去掉前面的'images_'和後面的'.zip'
            const std::string themeName = zipFile.substr(7, zipFile.size() - 11);
            // 以 '_' 分割名稱，存到 tokens 中
            const Poco::StringTokenizer tokens(themeName, "_", Poco::StringTokenizer::TOK_IGNORE_EMPTY | Poco::StringTokenizer::TOK_TRIM);
            std::string readableThemeName;
            bool isSvg = false;
            bool isDark = false;
            for (const auto& token : tokens)
            {
                if (token == "dark")
                    isDark = true;
                else if (token == "svg")
                    isSvg = true;
                else
                    readableThemeName += token + " ";
            }
            // 去掉最後一個空格
            if (!readableThemeName.empty())
                readableThemeName.pop_back();

            std::string typeName;
            if (isSvg || isDark)
            {
                typeName.append("(")
                        .append(isSvg ? "SVG" : "")
                        .append(isSvg && isDark ? " + " : "")
                        .append(isDark ? "dark" : "")
                        .append(")");
                readableThemeName += " " + typeName;
            }

            // Capitalize first letter.
            if (!readableThemeName.empty())
                readableThemeName[0] = std::toupper(readableThemeName[0]);


            // Local zip full path.
            Poco::Path zipFilePath(maLoIconThemePath, zipFile);
            // Save to maIconThemeMap
            maIconThemeMap[themeName] = std::make_pair(readableThemeName, zipFilePath.toString());
        }
    }

    // get the default icon themes from the configuration
    const auto& config = Poco::Util::Application::instance().config();
    std::string lightIconTheme = config.getString("user_interface.icon_theme.light", "");
    std::string darkIconTheme  = config.getString("user_interface.icon_theme.dark",  "");

    // Fallback icon themes
    lightIconTheme = lightIconTheme.empty() ? FALLBACK_LIGHT_ICON_THEME : lightIconTheme;
    darkIconTheme  = darkIconTheme.empty()  ? FALLBACK_DARK_ICON_THEME  : darkIconTheme;

    auto setIconThem = [&](ThemeType type, const std::string& themeName)
    {
        auto it = maIconThemeMap.find(themeName);
        if (it != maIconThemeMap.end())
        {
            std::shared_ptr<Info> info = std::make_shared<Info>();
            info->name = it->first;
            info->readableName = it->second.first;
            info->package = it->second.second;
            info->type = it->first.find("svg") != std::string::npos
                                                ? Info::IconType::SVG : Info::IconType::PNG;
            // read links.txt
            std::string linksTxt;
            if (info->package.getContent("links.txt", linksTxt))
            {
                // 以換行符分割 links.txt 內容
                Poco::StringTokenizer tokens(linksTxt, "\n",
                    Poco::StringTokenizer::TOK_IGNORE_EMPTY | Poco::StringTokenizer::TOK_TRIM);
                for (const auto& token : tokens)
                {
                    // 以空格分割每一行的內容
                    const Poco::StringTokenizer linkTokens(token, " ",
                        Poco::StringTokenizer::TOK_IGNORE_EMPTY | Poco::StringTokenizer::TOK_TRIM);
                    // 只紀錄第一個字串開頭是 'cmd/' 的內容
                    if (linkTokens.count() == 2 && linkTokens[0].find("cmd/") == 0)
                        info->linksMap[linkTokens[0]] = linkTokens[1];
                }
            }
            maInfoMap[type] = info;
        }
        else
            LOG_ERR("Failed to load icon theme: " << themeName);
    };

    setIconThem(ThemeType::LIGHT, lightIconTheme);
    setIconThem(ThemeType::DARK,  darkIconTheme);
}

bool IconTheme::getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType)
{
    std::string path = uri.getPath();

    bool isDark = false;
    // path 開頭只能是 "light/" 或 "dark/"
    if (path.find("light/") == 0)
    {
        path = path.substr(6);
    }
    else if (path.find("dark/") == 0)
    {
        path = path.substr(5);
        isDark = true;
    }
    else
    {
        LOG_ERR("Invalid path format: [" << uri.toString() << "] theme type should be 'light' or 'dark'.");
        return false;
    }

    if (maInfoMap.find(isDark ? ThemeType::DARK : ThemeType::LIGHT) == maInfoMap.end())
    {
        LOG_ERR((isDark ? "Dark" : "Light") << " icon theme is not loaded.");
        return false;
    }

    std::shared_ptr<Info> pInfo = maInfoMap[isDark ? ThemeType::DARK : ThemeType::LIGHT];
    std::string realName; // 在 zip 檔案中的名稱
    std::string extName; // 副檔名

    // name 有幾種格式，如下：
    // 1.開頭是 '.uno:'
    if (path.find(".uno:") == 0)
    {
        // 只有 uno 命令有分大小圖示
        const IconTheme::Size size = IconTheme::Size::MEDIUM;
        // 去掉 '.uno:'
        const std::string cmdName = path.substr(5);
        std::string sizePrefix;
        if (size == IconTheme::Size::SMALL) // 小圖示 16x16 的路徑是 "cmd/sc_" + cmdName + (".svg/.png")
            sizePrefix = "sc_";
        else if (size == IconTheme::Size::LARGE) // 大圖示 32x32 的路徑是 "cmd/32/" + cmdName + (".svg/.png")
            sizePrefix = "32/";
        else // 一般圖示 24x24 的路徑是 "cmd/lc_" + cmdName + (".svg/.png")
            sizePrefix = "lc_";

        realName = "cmd/" + sizePrefix + cmdName; // 在 zip 檔案中的名稱，不包含副檔名
    }
    // 要求檔案列表方法
    else if (path == "list()")
    {
        Poco::JSON::Array files;
        for (auto file : pInfo->package.getList())
            files.add(file);

        mimeType = "application/json";
        std::ostringstream oss;
        files.stringify(oss);
        resource = oss.str();

        return true;
    }
    // 要求連結列表方法
    else if (path == "links()")
    {
        Poco::JSON::Object links;
        for (const auto& link : pInfo->linksMap)
            links.set(link.first, link.second);

        mimeType = "application/json";
        std::ostringstream oss;
        links.stringify(oss);
        resource = oss.str();

        return true;
    }
    else
    {
        const Poco::Path iconPath(path);
        const std::string dirName = iconPath.parent().toString(); // 路徑
        const std::string baseName = iconPath.getBaseName(); // 在 zip 檔案中的名稱，不包含副檔名
        extName = iconPath.getExtension(); // 副檔名
        realName = dirName + baseName;
    }

    // realName 轉成小寫
    std::transform(realName.begin(), realName.end(), realName.begin(), ::tolower);

    // 如果副檔名是 svg 或 png，則副檔名依據 pInfo->type 而定
    if (extName == "svg" || extName == "png" || extName.empty())
        realName += pInfo->type == Info::IconType::SVG ? ".svg" : ".png";
    else
        realName += '.' + extName;

    // 如果 realName 在 linksMap 中，則取代 realName
    if (pInfo->linksMap.find(realName) != pInfo->linksMap.end())
        realName = pInfo->linksMap[realName];

    // Get the icon from the zip file
    if (pInfo->package.getContent(realName, resource))
    {
        mimeType = HttpHelper::getMimeType(realName);
        return true;
    }

    return false;
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
