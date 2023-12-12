# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

OxOOL_includedir = $(includedir)/OxOOL
OxOOL_include_HEADERS = \
	OxOOL/OxOOL.h \
	OxOOL/ModuleManager.h \
	OxOOL/HttpHelper.h \
	OxOOL/L10NTranslator.h \
	OxOOL/Logger.h \
	OxOOL/XMLConfig.h \
	OxOOL/ConvertBroker.h \
	OxOOL/Util.h \
	OxOOL/Util/OptionlValidator.h \
	OxOOL/Util/FileValidator.h

OxOOL_Module_includedir = $(includedir)/OxOOL/Module
OxOOL_Module_include_HEADERS = \
	OxOOL/Module/Base.h \
	OxOOL/Module/Map.h

OxOOL_Net_includedir = $(includedir)/OxOOL/Net
OxOOL_Net_include_HEADERS = \
	OxOOL/Net/PrivateKeyHandler.h \
	OxOOL/Net/Util.h

# LibreOfficeKit headers
lokit_headers = \
	$(top_srcdir)/bundled/include/LibreOfficeKit/LibreOfficeKitEnums.h

lokit_includedir = $(includedir)/OxOOL/LibreOfficeKit
lokit_include_HEADERS = $(lokit_headers)

# Common headers
common_headers = \
	$(top_srcdir)/common/Common.hpp \
    $(top_srcdir)/common/Clipboard.hpp \
    $(top_srcdir)/common/Crypto.hpp \
    $(top_srcdir)/common/JsonUtil.hpp \
    $(top_srcdir)/common/FileUtil.hpp \
    $(top_srcdir)/common/JailUtil.hpp \
    $(top_srcdir)/common/LangUtil.hpp \
    $(top_srcdir)/common/Log.hpp \
    $(top_srcdir)/common/Protocol.hpp \
    $(top_srcdir)/common/StateEnum.hpp \
    $(top_srcdir)/common/StringVector.hpp \
    $(top_srcdir)/common/Seccomp.hpp \
    $(top_srcdir)/common/Session.hpp \
    $(top_srcdir)/common/Unit.hpp \
    $(top_srcdir)/common/Util.hpp \
    $(top_srcdir)/common/ConfigUtil.hpp \
    $(top_srcdir)/common/Authorization.hpp \
    $(top_srcdir)/common/MessageQueue.hpp \
    $(top_srcdir)/common/Message.hpp \
    $(top_srcdir)/common/MobileApp.hpp \
    $(top_srcdir)/common/Png.hpp \
    $(top_srcdir)/common/TraceEvent.hpp \
    $(top_srcdir)/common/Rectangle.hpp \
    $(top_srcdir)/common/RenderTiles.hpp \
    $(top_srcdir)/common/SigUtil.hpp \
    $(top_srcdir)/common/security.h \
    $(top_srcdir)/common/SpookyV2.h \
    $(top_srcdir)/common/CommandControl.hpp \
    $(top_srcdir)/common/Simd.hpp

common_includedir = $(includedir)/OxOOL/common
common_include_HEADERS = $(common_headers)

# Net headers
net_headers = \
	$(top_srcdir)/net/Buffer.hpp \
    $(top_srcdir)/net/DelaySocket.hpp \
    $(top_srcdir)/net/FakeSocket.hpp \
    $(top_srcdir)/net/HttpRequest.hpp \
    $(top_srcdir)/net/HttpHelper.hpp \
    $(top_srcdir)/net/NetUtil.hpp \
    $(top_srcdir)/net/ServerSocket.hpp \
    $(top_srcdir)/net/Socket.hpp \
    $(top_srcdir)/net/WebSocketHandler.hpp \
    $(top_srcdir)/net/WebSocketSession.hpp

net_includedir = $(includedir)/OxOOL/net
net_include_HEADERS = $(net_headers)

# WSD headers
wsd_headers = \
	$(top_srcdir)/wsd/Admin.hpp \
    $(top_srcdir)/wsd/AdminModel.hpp \
    $(top_srcdir)/wsd/Auth.hpp \
    $(top_srcdir)/wsd/ClientSession.hpp \
    $(top_srcdir)/wsd/ContentSecurityPolicy.hpp \
    $(top_srcdir)/wsd/DocumentBroker.hpp \
    $(top_srcdir)/wsd/ProxyProtocol.hpp \
    $(top_srcdir)/wsd/Exceptions.hpp \
    $(top_srcdir)/wsd/FileServer.hpp \
    $(top_srcdir)/wsd/ProxyRequestHandler.hpp \
    $(top_srcdir)/wsd/OXOOLWSD.hpp \
    $(top_srcdir)/wsd/ProofKey.hpp \
    $(top_srcdir)/wsd/RequestDetails.hpp \
    $(top_srcdir)/wsd/SenderQueue.hpp \
    $(top_srcdir)/wsd/ServerURL.hpp \
    $(top_srcdir)/wsd/Storage.hpp \
    $(top_srcdir)/wsd/TileCache.hpp \
    $(top_srcdir)/wsd/TileDesc.hpp \
    $(top_srcdir)/wsd/TraceFile.hpp \
    $(top_srcdir)/wsd/UserMessages.hpp \
    $(top_srcdir)/wsd/QuarantineUtil.hpp \
    $(top_srcdir)/wsd/HostUtil.hpp
	$(top_srcdir)/wsd/HostUtil.hpp

wsd_includedir = $(includedir)/OxOOL/wsd
wsd_include_HEADERS = $(wsd_headers)

# vim: set noet sw=4 ts=4:
