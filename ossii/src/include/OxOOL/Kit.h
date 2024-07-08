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

#include <memory>

#include <OxOOL/ENV.h> // Include the header file that defines OxOOL::ENV

#define LOK_USE_UNSTABLE_API
#include <LibreOfficeKit/LibreOfficeKitInit.h>

class ChildSession;
class StringVector;

namespace OxOOL
{

namespace Kit
{

/// @brief Initialize the Kit library.
void initialize(LibreOfficeKit* loKitPtr);

class ENV final : public OxOOL::ENV
{
    ENV() = delete;
    ENV(const ENV&) = delete;
    ENV& operator=(const ENV&) = delete;
public:
    ENV(OxOOL::ENV::Mode mode);
    ~ENV() override;

private:
    void initialize() override;
};

/// @brief The Child extension session.
class ExtensionSession
{
public:
    ExtensionSession(ChildSession& session);
    virtual ~ExtensionSession();

    /// @brief Handle a message from the child.
    /// @param buffer The message buffer.
    /// @param length The message length.
    /// @param tokens The message tokens.
    /// @return True if the message was handled.
    bool handleChildMessage(const char* buffer, int length, const StringVector& tokens);

// Private methods -----------------------------------------------------------
private:
    /// @brief Handle a text input message.
    bool textInput(const StringVector& tokens);

// Private members -----------------------------------------------------------
private:
    ChildSession& mrSession;
};

} // namespace Kit
} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
