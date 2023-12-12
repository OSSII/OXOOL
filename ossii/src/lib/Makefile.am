# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

include_paths = -I${top_srcdir}/common \
                -I${top_srcdir}/net \
                -I${top_srcdir}/wsd \
                -I${top_srcdir}/kit \
                -I${top_srcdir}/ossii/src/include

if ENABLE_SSL
include_paths += ${OPENSSL_CFLAGS}
endif

AM_CPPFLAGS = -pthread -DOXOOLWSD_DATADIR='"@OXOOLWSD_DATADIR@"' \
	      -DOXOOLWSD_CONFIGDIR='"@OXOOLWSD_CONFIGDIR@"' \
	      -DDEBUG_ABSSRCDIR='"@abs_srcdir@"' \
	      ${include_paths} \
          ${ZLIB_CFLAGS} ${ZSTD_CFLAGS} ${PNG_CFLAGS} ${FONTCONFIG_CFLAGS}

if !ENABLE_DEBUG
AM_CPPFLAGS += -DNDEBUG
endif

AM_LDFLAGS = -Wl,-E -lpam $(ZLIB_LIBS) $(ZSTD_LIBS) ${PNG_LIBS} ${FONTCONFIG_LIBS}

# Clang's linker doesn't like -pthread.
if !HAVE_CLANG
AM_LDFLAGS += -pthread
endif

if ENABLE_SSL
AM_LDFLAGS += ${OPENSSL_LIBS}
endif

lib_LTLIBRARIES = lib@LIB_LINK_NAME@.la

shared_sources = $(top_srcdir)/common/FileUtil.cpp \
                 $(top_srcdir)/common/JailUtil.cpp \
                 $(top_srcdir)/common/Log.cpp \
                 $(top_srcdir)/common/Protocol.cpp \
                 $(top_srcdir)/common/StringVector.cpp \
                 $(top_srcdir)/common/Session.cpp \
                 $(top_srcdir)/common/Seccomp.cpp \
                 $(top_srcdir)/common/MessageQueue.cpp \
                 $(top_srcdir)/common/MobileApp.cpp \
                 $(top_srcdir)/common/TraceEvent.cpp \
                 $(top_srcdir)/common/SigUtil.cpp \
                 $(top_srcdir)/common/SpookyV2.cpp \
                 $(top_srcdir)/common/Unit.cpp \
                 $(top_srcdir)/common/Util.cpp \
                 $(top_srcdir)/common/ConfigUtil.cpp \
                 $(top_srcdir)/common/Authorization.cpp \
                 $(top_srcdir)/common/CommandControl.cpp \
                 $(top_srcdir)/common/Simd.cpp \
                 $(top_srcdir)/net/DelaySocket.cpp \
                 $(top_srcdir)/net/HttpRequest.cpp \
                 $(top_srcdir)/net/HttpHelper.cpp \
                 $(top_srcdir)/net/NetUtil.cpp \
                 $(top_srcdir)/net/Socket.cpp \
                 $(top_srcdir)/wsd/Exceptions.cpp
if ENABLE_SSL
shared_sources += $(top_srcdir)/net/Ssl.cpp
endif

oxoolwsd_sources = $(top_srcdir)/common/Crypto.cpp \
                  $(top_srcdir)/wsd/Admin.cpp \
                  $(top_srcdir)/wsd/AdminModel.cpp \
                  $(top_srcdir)/wsd/Auth.cpp \
                  $(top_srcdir)/wsd/DocumentBroker.cpp \
                  $(top_srcdir)/wsd/ProxyProtocol.cpp \
                  $(top_srcdir)/wsd/OXOOLWSD.cpp \
                  $(top_srcdir)/wsd/ClientSession.cpp \
                  $(top_srcdir)/wsd/FileServer.cpp \
                  $(top_srcdir)/wsd/ProxyRequestHandler.cpp \
                  $(top_srcdir)/wsd/FileServerUtil.cpp \
                  $(top_srcdir)/wsd/RequestDetails.cpp \
                  $(top_srcdir)/wsd/Storage.cpp \
                  $(top_srcdir)/wsd/HostUtil.cpp \
                  $(top_srcdir)/wsd/TileCache.cpp \
                  $(top_srcdir)/wsd/ProofKey.cpp \
                  $(top_srcdir)/wsd/QuarantineUtil.cpp

oxoolcore_sources = \
                    OxOOL/Module/Base.cpp \
                    OxOOL/Module/Map.cpp \
                    OxOOL/Net/Util.cpp \
                    OxOOL/ModuleManager.cpp \
                    OxOOL/HttpHelper.cpp \
                    OxOOL/L10NTranslator.cpp \
                    OxOOL/Logger.cpp \
                    OxOOL/XMLConfig.cpp \
                    OxOOL/ConvertBroker.cpp \
                    OxOOL/Util.cpp \
                    OxOOL/Util/OptionlValidator.cpp \
                    OxOOL/Util/FileValidator.cpp

lib@LIB_LINK_NAME@_la_SOURCES = $(shared_sources) $(oxoolwsd_sources) $(oxoolcore_sources)

# vim: set noet sw=4 ts=4:
