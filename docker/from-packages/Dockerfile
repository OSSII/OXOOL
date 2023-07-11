# syntax=docker/dockerfile:1.4
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

FROM debian:stable-slim
MAINTAINER Andras Timar <andras.timar@collabora.com>

# repo: can be 'repos', 'repos-staging', 'repos-snapshot'
# Optional. The default is 'repos'.
ARG repo

# type: can be
# 'code' - OxOffice Online
# 'oxool' - OxOffice Online, to build this you need to give your secret URL part from https://support.collaboraoffice.com, i.e. you have to be Collabora partner or customer
# 'key'  - OxOffice Online, the license key enabled version.
# Optional. The default is 'code'.
ARG type

# Optional. If defined then brand package will not be installed.
ARG nobrand

# Optional. If defined then the inotifywait will not monitor the changes of the config file
ARG noinotifywait

# UTF-8 locale is needed to handle file names with non-ASCII characters
ENV LC_CTYPE C.UTF-8

# Mount secret URL part (for type 'oxool') securely
RUN --mount=type=secret,id=secret_key \
# Update repos before installing packages
    apt-get update && \
# Install dependencies of installer of OxOffice Online
    apt-get -y install cpio tzdata libcap2-bin apt-transport-https gnupg2 ca-certificates curl && \
# Setup Collabora repo
    repourl="https://collaboraoffice.com/${repo:-repos}/CollaboraOnline/"; \
    secret_key=$(cat /run/secrets/secret_key); \
    if [ "$type" = "oxool" ] && [ -n ${secret_key+set} ]; then \
        echo "Based on the provided build arguments OxOffice Online from customer repo will be used."; \
        repourl="${repourl}23.05/customer-deb-${secret_key}/"; \
    elif [ "$type" = "key" ]; then \
        echo "Based on the provided build arguments license key enabled OxOffice Online will be used."; \
        repourl="${repourl}23.05-key/"; \
    else \
        echo "Based on the provided build arguments OxOffice Online will be used."; \
        repourl="${repourl}23.05-CODE/CODE-deb/"; \
    fi && \
    echo "deb [signed-by=/usr/share/keyrings/collaboraonline-release-keyring.gpg] ${repourl} /" > /etc/apt/sources.list.d/collabora.list && \
# Download Collabora package signing key
    if [ "$repo" = "repos-snapshot" ]; then \
        curl https://www.collaboraoffice.com/downloads/gpg/collaboraonline-snapshot-keyring.gpg --output /usr/share/keyrings/collaboraonline-snapshot-keyring.gpg; \
        sed -i "s/collaboraonline-release-keyring/collaboraonline-snapshot-keyring/" /etc/apt/sources.list.d/collabora.list; \
    else \
        curl https://www.collaboraoffice.com/downloads/gpg/collaboraonline-release-keyring.gpg --output /usr/share/keyrings/collaboraonline-release-keyring.gpg; \
    fi && \
# Update repos again
    apt-get update && \
# Install OxOffice Online (OxOffice is a dependency)
    apt-get -y install oxoolwsd \
# Install all dictionaries
                       collaboraoffice-dict-* \
# Install all language packs
                       collaboraofficebasis-ar \
                       collaboraofficebasis-bg \
                       collaboraofficebasis-ca \
                       collaboraofficebasis-cs \
                       collaboraofficebasis-da \
                       collaboraofficebasis-de \
                       collaboraofficebasis-el \
                       collaboraofficebasis-en-gb \
                       collaboraofficebasis-en-us \
                       collaboraofficebasis-eo \
                       collaboraofficebasis-es \
                       collaboraofficebasis-eu \
                       collaboraofficebasis-fi \
                       collaboraofficebasis-fr \
                       collaboraofficebasis-gl \
                       collaboraofficebasis-he \
                       collaboraofficebasis-hr \
                       collaboraofficebasis-hu \
                       collaboraofficebasis-id \
                       collaboraofficebasis-is \
                       collaboraofficebasis-it \
                       collaboraofficebasis-ja \
                       collaboraofficebasis-ko \
                       collaboraofficebasis-lo \
                       collaboraofficebasis-nb \
                       collaboraofficebasis-nl \
                       collaboraofficebasis-oc \
                       collaboraofficebasis-pl \
                       collaboraofficebasis-pt \
                       collaboraofficebasis-pt-br \
                       collaboraofficebasis-ru \
                       collaboraofficebasis-sk \
                       collaboraofficebasis-sl \
                       collaboraofficebasis-sq \
                       collaboraofficebasis-sv \
                       collaboraofficebasis-tr \
                       collaboraofficebasis-uk \
                       collaboraofficebasis-vi \
                       collaboraofficebasis-zh-cn \
                       collaboraofficebasis-zh-tw && \
# Install brand package (or not)
    if [ -z "$nobrand" ]; then \
        if [ "$type" = "oxool" ] || [ "$type" = "key" ]; then \
            apt-get -y install collabora-online-brand; \
        else \
            apt-get -y install code-brand; \
        fi; \
    fi && \
# Setup inotifywait
    if [ -z "$noinotifywait" ]; then \
        apt-get -y install inotify-tools psmisc; \
    fi && \
# Fix ownership of config directory that will be modified on start of the container by oxool user
    chown oxool:oxool /etc/oxoolwsd && \
# Remove packages that are not needed
# FIXME: long way to go, the commands below remove oxoolwsd, too.
#    apt-get remove -y --allow-remove-essential adduser apt bsdutils debconf debian-archive-keyring debianutils \
#        diffutils dpkg e2fsprogs findutils gcc-10-base gcc-9-base gpgv grep gzip hostname init-system-helpers \
#        login logsave mawk mount ncurses-base ncurses-bin passwd perl-base sed sysvinit-utils tar util-linux \
#        cpio tzdata libcap2-bin apt-transport-https gnupg2 ca-certificates curl && \
#    apt-get remove -y --allow-remove-essential cpio tzdata libcap2-bin apt-transport-https gnupg2 ca-certificates curl \
#         mount e2fsprogs dpkg apt && \
# Cleanup
    rm -rf /var/lib/apt/* && \
# Remove WOPI Proof key generated by the package, we need unique key for each container
    rm -rf /etc/oxoolwsd/proof_key*

# FIXME
# Use the old starter scripts until we find out how to replace them.
COPY /scripts/start-collabora-online.sh /
COPY /scripts/start-collabora-online.pl /

# oxoolwsd listens on port 9980
EXPOSE 9980

# Switch to oxool user (use numeric user id to be compatible with Kubernetes Pod Security Policies)
USER 100

## Fix name resolution from jails
#CMD cp /etc/resolv.conf /etc/hosts /opt/oxool/systemplate/etc/ && \
## Restart when /etc/oxoolwsd/oxoolwsd.xml changes
#    [ -x /usr/bin/inotifywait -a -x /usr/bin/killall ] && ( \
#        /usr/bin/inotifywait -e modify /etc/oxoolwsd/oxoolwsd.xml \
#        echo "$(ls -l /etc/oxoolwsd/oxoolwsd.xml) modified --> restarting" \
#        /usr/bin/killall -1 oxoolwsd \
#    ) & ; \
## Execute oxoolwsd server
#    exec /usr/bin/oxoolwsd \
#        --version \
#        --o:sys_template_path=/opt/oxool/systemplate \
#        --o:child_root_path=/opt/oxool/child-roots \
#        --o:file_server_root_path=/usr/share/oxoolwsd \
#        --o:logging.color=false \
#        ${extra_params}

# FIXME
# Use the old starter scripts until we find out how to replace them.
CMD ["/start-collabora-online.sh"]

