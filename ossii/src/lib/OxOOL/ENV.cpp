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

#include <config.h>
#include <config_unused.h>

#include <OxOOL/ENV.h>

#include <Poco/JSON/Object.h>
#include <Poco/JSON/Parser.h>

#include <wsd/OXOOLWSD.hpp>

namespace OxOOL
{
std::string ENV::AppName(APP_NAME);
std::string ENV::Vendor(VENDOR);

std::string ENV::Version(OXOOLWSD_VERSION);
std::string ENV::VersionHash(OXOOLWSD_VERSION_HASH);

std::string ENV::ModuleDir(OXOOL_MODULE_DIR);
std::string ENV::ModuleConfigDir = OXOOL_MODULE_CONFIG_DIR;
std::string ENV::ModuleDataDir = OXOOL_MODULE_DATA_DIR;

std::string ENV::ConfigFile;

std::string ENV::HttpAgentString("OxOOL HTTP Server " + ENV::Version);
std::string ENV::HttpServerString("OxOOL HTTP Agent "  + ENV::Version);

std::string ENV::FileServerRoot;
std::string ENV::SysTemplate;
std::string ENV::LoTemplate;
std::string ENV::ChildRoot;

bool        ENV::SSLEnabled = false;
std::string ENV::ServerProtocol;
int         ENV::ServerPortNumber = 0;
std::string ENV::ServiceRoot;

bool        ENV::AdminEnabled = true; // Admin enabled

Poco::JSON::Object::Ptr ENV::LOKitVersionInfo;

ENV::ENV()
{
}

void ENV::initialize()
{

    ENV::ConfigFile       = OXOOLWSD::ConfigFile;

    ENV::FileServerRoot   = OXOOLWSD::FileServerRoot;
    ENV::SysTemplate      = OXOOLWSD::SysTemplate;
    ENV::LoTemplate       = OXOOLWSD::LoTemplate;
    ENV::ChildRoot        = OXOOLWSD::ChildRoot;

    ENV::SSLEnabled       = OXOOLWSD::isSSLEnabled() || OXOOLWSD::isSSLTermination();
    ENV::ServerProtocol   = ENV::SSLEnabled ? "https://" : "http://";
    ENV::ServerPortNumber = OXOOLWSD::getClientPortNumber();
    ENV::ServiceRoot      = OXOOLWSD::ServiceRoot;

    ENV::AdminEnabled = OXOOLWSD::AdminEnabled;

    try
    {
        ENV::LOKitVersionInfo = Poco::JSON::Parser().parse(OXOOLWSD::LOKitVersion).extract<Poco::JSON::Object::Ptr>();
    }
    catch(const std::exception& e)
    {
        LOG_ERR("Failed to parse LibreOfficeKit version information: " << e.what());
        ENV::LOKitVersionInfo = new Poco::JSON::Object();
    }
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
