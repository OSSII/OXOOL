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

#include <map>
#include <memory>

#include <OxOOL/ResourceProvider.h>
#include <OxOOL/ZipPackage.h>

#include <Poco/Path.h>

constexpr const char ICON_THEMES_RELATIVE_PATH[] = "share/config";
constexpr const char FALLBACK_LIGHT_ICON_THEME[] = "colibre_svg";
constexpr const char FALLBACK_DARK_ICON_THEME[]  = "colibre_dark_svg";

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
    icon:<THEME TYPE>/<FUNCTION | UNO COMMAND | ICON PATH>

    THEME TYPE: There are only two categories
        * light: light icon.
        * dark:  dark color icon.

    FUNCTION: two functions
        * list() - Get the list of all files in json format. For example: icon:light/list()
        * links() - File link list, json format. For example: icon:dark/links()

    UNO COMMAND: Get the uno command icon, such as '.uno:Save'
        Example: icon:light/.uno:Save

    ICON PATH: Use the file path to get the icon.
        You can use "icon:dark/list()" to get the file list.
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

    /// @brief icon theme name and path map
    /// @description first: icon theme name,
    ///              second: {first:readable name, second: icon theme path}
    std::map<std::string, std::pair<std::string, std::string>> maIconThemeMap;

    /// @brief icon theme info map
    /// @description first: icon theme type, second: icon theme info
    std::map<ThemeType, std::shared_ptr<Info>> maInfoMap;

}; // class IconTheme

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
