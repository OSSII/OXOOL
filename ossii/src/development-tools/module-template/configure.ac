# -*- Mode: Autoconf; tab-width: 4; indent-tabs-mode: nil -*-
# Generated on %GENERATE_DATETIME%
# Process this file with autoconf to produce a configure script.

AC_PREREQ([2.69])
m4_define([oxool_NAME], [%OXOOL_NAME%])
m4_define([module_NAME], [%MODULE_NAME%])
m4_define([module_VERSION], [%MODULE_VERSION%])
m4_define([module_AUTHOR], [%MODULE_AUTHOR%])

AC_INIT(m4_defn([oxool_NAME])[-module-]m4_defn([module_NAME]),
        m4([module_VERSION]),
        m4_defn([module_AUTHOR]))

LT_INIT([shared, disable-static])
AC_CONFIG_HEADERS([config.h])

AM_INIT_AUTOMAKE([1.10 foreign subdir-objects tar-pax -Wno-portability])

AC_CONFIG_MACRO_DIR([m4])

AC_SUBST([MODULE_NAME], m4_defn([module_NAME]))

# Checks for programs.
AC_PROG_CXX
AC_PROG_CC
AC_PROG_INSTALL

CXXFLAGS="$CXXFLAGS -Werror -std=c++17"
CFLAGS="$CFLAGS -Werror"
LIBS="$LIBS -lstdc++fs"

# Checks for libraries.

PKG_PROG_PKG_CONFIG([0.29]) # 0.29 is the first version to support --atleast-pkgconfig-version

OXOOL_NAME=""
# check oxool or modaodfweb development environment
PKG_CHECK_MODULES([OxOOL], "oxool", [found="yes"], [found=no])
if test "${found}" = "yes" ; then
    OXOOL_NAME="oxool"
else
    PKG_CHECK_MODULES([MODAODFWEB], "modaodfweb", [found="yes"], [found=no])
    if test "${found}" = "yes" ; then
        OXOOL_NAME="modaodfweb"
    fi
fi

# If OXOOL_NAME is empty, it means that the development environment
# for oxool or modaodfweb was not found.
if test -z "${OXOOL_NAME}" ; then
    AC_MSG_ERROR([Please install oxool or modaodfweb development environment.])
fi

AC_SUBST([OXOOL_NAME])
AC_SUBST([OXOOL_MODULE_CONFIG_DIR], `${PKG_CONFIG} ${OXOOL_NAME} --variable=module_config_dir`)
AC_SUBST([OXOOL_MODULES_DIR], `${PKG_CONFIG} ${OXOOL_NAME} --variable=modules_dir`)
AC_SUBST([OXOOL_MODULE_DATA_DIR], `${PKG_CONFIG} ${OXOOL_NAME} --variable=module_data_dir`)
AC_SUBST([OXOOL_VERSION], `${PKG_CONFIG} ${OXOOL_NAME} --modversion`)
AC_SUBST([OXOOL_CFLAGS], `${PKG_CONFIG} ${OXOOL_NAME} --cflags`)
AC_SUBST([OXOOL_LIBS], `${PKG_CONFIG} ${OXOOL_NAME} --libs`)

# Checks for header files.

# Checks for typedefs, structures, and compiler characteristics.

# Checks for library functions.

XML_CONFIG_CMD=`which "${OXOOL_NAME}-xml-config"`
AC_SUBST([XML_CONFIG_CMD])

MODULE_SERVICE_URI=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.serviceURI 2> /dev/null`
AC_SUBST([MODULE_SERVICE_URI])

MODULE_SUMMARY=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.summary 2> /dev/null`
AC_SUBST([MODULE_SUMMARY])
if test -z "${MODULE_SUMMARY}" ; then
    AC_MSG_ERROR([Module summary is required. Please define in module.xml.in])
fi

MODULE_LICENSE=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.license 2> /dev/null`
AC_SUBST([MODULE_LICENSE])

MODULE_DESCRIPTION=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.description 2> /dev/null`
AC_SUBST([MODULE_DESCRIPTION])

MODULE_ADMIN_PRIVILAGE=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.adminPrivilege 2> /dev/null`
AC_SUBST([MODULE_ADMIN_PRIVILAGE])

MODULE_ADMIN_ICON=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.adminIcon 2> /dev/null`
AC_SUBST([MODULE_ADMIN_ICON])

MODULE_ADMIN_ITEM=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.adminItem 2> /dev/null`
AC_SUBST([MODULE_ADMIN_ITEM])

# 是否編譯 shared library
BUILD_SHARED_LIBRARY=true
MODULE_LOAD=`${XML_CONFIG_CMD} -f module.xml.in --get module.load 2> /dev/null`
if test -z "${MODULE_LOAD}" ; then
    BUILD_SHARED_LIBRARY=false
fi
AC_SUBST([BUILD_SHARED_LIBRARY])
AM_CONDITIONAL([BUILD_SHARED_LIBRARY], [test -n "${MODULE_LOAD}"])

# 是否有自定義的 html 目錄
CUSTOM_HTML=false
if test -d ./html ; then
    if test -f "html/index.html" || test -f "html/index.php" ; then
        CUSTOM_HTML=true
        AC_DEFINE([CUSTOM_HTML], [1], [Has a defined html directory.])
    else
        AC_DEFINE([CUSTOM_HTML], [0], [The html directory is not defined.])
    fi
fi
AC_SUBST([CUSTOM_HTML])
AM_CONDITIONAL([CUSTOM_HTML], [test "${CUSTOM_HTML}" = "true"])

# 是否需包含後臺管理範本
ENABLE_ADMIN=false
MODULE_ADMIN_ITEM=`${XML_CONFIG_CMD} -f module.xml.in --get module.detail.adminItem 2> /dev/null`
if test -n "${MODULE_ADMIN_ITEM}" ; then
    ENABLE_ADMIN=true
    AC_DEFINE([ENABLE_ADMIN], [1], [Contains Admin management.])
else
    AC_DEFINE([ENABLE_ADMIN], [0], [Admin management is not included.])
fi
AC_SUBST([ENABLE_ADMIN])
AM_CONDITIONAL([ENABLE_ADMIN], [test "${ENABLE_ADMIN}" = "true"])

# AC_OUTPUT
AC_CONFIG_FILES([
        Makefile
        ${MODULE_NAME}.xml:module.xml.in
        ${PACKAGE_TARNAME}.spec:module.spec.in
        debian/control:debian/control.in
])
AC_OUTPUT

AC_MSG_RESULT([
Configuration:
    Build environment:          ${OXOOL_NAME}
    ${OXOOL_NAME}-xml-config    ${XML_CONFIG_CMD}
    Customize html directory:   ${CUSTOM_HTML}
    Enable console admin:       ${ENABLE_ADMIN}

Module details:
    name            ${MODULE_NAME}
    serviceURI      ${MODULE_SERVICE_URI}
    version         ${PACKAGE_VERSION}
    summary         ${MODULE_SUMMARY}
    author          ${PACKAGE_BUGREPORT}
    license         ${MODULE_LICENSE}
    description     ${MODULE_DESCRIPTION}
    adminPrivilege  ${MODULE_ADMIN_PRIVILAGE}
    adminIcon       ${MODULE_ADMIN_ICON}
    adminItem       ${MODULE_ADMIN_ITEM}

\$ make # to compile
])

dnl vim:set shiftwidth=4 softtabstop=4 expandtab:
