# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

pamdir = ${sysconfdir}/pam.d

sudoersdir = ${sysconfdir}/sudoers.d
EXTRA_DIST = pam.d/pam \
	     sudoers.d/lool

install-data-local:
	$(INSTALL) -d $(DESTDIR)$(pamdir)
	$(INSTALL) -m 0640 $(srcdir)/pam.d/pam $(DESTDIR)$(pamdir)/@PACKAGE@
	$(INSTALL) -d $(DESTDIR)$(sudoersdir)
	$(INSTALL) -m 0440 $(srcdir)/sudoers.d/lool $(DESTDIR)$(sudoersdir)/@PACKAGE@

uninstall-local:
	rm -f $(DESTDIR)$(pamdir)
	rm -f $(DESTDIR)$(sudoersdir)

## vim: set noet sw=4 ts=4:
