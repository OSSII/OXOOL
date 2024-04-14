/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <OxOOL/OxOOL.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/L10NTranslator.h>
#include <OxOOL/HttpHelper.h>

#include <Poco/Exception.h>
#include <Poco/File.h>
#include <Poco/FileStream.h>
#include <Poco/StreamCopier.h>
#include <Poco/JSON/Parser.h>
#include <Poco/JSON/Object.h>

#include <common/Log.hpp>

namespace OxOOL
{

L10NTranslator::L10NTranslator(const std::string& language,
                               const OxOOL::Module::Ptr& module)
    : mpModule(module)
{
    setLanguage(language);

}

L10NTranslator::L10NTranslator(const Poco::Net::HTTPRequest& request,
                               const OxOOL::Module::Ptr& module)
    : mpModule(module)

{
    setLanguage(OxOOL::HttpHelper::getAcceptLanguage(request));
}

const std::string L10NTranslator::_(std::string& message) const
{
    if (!mpTranslator.isNull() && mpTranslator->has(message))
    {
        return mpTranslator->getValue<std::string>(message);
    }

    return message;
}

// Private meythods -----------------------------------------------------------

void L10NTranslator::setLanguage(const std::string& language)
{
    // 如果語言是 zh-Hant 或 zh-tw，就改成 zh-TW
    if (language == "zh-Hant" || language == "zh-tw")
    {
        maLanguage = "zh-TW";
    } else if (language == "zh-Hans" || language == "zh-cn")
    {
        maLanguage = "zh-CN";
    } else
    {
        maLanguage = language;
    }

    makeTranslator();
}

void L10NTranslator::makeTranslator()
{
    if (mpModule == nullptr)
        return;

    // 語系檔所在路徑
    const std::string l10nFile = mpModule->getDocumentRoot() + "/browser/l10n/" + maLanguage + ".json";
    // 語系檔案存在，就讀入內容
    if (Poco::File(l10nFile).exists())
    {
        Poco::FileInputStream fis(l10nFile, std::ios::binary);
        std::stringstream translateStr;
        Poco::StreamCopier::copyStream(fis, translateStr);
        fis.close();

        Poco::JSON::Parser parser;
        auto result = parser.parse(translateStr.str());

        try
        {
            mpTranslator = result.extract<Poco::JSON::Object::Ptr>();
        }
        catch(const Poco::Exception& exc)
        {
            LOG_ERR("Module [" << mpModule->getDetail().name << "]:" << exc.displayText());
        }
    }
}

} // namespace OxOOL
