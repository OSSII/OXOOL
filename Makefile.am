ETAGS=ctags -e

distdir = $(PACKAGE)-$(VERSION)-$(LOOLWSD_BRANCH)

if ENABLE_IOSAPP

SUBDIRS = loleaflet

else

if ENABLE_GTKAPP

SUBDIRS = gtk loleaflet

else

SUBDIRS = bundled/include/LibreOfficeKit src/include common net src/lib wsd kit loleaflet extensions

export ENABLE_DEBUG

bin_PROGRAMS = \
	oxoolconvert oxoolconfig

dist_bin_SCRIPTS = oxoolwsd-systemplate-setup

man_MANS = man/oxoolwsd.1 \
           man/oxoolforkit.1 \
           man/oxoolconvert.1 \
           man/oxoolconfig.1 \
           man/oxoolwsd-systemplate-setup.1

dist_doc_DATA = wsd/README \
                wsd/README.vars \
                wsd/protocol.txt \
                wsd/reference.md

oxoolwsddatadir = @LOOLWSD_DATADIR@

oxoolwsddata_DATA = discovery.xml \
                   favicon.ico

fontconfigdir = ${sysconfdir}/fonts/conf.d
fontconfig_DATA = SourceHan/50-oxool.conf

sourcehanfontsdir = ${datarootdir}/fonts/SourceHan
sourcehanfonts_DATA = SourceHan/SourceHanSans-Regular.ttc \
		      SourceHan/SourceHanSans-Bold.ttc

sudoersdir = ${sysconfdir}/sudoers.d
sudoers_DATA = etc/sudoers.d/lool

servicesysconfigdir = ${sysconfdir}/sysconfig
servicesysconfig_DATA = etc/sysconfig/oxoolwsd

oxoolwsdconfigdir = @LOOLWSD_CONFIGDIR@

oxoolwsdconfig_DATA = oxoolwsd.xml \
		      oxoolkitconfig.xcu \
		      etc/ca-chain.cert.pem \
		      etc/cert.pem \
		      etc/key.pem

oxool_modulesdir = @LOOLWSD_MODULES_DIR@

oxool_module_confdir = @LOOLWSD_MODULE_CONFIG_DIR@

oxool_module_datadir = @LOOLWSD_MODULE_DATA_DIR@

#apache2configdir = ${sysconfdir}/apache2/conf-available

#apache2config_DATA = etc/apache2/oxoolwsd.conf

#nginxconfigdir = ${sysconfdir}/nginx/snippets

#nginxconfig_DATA = etc/nginx/oxoolwsd.conf

ACLOCAL_AMFLAGS = -I m4

# quick and easy for now.
include_paths = -I${top_srcdir}/common -I${top_srcdir}/net -I${top_srcdir}/wsd -I${top_srcdir}/kit ${ZLIB_CFLAGS}

AM_CPPFLAGS = -pthread -DLOOLWSD_DATADIR='"@LOOLWSD_DATADIR@"' \
	      -DLOOLWSD_CONFIGDIR='"@LOOLWSD_CONFIGDIR@"' \
	      -DDEBUG_ABSSRCDIR='"@abs_top_srcdir@"' \
	      ${include_paths}

if !ENABLE_DEBUG
AM_CPPFLAGS += -DNDEBUG
endif

AM_LDFLAGS = -pthread -Wl,-E,-rpath,/snap/oxoolwsd/current/usr/lib -lpam $(ZLIB_LIBS)

if ENABLE_SSL
AM_LDFLAGS += -lssl -lcrypto
else
oxoolwsd_LDADD = -lssl -lcrypto
oxoolconfig_LDADD = -lssl -lcrypto $(top_builddir)/src/lib/liboxool.la
endif

AM_ETAGSFLAGS = --c++-kinds=+p --fields=+iaS --extra=+q -R --totals=yes --exclude=loleaflet *
AM_CTAGSFLAGS = $(AM_ETAGSFLAGS)

shared_sources = common/FileUtil.cpp \
                 common/IoUtil.cpp \
                 common/Log.cpp \
                 common/Protocol.cpp \
                 common/Session.cpp \
                 common/Seccomp.cpp \
                 common/MessageQueue.cpp \
                 common/SigUtil.cpp \
                 common/SpookyV2.cpp \
                 common/Unit.cpp \
                 common/Util.cpp \
                 common/Authorization.cpp \
                 net/DelaySocket.cpp \
                 net/Socket.cpp
if ENABLE_SSL
shared_sources += net/Ssl.cpp
endif

oxoolwsd_sources = common/Crypto.cpp \
                  wsd/Admin.cpp \
                  wsd/AdminModel.cpp \
                  wsd/Auth.cpp \
                  wsd/DocumentBroker.cpp \
                  wsd/LOOLWSD.cpp \
                  wsd/ClientSession.cpp \
                  wsd/FileServer.cpp \
                  wsd/Storage.cpp \
                  wsd/TileCache.cpp

oxoolwsd_SOURCES = $(oxoolwsd_sources) \
                  $(shared_sources)

noinst_PROGRAMS = clientnb \
                  connect \
                  lokitclient \
                  oxoolmap \
                  oxoolstress \
                  oxoolmount \
                  oxoolsocketdump \
                  oxoolwsd \
                  oxoolforkit

connect_SOURCES = tools/Connect.cpp
connect_LDADD = $(top_builddir)/src/lib/liboxool.la

lokitclient_SOURCES = tools/KitClient.cpp
lokitclient_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolforkit_sources = kit/ChildSession.cpp \
                     kit/ForKit.cpp \
                     kit/Kit.cpp

oxoolforkit_SOURCES = $(oxoolforkit_sources) \
                     $(shared_sources)

clientnb_SOURCES = net/clientnb.cpp
clientnb_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolmount_SOURCES = tools/mount.cpp
oxoolmount_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolmap_SOURCES = tools/map.cpp
oxoolmap_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolconvert_SOURCES = tools/Tool.cpp
oxoolconvert_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolstress_CPPFLAGS = -DTDOC=\"$(abs_top_srcdir)/test/data\" ${include_paths}
oxoolstress_SOURCES = tools/Stress.cpp
oxoolstress_LDADD = $(top_builddir)/src/lib/liboxool.la

oxoolconfig_SOURCES = tools/Config.cpp

oxoolsocketdump_SOURCES = tools/WebSocketDump.cpp
oxoolsocketdump_LDADD = $(top_builddir)/src/lib/liboxool.la

wsd_headers = wsd/Admin.hpp \
              wsd/AdminModel.hpp \
              wsd/Auth.hpp \
              wsd/ClientSession.hpp \
              wsd/DocumentBroker.hpp \
              wsd/Exceptions.hpp \
              wsd/FileServer.hpp \
              wsd/LOOLWSD.hpp \
              wsd/QueueHandler.hpp \
              wsd/SenderQueue.hpp \
              wsd/Storage.hpp \
              wsd/TileCache.hpp \
              wsd/TileDesc.hpp \
              wsd/TraceFile.hpp \
              wsd/UserMessages.hpp

shared_headers = tools/Replay.hpp

kit_headers = kit/ChildSession.hpp \
              kit/Delta.hpp \
              kit/DummyLibreOfficeKit.hpp \
              kit/Kit.hpp \
              kit/KitHelper.hpp \
              kit/Watermark.hpp

noinst_HEADERS = $(wsd_headers) $(shared_headers) $(kit_headers) \
                 test/WopiTestServer.hpp \
                 test/countloolkits.hpp \
                 test/test.hpp \
                 test/helpers.hpp

dist-hook:
	git log -1 --format=%h > $(distdir)/dist_git_hash 2> /dev/null || rm $(distdir)/dist_git_hash
	git rev-parse --abbrev-ref HEAD > $(distdir)/dist_git_branch 2> /dev/null || rm $(distdir)/dist_git_branch

EXTRA_DIST = discovery.xml \
             favicon.ico \
             oxoolkitconfig.xcu \
             oxoolwsd.spec \
             oxoolwsd.xml.in \
             oxoolwsd.service \
             debian/changelog \
             debian/compat \
             debian/control \
             debian/copyright \
             debian/oxool.cron.d \
             debian/oxool.postinst \
             debian/oxool.postrm \
             debian/oxool.preinst \
             debian/oxool.service \
             debian/rules \
             debian/source/format \
             etc/key.pem \
             etc/cert.pem \
             etc/ca-chain.cert.pem \
             etc/sudoers.d/lool \
             etc/sysconfig/oxoolwsd \
	     SourceHan/50-oxool.conf \
	     SourceHan/SourceHanSans-Regular.ttc \
	     SourceHan/SourceHanSans-Bold.ttc \
             scripts/unocommands.py \
             $(man_MANS)

pkgconfigdir = $(libdir)/pkgconfig
pkgconfig_DATA = oxool.pc

if HAVE_LO_PATH

SYSTEM_STAMP = @SYSTEMPLATE_PATH@/system_stamp

$(SYSTEM_STAMP) : ${top_srcdir}/oxoolwsd-systemplate-setup
	if test "z@SYSTEMPLATE_PATH@" != "z"; then rm -rf "@SYSTEMPLATE_PATH@"; fi
	${top_srcdir}/oxoolwsd-systemplate-setup "@SYSTEMPLATE_PATH@" "@LO_PATH@" "@EXTENSIONS_PATH@" && touch $@

@JAILS_PATH@ :
	mkdir -p $@

@TILECACHE_PATH@ :
	mkdir -p $@

clean-local:
	if test "z@JAILS_PATH@" != "z"; then rm -rf "@JAILS_PATH@"; fi
	if test "z@SYSTEMPLATE_PATH@" != "z"; then rm -rf "@SYSTEMPLATE_PATH@"; fi
	if test "z@TILECACHE_PATH@" != "z"; then rm -rf "@TILECACHE_PATH@"; fi

run: all @TILECACHE_PATH@ @JAILS_PATH@
	@echo "Launching oxoolwsd"
	@fc-cache "@LO_PATH@"/share/fonts/truetype
	@cp $(abs_top_srcdir)/test/data/hello.odt $(abs_top_srcdir)/test/data/hello-world.odt
	@cp $(abs_top_srcdir)/test/data/hello.ods $(abs_top_srcdir)/test/data/hello-world.ods
	@cp $(abs_top_srcdir)/test/data/hello.odp $(abs_top_srcdir)/test/data/hello-world.odp
	@echo
	LOOL_SERVE_FROM_FS=1 ./oxoolwsd --o:sys_template_path="@SYSTEMPLATE_PATH@" --o:lo_template_path="@LO_PATH@" \
			  --config-file="$(abs_top_srcdir)/oxoolwsd.xml" \
			  --o:file_server_root_path="$(abs_top_srcdir)" \
			  --o:child_root_path="@JAILS_PATH@" --o:storage.filesystem[@allow]=true \
			  --o:tile_cache_path="@TILECACHE_PATH@" \
			  --o:ssl.cert_file_path="$(abs_top_srcdir)/etc/cert.pem" \
			  --o:ssl.key_file_path="$(abs_top_srcdir)/etc/key.pem" \
			  --o:ssl.ca_file_path="$(abs_top_srcdir)/etc/ca-chain.cert.pem" \
			  --o:admin_console.username=admin --o:admin_console.password=admin \
			  --o:logging.file[@enable]=true --o:logging.level=trace

run-valgrind: all @TILECACHE_PATH@ @JAILS_PATH@
	@echo "Launching oxoolwsd under valgrind (but not forkit/oxoolkit, yet)"
	@fc-cache "@LO_PATH@"/share/fonts/truetype
	@cp $(abs_top_srcdir)/test/data/hello.odt $(abs_top_srcdir)/test/data/hello-world.odt
	@cp $(abs_top_srcdir)/test/data/hello.ods $(abs_top_srcdir)/test/data/hello-world.ods
	@cp $(abs_top_srcdir)/test/data/hello.odp $(abs_top_srcdir)/test/data/hello-world.odp
	valgrind --tool=memcheck --trace-children=no -v --read-var-info=yes \
		./oxoolwsd --o:sys_template_path="@SYSTEMPLATE_PATH@" --o:lo_template_path="@LO_PATH@" \
			  --o:child_root_path="@JAILS_PATH@" --o:storage.filesystem[@allow]=true \
			  --o:tile_cache_path="@TILECACHE_PATH@" \
			  --o:ssl.cert_file_path="$(abs_top_srcdir)/etc/cert.pem" \
			  --o:ssl.key_file_path="$(abs_top_srcdir)/etc/key.pem" \
			  --o:ssl.ca_file_path="$(abs_top_srcdir)/etc/ca-chain.cert.pem" \
			  --o:admin_console.username=admin --o:admin_console.password=admin \
			  --o:logging.file[@enable]=false --o:logging.level=trace

run-gdb: all @TILECACHE_PATH@ @JAILS_PATH@
	@echo "Launching oxoolwsd under valgrind's callgrind"
	@fc-cache "@LO_PATH@"/share/fonts/truetype
	@cp $(abs_top_srcdir)/test/data/hello.odt $(abs_top_srcdir)/test/data/hello-world.odt
	@cp $(abs_top_srcdir)/test/data/hello.ods $(abs_top_srcdir)/test/data/hello-world.ods
	@cp $(abs_top_srcdir)/test/data/hello.odp $(abs_top_srcdir)/test/data/hello-world.odp
	gdb --tui --args \
		./oxoolwsd --o:security.capabilities="false" \
			  --o:sys_template_path="@SYSTEMPLATE_PATH@" --o:lo_template_path="@LO_PATH@" \
			  --o:child_root_path="@JAILS_PATH@" --o:storage.filesystem[@allow]=true \
			  --o:tile_cache_path="@TILECACHE_PATH@" \
			  --o:ssl.cert_file_path="$(abs_top_srcdir)/etc/cert.pem" \
			  --o:ssl.key_file_path="$(abs_top_srcdir)/etc/key.pem" \
			  --o:ssl.ca_file_path="$(abs_top_srcdir)/etc/ca-chain.cert.pem" \
			  --o:admin_console.username=admin --o:admin_console.password=admin \
			  --o:logging.file[@enable]=false --o:logging.level=error

run-callgrind: all @TILECACHE_PATH@ @JAILS_PATH@
	@echo "Launching oxoolwsd under valgrind's callgrind"
	@fc-cache "@LO_PATH@"/share/fonts/truetype
	@cp $(abs_top_srcdir)/test/data/hello.odt $(abs_top_srcdir)/test/data/hello-world.odt
	@cp $(abs_top_srcdir)/test/data/hello.ods $(abs_top_srcdir)/test/data/hello-world.ods
	@cp $(abs_top_srcdir)/test/data/hello.odp $(abs_top_srcdir)/test/data/hello-world.odp
	valgrind --tool=callgrind --simulate-cache=yes --dump-instr=yes --num-callers=50 --error-limit=no --trace-children=yes \
		./oxoolwsd --o:security.capabilities="false" \
			  --o:sys_template_path="@SYSTEMPLATE_PATH@" --o:lo_template_path="@LO_PATH@" \
			  --o:child_root_path="@JAILS_PATH@" --o:storage.filesystem[@allow]=true \
			  --o:tile_cache_path="@TILECACHE_PATH@" \
			  --o:ssl.cert_file_path="$(abs_top_srcdir)/etc/cert.pem" \
			  --o:ssl.key_file_path="$(abs_top_srcdir)/etc/key.pem" \
			  --o:ssl.ca_file_path="$(abs_top_srcdir)/etc/ca-chain.cert.pem" \
			  --o:admin_console.username=admin --o:admin_console.password=admin \
			  --o:logging.file[@enable]=false --o:logging.level=error

run-strace: all @TILECACHE_PATH@ @JAILS_PATH@
	@echo "Launching oxoolwsd under strace"
	@fc-cache "@LO_PATH@"/share/fonts/truetype
	@cp $(abs_top_srcdir)/test/data/hello.odt $(abs_top_srcdir)/test/data/hello-world.odt
	@cp $(abs_top_srcdir)/test/data/hello.ods $(abs_top_srcdir)/test/data/hello-world.ods
	@cp $(abs_top_srcdir)/test/data/hello.odp $(abs_top_srcdir)/test/data/hello-world.odp
	strace -o strace.log -f -tt -s 256 \
		./oxoolwsd --o:security.capabilities="false" \
			  --o:sys_template_path="@SYSTEMPLATE_PATH@" --o:lo_template_path="@LO_PATH@" \
			  --o:child_root_path="@JAILS_PATH@" --o:storage.filesystem[@allow]=true \
			  --o:tile_cache_path="@TILECACHE_PATH@" \
			  --o:ssl.cert_file_path="$(abs_top_srcdir)/etc/cert.pem" \
			  --o:ssl.key_file_path="$(abs_top_srcdir)/etc/key.pem" \
			  --o:ssl.ca_file_path="$(abs_top_srcdir)/etc/ca-chain.cert.pem" \
			  --o:admin_console.username=admin --o:admin_console.password=admin \
			  --o:logging.file[@enable]=false --o:logging.level=error

else

SYSTEM_STAMP =

endif

clean-cache cache-clean:
# Intentionally don't use "*" below... Avoid risk of accidentally running rm -rf /*
	test -n "@LOOLWSD_CACHEDIR@" && rm -rf "@LOOLWSD_CACHEDIR@"/[0-9a-f]
	test -n "@TILECACHE_PATH@" && rm -rf "@TILECACHE_PATH@"/[0-9a-f]

clang-tidy:
	parallel clang-tidy -header-filter=^$(PWD).* -- $(shell git ls-files|grep /.*cpp$$|grep -v test)

# After building oxoolforkit, set its capabilities as required. Do it
# already after a plain 'make' to allow for testing without
# installing. When building for packaging, no need for this, as the
# capabilities won't survive packaging anyway. Instead, handle it when
# installing the RPM or Debian package.

all-local: oxoolwsd oxoolforkit oxoolmount @TILECACHE_PATH@ @JAILS_PATH@ $(SYSTEM_STAMP)
if ENABLE_SETCAP
	    sudo @SETCAP@ cap_net_bind_service=+ep oxoolwsd
	    sudo @SETCAP@ cap_fowner,cap_mknod,cap_sys_chroot=ep oxoolforkit
	    sudo @SETCAP@ cap_sys_admin=ep oxoolmount
else
	    echo "Skipping capability setting"
endif

# just run the build without any tests
build-nocheck: all-am

endif
endif

install-data-local:
	$(MKDIR_P) $(DESTDIR)$(LOOLWSD_MODULES_DIR)
	$(MKDIR_P) $(DESTDIR)$(LOOLWSD_MODULE_CONFIG_DIR)
	$(MKDIR_P) $(DESTDIR)$(LOOLWSD_MODULE_DATA_DIR)

uninstall-local:
	rmdir $(DESTDIR)$(LOOLWSD_MODULES_DIR)
	rmdir $(DESTDIR)$(LOOLWSD_MODULE_CONFIG_DIR)
	rmdir $(DESTDIR)$(LOOLWSD_MODULE_DATA_DIR)
