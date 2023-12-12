# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

DIST_FOLDER = $(top_srcdir)/browser/dist

.PHONY: build-browserdist

all-local: build-browserdist

BRANDING_DIR = $(srcdir)/branding

# 複製 uiconfig/ 所有檔案
UICONFIG_SRC = $(shell find $(srcdir)/uiconfig -name '*.*')
UICONFIG_DST = $(patsubst $(srcdir)/%,$(DIST_FOLDER)/%,$(UICONFIG_SRC))
$(DIST_FOLDER)/uiconfig/%: $(srcdir)/uiconfig/%
	@$(MKDIR_P) $(dir $@)
	@cp $< $@

# 複製圖片檔案
IMAGES_SRC = $(shell find $(srcdir)/images -name '*.*')
IMAGES_DST = $(patsubst $(srcdir)/%,$(DIST_FOLDER)/%,$(IMAGES_SRC))
$(DIST_FOLDER)/images/%: $(srcdir)/images/%
	@$(MKDIR_P) $(dir $@)
	@cp $< $@

# 準備打包的 JS 檔案列表
OXOOL_JS_LIST = \
	js/control/Permission.Extensions.js \
	js/control/IconAlias.js \
	js/control/Toolbar.Extensions.js \
	js/control/Parts.Extensions.js \
	js/control/Control.AlternativeCommand.js \
	js/control/Control.Dialogs.js \
	js/control/Control.ContextMenu.js \
	js/control/Control.Menubar.js \
	js/control/Control.ReadonlyBar.js \
	js/control/Control.OxOOLMain.js \
	js/main.js


# 產生打包用的 JS 檔案
$(BRANDING_DIR)/branding-src.js: $(OXOOL_JS_LIST)
	@echo "Checking for JS errors..."
	@$(NODE) $(top_srcdir)/browser/node_modules/eslint/bin/eslint.js $(srcdir)/js \
		--config $(top_srcdir)/browser/.eslintrc
	@echo "Bundling $@..."
	@$(MKDIR_P) $(dir $@)
	@cat $^ >> $@
	@echo "Done bundling $@."

# 壓縮打包用的 JS 檔案
$(DIST_FOLDER)/branding.js: $(BRANDING_DIR)/branding-src.js
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
	css/notebookbar.css

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
	$(DIST_FOLDER)/branding.js \
	$(DIST_FOLDER)/branding.css \
	$(DIST_FOLDER)/branding-mobile.css \
	$(DIST_FOLDER)/branding-tablet.css \
	$(DIST_FOLDER)/branding-desktop.css
	@echo "Done building browser dist"

# 清除打包用的相關檔案及目錄
clean-local:
	@echo "Cleaning browser dist"
	$(RM) -f $(DIST_FOLDER)/branding.js
	$(RM) -f $(DIST_FOLDER)/branding*.css
	$(RM) -rf $(DIST_FOLDER)/uiconfig
	$(RM) -rf $(DIST_FOLDER)/images/cmd
	$(RM) -rf $(DIST_FOLDER)/images/extcursors
	$(RM) -rf $(DIST_FOLDER)/images/res
	$(RM) -rf $(BRANDING_DIR)

EXTRA_DIST = $(shell find . -type f -not -path './.git/*' | sed 's/.\///')

# vim: set noet sw=4 ts=4:
