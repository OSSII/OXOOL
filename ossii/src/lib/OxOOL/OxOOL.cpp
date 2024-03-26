/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <config.h>
#include <config_unused.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ModuleManager.h>

#include <common/Message.hpp>
#include <common/StringVector.hpp>
#include <common/Util.hpp>
#include <wsd/OXOOLWSD.hpp>
#include <wsd/ClientSession.hpp>

namespace OxOOL
{
std::string ENV::Version;
std::string ENV::VersionHash;
std::string ENV::HttpAgentString;
std::string ENV::HttpServerString;

std::string ENV::ModuleDir;//(OXOOL_MODULE_DIR);
std::string ENV::ModuleConfigDir; //(OXOOL_MODULE_CONFIG_DIR);
std::string ENV::ModuleDataDir; //(OXOOL_MODULE_DATA_DIR);

int         ENV::ServerPortNumber = 0;
std::string ENV::ServiceRoot;
bool        ENV::SSLEnabled = false;

bool        ENV::AdminEnabled = true; // Admin enabled

ENV::ENV()
{
    // Initialize the environment.
    initialize();
}

void ENV::initialize()
{
    // Get the version information.
    Util::getVersionInfo(ENV::Version, ENV::VersionHash);

    ENV::HttpServerString = "OxOOL HTTP Server " + ENV::Version;
    ENV::HttpAgentString  = "OxOOL HTTP Agent "  + ENV::Version;

    ENV::ModuleDir       = OXOOL_MODULE_DIR;
    ENV::ModuleConfigDir = OXOOL_MODULE_CONFIG_DIR;
    ENV::ModuleDataDir   = OXOOL_MODULE_DATA_DIR;

    ENV::ServerPortNumber = OXOOLWSD::getClientPortNumber();
    ENV::ServiceRoot = OXOOLWSD::ServiceRoot;
    ENV::SSLEnabled = OXOOLWSD::isSSLEnabled() || OXOOLWSD::isSSLTermination();

    ENV::AdminEnabled = OXOOLWSD::AdminEnabled;
}

} // namespace OxOOL

namespace OxOOL
{
    /// Initialize the library.
    void initialize()
    {
        OxOOL::ENV::initialize();

        // Start the module manager.
        ModuleManager::instance().start();
    }

    const std::vector<OxOOL::Module::Detail> getAllModuleDetails()
    {
        return ModuleManager::instance().getAllModuleDetails();
    }

    /// @brief if the request is handled by the library.
    /// @param request
    /// @param disposition
    /// @return true - handled, false - not handled
    bool handleRequest(const Poco::Net::HTTPRequest& request, SocketDisposition& disposition)
    {
        return ModuleManager::instance().handleRequest(request, disposition);
    }

    /// Cleanup the library.
    void cleanup()
    {
        ModuleManager::instance().stop();
    }

    /// @brief if the client input is handled by the library.
    /// @param tokens
    /// @param firstLine
    /// @return true - handled, false - not handled
    bool handleClientInput(const std::shared_ptr<ClientSession>& clientSession,
                           const StringVector& tokens, const std::string& firstLine)
    {
        (void)clientSession;
        (void)tokens;
        (void)firstLine;
#if ENABLE_DEBUG
        // TODO: Implement this.

        //return ModuleManager::instance().handleClientInput(clientSession, tokens, firstLine);
        std::cout << "handleClientInput: "
                  << clientSession->getUserId() << "(" << clientSession->getUserName() << "): "
                  << "\"" << firstLine << "\"" << std::endl;
#endif
        return false;
    }

    /// @brief if the client input is handled by the library.
    /// @param payload
    /// @return true - handled, false - not handled
    bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                  const std::shared_ptr<Message>& payload)
    {
        (void)clientSession;
        (void)payload;
#if ENABLE_DEBUG
        std::cout << "handleKitToClientMessage: "
                  << clientSession->getUserId() << "(" << clientSession->getUserName() << "): "
                  << "\"" << payload->firstLine() << "\"" << std::endl;
#endif
        return false;
    }

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
