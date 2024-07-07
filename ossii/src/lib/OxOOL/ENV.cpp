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

#include <common/ConfigUtil.hpp>
#include <common/Log.hpp>

namespace OxOOL
{
std::string ENV::AppName(APP_NAME);
std::string ENV::Vendor(VENDOR);

std::string ENV::Version(OXOOLWSD_VERSION);
std::string ENV::VersionHash(OXOOLWSD_VERSION_HASH);

std::string ENV::ModuleDir(OXOOL_MODULE_DIR);
std::string ENV::ModuleConfigDir = OXOOL_MODULE_CONFIG_DIR;
std::string ENV::ModuleDataDir = OXOOL_MODULE_DATA_DIR;

std::string ENV::FileServerRoot;
std::string ENV::SysTemplate;
std::string ENV::LoTemplate;
std::string ENV::ChildRoot;

std::string ENV::ConfigFile;
bool        ENV::SSLEnabled = false;
std::string ENV::ServiceRoot;

Poco::JSON::Object ENV::LOKitVersionInfo;

// Private static members -----------------------------------------------------
ENV::Mode ENV::mnWhich;
// ----------------------------------------------------------------------------

ENV::ENV(Mode which)
{
    mnWhich = which;
    initialize();
}

void ENV::initialize()
{
    const char* oxool_config = std::getenv("OXOOL_CONFIG");
    if (oxool_config)
    {
        ENV::FileServerRoot = config::getString("file_server_root_path", "");
        ENV::SysTemplate = config::getString("sys_template_path", "");
        ENV::ChildRoot = config::getString("child_root_path", "");
        ENV::SSLEnabled = config::getBool("ssl.enable", false);
    }
    else
        LOG_ERR("OXOOL_CONFIG environment variable not set.");
}

bool ENV::setLOKitVersionInfo(const std::string& lokitVersion)
{
    try
    {
        ENV::LOKitVersionInfo = *Poco::JSON::Parser().parse(lokitVersion).extract<Poco::JSON::Object::Ptr>();
    }
    catch (const Poco::Exception& exc)
    {
        LOG_ERR("Error parsing LOKit version info: " << exc.displayText());
        return false;
    }
    return true;
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
