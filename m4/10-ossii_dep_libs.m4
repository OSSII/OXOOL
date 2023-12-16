dnl -*- Mode: Autoconf; tab-width: 4; indent-tabs-mode: nil; fill-column: 102 -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

AC_DEFUN([ossii_DEP_LIBS], [
#-----------------------------------------------------------------------
# Check for fontconfig support
#-----------------------------------------------------------------------
PKG_CHECK_MODULES(FONTCONFIG, fontconfig >= 2.12.6, use_fontconfig="yes", use_fontconfig="no")
if test "$use_fontconfig" = "no" ; then
    AC_MSG_ERROR([Need fontconfig, but not found or version too old.])
fi

#-----------------------------------------------------------------------
# Check for libgit2 support
#-----------------------------------------------------------------------
PKG_CHECK_MODULES(GIT2, libgit2, use_git2="yes", use_git2="no")
if test "$use_git2" = "no" ; then
    AC_MSG_ERROR([Requires the libgit2 development kit.])
fi

])

dnl vim:set shiftwidth=4 softtabstop=4 expandtab:
