# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

if ENABLE_DEBUG
MODULE_TEMPLATE_DIR = $(abs_top_builddir)/ossii/src/development-tools/module-template
else
MODULE_TEMPLATE_DIR = ${datarootdir}/@PACKAGE_NAME@-devel/module-template
endif

bin_PROGRAMS = @PACKAGE_NAME@-module-maker

@PACKAGE_NAME@_module_maker_CPPFLAGS = -pthread \
			      -DMODULE_TEMPLATE_DIR='"${MODULE_TEMPLATE_DIR}"' \
			      $(OSSII_CFLAGS) \
			      $(GIT2_CFLAGS)

@PACKAGE_NAME@_module_maker_LDFLAGS = $(GIT2_LIBS) $(OSSII_LIBS)
@PACKAGE_NAME@_module_maker_SOURCES = ModuleMaker.cpp

EXTRA_DIST = module-template

install-data-local:
	$(MKDIR_P) $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/
	cp -aR module-template $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/

uninstall-local:
	rm -fr $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/module-template

# vim: set noet sw=4 ts=4:
