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
#include <set>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ENV.h>
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
    maLoBrandPath = Poco::Path(ENV::LoTemplate, OFFICE_SHELL_PATH);

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

    // 1. get the default icon themes from the configuration
    const auto& config = Poco::Util::Application::instance().config();
    std::string lightIconTheme = config.getString("user_interface.icon_theme.light", "");
    std::string darkIconTheme  = config.getString("user_interface.icon_theme.dark",  "");

    // 2. Fallback default icon themes
    lightIconTheme = lightIconTheme.empty() ? FALLBACK_LIGHT_ICON_THEME : lightIconTheme;
    darkIconTheme  = darkIconTheme.empty()  ? FALLBACK_DARK_ICON_THEME  : darkIconTheme;

    // 3. check light and dark icon themes if exists
    if (maIconThemeMap.find(lightIconTheme) == maIconThemeMap.end())
    {
        LOG_ERR("Failed to find light icon theme: " << lightIconTheme);
        // 找名稱中沒有 'dark' 的第一個 icon theme
        for (const auto& it : maIconThemeMap)
        {
            if (it.first.find("dark") == std::string::npos)
            {
                lightIconTheme = it.first;
                LOG_INF("Use the first light icon theme: " << lightIconTheme);
                break;
            }
        }
    }

    // 4. check dark icon theme if exists
    if (maIconThemeMap.find(darkIconTheme) == maIconThemeMap.end())
    {
        LOG_ERR("Failed to find dark icon theme: " << darkIconTheme);
        // 找名稱中有 'dark' 的第一個 icon theme
        for (const auto& it : maIconThemeMap)
        {
            if (it.first.find("dark") != std::string::npos)
            {
                darkIconTheme = it.first;
                LOG_INF("Use the first dark icon theme: " << darkIconTheme);
                break;
            }
        }
    }

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

    /*
     * 取得 browser/dist/images/ 及
     *     browser/dist/images/dark/ 之下的所有檔案列表(不含子目錄)
     */
    maOnlineFiles[ThemeType::LIGHT] = std::set<std::string>();
    maOnlineFiles[ThemeType::DARK] = std::set<std::string>();

    // browser/dist/images/
    const Poco::Path lightPath(ENV::FileServerRoot, ONLINE_IMAGES_RELATIVE_PATH);
    // browser/dist/images/dark/
    const Poco::Path darkPath(lightPath, "dark");

    // 遍歷所有檔案，將檔案名稱存到 maOnlineFiles 中
    for (auto it = maOnlineFiles.begin(); it != maOnlineFiles.end(); ++it)
    {
        Poco::File dir(it->first == ThemeType::LIGHT ? lightPath : darkPath); // 取得路徑
        // 若路徑存在且是目錄
        if (dir.exists() && dir.isDirectory())
        {
            std::vector<std::string> files;
            dir.list(files); // 取得目錄下所有檔案
            // 遍歷所有檔案，將檔案名稱存到 maOnlineFiles 中
            for (const auto& file : files)
            {
                // 只存 svg 或 png 檔案
                if (file.find(".svg") != std::string::npos ||
                    file.find(".png") != std::string::npos)
                    it->second.emplace(file);
            }
        }
        else
            LOG_ERR("Failed to load online images list: " << dir.path());
    }
}

bool IconTheme::getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType)
{
    std::string_view path = uri.getPath();

    bool isDark = false;
    // path 開頭只能是 "light/" 或 "dark/"
    if (path.find("light/") == 0)
    {
        path.remove_prefix(6);
    }
    else if (path.find("dark/") == 0)
    {
        path.remove_prefix(5);
        isDark = true;
    }
    else
    {
        LOG_ERR("Invalid path format: [" << uri.toString() << "] theme type should be 'light' or 'dark'.");
        return false;
    }

    // 本段程式碼取得後端 office 廠商相關的 logo 及 about 圖示
    if (path == "getLogo()")
    {
        Poco::Path logoFile(maLoBrandPath, (isDark ? "logo_inverted.svg" : "logo.svg"));
        return getFileContent(logoFile.toString(), resource, mimeType);
    }
    else if (path == "getAbout()")
    {
        Poco::Path aboutFile(maLoBrandPath, "about.svg");
        Poco::Path darkAboutFile(maLoBrandPath, "about_inverted.svg");
        // 暗色 about_inverted.svg 有可能不存在
        // 若是暗色主題，且 about_inverted.svg 存在，則使用 about_inverted.svg
        if (isDark && Poco::File(darkAboutFile).exists())
            aboutFile = darkAboutFile;

        return getFileContent(aboutFile.toString(), resource, mimeType);
    }
    // end of brand logo

    if (maInfoMap.find(isDark ? ThemeType::DARK : ThemeType::LIGHT) == maInfoMap.end())
    {
        LOG_ERR((isDark ? "Dark" : "Light") << " icon theme is not loaded.");
        return false;
    }

    std::shared_ptr<Info> pInfo = maInfoMap[isDark ? ThemeType::DARK : ThemeType::LIGHT];
    std::string realName; // 在 zip 檔案中的名稱
    std::string extName; // 副檔名

    // name 有幾種格式，如下：
    // 1. '@' + name: 代表直接取得 online browser/dist/images/ 之下的檔案
    if (path[0] == '@')
    {
        path.remove_prefix(1); // 去掉 '@'

        // 檢測結尾是否為 '.svg' 或 '.png'
        if (path.find(".svg") != std::string::npos || path.find(".png") != std::string::npos)
            realName = path;
        else // 若沒有指定副檔名，則預設為 svg
            realName = path.data() + std::string(".svg");

        // 若 onlineFile 存在，則取得檔案內容
        if (maOnlineFiles[isDark ? ThemeType::DARK : ThemeType::LIGHT].count(realName) == 1)
        {
            Poco::Path onlinePath(ENV::FileServerRoot, ONLINE_IMAGES_RELATIVE_PATH);
            onlinePath.append(realName);
            return getFileContent(onlinePath.toString(), resource, mimeType);
        }

        return false;
    }
    // 2.開頭是 '.uno:'
    else if (path.find(".uno:") == 0)
    {
        path.remove_prefix(5); // 去掉 '.uno:'

        // 只有 uno 命令有分大、中、小三種 size 圖示，而且每種 size 圖示的數量不同
        IconTheme::Size size = IconTheme::Size::SMALL; // 預設小圖示

        // uno命令後若接 '/m' - MEDIUM、'/l' - LARGE，則改變 size
        if (path.size() > 2 && path[path.size() - 2] == '/')
        {
            if (path[path.size() - 1] == 'm')
                size = IconTheme::Size::MEDIUM;
            else if (path[path.size() - 1] == 'l')
                size = IconTheme::Size::LARGE;

            // 去掉 '/m' 或 '/l'
            path.remove_suffix(2);
        }

        std::string sizePrefix;
        if (size == IconTheme::Size::MEDIUM) // 一般圖示 24x24 的路徑是 "cmd/lc_" + path + (".svg/.png")
            sizePrefix = "lc_";
        else if (size == IconTheme::Size::LARGE) // 大圖示 32x32 的路徑是 "cmd/32/" + path + (".svg/.png")
            sizePrefix = "32/";
        else // 小圖示 16x16 的路徑是 "cmd/sc_" + path + (".svg/.png")
            sizePrefix = "sc_";

        realName = "cmd/" + sizePrefix + path.data(); // 在 zip 檔案中的名稱，不包含副檔名
    }
    else if (path == "format()")
    {
        Poco::JSON::Object format;
        format.set("format", pInfo->type == Info::IconType::SVG ? "svg" : "png");

        return makeJsonResource(format, resource, mimeType);
    }
    // 要求檔案列表方法
    else if (path == "files()")
    {
        Poco::JSON::Array files;
        for (auto file : pInfo->package.getList())
            files.add(file);

        return makeJsonResource(files, resource, mimeType);
    }
    // 要求連結列表方法
    else if (path == "links()")
    {
        Poco::JSON::Object links;
        for (const auto& link : pInfo->linksMap)
            links.set(link.first, link.second);

        return makeJsonResource(links, resource, mimeType);
    }
    else if (path == "onlineFiles()")
    {
        Poco::JSON::Array files;
        for (const auto& onlineFile : maOnlineFiles[isDark ? ThemeType::DARK : ThemeType::LIGHT])
            files.add(onlineFile);

        return makeJsonResource(files, resource, mimeType);
    }
    else if (path == "structure()")
    {
        Poco::JSON::Object structure;
        structure.set("name", pInfo->name);
        structure.set("readableName", pInfo->readableName);
        structure.set("format", pInfo->type == Info::IconType::SVG ? "svg" : "png");

        Poco::JSON::Array files;
        for (auto file : pInfo->package.getList())
            files.add(file);
        structure.set("files", files);

        files.clear();
        for (const auto& onlineFile : maOnlineFiles[isDark ? ThemeType::DARK : ThemeType::LIGHT])
            files.add(onlineFile);
        structure.set("onlineFiles", files);

        Poco::JSON::Object links;
        for (const auto& link : pInfo->linksMap)
            links.set(link.first, link.second);
        structure.set("links", links);

        return makeJsonResource(structure, resource, mimeType);
    }
    else
    {
        const Poco::Path iconPath(path.data());
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

// Private method here --------------------------------------------------------

bool IconTheme::makeJsonResource(const Poco::JSON::Object& object, std::string& resource, std::string& mimeType)
{
    mimeType = "application/json; charset=utf-8";
    std::ostringstream oss;
    object.stringify(oss);
    resource = oss.str();

    return true;
}

bool IconTheme::makeJsonResource(const Poco::JSON::Array& array, std::string& resource, std::string& mimeType)
{
    mimeType = "application/json; charset=utf-8";
    std::ostringstream oss;
    array.stringify(oss);
    resource = oss.str();

    return true;
}

bool IconTheme::getFileContent(const std::string& fullpath, std::string& content, std::string& mimeType)
{
    if (Poco::File(fullpath).exists())
    {
        std::ifstream ifs(fullpath, std::ios::binary);
        std::ostringstream oss;
        oss << ifs.rdbuf();
        content = oss.str();
        mimeType = HttpHelper::getMimeType(fullpath);
        return true;
    }
    else
        LOG_ERR("Failed to load file: " << fullpath);

    return false;
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
