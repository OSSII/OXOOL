#!/usr/bin/env bash
# Deploy Nextcloud service for testing
#
# Copyright 2024 Buo-ren Lin <buoren.lin@ossii.com.tw>
# SPDX-License-Identifier: LicenseRef-Proprietary

# The base URL of the service hosting the Nextcloud server release packages
NEXTCLOUD_SERVER_RELEASES_BASEURL="${NEXTCLOUD_SERVER_RELEASES_BASEURL:-https://download.nextcloud.com/server/releases/}"

# The Nextcloud server version to install
NEXTCLOUD_VERSION="${NEXTCLOUD_VERSION:-30.0.4}"

# The type of the release package to download: [tarball|zip]
NEXTCLOUD_RELEASE_PACKAGE_TYPE="${NEXTCLOUD_RELEASE_PACKAGE_TYPE:-zip}"

printf \
    'Info: Configuring the defensive interpreter behaviors...\n'
set_opts=(
    # Terminate script execution when an unhandled error occurs
    -o errexit
    -o errtrace

    # Terminate script execution when an unset parameter variable is
    # referenced
    -o nounset
)
if ! set "${set_opts[@]}"; then
    printf \
        'Error: Unable to configure the defensive interpreter behaviors.\n' \
        1>&2
    exit 1
fi

printf \
    'Info: Setting the ERR trap...\n'
trap_err(){
    printf \
        'Error: The program prematurely terminated due to an unhandled error.\n' \
        1>&2
    exit 99
}
if ! trap trap_err ERR; then
    printf \
        'Error: Unable to set the ERR trap.\n' \
        1>&2
    exit 1
fi

printf \
    'Info: Checking the existence of the required commands...\n'
required_commands=(
    dnf
)
flag_required_command_check_failed=false
for command in "${required_commands[@]}"; do
    if ! command -v "${command}" >/dev/null; then
        flag_required_command_check_failed=true
        printf \
            'Error: This program requires the "%s" command to be available in your command search PATHs.\n' \
            "${command}" \
            1>&2
    fi
done
if test "${flag_required_command_check_failed}" == true; then
    printf \
        'Error: Required command check failed, please check your installation.\n' \
        1>&2
    exit 1
fi

printf \
    'Info: Checking script prerequisites...\n'
if test "${EUID}" -ne 0; then
    printf \
        'Error: This program is required to be run as the superuser(root).\n' \
        1>&2
    exit 1
fi

printf \
    'Info: Installing the script runtime dependencies...\n'
runtime_dep_pkgs=(
    # For extracting Nextcloud release packages
    bzip2
    tar

    # For triggering the Nextcloud initialization process
    curl

    # For downloading the Nextcloud release package
    wget

    # For determining the operation timestamp
    coreutils

    # FIXME: What are these used?
    epel-release
    yum-utils
)
case "${NEXTCLOUD_RELEASE_PACKAGE_TYPE}" in
    tarball)
        runtime_dep_pkgs+=(bzip2 tar)
    ;;
    zip)
        runtime_dep_pkgs+=(unzip)
    ;;
    *)
        printf \
            'Error: Invalid NEXTCLOUD_RELEASE_PACKAGE_TYPE parameter value specified.\n' \
            1>&2
        exit 1
    ;;
esac

rpm_opts=(
    --query
    --quiet
)
if ! rpm "${rpm_opts[@]}" "${runtime_dep_pkgs[@]}"; then
    if ! dnf install -y "${runtime_dep_pkgs[@]}"; then
        printf \
            'Error: Unable to install the script runtime dependencies.\n' \
            1>&2
        exit 2
    fi
fi

printf \
    'Info: Determining the operation timestamp...\n'
if ! timestamp="$(date +%Y%m%d-%H%M%S)"; then
    printf \
        'Error: Unable to determine the operation timestamp.\n' \
        1>&2
    exit 2
fi
printf \
    'Info: Operation timestamp determined to be "%s".\n' \
    "${timestamp}"

rpm_opts=(
    --query
    --quiet
)
if ! rpm "${rpm_opts[@]}" httpd; then
    printf \
        'Info: Installing the Apache httpd server...\n'
    if ! dnf install -y httpd; then
        printf \
            'Error: Unable to install the Apache httpd server.\n' \
            1>&2
        exit 2
    fi
fi

printf \
    'Info: Configuring the Apache httpd service to start at boot...\n'
if ! systemctl enable httpd; then
    printf \
        'Error: Unable to configure the Apache httpd service to start at boot.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Starting the Apache httpd service...\n'
if ! systemctl restart httpd; then
    printf \
        'Error: Unable to start the Apache httpd service.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Configuring the remi software repository...\n'
if ! dnf install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm; then
    printf \
        'Error: Unable to configure the remi software repository.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Resetting the php dnf module...\n'
if ! dnf module reset -y php; then
    printf \
        'Error: Unable to reset the php dnf module.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Installing the php:remi-8.1 dnf module...\n'
if ! dnf module install -y php:remi-8.1; then
    printf \
        'Error: Unable to install the php:remi-8.1 dnf module.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Upgrading all packages...\n'
if ! dnf update -y; then
    printf \
        'Error: Unable to upgrade all packages.\n' \
        1>&2
    exit 2
fi

nextcloud_runtime_dep_pkgs=(
    php
    php-gd
    php-json
    php-mbstring
    php-opcache
    php-pdo
    php-pecl-apcu
    php-pecl-zip
    php-process
    php-xml

    # Optional dependencies to improve performance or functionality
    php-bcmath
    php-gmp
    php-imap
    php-intl
    php-ldap
    php-pecl-imagick-im7
    php-smbclient
)
rpm_opts=(
    --query
    --quiet
)
if ! rpm "${rpm_opts[@]}" "${nextcloud_runtime_dep_pkgs[@]}"; then
    printf \
        'Info: Installing the runtime dependency packages of the Nextcloud server...\n'
    if ! dnf install -y "${nextcloud_runtime_dep_pkgs[@]}"; then
        printf \
            'Error: Unable to install the runtime dependency packages of the Nextcloud server.\n' \
            1>&2
        exit 2
    fi
fi

web_service_docroot=/var/www/html
installed_nextcloud_dir="${web_service_docroot}/nextcloud"

if test -e "${installed_nextcloud_dir}"; then
    printf \
        'Info: Existing Nextcloud service installation detected, moving it out of the way...\n'
    mv_opts=(
        --verbose
    )
    if ! mv "${mv_opts[@]}" \
        "${installed_nextcloud_dir}" \
        "${installed_nextcloud_dir}.orig-${timestamp}"; then
        printf \
            'Error: Unable to move the existing Nextcloud service installation.\n' \
            1>&2
        exit 2
    fi
fi

case "${NEXTCLOUD_RELEASE_PACKAGE_TYPE}" in
    tarball)
        nextcloud_pkg_name="nextcloud-${NEXTCLOUD_VERSION}.tar.bz2"
    ;;
    zip)
        nextcloud_pkg_name="nextcloud-${NEXTCLOUD_VERSION}.zip"
    ;;
    *)
        printf \
            'Error: Invalid NEXTCLOUD_RELEASE_PACKAGE_TYPE parameter value specified.\n' \
            1>&2
        exit 1
    ;;
esac

downloaded_nextcloud_pkg="${web_service_docroot}/${nextcloud_pkg_name}"
if ! test -e "${downloaded_nextcloud_pkg}"; then
    printf \
        'Info: Downloading the Nextcloud server release package...\n'
    wget_opts=(
        -O "${downloaded_nextcloud_pkg}"
    )
    nextcloud_pkg_url="${NEXTCLOUD_SERVER_RELEASES_BASEURL}${nextcloud_pkg_name}"
    if ! wget "${wget_opts[@]}" "${nextcloud_pkg_url}"; then
        printf \
            'Error: Unable to download the "%s" version of the Nextcloud server release package.\n' \
            "${NEXTCLOUD_VERSION}" \
            1>&2
        exit 2
    fi
fi

printf \
    'Info: Extracting the Nextcloud server release package...\n'
case "${NEXTCLOUD_RELEASE_PACKAGE_TYPE}" in
    tarball)
        tar_opts=(
            --extract
            --directory="${web_service_docroot}"
            --file="${downloaded_nextcloud_pkg}"
        )
        if ! tar "${tar_opts[@]}"; then
            printf \
                'Error: Unable to extract the Nextcloud server release package.\n' \
                1>&2
            exit 2
        fi
    ;;
    zip)
        if ! unzip "${downloaded_nextcloud_pkg}" \
            -d "${web_service_docroot}"; then
            printf \
                'Error: Unable to extract the Nextcloud server release package.\n' \
                1>&2
            exit 2
        fi
    ;;
    *)
        printf \
            'Error: Invalid NEXTCLOUD_RELEASE_PACKAGE_TYPE parameter value specified.\n' \
            1>&2
        exit 1
    ;;
esac

printf \
    'Info: Installing the Nextcloud automatic setup configuration file...\n'
nextcloud_docroot="${web_service_docroot}/nextcloud"
nextcloud_config_dir="${nextcloud_docroot}/config"
nextcloud_autoconfig="${nextcloud_config_dir}/autoconfig.php"

if ! cat >"${nextcloud_autoconfig}" <<"EOF"
<?php
// Nextcloud automatic setup configuration file
//
// References:
//
// * Automatic setup — Nextcloud latest Administration Manual latest documentation
//   https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/automatic_configuration.html
$AUTOCONFIG = [
    "directory"     => "/var/www/html/nextcloud/data",
    "dbtype"        => "sqlite",
    "dbname"        => "nextcloud",
    "dbtableprefix" => "",
    "adminlogin"    => "test",
    "adminpass"     => "test",
];
EOF
    then
    printf \
        'Error: Unable to install the Nextcloud automatic setup configuration file.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Fixing the file ownership of the Nextcloud service directory...\n'
chown_opts=(
    --recursive

    # Verbosely print what file's ownership was changed
    --changes
)
if ! chown "${chown_opts[@]}" apache.apache "${installed_nextcloud_dir}"; then
    printf \
        'Error: Unable to fix the file ownership of the Nextcloud service directory.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Restarting the Apache httpd service to apply Nextcloud server site configuration...\n'
if ! systemctl restart httpd; then
    printf \
        'Error: Unable to restart the Apache httpd service to apply Nextcloud server site configuration.\n' \
        1>&2
    exit 2
fi

# NOTE: In Docker container there's no FirewallD
if command -v firewall-cmd >/dev/null; then
    printf \
        'Info: Configuring FirewallD to allow public access to the HTTP service...\n'
    if ! firewall-cmd --zone=public --add-service=http; then
        printf \
            'Error: Unable to configure FirewallD to allow public access to the HTTP service.\n' \
            1>&2
        exit 2
    fi

    printf \
        'Info: Configuring FirewallD to allow public access to the HTTP service on boot...\n'
    if ! firewall-cmd --permanent --zone=public --add-service=http; then
        printf \
            'Error: Unable to configure FirewallD to allow public access to the HTTP service on boot.\n' \
            1>&2
        exit 2
    fi

    printf \
        'Info: Applying FirewallD configuration changes...\n'
    if ! firewall-cmd --reload; then
        printf \
            'Error: Unable to apply FirewallD configuration changes.\n' \
            1>&2
        exit 2
    fi
fi

printf \
    'Info: Workarounding Nextcloud bug causing browser to redirect to invalid URL after initialization...\n'
curl_opts=(
    # We don't care the response body nor the header itself
    --head
    --output /dev/null

    # Don't print progress
    --silent

    # Return error exit status when receiving an error response
    --fail
)
if ! curl "${curl_opts[@]}" http://192.168.56.10/nextcloud/index.php; then
    printf \
        'Error: Unable to workaround Nextcloud bug causing browser to redirect to invalid URL after initialization.\n' \
        1>&2
    exit 2
fi

printf \
    'Info: Operation completed without errors, use the http://192.168.56.10/nextcloud/ URL to access the Nextcloud service, the admin username/password is test/test.\n'
