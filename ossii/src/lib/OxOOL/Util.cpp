/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <iomanip>
#include <set>
#include <string>
#include <vector>
#include <fstream>
#include <openssl/evp.h>

#include <OxOOL/Util.h>

#include <Poco/Util/Application.h>
#include <Poco/Path.h>
#include <Poco/String.h>
#include <Poco/RegularExpression.h>
#include <Poco/URI.h>
#include <Poco/Crypto/Crypto.h>
#include <Poco/Crypto/Cipher.h>
#include <Poco/Crypto/CipherKey.h>
#include <Poco/Crypto/CipherFactory.h>
#include <Poco/MemoryStream.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTMLForm.h>
#include <Poco/InflatingStream.h>
#include <Poco/DeflatingStream.h>

#include <common/Log.hpp>
#include <common/StringVector.hpp>
#include <wsd/Auth.hpp>
#include <net/Socket.hpp>

namespace OxOOL::Util
{

std::string encryptAES256(const std::string& text,
                            const std::string& password)
{
    std::string insurePassword = password.size() == 0 ? "80542203" : password;
    // 縮放大小為 32 bytes(256 bits)，不足的話補 '0'，太長就縮短
    insurePassword.resize(32, '0');
    const std::string ivString("80542203805422038054220380542203");
    Poco::Crypto::Cipher::ByteVec iv{ivString.begin(), ivString.end()};
    Poco::Crypto::Cipher::ByteVec passwordKey{ insurePassword.begin(), insurePassword.end() };
    Poco::Crypto::CipherKey key("aes-256-cbc", passwordKey, iv);
    Poco::Crypto::Cipher::Ptr cipher = Poco::Crypto::CipherFactory::defaultFactory().createCipher(key);
    return cipher->encryptString(text, Poco::Crypto::Cipher::ENC_BASE64);
}

std::string decryptAES256(const std::string& text,
                            const std::string& password)
{
    std::string insurePassword = password.size() == 0 ? "80542203" : password;
    // 縮放大小為 32 bytes(256 bits)，不足的話補 '0'，太長就縮短
    insurePassword.resize(32, '0');
    const std::string ivString("80542203805422038054220380542203");
    Poco::Crypto::Cipher::ByteVec iv{ ivString.begin(), ivString.end() };
    Poco::Crypto::Cipher::ByteVec passwordKey{ insurePassword.begin(), insurePassword.end() };
    Poco::Crypto::CipherKey key("aes-256-cbc", passwordKey, iv);
    Poco::Crypto::Cipher::Ptr pCipherAES256 = Poco::Crypto::CipherFactory::defaultFactory().createCipher(key);
    return pCipherAES256->decryptString(text, Poco::Crypto::Cipher::ENC_BASE64);
}

bool stringToBool(const std::string& str)
{
    static std::set<std::string> trueSet = { "true", "yes", "on"};

    // 找是否符合條件的字串
    if (auto it = trueSet.find(Poco::toLower(str)); it != trueSet.end())
        return true;

    // 試著轉成 long int
    try
    {
        return std::stol(str) != 0 ? true : false;
    }
    catch(const std::exception& e)
    {
        // do nothing.
    }
    return false;
}

std::string convertUserHome(const std::string& path)
{
    // if path is not start with "~/", return path directly.
    if (path.find_first_of("~/") != 0)
        return path;

    // replace "~/" with user home path.
    std::string tmpPath(path);
    tmpPath.erase(0, 2);
    tmpPath = Poco::Path::home() + tmpPath;

    return tmpPath;
}

std::string encodeURIComponent(const std::string& uri, const std::string& reserved)
{
    std::string encoded;
    Poco::URI::encode(uri, reserved, encoded);
    return encoded;
}

std::string decodeURIComponent(const std::string& uri)
{
    std::string decoded;
    Poco::URI::decode(uri, decoded);
    return decoded;
}

template <typename T>
bool dataFromHexString(const std::string& hexString, T& data)
{
    if (hexString.length() % 2 != 0)
    {
        return false;
    }

    data.clear();
    std::stringstream stream;
    unsigned value;
    for (unsigned long offset = 0; offset < hexString.size(); offset += 2)
    {
        stream.clear();
        stream << std::hex << hexString.substr(offset, 2);
        stream >> value;
        data.push_back(static_cast<typename T::value_type>(value));
    }

    return true;
}

std::string tokensToString(const StringVector& tokens)
{
    const std::size_t size = tokens.size();
    std::string line;
    for (std::size_t i = 0; i < size; ++i)
    {
        line.append(tokens[i]);
        if (i + 1 < size)
            line.append(" ");
    }

    return line;
}

bool isConfigAuthOk(const std::string& username, const std::string& password)
{
    const auto& config = Poco::Util::Application::instance().config();
    const std::string& user = config.getString("admin_console.username", "");

    // Check for the username
    if (user.empty() || user != username)
    {
        LOG_ERR("Username is incorrect, denying access.");
        return false;
    }

    // do we have secure_password?
    if (config.has("admin_console.secure_password"))
    {
        const std::string securePass = config.getString("admin_console.secure_password", "");
        if (securePass.empty())
        {
            LOG_ERR("Secure password is empty, denying access.");
            return false;
        }

#if HAVE_PKCS5_PBKDF2_HMAC
        // Extract the salt from the config
        std::vector<unsigned char> saltData;
        StringVector tokens = StringVector::tokenize(securePass, '.');
        if (tokens.size() != 5 ||
            !tokens.equals(0, "pbkdf2") ||
            !tokens.equals(1, "sha512") ||
            !dataFromHexString(tokens[3], saltData))
        {
            LOG_ERR("Incorrect format detected for secure_password in config file.");
            return false;
        }

        unsigned char userProvidedPwdHash[tokens[4].size() / 2];
        PKCS5_PBKDF2_HMAC(password.c_str(), -1,
                          saltData.data(), saltData.size(),
                          std::stoi(tokens[2]),
                          EVP_sha512(),
                          sizeof userProvidedPwdHash, userProvidedPwdHash);

        std::stringstream stream;
        for (unsigned long j = 0; j < sizeof userProvidedPwdHash; ++j)
            stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(userProvidedPwdHash[j]);

        // now compare the hashed user-provided pwd against the stored hash
        return tokens.equals(4, stream.str());
#else
        const std::string pass = config.getString("admin_console.password", "");
        LOG_ERR("The config file has admin_console.secure_password setting, "
                << "but this application was compiled with old OpenSSL version, "
                << "and this setting cannot be used." << (!pass.empty()? " Falling back to plain text password.": ""));

        // careful, a fall-through!
#endif
    }

    const std::string pass = config.getString("admin_console.password", "");
    if (pass.empty())
    {
        LOG_ERR("Admin Console password is empty, denying access.");
        return false;
    }

    return pass == password;
}

bool isAdminLoggedIn(const Poco::Net::HTTPRequest& request)
{
    // 檢查是否以管理員身份登入
    // 檢查是否有名為 "jwt" 的 cookie
    Poco::Net::NameValueCollection cookies;
    request.getCookies(cookies);
    // 如果有 jwt cookie，檢查是否有效
    if (cookies.has("jwt"))
    {
        const std::string jwtToken = cookies.get("jwt");
        LOG_INF("Verifying JWT token: " << jwtToken);
        JWTAuth authAgent("admin", "admin", "admin");
        // JWT token 有效
        if (authAgent.verify(jwtToken))
        {
            LOG_TRC("JWT token is valid");
            return true;
        }
    }

    return false;
}

bool isAdminLoggedIn(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket)
{
    std::string jwtToken;

    // 檢查是否以管理員身份登入
    // 檢查是否有名為 "jwt" 的 cookie
    Poco::Net::NameValueCollection cookies;
    request.getCookies(cookies);
    // 如果有 jwt cookie，檢查是否有效
    if (cookies.has("jwt"))
    {
        jwtToken = cookies.get("jwt");
    }
    else if (socket != nullptr) // 檢查是否透過表單傳送 jwt token
    {
        Poco::MemoryInputStream message(&socket->getInBuffer()[0],
                                        socket->getInBuffer().size());
        const Poco::Net::HTMLForm form(request, message);
        jwtToken = form.get("jwt", "");
    }

    if (!jwtToken.empty())
    {
        LOG_INF("Verifying JWT token: " << jwtToken);
        JWTAuth authAgent("admin", "admin", "admin");
        // JWT token 有效
        if (authAgent.verify(jwtToken))
        {
            LOG_TRC("JWT token is valid");
            return true;
        }
    }

    return false;
}

const std::map<std::string, std::string>& getOsRelease()
{
    static std::map<std::string, std::string> osRelease;

    // Already read.
    if (!osRelease.empty())
        return osRelease;

    std::ifstream in("/etc/os-release", std::ifstream::in);
    if (in.is_open())
    {
        std::string line;
        while (std::getline(in, line))
        {
            // 第一個字元是 #，就跳過
            if (line.front() == '#')
                continue;

            StringVector tokens = StringVector::tokenize(line, "=");
            if (tokens.size() == 2)
            {
                std::string value = tokens[1];
                // 第一個字元是雙引號，就移除
                if (value.front() == '"')
                    value.erase(0, 1);
                // 最後一個字元是雙引號，就移除
                if (value.back() == '"')
                    value.pop_back();

                osRelease[tokens[0]] = value;
            }
        }
        in.close();
    }

    return osRelease;
}

std::string gzip(const std::string& uncompressedContent)
{
    std::ostringstream compressedContent;
    Poco::DeflatingOutputStream deflater(compressedContent, Poco::DeflatingStreamBuf::STREAM_GZIP);
    deflater << uncompressedContent;
    deflater.close();

    return compressedContent.str();
}

std::string gunzip(const std::string& compressedContent)
{
    std::istringstream istr(compressedContent, std::ios::binary);
    Poco::InflatingInputStream inflater(istr, Poco::InflatingStreamBuf::STREAM_GZIP);
    std::ostringstream data;
    Poco::StreamCopier::copyStream(inflater, data);

    return data.str();
}

bool matchRegex(const std::set<std::string>& set, const std::string& subject)
{
    if (set.find(subject) != set.end())
    {
        return true;
    }

    // Not a perfect match, try regex.
    for (const auto& value : set)
    {
        try
        {
            // Not performance critical to warrant caching.
            Poco::RegularExpression re(value, Poco::RegularExpression::RE_CASELESS);
            Poco::RegularExpression::Match reMatch;

            // Must be a full match.
            if (re.match(subject, reMatch) && reMatch.offset == 0 &&
                reMatch.length == subject.size())
            {
                return true;
            }
        }
        catch (const std::exception& exc)
        {
            // Nothing to do; skip.
        }
    }

    return false;
}

} // namespace OxOOL::Util

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
