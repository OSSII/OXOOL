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
class URI;
} // namespace Poco

namespace OxOOL
{

/// @brief The interface of the resource provider.
class ResourceProvider
{
public:
    ResourceProvider() {};
    virtual ~ResourceProvider() {};

    /// @brief Initialize the resource provider.
    /// when the resource provider is registered, this method will be called.
    virtual void initialize() {};

    /// @brief Get the scheme of the resource provider.
    virtual const std::string& getScheme() const = 0;

    /// @brief Get a resource from the given URI.
    /// @param uri The URI of the resource.
    /// @param resource The resource content obtained.
    /// @param mimeType The obtained resource MIME type.
    /// @return true if the resource is obtained successfully, false otherwise.
    virtual bool getResource(const Poco::URI& uri, std::string& resource, std::string& mimeType) = 0;

}; // class ResourceProvider

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
