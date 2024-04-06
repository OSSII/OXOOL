# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

SUBDIRS = . admin

DIST_FOLDER = $(top_srcdir)/browser/dist

.PHONY: build-browserdist

all-local: build-browserdist

# 複製 uiconfig/ 所有檔案
UICONFIG_SRC = $(shell find $(srcdir)/uiconfig -name '*.*')
UICONFIG_DST = $(patsubst $(srcdir)/%,$(DIST_FOLDER)/%,$(UICONFIG_SRC))
$(DIST_FOLDER)/uiconfig/%: $(srcdir)/uiconfig/%
	@$(MKDIR_P) $(dir $@)
	@cp $< $@

ADMIN_JS_LIST = \
	../admin/js/global.js \
	../admin/js/color-scheme-switcher.js \
	../admin/src/Base.js \
	../admin/src/AdminSocketBase.js \
	../admin/src/Util.js

# 準備打包的 JS 檔案列表
OXOOL_JS_LIST = \
	js/BrandingData.js \
	js/OxOOL.js \
	js/ModuleManager.js \
	js/map/handler/Map.AlternativeCommand.js \
	js/map/handler/Map.StateChanges.Extend.js \
	js/control/Permission.Extensions.js \
	js/control/IconAlias.js \
	js/control/Toolbar.Extensions.js \
	js/control/Parts.Extensions.js \
	js/control/Control.Dialogs.js \
	js/control/Control.ContextMenu.js \
	js/control/Control.Menubar.js \
	js/control/Control.ReadonlyBar.js \
	js/spectrum.js \
	js/main.js

pot:
	xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --output=po/ossii.pot \
		$(OXOOL_JS_LIST) \
		$(ADMIN_L10N_JS_LIST)

	msguniq -w 78 -t UTF-8 po/ossii.pot > po/ossii.pot.new; mv po/ossii.pot.new po/ossii.pot

l10n: pot
	for i in po/*.po; do pot2po --input=po/ossii.pot --template=$$i --output=$$i.new; mv $$i.new $$i;done

L10N_PO = $(wildcard $(srcdir)/po/*.po)
L10N_JSON = $(patsubst $(srcdir)/po/%.po,$(DIST_FOLDER)/l10n/ossii/%.json,$(L10N_PO))

# 產生打包用的 JS 檔案
ossii-src.js: $(OXOOL_JS_LIST)
	@echo "Checking for JS errors..."
	@$(NODE) $(top_srcdir)/browser/node_modules/eslint/bin/eslint.js $(srcdir)/js \
		--config $(top_srcdir)/browser/.eslintrc \
		--ignore-path $(srcdir)/.eslintignore
	@echo "Bundling $@..."
	@$(MKDIR_P) $(dir $@)
	@cat $^ > $@
	@echo "Done bundling $@."

# 壓縮打包用的 JS 檔案
$(DIST_FOLDER)/ossii.js: ossii-src.js
	@echo "Uglifying $@..."
	@$(MKDIR_P) $(dir $@)
	@$(RM) -f $@
	@${top_srcdir}/browser/node_modules/uglify-js/bin/uglifyjs \
		-O max_line_len=100 \
		$^ \
		--output $@


#
$(DIST_FOLDER)/branding-%.css: css/branding-%.css
	@echo "Uglifying $@..."
	@$(MKDIR_P) $(dir $@)
	@$(NODE) $(top_srcdir)/browser/node_modules/uglifycss/uglifycss $< > $@

OXOOL_CSS_LIST = \
	css/oxool.css \
	css/color-palette.css \
	css/color-palette-dark.css \
	css/jsdialogs.css \
	css/jssidebar.css \
	css/menubar.css \
	css/notebookbar.css \
	css/spectrum.css

$(DIST_FOLDER)/l10n/ossii-localizations.json: $(srcdir)/l10n/ossii-localizations.json
	@echo "Copying $@..."
	@$(MKDIR_P) $(dir $@)
	cp $< $@

$(DIST_FOLDER)/branding.css: $(OXOOL_CSS_LIST)
	@echo "Checking for CSS errors..."
	@$(NODE) $(top_srcdir)/browser/node_modules/stylelint/bin/stylelint.js --config $(top_srcdir)/browser/.stylelintrc.json $(srcdir)/css/*.css
	@echo "Uglifying $@..."
	@$(MKDIR_P) $(dir $@)
	@$(NODE) $(top_srcdir)/browser/node_modules/uglifycss/uglifycss $^ > $@

#
build-browserdist: \
	$(IMAGES_DST) \
	$(UICONFIG_DST) \
	$(DIST_FOLDER)/ossii.js \
	$(DIST_FOLDER)/branding.css \
	$(DIST_FOLDER)/branding-mobile.css \
	$(DIST_FOLDER)/branding-tablet.css \
	$(DIST_FOLDER)/branding-desktop.css \
	$(DIST_FOLDER)/l10n/ossii-localizations.json
	@echo "Done building browser dist"

# 清除打包用的相關檔案及目錄
clean-local:
	@echo "Cleaning browser dist"
	$(RM) -f $(DIST_FOLDER)/ossii.js
	$(RM) -f $(DIST_FOLDER)/branding*.css
	$(RM) -f $(DIST_FOLDER)/l10n/ossii-localizations.json
	$(RM) -rf $(DIST_FOLDER)/uiconfig
	$(RM) -rf ossii-src.js

EXTRA_DIST = $(shell find . -type f -not -path './.git/*' | sed 's/.\///')

# vim: set noet sw=4 ts=4:
