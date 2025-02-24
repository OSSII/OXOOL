/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <OxOOL/OxOOL.h>
#include <OxOOL/Module/Base.h>

#include <Poco/JSON/Object.h>

namespace Poco::Net
{
    class HTTPRequest;
}


namespace OxOOL
{

class L10NTranslator
{
    L10NTranslator() = delete;
public:
    L10NTranslator(const std::string& language,
                  const OxOOL::Module::Ptr& module);

    L10NTranslator(const Poco::Net::HTTPRequest& request,
                   const OxOOL::Module::Ptr& module);

    virtual ~L10NTranslator() {};

    /// @brief 取得翻譯器能翻譯的語言
    /// @return
    const std::string& getLanguage() const { return maLanguage; }

    /// @brief 取得翻譯結果
    /// @param message 原文
    /// @return 翻譯結果
    const std::string _(std::string& message) const;

private:
    void setLanguage(const std::string& language);

    void makeTranslator();

private:
    /// @brief 所屬模組
    OxOOL::Module::Ptr mpModule;

    /// @brief 翻譯的語言
    std::string maLanguage;

    // 該語系的翻譯 JSON 物件
    Poco::JSON::Object::Ptr mpTranslator;
};

} // namespace OxOOL