/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include "Watermark.hpp"

#include <time.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/Util.h>

#include <Poco/String.h>
#include <Poco/DateTimeFormatter.h>
#include <Poco/DateTime.h>
#include <Poco/Util/Application.h>
#include <Poco/JSON/Object.h>
#include <Poco/JSON/Parser.h>

#include <wsd/ClientSession.hpp>

namespace OxOOL
{

void Watermark::initialize()
{
    loadSysWatermark();
}

void Watermark::enhanceWatermark(const std::shared_ptr<ClientSession>& clientSession)
{
    // Parse UserExtraInfo to JSON object
    Poco::JSON::Object::Ptr userExtraInfo;
    try
    {
        Poco::JSON::Parser parser;
        userExtraInfo = parser.parse(clientSession->getUserExtraInfo()).extract<Poco::JSON::Object::Ptr>();
    }
    catch (const Poco::Exception& exc)
    {
        LOG_WRN("Error parsing userExtraInfo: " << exc.displayText());
        return;
    }

    // Check userExtraInfo has watermark
    if (!userExtraInfo->has("watermark"))
    {
        LOG_WRN("No watermark in userExtraInfo");
        return;
    }

    // Check if watermark is object
    if (!userExtraInfo->isObject("watermark"))
    {
        LOG_WRN("Watermark is not an object");
        return;
    }

    // 檢查 userExtraInfo 是否帶 ip
    const std::string ip = userExtraInfo->optValue<std::string>("ip", "");


    // Merge system watermark with user watermark
    Poco::JSON::Object userWatermark = *userExtraInfo->getObject("watermark");
    for (const auto& key : maSysWatermark)
    {
        if (!userWatermark.has(key.first))
            userWatermark.set(key.first, key.second);
    }

    // if text is empty, or editing/printing are false, disable watermark
    if (userWatermark.get("text").isEmpty() ||
        (!userWatermark.getValue<bool>("editing") && !userWatermark.getValue<bool>("printing")))
    {
        clientSession->setWatermarkText("");
        return;
    }

    // convert water text tags
    const std::string text = convertTags(clientSession, userWatermark.getValue<std::string>("text"), ip);
    // replace text
    userWatermark.set("text", text);
    // stringify
    const std::string watermarkJsonText = convertJsonString(userWatermark);
    // set watermark text
    clientSession->setWatermarkText(watermarkJsonText);
    // send watermark to client
    clientSession->sendTextFrame("watermark: " + watermarkJsonText);
}

// Private meythods -----------------------------------------------------------
void Watermark::loadSysWatermark()
{
    const std::vector<std::array<std::string, 3>> keyMap =
    {
        {"editing", "bool", "false"},
        {"printing", "bool", "false"},
        {"text", "string", ""},
        {"opacity", "double", "0.2"},
        {"angle", "uint", "45"},
        {"familyname", "string", "Liberation Sans"},
        {"color", "string", "#000000"},
        {"bold", "bool", "false"},
        {"italic", "bool", "false"},
        {"relief", "string", ""},
        {"outline", "bool", "false"},
        {"shadow", "bool", "false"}
    };

    const auto& config = Poco::Util::Application::instance().config();

    maSysWatermark.clear(); // Clear the object

    for (const auto& key : keyMap)
    {
        // key[0] - key name
        // key[1] - type
        // key[2] - default value
        const std::string nodeName = "watermark." + key[0];
        try
        {
            if (key[1] == "bool")
                maSysWatermark.set(key[0], config.getBool(nodeName, Util::stringToBool(key[2])));
            else if (key[1] == "double")
                maSysWatermark.set(key[0], config.getDouble(nodeName, std::stod(key[2])));
            else if (key[1] == "uint")
                maSysWatermark.set(key[0], config.getUInt(nodeName, std::stoul(key[2])));
            else if (key[1] == "string" || key[1].empty())
                maSysWatermark.set(key[0], config.getString(nodeName, key[2]));
            else
                throw std::runtime_error("Unknown type: " + key[1]);
        }
        catch(const std::exception& e)
        {
            LOG_WRN("Error reading '" << nodeName << "': " << e.what()
                    << ". Using default value: " << key[2]);

            if (key[1] == "bool")
                maSysWatermark.set(key[0], Util::stringToBool(key[2]));
            else if (key[1] == "double")
                maSysWatermark.set(key[0], std::stod(key[2]));
            else if (key[1] == "uint")
                maSysWatermark.set(key[0], std::stoul(key[2]));
            else
                maSysWatermark.set(key[0], key[2]);
        }
    }

    // Check if watermark text is empty
    if (maSysWatermark.get("text").isEmpty())
    {
        maSysWatermark.set("editing", false);
        maSysWatermark.set("printing", false);
    }

    LOG_INF("System watermark: " << convertJsonString(maSysWatermark));
}

std::string Watermark::convertJsonString(const Poco::JSON::Object& obj)
{
    std::ostringstream oss;
    obj.stringify(oss);
    return oss.str();
}

std::string Watermark::convertTags(const std::shared_ptr<ClientSession>& clientSession,
                                   const std::string& text, const std::string& userIP)
{
    std::string retString = text;

    const std::string& timezone = clientSession->getTimezone();
    setenv("TZ", timezone.c_str(), 1);
    tzset();
    time_t now = time(NULL);
    struct tm local_tm = *localtime(&now);
    unsetenv("TZ");
    // 系統時間加上客戶端時區偏移值，就是客戶端目前時間
    Poco::DateTime clientDateTime(Poco::Timestamp() + Poco::Timespan(local_tm.tm_gmtoff, 0));
    // 日光節約時間
    if (local_tm.tm_isdst > 0)
        clientDateTime += Poco::Timespan(3600, 0);

    // 使用者 ID ${id}
    Poco::replaceInPlace(retString, std::string("${id}"), clientSession->getUserId());
    // 使用者名稱 ${name}
    Poco::replaceInPlace(retString, std::string("${name}"), clientSession->getUserName());
    // 使用者時區 ${timezone}
    Poco::replaceInPlace(retString, std::string("${timezone}"), timezone);

    // 使用者 IP ${ip}
    std::string ip = userIP;
    /* if (ip.empty())
    {

        ip = clientSession->getAddr();
    } */

    // strip ipv6 prefix
    if (ip.find("::ffff:") == 0)
    {
        ip = ip.substr(7);
    }
    else if (ip == "::1")
    {
        ip = "127.0.0.1";
    }

    Poco::replaceInPlace(retString, std::string("${ip}"), ip);

    // 日期 ${yyyy-mm-dd}
    Poco::replaceInPlace(retString, std::string("${yyyy-mm-dd}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%Y-%n-%e"));
    // 日期 ${mm-dd-yyyy}
    Poco::replaceInPlace(retString, std::string("${mm-dd-yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%n-%e-%Y"));
    // 日期 ${dd-mm-yyyy}
    Poco::replaceInPlace(retString, std::string("${dd-mm-yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%e-%n-%Y"));

    // 日期 ${yyyy/mm/dd}
    Poco::replaceInPlace(retString, std::string("${yyyy/mm/dd}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%Y/%n/%e"));
    // 日期 ${mm/dd/yyyy}
    Poco::replaceInPlace(retString, std::string("${mm/dd/yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%n/%e/%Y"));
    // 日期 ${dd/mm/yyyy}
    Poco::replaceInPlace(retString, std::string("${dd/mm/yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%e/%n/%Y"));

    // 日期 ${yyyy.mm.dd}
    Poco::replaceInPlace(retString, std::string("${yyyy.mm.dd}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%Y.%n.%e"));
    // 日期 ${mm.dd.yyyy}
    Poco::replaceInPlace(retString, std::string("${mm.dd.yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%n.%e.%Y"));
    // 日期 ${dd.mm.yyyy}
    Poco::replaceInPlace(retString, std::string("${dd.mm.yyyy}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%e.%n.%Y"));

    // 24小時格式時間 ${time}
    Poco::replaceInPlace(retString, std::string("${time}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%H:%M"));
    // 12小時格式時間 ${ampm}
    Poco::replaceInPlace(retString, std::string("${ampm}"),
                         Poco::DateTimeFormatter::format(clientDateTime, "%h:%M %a"));

    return retString;
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
