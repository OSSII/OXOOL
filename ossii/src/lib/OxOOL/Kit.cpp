/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * Copyright the Collabora Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <OxOOL/OxOOL.h>
#include <OxOOL/Kit.h>

#include <Poco/JSON/Object.h>
#include <Poco/JSON/Parser.h>

#include <kit/ChildSession.hpp>

namespace OxOOL::Kit
{

bool handleChildMessage(const std::shared_ptr<ChildSession>& childSession,
                        const StringVector& tokens,
                        const std::shared_ptr<lok::Document>& lokitDocument)
{
    // if any of the commands are handled, set to true.
    bool handled = false;

    if (tokens.equals(0, "initunostatus"))
    {
        lokitDocument->setView(childSession->getViewId());
        lokitDocument->initUnoStatus(tokens[1].c_str());
        handled = true;
    }

    return handled;
}

} // namespace OxOOL::Kit

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
