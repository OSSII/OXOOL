/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <OxOOL/OxOOL.h>

#include <map>
#include <set>
#include <string>

class StreamSocket;

namespace OxOOL::Util
{
/// 以 AES 256 加密字串
std::string encryptAES256(const std::string& text,
                            const std::string& password = std::string());

/// 以 AES 256 解密字串
std::string decryptAES256(const std::string& text,
                            const std::string& password = std::string());

/// @brief 將字串轉成 bool
/// 如果字串內容是 "true"、"yes" "on" 或是數字非 "0"，則傳回 true，否則為 false
/// @param str - 不分大小寫字串
/// @return true / false
bool stringToBool(const std::string& str);

/// @brief 如果含有使用者家目錄符號 ~/，則轉換成實際家目錄路徑
/// @param path - 轉換後的路徑，如果沒有家目錄符號則不變
std::string convertUserHome(const std::string& path);

/// @brief
/// @param uri
/// @param reserved
/// @return
std::string encodeURIComponent(const std::string& uri,
                               const std::string& reserved = ",/?:@&=+$#");

/// @brief
/// @param uri
/// @return
std::string decodeURIComponent(const std::string& uri);

/// @brief 將字串轉成 16 進位字串
/// @param hexString - 要轉換的資料
/// @param data - 轉換後的資料
/// @return true / false
template <typename T>
bool dataFromHexString(const std::string& hexString, T& data);

/// @brief 檢查使用者名稱與密碼是否與 consig 紀錄的相同
bool isConfigAuthOk(const std::string& username, const std::string& password);

/// @brief 檢查管理者是否已登入
bool isAdminLoggedIn(const Poco::Net::HTTPRequest& request, const std::shared_ptr<StreamSocket>& socket = nullptr);

/// @brief Read the contents of /etc/os-release
/// @ref https://www.freedesktop.org/software/systemd/man/latest/os-release.html
/// @return
const std::map<std::string, std::string>& getOsRelease();

/// Return true if the subject matches in given set. It uses regex
/// Mainly used to match WOPI hosts patterns
bool matchRegex(const std::set<std::string>& set, const std::string& subject);

/// Given one or more patterns to allow, and one or more to deny,
/// the match member will return true if, and only if, the subject
/// matches the allowed list, but not the deny.
/// By default, everything is denied.
class RegexListMatcher
{
public:
    RegexListMatcher() :
        _allowByDefault(false)
    {
    }

    RegexListMatcher(const bool allowByDefault) :
        _allowByDefault(allowByDefault)
    {
    }

    RegexListMatcher(std::initializer_list<std::string> allowed) :
        _allowByDefault(false),
        _allowed(allowed)
    {
    }

    RegexListMatcher(std::initializer_list<std::string> allowed,
                        std::initializer_list<std::string> denied) :
        _allowByDefault(false),
        _allowed(allowed),
        _denied(denied)
    {
    }

    RegexListMatcher(const bool allowByDefault,
                        std::initializer_list<std::string> denied) :
        _allowByDefault(allowByDefault),
        _denied(denied)
    {
    }

    void allow(const std::string& pattern) { _allowed.insert(pattern); }
    void deny(const std::string& pattern)
    {
        _allowed.erase(pattern);
        _denied.insert(pattern);
    }

    void clear()
    {
        _allowed.clear();
        _denied.clear();
    }

    bool match(const std::string& subject) const
    {
        return (_allowByDefault ||
                matchRegex(_allowed, subject)) &&
                !matchRegex(_denied, subject);
    }

    // whether a match exist within both _allowed and _denied
    bool matchExist(const std::string& subject) const
    {
        return (matchRegex(_allowed, subject) ||
                matchRegex(_denied, subject));
    }

    bool empty() const
    {
        return _allowed.empty() && _denied.empty();
    }

private:
    const bool _allowByDefault;
    std::set<std::string> _allowed;
    std::set<std::string> _denied;
};

} // namespace OxOOL::Util

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
