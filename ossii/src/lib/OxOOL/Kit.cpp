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
#include <string_view>

#include <OxOOL/ENV.h>
#include <OxOOL/Kit.h>

#include <Poco/JSON/Object.h>
#include <Poco/JSON/Parser.h>
#include <Poco/URI.h>

#define LOK_USE_UNSTABLE_API
#include <LibreOfficeKit/LibreOfficeKitInit.h>

#include <common/Log.hpp>
#include <kit/Kit.hpp>
#include <kit/ChildSession.hpp>

namespace OxOOL
{
namespace Kit
{

LibreOfficeKit* LoKitPtr = nullptr;

void initialize(LibreOfficeKit* loKitPtr)
{
    LoKitPtr = loKitPtr;
    ENV env(OxOOL::ENV::Mode::KIT);
}

ENV::ENV(OxOOL::ENV::Mode mode)
    : OxOOL::ENV(mode)
{
    this->initialize();
}

ENV::~ENV()
{
}

void ENV::initialize()
{
    char* versionInfo = LoKitPtr->pClass->getVersionInfo(LoKitPtr);
    const std::string versionInfoStr(versionInfo);
    std::free(versionInfo);
    OxOOL::ENV::setLOKitVersionInfo(versionInfoStr);
}

ExtensionSession::ExtensionSession(ChildSession& session)
    : mrSession(session)
{
}

ExtensionSession::~ExtensionSession()
{
}

bool ExtensionSession::handleChildMessage(const char* buffer, int length, const StringVector& tokens)
{
    std::string_view firstLine(buffer, length);

    // if any of the commands are handled, set to true.
    bool handled = false;

    if (tokens.equals(0, "initunostatus"))
    {
        if (OxOOL::ENV::LOKitVersionInfo.has("initUnoStatus"))
        {
            mrSession.getLOKitDocument()->setView(mrSession.getViewId());
            mrSession.getLOKitDocument()->initUnoStatus(tokens[1].c_str());
        }
        else
        {
            LOG_ERR("LOKit does not support initUnoStatus.");
        }

        handled = true;
    }
    else if (tokens.equals(0, "textinput"))
    {
        handled = textInput(tokens);
    }

    return handled;
}

bool ExtensionSession::textInput(const StringVector& tokens)
{
    if (!OxOOL::ENV::LOKitVersionInfo.has("postWindowExtTextInputEventEnhance"))
    {
        LOG_ERR("LOKit does not support postWindowExtTextInputEventEnhance.");
        return false;
    }

    // tokens[0] = textinput
    // 其餘 tokens 必須要包括
    // id - view id
    // text - input text
    // type - input type. "input", "end"
    // cursor - cursor position in text

    int id = -1, cursor = -1, type = -1;
    std::string decodedText;

    for (std::size_t i = 1; i < tokens.size(); ++i)
    {
        std::string name, value;
        OXOOLProtocol::parseNameValuePair(tokens[i], name, value);
        if (name == "id")
            id = std::stoi(value);
        else if (name == "text")
        {
            Poco::URI::decode(value, decodedText);
        }
        else if (name == "type")
        {
            if (value == "input")
                type = LOK_EXT_TEXTINPUT;
            else if (value == "end")
                type = LOK_EXT_TEXTINPUT_END;
        }
        else if (name == "cursor")
            cursor = std::stoi(value);
    }

    if (id < 0 || cursor < 0 || type < 0)
        return false; // fall back to default handling.

    // end input event only needs id and type.
    // there is no need to set the text.
    if (type == LOK_EXT_TEXTINPUT_END)
        decodedText.clear();

    mrSession.getLOKitDocument()->setView(mrSession.getViewId());
    mrSession.getLOKitDocument()->postWindowExtTextInputEventEnhance(id, type, decodedText.c_str(), cursor);

    return true;
}

} // namespace Kit
} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
