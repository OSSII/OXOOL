dnl -*- Mode: Autoconf; tab-width: 4; indent-tabs-mode: nil; fill-column: 102 -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

AC_DEFUN([ossii_CONFIG_VARS], [

OSSII_LDFLAGS=
if test "$ENABLE_DEBUG" = "true"; then
    modules_dir="`pwd`/ossii/src/modules"
    OXOOL_MODULE_DIR="${modules_dir}"
    OXOOL_MODULE_CONFIG_DIR="${modules_dir}"
    OXOOL_MODULE_DATA_DIR="${modules_dir}"
    OSSII_LDFLAGS="-Wl,-E,-rpath,`pwd`/ossii/src/lib/.libs"
else
    OXOOL_MODULE_DIR=${libdir}/${PACKAGE}
    OXOOL_MODULE_CONFIG_DIR=${sysconfdir}/${PACKAGE}/conf.d
    OXOOL_MODULE_DATA_DIR=${prefix}/share/${PACKAGE}/modules
fi

AC_DEFINE_UNQUOTED([OXOOL_MODULE_DIR],["$OXOOL_MODULE_DIR"],[OxOOL module share library storage directory.])
AC_SUBST([OXOOL_MODULE_DIR])
AC_DEFINE_UNQUOTED([OXOOL_MODULE_CONFIG_DIR],["$OXOOL_MODULE_CONFIG_DIR"],[OxOOL module configuration file storage directory.])
AC_SUBST([OXOOL_MODULE_CONFIG_DIR])
AC_DEFINE_UNQUOTED([OXOOL_MODULE_DATA_DIR],["$OXOOL_MODULE_DATA_DIR"],[OxOOL module data storage directory.])
AC_SUBST([OXOOL_MODULE_DATA_DIR])

AC_SUBST([OSSII_CFLAGS], ["-I`pwd`/ossii/src/include -I`pwd`/common -I`pwd`/net -I`pwd`/wsd -I`pwd`/kit"])
AC_SUBST([OSSII_LDFLAGS])
AC_SUBST([OSSII_LIBS], ["${OSSII_LDFLAGS} `pwd`/ossii/src/lib/lib${OSSII_LIB_NAME}.la"])

AC_DEFINE_UNQUOTED([VENDOR],[ossii_VENDOR],[Vendor])
AC_SUBST([VENDOR], [ossii_VENDOR])

# This is used by the ossii browser to load custom icons.
AC_SUBST([CUSTOM_ICONS_DIRECTORY], ["`pwd`/ossii/browser/images"])

])
dnl vim:set shiftwidth=4 softtabstop=4 expandtab:
