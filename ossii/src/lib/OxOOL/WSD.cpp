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

#include <memory>

#include <OxOOL/ENV.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/WSD.h>

#include <common/Log.hpp>
#include <common/Message.hpp>
#include <common/StringVector.hpp>
#include <wsd/DocumentBroker.hpp>
#include <wsd/ClientSession.hpp>


namespace OxOOL
{
namespace WSD
{

static OxOOL::ModuleManager& ModuleMgr = OxOOL::ModuleManager::instance();

ExtensionSession::ExtensionSession(ClientSession& session)
    : mrSession(session)
{
}

ExtensionSession::~ExtensionSession()
{
}

bool ExtensionSession::handleClientMessage(const std::string& firstLine, const StringVector& tokens)
{
    (void)firstLine;

    // if any of the commands are handled, set to true.
    bool handled = false;
    std::shared_ptr<DocumentBroker> docBroker = mrSession.getDocumentBroker();

    if (tokens.equals(0, "load"))
    {
        // 尚未載入文件
        if (mrSession.getDocURL().empty())
        {
            std::string lang = "en-US";
            // find the lang=xx parameter
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
            mrSession.sendTextFrame("modules: " + ModuleMgr.getAllModuleDetailsJsonString(lang));
        }
        return false; // not handled. please don't change this.
    }
    else if (tokens.equals(0, "initunostatus"))
    {
        // LOKit 是否支援 initUnoStatus
        if (!OxOOL::ENV::LOKitVersionInfo.has("initUnoStatus"))
            mrSession.sendTextFrameAndLogError("error: cmd=initunostatus kind=unsupported");
        else if (tokens.size() != 2)
            mrSession.sendTextFrameAndLogError("error: cmd=initunostatus kind=syntax");
        else
            mrSession.forwardToChild(firstLine, docBroker);

        handled = true; // handled
    }
    else if (tokens.equals(0, "writetext"))
    {
        if (OxOOL::ENV::LOKitVersionInfo.has("postWindowExtTextInputEventEnhance"))
            mrSession.forwardToChild(firstLine, docBroker);
        else
            LOG_ERR("LoKit does not support postWindowExtTextInputEventEnhance.");

        handled = true; // handled
    }
    else if (tokens.equals(0, "uno") && tokens.size() > 1)
    {
        // If uno command is forbidden, return handled.
        handled = filterUnoCommand(tokens[1]);
    }
    else if (isDirectForward(tokens[0]))
    {
        mrSession.forwardToChild(firstLine, docBroker);
        handled = true;
    }


    // 如果沒有被處理，就交給 ModuleMgr 處理。
    if (!handled)
        handled = ModuleMgr.handleClientMessage(mrSession.client_from_this(), tokens);

    return handled;
}

bool ExtensionSession::handleKitToClientMessage(const std::shared_ptr<Message>& payload)
{
    return ModuleMgr.handleKitToClientMessage(mrSession.client_from_this(), payload);
}

// Private Methods -----------------------------------------------------------

bool ExtensionSession::filterUnoCommand(const std::string& unoCommand)
{
    static std::vector<std::string> exportFileCommands =
    {
        ".uno:SaveGraphic", // text/spreadsheet/presentation/drawing
        ".uno:ExportAsGraphic", // spreadsheet
        ".uno:SaveBackground", // presentation
        ".uno:ExternalEdit", // text/spreadsheet/presentation/drawing
    };

    // If DisableCopy turned on, then we don't allow any export file command.
    if (mrSession._wopiFileInfo && mrSession._wopiFileInfo->getDisableCopy())
    {
        for (const auto& cmd : exportFileCommands)
        {
            if (cmd.find(unoCommand) == 0) // starts with
            {
                mrSession.sendTextFrame("error: cmd=" + unoCommand + " kind=forbidden");
                return true; // handled
            }
        }
    }

    return false;
}

bool ExtensionSession::isDirectForward(const std::string& cmd)
{
    static std::vector<std::string> directCommands =
    {
        "insertpicture",
        "changepicture",
    };

    for (auto directCmd : directCommands)
    {
        if (cmd == directCmd)
            return true;
    }

    return false;
}

} // namespace WSD

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
