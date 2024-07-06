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

#include <Poco/JSON/Object.h>

namespace OxOOL
{
class ENV
{
public:
    ENV();
    ~ENV() {};

    static void initialize();

    static std::string AppName; // App name
    static std::string Vendor; // VENDOR
    static std::string Version; // PACKAGE_VERSION
    static std::string VersionHash; // OXOOLWSD_VERSION_HASH

    static std::string ConfigFile; // Configuration file

    static std::string HttpServerString; // "OxOOL HTTP Server " + ENV::Version
    static std::string HttpAgentString; // "OxOOL HTTP Agent " + ENV::Version

    static std::string FileServerRoot; // File server root(eg. "/usr/share/oxool")
    static std::string SysTemplate; // System Template directory.
    static std::string LoTemplate; // LibreOffice Template directory.
    static std::string ChildRoot; // Child root directory
    static std::string ModuleDir; // Module directory
    static std::string ModuleConfigDir; // Module configuration directory
    static std::string ModuleDataDir; // Module data directory

    static bool SSLEnabled; // SSL enabled
    static std::string ServerProtocol; // Server Protocol("http://" or "https://")
    static int ServerPortNumber; // Server port number
    static std::string ServiceRoot; // Service root

    static bool AdminEnabled; // Admin enabled

    static Poco::JSON::Object::Ptr LOKitVersionInfo; // LibreOfficeKit version information.
};

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
