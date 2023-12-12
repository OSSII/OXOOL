# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

include_paths = -I$(top_srcdir)/ossii/src/include \
		-I$(top_srcdir)/common \
		-I$(top_srcdir)/net \
		-I$(top_srcdir)/wsd

configdir = @OXOOLWSD_MODULE_CONFIG_DIR@
dist_config_DATA = Announce.xml

# Module install path
moduledir = @OXOOLWSD_MODULE_DIR@
module_LTLIBRARIES = announce.la

announce_la_CPPFLAGS = -pthread ${include_paths}

announce_la_LDFLAGS = -avoid-version -module

announce_la_SOURCES = src/Announce.cpp

# vim: set noet sw=4 ts=4:
