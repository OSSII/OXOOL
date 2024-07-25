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

merge_po_to_json:
	@for i in $(wildcard $(srcdir)/po/*.po); do \
		POFILE="$$i"; \
		# 去掉 po/ 路徑前綴，取得語言代碼 \
		LANGCODE=$$(basename $$POFILE .po); \
		JSONFILE="$(DIST_FOLDER)/l10n/ui-$${LANGCODE}.json"; \
		# 如果沒有對應的 JSON 檔案，則不處理 \
		if [ ! -f "$$JSONFILE" ]; then \
			echo "$${JSONFILE} not found, skip..."; \
			continue; \
		fi; \
		echo "Merge $$POFILE to $$JSONFILE..."; \
		# 執行 mergepo2json.py 腳本，將 PO 檔案合併到 JSON 檔案 \
		$(top_srcdir)/ossii/scripts/mergepo2json.py --po "$$POFILE" --json "$$JSONFILE" --output "$$JSONFILE"; \
	done

# 複製 uiconfig/ 所有檔案
UICONFIG_SRC = $(shell find $(srcdir)/uiconfig -name '*.*')
UICONFIG_DST = $(patsubst $(srcdir)/%,$(DIST_FOLDER)/%,$(UICONFIG_SRC))
$(DIST_FOLDER)/uiconfig/%: $(srcdir)/uiconfig/%
	@$(MKDIR_P) $(dir $@)
	@cp $< $@

ADMIN_JS_LIST = \
	admin/js/*.js \
	admin/src/*.js \
	$(shell find admin/standard -name "admin.js")

# 準備打包的 JS 檔案列表
OXOOL_JS_LIST = \
	js/l10n.js \
	js/unocommands.js \
	js/BrandingData.js \
	js/OxOOL.js \
	js/ModuleManager.js \
	js/layer/marker/EnhancedTextInput.js \
	js/map/handler/Map.Tasks.js \
	js/map/handler/Map.Icon.js \
	js/map/handler/Map.AlternativeCommand.js \
	js/map/handler/Map.StateChanges.Extend.js \
	js/map/handler/Map.ExternalEdit.js \
	js/control/Permission.Extensions.js \
	js/control/Toolbar.Extensions.js \
	js/control/Control.Dialogs.js \
	js/control/Control.ContextMenu.js \
	js/control/Control.Menubar.js \
	js/control/Control.ReadonlyBar.js \
	js/control/Control.StatusBar.js \
	js/control/Control.NotebookbarWriter.js \
	js/control/Control.NotebookbarCalc.js \
	js/control/Control.NotebookbarImpress.js \
	js/control/Control.NotebookbarDraw.js \
	js/spectrum.js \
	js/main.js

pot:
	xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --output=po/ossii.pot \
		js/OtherMessages.js \
		$(OXOOL_JS_LIST) \
		$(ADMIN_JS_LIST)

	msguniq -w 78 -t UTF-8 po/ossii.pot > po/ossii.pot.new; mv po/ossii.pot.new po/ossii.pot

l10n: pot
	@for i in $(wildcard $(srcdir)/po/*.po); do pot2po --input=po/ossii.pot --template=$$i --output=$$i.new; mv $$i.new $$i;done
#	@for i in $(wildcard $(srcdir)/po/*.po); do msgmerge --update --backup=off $$i po/ossii.pot;done

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
	merge_po_to_json \
	$(DIST_FOLDER)/ossii.js \
	$(DIST_FOLDER)/branding.css \
	$(DIST_FOLDER)/branding-mobile.css \
	$(DIST_FOLDER)/branding-tablet.css \
	$(DIST_FOLDER)/branding-desktop.css
	@echo "Done building browser dist"

# 清除打包用的相關檔案及目錄
clean-local:
	@echo "Cleaning browser dist"
	$(RM) -f $(DIST_FOLDER)/ossii.js
	$(RM) -f $(DIST_FOLDER)/branding*.css
	$(RM) -rf $(DIST_FOLDER)/uiconfig
	$(RM) -rf ossii-src.js

EXTRA_DIST = $(shell find . -type f -not -path './.git/*' | sed 's/.\///')

# vim: set noet sw=4 ts=4:
