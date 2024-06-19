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

#include <mutex>
#include <map>

#include <OxOOL/ResourceManager.h>
#include <OxOOL/ResourceProvider.h>

#include <Poco/URI.h>

#include <common/Log.hpp>

#include "Private/IconThemeProvider.hpp"

namespace OxOOL
{

ResourceManager::ResourceManager()
    : mbInitialized(false)
{
}

ResourceManager::~ResourceManager()
{
}

void ResourceManager::initialize()
{
    if (mbInitialized)
        return;

    // Register the icon theme provider
    const std::shared_ptr<ResourceProvider> iconThemeProvider = std::make_shared<IconTheme>();
    const std::string& scheme = iconThemeProvider->getScheme();
    iconThemeProvider->initialize();
    maProvidersMap[scheme] = iconThemeProvider;

    mbInitialized = true;
}

bool ResourceManager::registerProvider(std::shared_ptr<ResourceProvider> provider)
{
    if (!provider)
    {
        LOG_ERR("Invalid resource provider.");
        return false;
    }

    std::lock_guard<std::mutex> lock(maMutex);
    const std::string& scheme = provider->getScheme();
    if (scheme.empty() || maProvidersMap.find(scheme) != maProvidersMap.end())
    {
        LOG_ERR("Resource provider with scheme '" << scheme << "' is already registered.");
        return false;
    }

    provider->initialize();
    maProvidersMap[scheme] = provider;
    return true;
}

bool ResourceManager::unregisterProvider(const std::string& scheme)
{
    std::lock_guard<std::mutex> lock(maMutex);
    if (maProvidersMap.find(scheme) == maProvidersMap.end())
    {
        LOG_ERR("Resource provider with scheme '" << scheme << "' is not registered.");
        return false;
    }

    maProvidersMap.erase(scheme);
    return true;
}

bool ResourceManager::getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType)
{
    // clear the output parameters
    resource.clear();
    mimeType.clear();

    const std::string& scheme = uri.getScheme();
    // Check if the URI scheme is supported
    if (maProvidersMap.find(scheme) == maProvidersMap.end())
    {
        LOG_ERR("Scheme '" << scheme << "' is not supported.");
        return false;
    }

    // Get the resource provider
    const std::shared_ptr<ResourceProvider> provider = maProvidersMap[scheme];
    return provider->getResource(uri, resource, mimeType);
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
