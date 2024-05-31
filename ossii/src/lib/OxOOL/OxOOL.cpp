/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <config.h>
#include <config_unused.h>

#include <iomanip>
#include <openssl/rand.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/Util/Application.h>
#include <Poco/JSON/Parser.h>

#include <common/Message.hpp>
#include <common/StringVector.hpp>
#include <common/Util.hpp>
#include <wsd/OXOOLWSD.hpp>
#include <wsd/ClientSession.hpp>

#include "Private/Watermark.hpp"

namespace OxOOL
{
std::string ENV::Version;
std::string ENV::VersionHash;

std::string ENV::ConfigFile;

std::string ENV::HttpAgentString;
std::string ENV::HttpServerString;

std::string ENV::FileServerRoot;
std::string ENV::SysTemplate;
std::string ENV::ModuleDir;
std::string ENV::ModuleConfigDir;
std::string ENV::ModuleDataDir;

bool        ENV::SSLEnabled = false;
std::string ENV::ServerProtocol;
int         ENV::ServerPortNumber = 0;
std::string ENV::ServiceRoot;

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

    ENV::ConfigFile        = OXOOLWSD::ConfigFile;

    ENV::FileServerRoot   = OXOOLWSD::FileServerRoot;
    ENV::SysTemplate      = OXOOLWSD::SysTemplate;
    ENV::ModuleDir        = OXOOL_MODULE_DIR;
    ENV::ModuleConfigDir  = OXOOL_MODULE_CONFIG_DIR;
    ENV::ModuleDataDir    = OXOOL_MODULE_DATA_DIR;

    ENV::SSLEnabled       = OXOOLWSD::isSSLEnabled() || OXOOLWSD::isSSLTermination();
    ENV::ServerProtocol   = ENV::SSLEnabled ? "https://" : "http://";
    ENV::ServerPortNumber = OXOOLWSD::getClientPortNumber();
    ENV::ServiceRoot      = OXOOLWSD::ServiceRoot;

    ENV::AdminEnabled = OXOOLWSD::AdminEnabled;
}

} // namespace OxOOL

namespace OxOOL
{
    static ModuleManager& ModuleMgr = ModuleManager::instance();
    static Watermark Watermark;

    /// Initialize the library.
    void initialize()
    {
        // Initialize the environment.
        OxOOL::ENV::initialize();
        // Initialize the module manager.
        ModuleMgr.initialize();
        // Initialize the watermark.
        Watermark.initialize();
    }

    void enhanceWatermark(const std::shared_ptr<ClientSession>& session)
    {
        Watermark.enhanceWatermark(session);
    }

    const std::vector<OxOOL::Module::Detail> getAllModuleDetails()
    {
        return ModuleMgr.getAllModuleDetails();
    }

    /// @brief if the request is handled by the library.
    /// @param request
    /// @param disposition
    /// @return true - handled, false - not handled
    bool handleRequest(const Poco::Net::HTTPRequest& request, SocketDisposition& disposition)
    {
        return ModuleMgr.handleRequest(request, disposition);
    }

    void dumpAllModuleInfo()
    {
        // TODO: Implement this.
    }

    /// Cleanup the library.
    void cleanup()
    {
        ModuleMgr.stop();
    }

    /// @brief if the client input is handled by the library.
    /// @param tokens
    /// @param firstLine
    /// @return true - handled, false - not handled
    bool handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                             const StringVector& tokens)
    {
        return ModuleMgr.handleClientMessage(clientSession, tokens);
    }

    /// @brief if the client input is handled by the library.
    /// @param payload
    /// @return true - handled, false - not handled
    bool handleKitToClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                                  const std::shared_ptr<Message>& payload)
    {
        return ModuleMgr.handleKitToClientMessage(clientSession, payload);
    }

    void handleAdminMessage(const SendTextMessageFn& sendTextMessage,
                            const StringVector& tokens)
    {
        ModuleMgr.handleAdminMessage(sendTextMessage, tokens);
    }

    bool isConfigAuthOk(const std::string& userProvidedUsr, const std::string& userProvidedPwd)
    {
        const auto& config = Poco::Util::Application::instance().config();
        const std::string& user = config.getString("admin_console.username", "");

        // Check for the username
        if (user.empty())
        {
            LOG_ERR("Admin Console username missing, admin console disabled.");
            return false;
        }
        else if (user != userProvidedUsr)
        {
            LOG_ERR("Admin Console wrong username.");
            return false;
        }

        const char useOxoolconfig[] = " Use Oxoolconfig to configure the admin password.";

        // do we have secure_password?
        if (config.has("admin_console.secure_password"))
        {
            const std::string securePass = config.getString("admin_console.secure_password", "");
            if (securePass.empty())
            {
                LOG_ERR("Admin Console secure password is empty, denying access." << useOxoolconfig);
                return false;
            }

#if HAVE_PKCS5_PBKDF2_HMAC
            // Extract the salt from the config
            std::vector<unsigned char> saltData;
            StringVector tokens = StringVector::tokenize(securePass, '.');
            if (tokens.size() != 5 ||
                !tokens.equals(0, "pbkdf2") ||
                !tokens.equals(1, "sha512") ||
                !Util::dataFromHexString(tokens[3], saltData))
            {
                LOG_ERR("Incorrect format detected for secure_password in config file." << useOxoolconfig);
                return false;
            }

            unsigned char userProvidedPwdHash[tokens[4].size() / 2];
            PKCS5_PBKDF2_HMAC(userProvidedPwd.c_str(), -1,
                            saltData.data(), saltData.size(),
                            std::stoi(tokens[2]),
                            EVP_sha512(),
                            sizeof userProvidedPwdHash, userProvidedPwdHash);

            std::stringstream stream;
            for (unsigned long j = 0; j < sizeof userProvidedPwdHash; ++j)
                stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(userProvidedPwdHash[j]);

            // now compare the hashed user-provided pwd against the stored hash
            return tokens.equals(4, stream.str());
#else
            const std::string pass = config.getString("admin_console.password", "");
            LOG_ERR("The config file has admin_console.secure_password setting, "
                    << "but this application was compiled with old OpenSSL version, "
                    << "and this setting cannot be used." << (!pass.empty()? " Falling back to plain text password.": ""));

            // careful, a fall-through!
#endif
        }

        const std::string pass = config.getString("admin_console.password", "");
        if (pass.empty())
        {
            LOG_ERR("Admin Console password is empty, denying access." << useOxoolconfig);
            return false;
        }

        return pass == userProvidedPwd;
    }

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
