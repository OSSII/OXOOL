# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

ADMIN_SRC_JS = \
	src/Base.js \
	src/Util.js \
	src/AdminSocketBase.js \
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

clean-local:
	$(RM) admin-src.js admin.js

# vim: set noet sw=4 ts=4:
