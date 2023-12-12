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

bin_PROGRAMS = @PACKAGE_NAME@-xml-config

@PACKAGE_NAME@_xml_config_CPPFLAGS = -pthread \
			      ${include_paths}

@PACKAGE_NAME@_xml_config_LDADD = ../lib/@LIB_NAME@.la
@PACKAGE_NAME@_xml_config_SOURCES = XmlConfig.cpp

# vim: set noet sw=4 ts=4:
