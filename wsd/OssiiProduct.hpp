/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
#pragma once

#define OXOOL_PRODUCT_NAME "oxool"
#define OXOOL_USERS_FILE "users"

#include <string>
#include <set>
#include <ossiiProduct.h>

class OssiiProduct
{
public:
    OssiiProduct();

    virtual ~OssiiProduct();

    /// 初始化產品支援(啟動 oxool online 時完成，其他程序不須呼叫)
    void initialize();

    /// 處理 /oxool/usermsg API 呼叫
    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket);

    /// 取得 public.key 目錄
    std::string confDir() {return _confDir;}

    /// 取得 signature、authorizer 以及其他關於產品資料檔案可存取的目錄
    std::string libDir() {return _libDir;}

    /// 查詢是否授權
    bool isSupported() {return _isSupported;}

    /// 取得授權客戶編號
    std::string custNo() {return ossii_Product_getCustNo();}

    /// 取得授權客戶名稱
    std::string custName() {return ossii_Product_getCustName();}

    /// 取得到期日期(YYYYMMDD 字串格式)
    std::string expiryDateYYYYMMDD() {return ossii_Product_getExpiryDate();}

    /// 取得到期日期(Poco::DateTime 物件)
    Poco::DateTime expiryDate() {return _expiryDate;}

    /// 查詢剩下幾天到期( <= 0 表示已到期)
    int expiryDaysRemaining();

    /// 取得授權帳號數量
    int maxUsers() {return _maxUsers;}

    /// 是否大量授權？
    bool isVolumeLicensing();

    /// 取得使用者列表
    const std::set<std::string> userList() {return _users;}

    /// 取得產品模組的 Json 字串(需自行處理內含 key:value)
    std::string getModuleJson(const std::string& moduleName);

    /// 取得產品模組指定 key 的值(簡易取得某模組某個 key 的 value)
    std::string getModuleValue(const std::string& moduleName,
                               const std::string& moduleKey);

    /// 取得使用者帳號檔案完整路徑名稱
    inline std::string usersFileName() {return _libDir + "/" + OXOOL_USERS_FILE;}

    /// 檢查使用者帳號是否存在
    bool userExists(const std::string& userID);

    /// 新增一個 userID 到列表中
    /// 注意！只會把資料新增到記憶體列表，不會更新到帳號檔案中
    /// 請在新增資料完畢後，執行 updateUserListFile()
    bool addUser(const std::string& userID);

    /// 從列表中刪除一個 userID
    /// 注意！只會把資料新從記憶體列表刪除，不會更新到帳號檔案中
    /// 請在刪除資料完畢後，執行 updateUserListFile()
    bool deleteUser(const std::string& userID);

    /// 更新使用者帳號列表(有用 addUser() 或 deleteUser() 後，需執行該 method)
    bool updateUserListFile();

    /// 取得產品模組完整的 Json 字串(需自行處理 json 內容)
    std::string getProductList();

    /// 從 std::cerr 輸出 API URI
    void showURI();

private:
    bool _isSupported; // 是否授權
    size_t _maxUsers; // 預設的使用者帳號數量

    std::string _confDir; // public.key 目錄
    std::string _libDir; // signature、authorizer 以及其他關於產品資料檔案可存取的目錄
    Poco::DateTime _expiryDate; // 技術支援到期日

    std::set<std::string> _users; // 使用者帳號列表(不重複)

    /// 讀取使用者名單
    bool _readUsersList();
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
