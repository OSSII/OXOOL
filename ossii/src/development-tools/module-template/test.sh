#!/bin/bash

RED='\033[0;31m'
GREEN='\033[32m'
NC='\033[0m' # No Color

if test $# != 1 ; then
    echo "Usage: $0 <Path to XML file.>"
    exit 1;
fi

# 檢查 xml 檔案是否存在
XML_FILE=`readlink -e "$1" 2>/dev/null`
if test -z "${XML_FILE}" ; then
    echo -e "${RED}$1 not found.${NC}"
    exit 2;
fi

# 檢查 curl 指令是否存在
CURL_CMD=`which curl 2>/dev/null`
if test -z "${CURL_CMD}" ; then
    echo -e "${RED}Could not find the "curl" command, please install it.${NC}"
    exit 3;
fi


# 檢查 oxoolwsd 或 modaodfweb 是否正在執行
OXOOLWSD_PID=`pgrep -x oxoolwsd`
MODAODFWEB_PID=`pgrep -x modaodfweb`
# 取有值的 PID
PID=${OXOOLWSD_PID:-$MODAODFWEB_PID}
# 如果 PID 為空，表示兩者都沒有在執行
if test -z "${PID}" ; then
    echo -e "${RED}'oxoolwsd' or 'modaodfweb' are not executed.${NC}"
    exit 4;
fi

# 是哪一個服務在執行
if test -n "${OXOOLWSD_PID}" ; then
    echo -e "${GREEN}'oxoolwsd' is running.${NC}"
else
    echo -e "${GREEN}'modaodfweb' is running.${NC}"
fi


# 取得測試 URL，檔案可能在 /tmp/.oxoolmoduletesting(舊版)
# 或 /dev/shm/.oxoolmoduletesting(新版)
if test -f /tmp/.oxoolmoduletesting ; then
    TESTING_FILE=/tmp/.oxoolmoduletesting
elif test -f /dev/shm/.oxoolmoduletesting ; then
    TESTING_FILE=/dev/shm/.oxoolmoduletesting
fi

# 如果 TESTING_FILE 為空，表示兩者都不存在
if test -z "${TESTING_FILE}" ; then
    echo -e "${RED}'/tmp/.oxoolmoduletesting' or '/dev/shm/.oxoolmoduletesting' does not exist, cannot get test URL.${NC}"
    exit 5;
fi

# 取得測試 URL
TESTING_URL=`cat ${TESTING_FILE}`
FULL_URL="${TESTING_URL}${XML_FILE}"
echo -e "${GREEN}Test URL: ${FULL_URL}${NC}"

${CURL_CMD} "${FULL_URL}"
