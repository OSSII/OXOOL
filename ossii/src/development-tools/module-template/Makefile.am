
ACLOCAL_AMFLAGS = -I m4

SUBDIRS = .

# JavaScript files, including html/ , browser/ and admin/
JS_FILES = $(shell find html/ browser/ admin/ -name '*.js')
# Generate POT file
pot:
	@xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --output="po/@MODULE_NAME@.pot" \
	$(JS_FILES)

	@msguniq -w 78 -t UTF-8 po/@MODULE_NAME@.pot > po/@MODULE_NAME@.pot.new; mv po/@MODULE_NAME@.pot.new po/@MODULE_NAME@.pot

l10n: pot
	@for i in $(wildcard $(srcdir)/po/*.po); do \
		msgmerge --update --backup=off $$i po/@MODULE_NAME@.pot; \
		echo "Updated $$i"; \
	done

convert_po2json:
	@$(MKDIR_P) $(srcdir)/browser/l10n
	@for i in $(wildcard $(srcdir)/po/*.po); do \
		lang=$$(basename $$i .po); \
		$(top_srcdir)/utils/po2json.py --quiet $$i -o $(srcdir)/browser/l10n/$$lang.json; \
		echo "Converted $$i to browser/l10n/$$lang.json"; \
	done

.PHONY: build-another

all-local: build-another

build-another: \
	convert_po2json


EXTRA_DIST = \
	browser/* \
	po/* \
	utils/po2json.py \
	@PACKAGE_TARNAME@.spec \
	debian/changelog \
	debian/compat \
	debian/control \
	debian/rules \
	debian/source/*

if CUSTOM_HTML
EXTRA_DIST += html
endif

if ENABLE_ADMIN
EXTRA_DIST += admin
endif

MODULE_DATA_DIR = @OXOOL_MODULE_DATA_DIR@/@MODULE_NAME@

# Module config file install path
configdir = @OXOOL_MODULE_CONFIG_DIR@
dist_config_DATA = @MODULE_NAME@.xml

if BUILD_SHARED_LIBRARY
# Module install path
moduledir = @OXOOL_MODULES_DIR@
module_LTLIBRARIES = @MODULE_NAME@.la
@MODULE_NAME@_la_CPPFLAGS = -pthread $(LIBS) $(OXOOL_CFLAGS)
@MODULE_NAME@_la_LDFLAGS = -avoid-version -module $(LIBS) $(OXOOL_LIBS)
@MODULE_NAME@_la_SOURCES = src/Module.cpp
endif

install-data-local:
	$(MKDIR_P) $(DESTDIR)/$(MODULE_DATA_DIR)/browser/l10n
	cp -aR browser/l10n/. $(DESTDIR)/$(MODULE_DATA_DIR)/browser/l10n
if CUSTOM_HTML
	$(MKDIR_P) $(DESTDIR)/$(MODULE_DATA_DIR)/html
	cp -aR html/. $(DESTDIR)/$(MODULE_DATA_DIR)/html
endif
if ENABLE_ADMIN
	$(MKDIR_P) $(DESTDIR)/$(MODULE_DATA_DIR)/admin
	cp -aR admin/. $(DESTDIR)/$(MODULE_DATA_DIR)/admin
endif

uninstall-local:
	rm -fr $(DESTDIR)/$(MODULE_DATA_DIR)/l10n
if CUSTOM_HTML
	rm -fr $(DESTDIR)/$(MODULE_DATA_DIR)/html
endif
if ENABLE_ADMIN
	rm -fr $(DESTDIR)/$(MODULE_DATA_DIR)/admin
endif

# Clean up
clean-local:
	rm -fr browser/l10n

run: all
	@./test.sh "@MODULE_NAME@.xml"
