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

#include <Poco/JSON/Object.h>

namespace lok
{
class Document;
}   // namespace lok

class ChildSession;
class StringVector;

namespace OxOOL
{

namespace Kit
{

/// @brief if the client input is handled by the library.
bool handleChildMessage(const std::shared_ptr<ChildSession>& childSession,
                        const StringVector& tokens,
                        const std::shared_ptr<lok::Document>& lokitDocument);

} // namespace Kit
} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
