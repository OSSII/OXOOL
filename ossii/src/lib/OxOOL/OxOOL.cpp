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

#include <iomanip>
#include <openssl/rand.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ENV.h>
#include <OxOOL/Util.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/ZipPackage.h>
#include <OxOOL/ResourceManager.h>

#include <Poco/DirectoryIterator.h>
#include <Poco/File.h>
#include <Poco/Path.h>
#include <Poco/URI.h>
#include <Poco/Util/Application.h>
#include <Poco/JSON/Object.h>

#include <common/JailUtil.hpp>
#include <common/Log.hpp>
#include <common/Message.hpp>
#include <common/StringVector.hpp>
#include <wsd/OXOOLWSD.hpp>
#include <wsd/ClientSession.hpp>

#include "Private/Watermark.hpp"

namespace OxOOL
{
    static std::atomic<bool> OxOOLInitialized(false);
    static ModuleManager& ModuleMgr = ModuleManager::instance();
    static Watermark Watermark;

    /// Initialize the library.
    /**
     * @brief Initializes the OxOOL library.
     *
     * This function initializes the OxOOL library by performing the following steps:
     * 1. Checks if the library has already been initialized. If it has, the function returns.
     * 2. Prints a message indicating that the initialization process has started.
     * 3. Initializes the environment using the WSD mode.
     * 4. Initializes the module manager.
     * 5. Initializes the watermark.
     *
     * @note This function should be called before using any other functionality provided by the OxOOL library.
     */
    void initialize()
    {
        if (OxOOLInitialized.exchange(true))
        {
            LOG_WRN("OxOOL::initialize() called more than once.");
            return;
        }

        // Initialize the environment.
        ENV::initialize();
        // Initialize the module manager.
        ModuleMgr.initialize();
        // Initialize the watermark.
        Watermark.initialize();
    }

    /// @brief Check if the library is initialized.
    bool isInitialized()
    {
        return OxOOLInitialized;
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
        if (OxOOLInitialized)
            return ModuleMgr.handleRequest(request, disposition);
        else
        {
            LOG_ERR("OxOOL::handleRequest() called before initialization.");
            return false;
        }
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
    /// @param clientSession
    /// @param tokens
    /// @return true - handled, false - not handled
    bool handleClientMessage(const std::shared_ptr<ClientSession>& clientSession,
                             const StringVector& tokens)
    {
        // if handled by any command, return true.
        bool handled = false; // not handled

        const std::shared_ptr<DocumentBroker> docBroker = clientSession->getDocumentBroker();
        const std::string firstLine = OxOOL::Util::tokensToString(tokens);

        // NOTE: 特殊處理：介入 load 指令，先把模組列表送給 client，然後傳回 false，
        // 讓 ClientSession 的 _handleInput() 繼續處理。
        if (tokens.equals(0, "load") )
        {
            // 尚未載入文件
            if (clientSession->getDocURL().empty())
            {
                std::string lang("en-US"); // 預設語言
                // 先找出 lang=? 的參數
                for (std::size_t i = 1; i < tokens.size(); ++i)
                {
                    if (tokens[i].find("lang=") == 0)
                    {
                        lang = tokens[i].substr(5);
                        if (lang == "en")
                            lang = "en-US";

                        break;
                    }
                }
                clientSession->sendTextFrame("modules: " + ModuleMgr.getAllModuleDetailsJsonString(lang));
            }
            return false; // not handled. please don't change this.
        }
        else if (tokens.equals(0, "initunostatus"))
        {
            // LOKit 是否支援 initUnoStatus
            if (!OxOOL::ENV::LOKitVersionInfo->has("initUnoStatus"))
                clientSession->sendTextFrameAndLogError("error: cmd=initunostatus kind=unsupported");
            else if (tokens.size() != 2)
                clientSession->sendTextFrameAndLogError("error: cmd=initunostatus kind=syntax");
            else
                docBroker->forwardToChild(clientSession, firstLine);

            handled = true; // handled
        }

        // 如果沒有被處理，就交給 ModuleMgr 處理。
        if (!handled)
            handled = ModuleMgr.handleClientMessage(clientSession, tokens);

        return handled;
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

/*-------------------------
 * Jail related functions.
 -------------------------*/
namespace OxOOL::Jail
{
    void createExtensionsTemplate(const std::string& childRoot,
                                  const std::string& loTemplate,
                                  const std::string& fileServerRoot)
    {
        const std::string extenstionsPath = Poco::Path(childRoot).append(CHILDROOT_TMP_EXTENSIONS_PATH).toString();
        LOG_INF("Creating extensions template at: " << extenstionsPath );
        JailUtil::createJailPath(extenstionsPath);

        const std::string loExtenstionsPath = loTemplate + "/share/extensions";
        // Check if LibreOffice extensions directory exists.
        if (Poco::File(loExtenstionsPath).exists() && Poco::File(loExtenstionsPath).isDirectory())
        {
            for (Poco::DirectoryIterator it(loExtenstionsPath); it != Poco::DirectoryIterator(); ++it)
            {
                LOG_INF("Copying LO extension: [" << it->path() << "] to [" << extenstionsPath << "]");
                Poco::File(it->path()).copyTo(extenstionsPath);
            }
        }
        else
        {
            LOG_ERR("LO extensions directory not found: " << loExtenstionsPath);
            // remove the extensions template directory.
            Poco::File(extenstionsPath).remove(true);
            return;
        }

        // Extract OxOOL extensions.
#if ENABLE_DEBUG
        const std::string sysExtenstionsPath = fileServerRoot + "/ossii/extensions";
#else
        const std::string sysExtenstionsPath = fileServerRoot + "/extensions";
#endif
        // Check if system extensions directory exists.
        bool hasOxtFiles = false;
        if (Poco::File(sysExtenstionsPath).exists() && Poco::File(sysExtenstionsPath).isDirectory())
        {
            for (Poco::DirectoryIterator it(sysExtenstionsPath); it != Poco::DirectoryIterator(); ++it)
            {
                const Poco::Path extFile(it->path());
                if (it->isFile() && extFile.getExtension() == "oxt")
                {
                    hasOxtFiles = true;
                    const std::string dirName = extFile.getFileName();
                    const Poco::Path oxtDir(extenstionsPath, dirName);
                    // Extract the oxt file.
                    LOG_INF("Extracting OXT file: " << it->path() << " to " << oxtDir.toString());
                    OxOOL::ZipPackage::decompressAllFiles(it->path(), oxtDir.toString());
                }
            }
        }

        if (!hasOxtFiles)
        {
            LOG_ERR("No OXT files found in: " << sysExtenstionsPath << ", removing extensions template: " << extenstionsPath);
            // remove the extensions template directory.
            Poco::File(extenstionsPath).remove(true);
        }
    }

    bool mountExtensionsTemplate(const std::string& childRoot, const std::string& jailId)
    {
        // Extensions template directory.
        const std::string extenstionsPath = Poco::Path(childRoot).append(CHILDROOT_TMP_EXTENSIONS_PATH).toString();
        // Check if extensions template directory exists.
        if (!Poco::File(extenstionsPath).exists() || !Poco::File(extenstionsPath).isDirectory())
        {
            LOG_ERR("Extensions template directory not found: " << extenstionsPath);
            return false;
        }

        // Jail path.
        const std::string jailPath = Poco::Path(childRoot).append(jailId).toString();
        // Check if jail directory exists.
        if (!Poco::File(jailPath).exists() || !Poco::File(jailPath).isDirectory())
        {
            LOG_ERR("Jail directory not found: " << jailPath);
            return false;
        }

        // Extensions jail directory.
        const std::string loJailExtensionsPath =
            Poco::Path(jailPath + '/' + JailUtil::LO_JAIL_SUBPATH + "/share/extensions").toString();
        // Bind mount the extensions template to the jail.
        if (!JailUtil::bind(extenstionsPath, loJailExtensionsPath) ||
            !JailUtil::remountReadonly(extenstionsPath, loJailExtensionsPath))
        {
            LOG_ERR("Failed to bind mount extensions template to jail: ["
                    << extenstionsPath << "] to [" << loJailExtensionsPath << "]");
            return false;
        }

        return true;
    }
} // namespace OxOOL::Jail

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
