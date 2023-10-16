# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#

DIST_FOLDER = $(top_srcdir)/browser/dist

.PHONY: build-browserdist

all-local: build-browserdist

BRANDING_DIR = $(srcdir)/branding

# 準備打包的 JS 檔案列表
OXOOL_JS_LIST = \
	js/control/Control.OxOOLMain.js \
	js/control/IconAlias.js \
	js/control/Toolbar.Extensions.js \
	js/control/Control.AlternativeCommand.js \
	js/control/Control.Menubar.js \
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
	$(RM) -rf $(BRANDING_DIR)

# vim: set noet sw=4 ts=4:
