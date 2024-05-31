/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <functional>
#include <memory>
#include <string>
#include <vector>

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


namespace OxOOL::Module
{
class Detail;
} // namespace OxOOL

namespace OxOOL
{
class ENV
{
public:
    ENV();
    ~ENV() {};

    static void initialize();

    static std::string Version; // PACKAGE_VERSION
    static std::string VersionHash; // OXOOLWSD_VERSION_HASH

    static std::string ConfigFile; // Configuration file

    static std::string HttpServerString; // "OxOOL HTTP Server " + ENV::Version
    static std::string HttpAgentString; // "OxOOL HTTP Agent " + ENV::Version

    static std::string FileServerRoot; // File server root(eg. "/usr/share/oxool")
    static std::string SysTemplate; // System Template directory.
    static std::string ModuleDir; // Module directory
    static std::string ModuleConfigDir; // Module configuration directory
    static std::string ModuleDataDir; // Module data directory

    static bool SSLEnabled; // SSL enabled
    static std::string ServerProtocol; // Server Protocol("http://" or "https://")
    static int ServerPortNumber; // Server port number
    static std::string ServiceRoot; // Service root

    static bool AdminEnabled; // Admin enabled

private:

};

} // namespace OxOOL

namespace OxOOL
{

/// Initialize the library.
void initialize();

void enhanceWatermark(const std::shared_ptr<ClientSession>& session);

/// @brief Get all module details.
const std::vector<OxOOL::Module::Detail> getAllModuleDetails();

/// @brief if the request is handled by the library.
bool handleRequest(const Poco::Net::HTTPRequest& request, SocketDisposition& disposition);

void dumpAllModuleInfo();

/// Cleanup the library.
void cleanup();

/// @brief if the client input is handled by the library.
bool handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                         const StringVector& tokens);

bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                              const std::shared_ptr<Message>& payload);

typedef std::function<void(const std::string&, bool)> SendTextMessageFn;
void handleAdminMessage(const SendTextMessageFn& sendTextMessage,
                        const StringVector& tokens);

/// @brief Check user and password if match the configuration.
/// @param userProvidedUsr
/// @param userProvidedPwd
/// @return true - match, false - not match
bool isConfigAuthOk(const std::string& userProvidedUsr, const std::string& userProvidedPwd);

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
