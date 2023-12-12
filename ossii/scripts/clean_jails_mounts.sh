#!/bin/sh

JAILS_DIR="jails/"

if [ -d "${JAILS_DIR}" ]
then

find jails/* -maxdepth 1 -type d |
while read dir
do
    # dir 是 mountpoint?
    if ! mountpoint -q "${dir}"
    then
        continue
    fi

    LO_DIR="${dir}/lo"
    EXTENSIONS_DIR="${dir}/lo/share/extensions"
    TMP_DIR="${dir}/tmp"

    if [ -d "${LO_DIR}" ]
    then
        sudo umount "${EXTENSIONS_DIR}"
        sudo umount "${LO_DIR}"
        sudo umount "${TMP_DIR}"
        sudo umount "${dir}"
        rm -fr "${dir}"
    fi
done

fi
