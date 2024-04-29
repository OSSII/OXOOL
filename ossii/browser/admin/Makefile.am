# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

ADMIN_SRC_JS = \
	$(top_srcdir)/ossii/browser/js/l10n.js \
	src/Base.js \
	src/Util.js \
	src/AdminSocketBase.js \
	$(top_srcdir)/browser/src/core/Util.js \
	$(top_srcdir)/browser/src/core/Class.js \
	src/AdminModule.js \
	src/Main.js

admin-src.js: $(ADMIN_SRC_JS)
	@echo "Checking for Admin JS errors..."
	@$(NODE) $(top_srcdir)/browser/node_modules/eslint/bin/eslint.js $(srcdir)/src $(srcdir)/js \
		--config $(srcdir)/.eslintrc \
		--ignore-path $(srcdir)/.eslintignore
	@echo "Bundling $@..."
	@$(MKDIR_P) $(dir $@)
	@cat $^ > $@
	@echo "Done bundling $@."

admin.js: admin-src.js
	@echo "Uglifying $@..."
	@$(MKDIR_P) $(dir $@)
	@$(RM) -f $@
	@${top_srcdir}/browser/node_modules/uglify-js/bin/uglifyjs \
		-O max_line_len=100 \
		$^ \
		--output $@

# Admin root
adminrootdir = $(pkgdatadir)/admin
dist_adminroot_DATA = \
	admin.js \
	admin.html \
	login.html

# Admin CSS
admincssdir = $(pkgdatadir)/admin/css
dist_admincss_DATA = \
	css/*.css

# Admin Fonts
adminfontsdir = $(pkgdatadir)/admin/css/fonts
dist_adminfonts_DATA = \
	css/fonts/*

# Admin JS
adminjsdir = $(pkgdatadir)/admin/js
dist_adminjs_DATA = \
	js/*.js

# Admin images
adminimgdir = $(pkgdatadir)/admin/images
dist_adminimg_DATA = \
	images/*


admin_internal_module_DIST = \
	standard/Overview \
	standard/Analytics \
	standard/Log

# Admin internal modules ------------------------------------------------------
# 所有內建模組的目錄都是 admin/standard/{ModuleName}

# Overview
admin_module_Overviewdir = $(pkgdatadir)/admin/standard/Overview
dist_admin_module_Overview_DATA = \
	standard/Overview/admin.html \
	standard/Overview/admin.js

# Analytics
admin_module_Analyticsdir = $(pkgdatadir)/admin/standard/Analytics
dist_admin_module_Analytics_DATA = \
	standard/Analytics/admin.html \
	standard/Analytics/admin.js
admin_module_Analytics_jsdir = $(pkgdatadir)/admin/standard/Analytics/js
dist_admin_module_Analytics_js_DATA = \
	standard/Analytics/js/*.js

# Log
admin_module_Logdir = $(pkgdatadir)/admin/standard/Log
dist_admin_module_Log_DATA = \
	standard/Log/admin.html \
	standard/Log/admin.js

#------------------------------------------------------------

clean-local:
	$(RM) admin-src.js admin.js

# vim: set noet sw=4 ts=4:
