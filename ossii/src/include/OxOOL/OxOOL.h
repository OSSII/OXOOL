/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <memory>
#include <string>

#define MULTILINE_STRING(...) #__VA_ARGS__

#ifndef CODE_COVERAGE
#define CODE_COVERAGE 0
#endif

#ifndef MOBILEAPP
#define MOBILEAPP 0
#endif

namespace Poco::Net
{
class HTTPRequest;
} // namespace Poco::Net

class SocketDisposition;
class ClientSession;
class StringVector;
class Message;

namespace OxOOL
{
class ENV
{
public:
    ENV();
    ~ENV(){};

    static std::string Version; // PACKAGE_VERSION
    static std::string VersionHash; // OXOOLWSD_VERSION_HASH
    static std::string HttpAgentString; // "OxOOL HTTP Agent " + ENV::Version
    static std::string WopiAgentString; // ENV::HttpAgentString
    static std::string HttpServerString; // "OxOOL HTTP Server " + ENV::Version
    static std::string ModuleDir; // Module directory
    static std::string ModuleConfigDir; // Module configuration directory
    static std::string ModuleDataDir; // Module data directory

private:
};
} // namespace OxOOL

namespace OxOOL
{

/// Initialize the library.
void initialize();

/// @brief if the request is handled by the library.
bool handleRequest(const Poco::Net::HTTPRequest& request, SocketDisposition& disposition);

void dumpAllModuleInfo();

/// Cleanup the library.
void cleanup();

/// 以下只是概念，尚未完全實作

/// @brief if the client input is handled by the library.
bool handleClientInput(const std::shared_ptr<ClientSession>& clientSession,
                       const StringVector& tokens, const std::string& firstLine);

bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                              const std::shared_ptr<Message>& payload);

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
