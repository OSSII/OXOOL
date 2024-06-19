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
#include <mutex>

namespace Poco::Net
{
    class HTTPRequest;
} // namespace Poco::Net

class StreamSocket;

/// @brief The resource information.
/// The resource content is gziped.
/// Modern browsers support gzip-compressed content,
/// so caching uncompressed content is not necessary.
///
/// If the client browser does not support gzip compression,
/// just provide decompressed content.
struct ResourceInfo
{
    std::string gzipedResource; // The gziped resource content.
    std::string mimeType; // The MIME type of the resource.
};

class ResourceService final : public OxOOL::Module::Base
{
public:
    ResourceService() {}

    ~ResourceService() {}

    void initialize() override;

    std::string getVersion() override;

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override;

private:
    std::mutex maMutex;

    /// @brief Resource cache.
    /// The key is the URI of the resource. The value is the resource information.
    std::map<std::string, ResourceInfo> maResourceCache;
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
