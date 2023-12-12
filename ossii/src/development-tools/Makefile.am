# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

if ENABLE_DEBUG
MODULE_TEMPLATE_DIR = $(abs_top_builddir)/src/development-tools/module-template
else
MODULE_TEMPLATE_DIR = ${datarootdir}/@PACKAGE_NAME@-devel/module-template
endif

include_paths = -I$(top_srcdir)/ossii/src/include \
                -I$(top_srcdir)/common \
                -I$(top_srcdir)/net \
                -I$(top_srcdir)/wsd

bin_PROGRAMS = @PACKAGE_NAME@-module-maker

@PACKAGE_NAME@_module_maker_CPPFLAGS = -pthread \
			      -DMODULE_TEMPLATE_DIR='"${MODULE_TEMPLATE_DIR}"' \
			      ${include_paths} \
			      $(GIT2_CFLAGS)

@PACKAGE_NAME@_module_maker_LDADD = $(GIT2_LIBS) $(top_srcdir)/ossii/src/lib/@LIB_NAME@.la
@PACKAGE_NAME@_module_maker_SOURCES = ModuleMaker.cpp

EXTRA_DIST = module-template

install-data-local:
	$(MKDIR_P) $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/
	cp -aR module-template $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/

uninstall-local:
	rm -fr $(DESTDIR)${datarootdir}/@PACKAGE_NAME@-devel/module-template

# vim: set noet sw=4 ts=4:
