# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

SUBDIRS = browser etc extensions fonts

pkgconfigdir = $(libdir)/pkgconfig
#pkgconfig_DATA = @PACKAGE@.pc

install-data-local:
	$(INSTALL) -d $(DESTDIR)$(pkgconfigdir)
	$(INSTALL_DATA) $(srcdir)/online.pc $(DESTDIR)$(pkgconfigdir)/@PACKAGE@.pc

uninstall-local:
	rm -rf $(DESTDIR)$(pkgconfigdir)

# vim: set noet sw=4 ts=4:
