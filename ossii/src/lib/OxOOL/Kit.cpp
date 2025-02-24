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

#include <fstream>
#include <memory>
#include <string_view>

#include <OxOOL/ENV.h>
#include <OxOOL/Util.h>
#include <OxOOL/Kit.h>

#include <Poco/JSON/Object.h>
#include <Poco/JSON/Parser.h>
#include <Poco/Path.h>
#include <Poco/URI.h>
#include <Poco/TemporaryFile.h>

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

bool ExtensionSession::handleChildMessage(const std::string& firstLine, const StringVector& tokens)
{
    (void)firstLine;
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
    else if (tokens.equals(0, "writetext"))
    {
        writeText(tokens);
        handled = true;
    }
    else if (tokens.equals(0, "insertpicture"))
    {
        insertPicture(tokens);
        handled = true;
    }
    else if (tokens.equals(0, "changepicture"))
    {
        insertPicture(tokens, true);
        handled = true;
    }

    return handled;
}

bool ExtensionSession::writeText(const StringVector& tokens)
{
    int id = -1, cursor = -1;
    std::string type;
    std::string decodedText;

    for (std::size_t i = 1; i < tokens.size(); ++i)
    {
        std::string name, value;
        OXOOLProtocol::parseNameValuePair(tokens[i], name, value);
        if (name == "id")
            id = std::stoi(value);
        else if (name == "text")
            Poco::URI::decode(value, decodedText);
        else if (name == "type")
            type = value;
        else if (name == "cursor")
            cursor = std::stoi(value);
    }

#if ENABLE_DEBUG
    std::cout << "id: " << id << ", text: " << decodedText
              << ", type: " << type << ", cursor: " << cursor << std::endl;
#endif

    mrSession.getLOKitDocument()->setView(mrSession.getViewId());
    if (type != "input")
    {
        // Insert text to document.
        mrSession.getLOKitDocument()->postWindowExtTextInputEvent(id, LOK_EXT_TEXTINPUT, decodedText.c_str());
        mrSession.getLOKitDocument()->postWindowExtTextInputEvent(id, LOK_EXT_TEXTINPUT_END, decodedText.c_str());
    }
    else
    {
        // Send preview text with cursor position.
        mrSession.getLOKitDocument()->postWindowExtTextInputEventEnhance(id, LOK_EXT_TEXTINPUT, decodedText.c_str(), cursor);
    }

    return true;
}

bool ExtensionSession::insertPicture(const StringVector& tokens, bool isChange)
{
    std::string data;

    if (tokens.size() != 2 || !OXOOLProtocol::getTokenString(tokens[1], "data", data))
    {
        mrSession.sendTextFrame("error: cmd=insertpicture kind=syntax");
        return false;
    }

    auto binaryData = OxOOL::Util::decodeBase64(data);

    // Create a temporary directory to store the image file.
    Poco::TemporaryFile tempDir(Poco::Path::temp());
    tempDir.createDirectories();
    const std::string dirName = tempDir.path();
    const std::string fileName(std::to_string(mrSession.getViewId()));
    // Temporary file path.
    std::string tempFile = dirName + '/'  + fileName;
    // Write binary data to the temporary file.
    std::ofstream fileStream(tempFile, std::ofstream::out|std::ofstream::binary);
    fileStream.write(reinterpret_cast<char*>(binaryData.data()), binaryData.size());
    fileStream.close();

    std::string command = ".uno:InsertGraphic";
    std::string arguments = "{"
        "\"FileName\":{"
            "\"type\":\"string\","
            "\"value\":\"file://" + tempFile + "\""
        "}}";


    mrSession.getLOKitDocument()->setView(mrSession.getViewId());
    LOG_DBG((isChange ? "Change" : "Insert") << " picture '" << arguments << "'");
    // Insert picture to document. sync call.
    mrSession.getLOKitDocument()->postUnoCommand(command.c_str(), arguments.c_str(), true);
    tempDir.remove(true);

    return true;
}

} // namespace Kit
} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
