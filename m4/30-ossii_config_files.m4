dnl -*- Mode: Autoconf; tab-width: 4; indent-tabs-mode: nil; fill-column: 102 -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
AC_DEFUN([ossii_CONFIG_FILES],[
AC_CONFIG_FILES([
    ${WSD_NAME}.xml:online.xml.in
    ${WSD_NAME}.service:online.service.in
    ${PACKAGE}kitconfig.xcu:onlinekitconfig.xcu.in
    ${WSD_NAME}-systemplate-setup:online-systemplate-setup.in
    ${PACKAGE}.spec:ossii/online.spec.in
    debian/${PACKAGE}.service:online.service.in
    debian/${PACKAGE}.preinst:ossii/debian-template/online.preinst
    debian/${PACKAGE}.postinst:ossii/debian-template/online.postinst
    debian/${PACKAGE}.postrm:ossii/debian-template/online.postrm
    debian/${PACKAGE}.install:ossii/debian-template/online.install
    debian/${PACKAGE}-dev.install:ossii/debian-template/online-dev.install
    ])
AC_CONFIG_FILES([ossii/debian-template/control], [cp ossii/debian-template/control debian/])
AC_CONFIG_FILES([ossii/debian-template/copyright], [cp ossii/debian-template/copyright debian/])
AC_CONFIG_FILES([ossii/debian-template/rules], [cp ossii/debian-template/rules debian/])

# The ossii directory is the OxOOL common object and development kit,
# Search all Makefile.am and *.in files under it,
# Avoid recording one by one.
AC_CONFIG_FILES(m4_esyscmd_s([
find ossii/ ! -path "ossii/src/development-tools/module-template/*" \
    -type f -name "Makefile.am" \
    -or -name "online.pc.in" \
    -or -name "OxOOL.h.in" |
while read file
do
    DIRNAME=`dirname "$file"`
    FILENAME=$(basename -- "$file") # strip directory and suffix
    EXTENSION="${FILENAME##*.}" # get suffix
    FILENAME="${FILENAME%.*}" # strip suffix
    echo "${DIRNAME}/${FILENAME}" # output file name without suffix
done
    ]))
])

dnl vim:set shiftwidth=4 softtabstop=4 expandtab:
