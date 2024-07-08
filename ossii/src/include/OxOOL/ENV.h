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

#include <string>

namespace Poco
{
namespace JSON
{
class Object;
} // namespace JSON
} // namespace Poco

namespace OxOOL
{
class ENV
{
    ENV() = delete; // Disallow creating an instance of this object (singleton
    ENV(const ENV&) = delete; // Disallow copying
    ENV& operator=(const ENV&) = delete; // Disallow copying
public:

    enum Mode
    {
        WSD = 0,
        KIT = 1
    };

    ENV(Mode which);
    virtual ~ENV() {}

    virtual void initialize();

    static bool isWSD() { return mnWhich == WSD; }
    static bool isKIT() { return mnWhich == KIT; }

    // Use default values for these.
    static std::string AppName; // App name
    static std::string Vendor; // VENDOR

    static std::string Version; // PACKAGE_VERSION
    static std::string VersionHash; // OXOOLWSD_VERSION_HASH

    static std::string ModuleDir; // Module directory
    static std::string ModuleConfigDir; // Module configuration directory
    static std::string ModuleDataDir; // Module data directory

    // Use OXOOL_CONFIG environment variable.
    static std::string FileServerRoot; // File server root(eg. "/usr/share/oxool")
    static std::string SysTemplate; // System Template directory.
    static std::string ChildRoot; // Child root directory
    static bool SSLEnabled; // SSL enabled

    static std::string LoTemplate; // LibreOffice Template directory.

    static std::string ConfigFile; // Configuration file (WSD Mode Only)
    static std::string ServiceRoot; // Service root (WSD Mode Only)

    static Poco::JSON::Object LOKitVersionInfo; // LibreOfficeKit version information.
    /// @brief Set up LibreOfficeKit version information.
    /// @param jsonString LibreOfficeKit version information in JSON format.
    /// @return true if successful, false json parsing failed.
    static bool setLOKitVersionInfo(const std::string& jsonString);

private:
    static Mode mnWhich;
};

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
