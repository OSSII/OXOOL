/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */

#include "config.h"
#include <iostream>
#include <fstream>

#include <Poco/URI.h>

#include "common/Common.hpp"
#include "LOOLWSD.hpp"
#include "Log.hpp"
#include "JsonUtil.hpp"
#include "OssiiProduct.hpp"

OssiiProduct::OssiiProduct():
    _isSupported(false),
    _maxUsers(0)
{
}

OssiiProduct::~OssiiProduct()
{
}

/// 初始化產品支援(啟動 oxool online 時完成，其他程序不須呼叫)
void OssiiProduct::initialize()
{
    _confDir = _libDir = std::string(LOOLWSD::FileServerRoot + "/support");
    _expiryDate = Poco::DateTime(); // 預設到期日為現在

    // 第一步：指定 Config 目錄，public.key 必須存放在此目錄
    if (ossii_Product_setConfigDir(_confDir.c_str()))
    {
        // 第二步：指定存放 signature 的檔案目錄，必須能夠寫入
        if (ossii_Product_setLibDir(_libDir.c_str()))
        {
            // 第三步：檢查是否合法？
            _isSupported = ossii_Product_isValid();
        }
    }

    if (_isSupported)
    {
        // 讀取支援到期日：過期仍可使用，只是不支援軟體更新及技術支援
        std::string expDate = ossii_Product_getExpiryDate();
        _expiryDate = Poco::DateTime(
                    std::stoi(expDate.substr(0, 4)),
                    std::stoi(expDate.substr(4, 2)),
                    std::stoi(expDate.substr(6, 2)));
        // 取得 oxool json 字串
        std::string oxoolJson = getModuleJson(OXOOL_PRODUCT_NAME);
        Poco::JSON::Object::Ptr jsonObj;
        // 轉成 Poco Json 物件
        if (JsonUtil::parseJSON(oxoolJson, jsonObj))
        {
            size_t nMaxUsers = jsonObj->optValue<size_t>("MaxUsers", 0);
            if (nMaxUsers > 0)
            {
                _maxUsers = nMaxUsers;
            }
            // 讀取使用者帳號列表
            _readUsersList();
        }
        LOOLWSD::MaxConnections = _maxUsers * 2; // 最大連線數為授權帳號數 * 2
        LOOLWSD::MaxDocuments = _maxUsers * 2; // 最大編輯檔案數為授權帳號數 * 2
        LOOLWSD::OverrideWatermark = "";
    }
    else
    {
        LOOLWSD::MaxConnections = 2; // 試用版最多兩個連線
        LOOLWSD::MaxDocuments = 1; // 一個檔案
        LOOLWSD::OverrideWatermark = "Trial Version."; // 浮水印顯示測試版
    }
}

/// 處理 /oxool/usermsg API 呼叫
void OssiiProduct::handleRequest(const Poco::Net::HTTPRequest& request,
                                 const std::shared_ptr<StreamSocket>& socket)
{
    Poco::URI requestUri(request.getURI());
    // 網址路徑分段
    std::vector<std::string> pathSegs;
    requestUri.getPathSegments(pathSegs);

    std::ostringstream oss;
    Poco::JSON::Object jsonObj;
    try
    {
        // /oxool/usermgr
        if (pathSegs[1] == "usermgr")
        {
            // 讀取使用者列表 /oxool/usermgr/getList
            if (pathSegs.size() == 3 && pathSegs[2] == "getList")
            {
                Poco::JSON::Array users;
                // 依序把名單寫入檔案中
                for (std::set<std::string>::iterator it = _users.begin(); it != _users.end(); ++it)
                {
                    users.add(*it);
                }
                jsonObj.set("maxUsers", _maxUsers);
                jsonObj.set("users", users);
            }
            // 新增或刪除使用者
            // /oxool/usermgr/{add/delete}/{user ID}
            else if (pathSegs.size() == 4)
            {
                const std::string userID = Poco::Net::HTTPRequest::decodeWord(pathSegs[3]);
                bool isSuccess = false;
                if (pathSegs[2] == "add")
                {
                    isSuccess = addUser(userID);
                    if (isSuccess)
                    {
                        updateUserListFile();
                    }
                    jsonObj.set("success", isSuccess);
                }
                else if (pathSegs[2] == "delete")
                {
                    isSuccess = deleteUser(userID);
                    if (isSuccess)
                    {
                        updateUserListFile();
                    }
                    jsonObj.set("success", isSuccess);
                }
            }

            // 如果 jsonObj 有資料就把 json 字傳傳回去
            if (jsonObj.size() > 0)
            {
                std::ostringstream ostrJSON;
                jsonObj.stringify(ostrJSON);

                oss << "HTTP/1.1 200 OK\r\n"
                    << "Last-Modified: " << Util::getHttpTimeNow() << "\r\n"
                    << "User-Agent: " << WOPI_AGENT_STRING << "\r\n"
                    << "Content-Length: " << ostrJSON.str().size() << "\r\n"
                    << "Content-Type: application/json\r\n"
                    << "X-Content-Type-Options: nosniff\r\n"
                    << "\r\n"
                    << ostrJSON.str();

                socket->send(oss.str());
                return;
            }
        }
        throw std::exception(); // 拋出例外
    }
    catch (const std::exception& e)
    {
        // Bad request.
        oss << "HTTP/1.1 400\r\n"
            "Date: " << Util::getHttpTimeNow() << "\r\n"
            "User-Agent: " << WOPI_AGENT_STRING << "\r\n"
            "Content-Length: 0\r\n"
            "\r\n";
        socket->send(oss.str());
    }
}

/// 傳回技術支援到期天數
int OssiiProduct::expiryDaysRemaining()
{
    if (_isSupported)
    {
        return ossii_Product_getRemainingDays();
    }
    return 0;
}

/// 取得產品模組的 Json 字串(需自行處理 json 內容)
std::string OssiiProduct::getModuleJson(const std::string& moduleName)
{
    std::string returnValue = "";

    if (_isSupported)
    {
        // 取得 json 字串
        returnValue = ossii_Product_getProduct(moduleName.c_str());

    }
    return returnValue;
}

/// 取得產品模組指定 key 的值
std::string OssiiProduct::getModuleValue(const std::string& moduleName,
                                         const std::string& moduleKey)
{
    std::string returnValue = "";
    if (_isSupported)
    {
        // 取得 json 字串
        std::string jsonStr = ossii_Product_getProduct(moduleName.c_str());
        Poco::JSON::Object::Ptr jsonObj;
        if (JsonUtil::parseJSON(jsonStr, jsonObj) && jsonObj->has(moduleKey))
        {
            returnValue = jsonObj->optValue<std::string>(moduleKey, "");
        }
    }
    return returnValue;
}

// 是否大量授權，大量授權的話不需檢查使用者
bool OssiiProduct::isVolumeLicensing()
{
    return (_maxUsers >= 99999);
}

/// 檢查使用者帳號是否存在
bool OssiiProduct::userExists(const std::string& userID)
{
    // 大量授權的話不需管理使用者列表，直接 bypass
    if (isVolumeLicensing())
    {
        return true;
    }

    bool exists = false; // 沒有
    // 帳號列表有紀錄
    if (!_users.empty())
    {
        exists = (_users.find(userID) != _users.end());
    }
    return exists;
}

/// 新增一個 userID 到列表中
/// 注意！只會把資料新增到記憶體列表，不會更新到帳號檔案中
/// 請在新增資料完畢後，執行 updateUserListFile()
bool OssiiProduct::addUser(const std::string& userID)
{
    // 大量授權的話不需管理使用者列表，直接 bypass
    if (isVolumeLicensing())
    {
        return true;
    }

    // 未超過授權上限，且該帳號不存在列表中
    if (_users.size() < _maxUsers && !userExists(userID))
    {
        _users.insert(userID); // 新增該筆資料
        return true;
    }
    return false;
}

/// 從列表中刪除一個 userID
/// 注意！只會把資料新從記憶體列表刪除，不會更新到帳號檔案中
/// 請在刪除資料完畢後，執行 updateUserListFile()
bool OssiiProduct::deleteUser(const std::string& userID)
{
    // 大量授權的話不需管理使用者列表，直接 bypass
    if (isVolumeLicensing())
    {
        return true;
    }

    // 該帳號存在列表中
    if (userExists(userID))
    {
        _users.erase(userID);
        return true;
    }
    return false;
}

/// 更新使用者帳號列表(有用 addUser() 或 deleteUser() 後，需執行該 method)
bool OssiiProduct::updateUserListFile()
{
    // 大量授權的話不需管理使用者列表，直接 bypass
    if (isVolumeLicensing())
    {
        return true;
    }

    std::ofstream usersFile(usersFileName(), std:: ios::out|std::ios::trunc);
    if (!usersFile.is_open())
    {
        LOG_ERR("Can't open write user list file! (" + usersFileName() + ")");
        return false;
    }

    std::set<std::string>::iterator it;
    // 依序把名單寫入檔案中
    for (it = _users.begin(); it != _users.end(); ++it)
    {
        usersFile << *it << "\n";
    }
    usersFile.close();
    return true;
}

/// 讀取使用者帳號列表(名為_libdir + "/" + OXOOL_USERS_FILE)
bool OssiiProduct::_readUsersList()
{
    // 大量授權的話不需管理使用者列表，直接 bypass
    if (isVolumeLicensing())
    {
        return true;
    }

    std::ifstream usersFile(usersFileName());

    if (!usersFile.is_open())
    {
        LOG_ERR("Can't open read user list file! (" + usersFileName() + ")");
        return false;
    }

    _users.clear(); // 清除現有的使用者列表(如果有的話)
    std::string line;

    // 不超過最大授權數量時，一次讀一行
    while (_users.size() < _maxUsers && std::getline(usersFile, line))
    {
        // 使用者帳號不存在的話，新增一筆
        if (!userExists(line))
        {
            _users.insert(line);
        }
    }
    usersFile.close();
    return true;
}

/// 取得產品模組的 Json 字串(需自行處理 json 內容)
std::string OssiiProduct::getProductList()
{
    std::string returnValue = "";

    if (_isSupported)
    {
        // 取得 json 字串
        returnValue = ossii_Product_getProductList();

    }
    return returnValue;
}

/// 從 std::cerr 輸出 API URI
void OssiiProduct::showURI()
{
    // 如果有授權的話
    if (isSupported())
    {
        const int daysRemaining = expiryDaysRemaining(); // 剩幾天到期
        std::string expired("expired!");
        if (daysRemaining > 0)
        {
            expired = "Expires in " + std::to_string(daysRemaining) + " days";
        }
        std::cerr << "\nOxOffice online product authorization:\n\n"
                  << "    Authorized to:              " << custName() << "\n"
                  << "    Technical support due date: " << Poco::DateTimeFormatter::format(expiryDate(), "%Y-%m-%d")
                  << "(" << expired << ")\n"
                  << "    Maximum number of accounts: " << (isVolumeLicensing() ? "unlimited" : std::to_string(_maxUsers)) << "\n";
        // 不是大量授權的話，顯示使用者管理 URI
        if (!isVolumeLicensing())
        {
            std::string srvRoot = "    " + LOOLWSD::ServiceRoot + "/oxool/usermgr";
            std::cerr << "\nUser management:\n\n"
                      << srvRoot + "/getList\n"
                      << srvRoot + "/add/{USER ID}\n"
                      << srvRoot + "/delete/{USER ID}\n";
        }
    }
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
