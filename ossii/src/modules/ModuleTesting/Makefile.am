# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

configdir = @OXOOLWSD_MODULE_CONFIG_DIR@
dist_config_DATA = ModuleTesting.xml

# Module install path
moduledir = @OXOOLWSD_MODULE_DIR@
module_LTLIBRARIES = ModuleTesting.la

ModuleTesting_la_CPPFLAGS = -pthread $(OSSII_CFLAGS)

ModuleTesting_la_LDFLAGS = -avoid-version -module

ModuleTesting_la_SOURCES = src/ModuleTesting.cpp

# vim: set noet sw=4 ts=4:
