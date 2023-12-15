dnl -*- Mode: Autoconf; tab-width: 4; indent-tabs-mode: nil; fill-column: 102 -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

AC_DEFUN([ossii_POST_INIT],[
chmod +x ${WSD_NAME}-systemplate-setup || true
])

dnl vim:set shiftwidth=4 softtabstop=4 expandtab:
