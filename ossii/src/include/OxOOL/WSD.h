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

#include <string>

class ClientSession;
class StringVector;
class Message;

namespace OxOOL
{

class ModuleManager;

namespace WSD
{

class ExtensionSession
{
public:
    ExtensionSession(ClientSession& session);
    virtual ~ExtensionSession();

    /// @brief Handle a message from the child.
    /// @param firstLine The first line of the message.
    /// @param tokens The message tokens.
    /// @return True if the message was handled.
    bool handleClientMessage(const std::string& firstLine, const StringVector& tokens);

    /// @brief Handle a message from the kit.
    /// @param payload The message.
    /// @return True if the message was handled.
    bool handleKitToClientMessage(const std::shared_ptr<Message>& payload);

private:
    ClientSession& mrSession;

}; // class ExtensionSession

} // namespace WSD

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
