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

static Poco::JSON::Object::Ptr LOKitVersionInfo; // LibreOfficeKit version information.
void setVersionInfo(const std::string versionString)
{
    LOKitVersionInfo = Poco::JSON::Parser().parse(versionString).extract<Poco::JSON::Object::Ptr>();
}

const Poco::JSON::Object::Ptr& getLOKitVersion()
{
    return LOKitVersionInfo;
}

bool handleChildMessage(const std::shared_ptr<ChildSession>& childSession,
                        const StringVector& tokens)
{
    (void)childSession;
    (void)tokens;

    return false;
}

} // namespace OxOOL::Kit

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
