/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <memory>
#include <mutex>

#include <Poco/JSON/Object.h>

class ClientSession;

namespace OxOOL
{

class Watermark
{
public:

    Watermark() {}
    virtual ~Watermark() {}

    void initialize();

    /// @brief Enhance watermark
    /// @param clientSession
    void enhanceWatermark(const std::shared_ptr<ClientSession>& clientSession);

private:
    /// @brief System watermark
    Poco::JSON::Object maSysWatermark;
    /// @brief Load system watermark from configuration
    void loadSysWatermark();

    /// @brief Mutex for timezone offset cache
    std::mutex maTimezoneMutex;
    /// @brief Timezone offset cache
    std::map<std::string, long int> maTimezoneOffset;
    /// @brief Get timezone offset
    long int getTimezoneOffset(const std::string& timezone);

    /// @brief Convert JSON object to string
    std::string convertJsonString(const Poco::JSON::Object& obj);

    /// @brief Convert text
    /// @param text
    /// @return
    std::string convertTags(const std::shared_ptr<ClientSession>& clientSession,
                            const std::string& text, const std::string& userIP = std::string());

};

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
