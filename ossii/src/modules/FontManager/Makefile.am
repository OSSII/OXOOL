# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

# JavaScript files admin/
JS_FILES = $(shell find admin/ -name '*.js')
# Generate POT file
pot:
	@$(MKDIR_P) $(srcdir)/po
	@xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --output="po/FontManager.pot" \
	$(JS_FILES)

	@msguniq -w 78 -t UTF-8 po/FontManager.pot > po/FontManager.pot.new; mv po/FontManager.pot.new po/FontManager.pot

l10n: pot
	@for i in $(wildcard $(srcdir)/po/*.po); do \
		msgmerge --update --backup=off $$i po/FontManager.pot; \
		echo "Updated $$i"; \
	done

convert_po2json:
	@$(MKDIR_P) $(srcdir)/browser/l10n
	@for i in $(wildcard $(srcdir)/po/*.po); do \
		lang=$$(basename $$i .po); \
		$(top_srcdir)/ossii/scripts/po2json.py --quiet $$i -o $(srcdir)/browser/l10n/$$lang.json; \
		echo "Converted $$i to browser/l10n/$$lang.json"; \
	done

.PHONY: build-another

all-local: build-another

build-another: \
	convert_po2json

configdir = @OXOOL_MODULE_CONFIG_DIR@
dist_config_DATA = FontManager.xml

# Module install path
moduledir = @OXOOL_MODULE_DIR@
module_LTLIBRARIES = FontManager.la

FontManager_la_CPPFLAGS = -pthread $(OSSII_CFLAGS) $(FONTCONFIG_CFLAGS)

FontManager_la_LDFLAGS = -avoid-version -module $(OXOOL_LIBS) $(FONTCONFIG_LIBS)

FontManager_la_SOURCES = src/FontManager.cpp

admindir = @OXOOL_MODULE_DATA_DIR@/FontManager/admin
dist_admin_DATA = admin/admin.html admin/admin.js

l10ndir = @OXOOL_MODULE_DATA_DIR@/FontManager/browser/l10n
# json 是依據 po 檔案轉換而來，所以不需要加上 dist_l10n_DATA
l10n_DATA = $(wildcard browser/l10n/*.json)


EXTRA_DIST = $(wildcard $(srcdir)/po/*.po)

# vim: set noet sw=4 ts=4:
