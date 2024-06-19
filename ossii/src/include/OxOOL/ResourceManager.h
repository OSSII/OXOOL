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
#include <map>
#include <memory>
#include <atomic>
#include <mutex>

namespace Poco
{
class URI;
} // namespace Poco

namespace OxOOL
{
class ResourceProvider;

class ResourceManager
{
    ResourceManager(const ResourceManager&) = delete;
    ResourceManager& operator = (const ResourceManager&) = delete;
    ResourceManager();

public:
    virtual ~ResourceManager();

    /// @brief Get the singleton instance of the resource manager.
    static ResourceManager& instance()
    {
        static ResourceManager maResourceManager;
        return maResourceManager;
    }

    /// @brief Initialize the resource manager.
    void initialize();

    /// @brief Register a resource provider.
    /// @param provider The resource provider to register.
    /// @return true if the provider is registered successfully, false otherwise.
    bool registerProvider(std::shared_ptr<ResourceProvider> provider);

    /// @brief Unregister a resource provider.
    /// @param scheme The scheme of the provider to unregister.
    /// @return true if the provider is unregistered successfully, false otherwise.
    bool unregisterProvider(const std::string& scheme);

    /// @brief Get a resource from the given URI.
    /// @param uri The URI of the resource.
    /// @param resource The resource content obtained.
    /// @param mimeType The obtained resource MIME type.
    /// @return true if the resource is retrieved successfully, false otherwise.
    bool getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType);

private:
    std::atomic<bool> mbInitialized; ///< Whether the resource manager is initialized.

    std::mutex maMutex; ///< Mutex to protect the resource providers map.
    /// @brief Map of resource providers.
    /// The key is the scheme of the URI. The value is the resource provider.
    std::map<std::string, std::shared_ptr<ResourceProvider>> maProvidersMap;

}; // class ResourceManager

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
