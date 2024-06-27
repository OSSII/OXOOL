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

#pragma once

#include <set>
#include <map>
#include <memory>

#include <OxOOL/ResourceProvider.h>
#include <OxOOL/ZipPackage.h>

#include <Poco/Path.h>

constexpr const char ONLINE_IMAGES_RELATIVE_PATH[] = "browser/dist/images";

constexpr const char ICON_THEMES_RELATIVE_PATH[] = "share/config";
constexpr const char OFFICE_SHELL_PATH[] = "program/shell";

constexpr const char FALLBACK_LIGHT_ICON_THEME[] = "colibre_svg";
constexpr const char FALLBACK_DARK_ICON_THEME[]  = "colibre_dark_svg";

namespace Poco
{
    class URI;
    namespace JSON
    {
        class Array;
        class Object;
    }
}

namespace OxOOL
{

struct Info
{
    enum IconType
    {
        SVG = 0,
        PNG
    };

    std::string name; // The name of the icon theme.
    std::string readableName; // The readable name of the icon theme.
    OxOOL::ZipPackage package;
    // The contents of links.txt read from package.
    // Only starting with 'cmd/' will be saved.
    std::map<std::string, std::string> linksMap;
    IconType type;
};


class IconTheme : public OxOOL::ResourceProvider
/*
    You can use URI to obtain icon resources.
    The URI format is as follows:
    icon:<THEME TYPE>/<FUNCTION | UNO COMMAND | ICON PATH | ONLINE IMAGE>

    THEME TYPE: There are only two categories
        * light: light icon.
        * dark:  dark color icon.

    FUNCTION: There are 6 functions
        * format() - Get the icon format, json format. For example: icon:light/format()
        * files() - Get the list of all files in json format. For example: icon:light/files()
        * links() - File link list, json format. For example: icon:dark/links()

        * getLogo() - Get LoKit logo. For example: icon:light/getLogo()
        * getAbout() - Get LoKit about icon. For example: icon:light/getAbout()
        * onlineFiles() - Get the online image file list, json format. For example: icon:light/onlineFiles()
        * structure() - Get the icon structure, json format. include format, files, onlineFiles and links.
                        For example: icon:dark/structure()

    UNO COMMAND: Get the uno command icon, such as '.uno:Save'
        Example: "icon:light/.uno:Save" or "icon:dark/.uno:Save"

        UNO command has three sizes: small, medium, and large.
            16x16 px icons are used in the menus.
            24x24 px icons are used in toolbars and sidebar.
            Notebook bar use 24x24 px icons when there is only one icon, and 16x16 px everywhere else.

        Default icon size is small(16 x16).
        if you want to get the medium(24 x 24) or large(32 x 32) icon,
        you can add the size parameter to the URI.
        For example: "icon:light/.uno:Save/m" to get the medium icon.
                 or: "icon:light/.uno:Save/l" to get the large icon.

    ICON PATH: Get the icon by path(No extension is required).
        For example: "icon:light/res/writer128" or "icon:dark/res/writer128" to get icon in svg or png format.

    ONLINE IMAGE: Get the online image file. if not specified extension name, the default is svg.
        For example: "icon:light/@filename" or "icon:dark/@filename.png" to get the online image file.
*/
{
public:

    enum ThemeType
    {
        LIGHT = 0,
        DARK
    };

    enum Size
    {
        SMALL = 0,
        MEDIUM,
        LARGE
    };

    IconTheme();
    ~IconTheme();

    /// @brief initialize icon theme
    void initialize();

    /// @brief return the scheme of the provider
    const std::string& getScheme() const override
    {
        static const std::string scheme = "icon";
        return scheme;
    }

    /// @brief Get a resource from the given URI.
    /// @param uri The URI of the resource.
    /// @param resource The resource content obtained.
    /// @param mimeType The obtained resource MIME type.
    /// @return true if the resource is retrieved successfully, false otherwise.
    bool getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType) override;

private:
    /// @brief Lokit icon theme path
    Poco::Path maLoIconThemePath;

    /// @brief Lokit brand path
    Poco::Path maLoBrandPath;

    /// @brief icon theme name and path map
    /// @description first: icon theme name,
    ///              second: {first:readable name, second: icon theme path}
    std::map<std::string, std::pair<std::string, std::string>> maIconThemeMap;

    /// @brief icon theme info map
    /// @description first: icon theme type, second: icon theme info
    std::map<ThemeType, std::shared_ptr<Info>> maInfoMap;

    std::map<ThemeType, std::set<std::string>> maOnlineFiles;

    bool makeJsonResource(const Poco::JSON::Object& object, std::string& resource, std::string& mimeType);

    bool makeJsonResource(const Poco::JSON::Array& array, std::string& resource, std::string& mimeType);

    /// @brief Get file content
    /// @param fullpath - The full path of the file.
    /// @param content - The file content obtained.
    /// @param mimeType - file MIME type
    /// @return true if the file is retrieved successfully, false otherwise.
    bool getFileContent(const std::string& fullpath, std::string& content, std::string& mimeType);

}; // class IconTheme

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
