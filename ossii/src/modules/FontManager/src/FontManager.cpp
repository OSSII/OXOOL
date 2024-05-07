/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <fontconfig/fontconfig.h>

#include <OxOOL/OxOOL.h>
#include <OxOOL/Util.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/Module/Map.h>
#include <OxOOL/HttpHelper.h>
#include <common/StringVector.hpp>
#include <common/Message.hpp>
#include <net/Socket.hpp>
#include <wsd/ClientSession.hpp>

#include <Poco/MemoryStream.h>
#include <Poco/Path.h>
#include <Poco/File.h>
#include <Poco/URI.h>
#include <Poco/Net/HTMLForm.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTTPResponse.h>

class FontManager : public OxOOL::Module::Base
{
public:
    /// @brief Module constructor.
    FontManager()
    {
        // Put your code here.
    }

    /// Module deconstructor.
    virtual ~FontManager()
    {
        // Put your code here.
    }

    /// @brief 模組載入完畢後，初始化工作，只會在載入完畢後呼叫一次
    /// After the module is loaded, the initialization work will only be called once after
    /// the module is loaded.
    void initialize() override
    {
#if ENABLE_DEBUG
        fontsDir = OxOOL::ENV::FileServerRoot + "/fonts";
#else
        fontsDir = "/usr/share/fonts/" PACKAGE_NAME;
#endif
        // 如果字型目錄不存在，則建立字型目錄
        if (!Poco::File(fontsDir).exists())
            Poco::File(fontsDir).createDirectories();

        maApiMap.setServiceURI(getDetail().serviceURI);

        maApiMap.set("/uploadfonts", maApiMap.POST, CALLBACK(&FontManager::uploadFonts));

        LOG_DBG("FontManager service initialized.");
    }

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override
    {
        // 如果是 api 請求，則交由 apiMap 處理
        if (maApiMap.handled(request, socket))
            return;

        // 其餘的請求，交由父類別處理
        OxOOL::Module::Base::handleRequest(request, socket);
    }

    /// @brief 處理控制臺 Websocket 的訊息
    /// Handle console Websocket messages.
    std::string handleAdminMessage(const StringVector& tokens) override
    {
        // 傳回字型列表
        // 語法：getFontlist
        if (tokens.equals(0, "getFontlist"))
        {
            return "fontList: " + scanFontDir();
        }
        // 刪除字型
        // 語法：deleteFont <檔名>
        // 檔名要用 encodeURI()
        else if (tokens.equals(0, "deleteFont") && tokens.size() == 2)
        {
            // System templlate directory
            const std::string sysTemplateFontsDir = OxOOL::ENV::SysTemplate + "/usr/share/fonts/" PACKAGE_NAME;
            std::string fileName;
            Poco::URI::decode(tokens[1], fileName);
            Poco::File masterFont(fontsDir + "/" + fileName); // 存在系統字型目錄
            Poco::File tempFont(sysTemplateFontsDir + "/" + fileName); // 存在 System templlate 字型目錄

            // 如果字型存在，則刪除字型
            if (masterFont.exists())
                masterFont.remove();

            if (tempFont.exists())
                tempFont.remove();

            return "deleteFontSuccess";
        }

        return "unknowncommand: " + tokens[0];
    }

private:
    /// @brief api URI
    OxOOL::Module::Map maApiMap;

    std::string fontsDir; // 字型目錄

    // 掃描 OxOOL 管理的字型目錄
    const std::string scanFontDir()
    {
        const std::string format = "{\"%{file|basename}\":{\"index\":%{index}, \"family\":\"%{family}\", \"familylang\":\"%{familylang}\", \"style\":\"%{style}\", \"stylelang\":\"%{stylelang}\", \"weight\":\"%{weight}\", \"slant\":\"%{slant}\", \"color\":\"%{color|downcase}\", \"symbol\":\"%{symbol|downcase}\", \"variable\":\"%{variable|downcase}\", \"lang\":\"%{lang}\"}}";
        FcFontSet *fs = FcFontSetCreate();
        FcStrSet *dirs = FcStrSetCreate();
        FcStrList *strlist = FcStrListCreate(dirs);
        FcChar8 *file = (FcChar8*)fontsDir.c_str();
        do
        {
            FcDirScan(fs, dirs, NULL, NULL, file, FcTrue);
        }
        while ((file = FcStrListNext(strlist)));
        FcStrListDone(strlist);
        FcStrSetDestroy(dirs);

        std::string jsonStr("[");
        for (int i = 0; i < fs->nfont; i++)
        {
            FcPattern *pat = fs->fonts[i];
            FcChar8 *s = FcPatternFormat(pat, (FcChar8 *)format.c_str());

            if (i > 0) jsonStr.append(",");

            jsonStr.append((char *)s);
            FcStrFree(s);
        }
        jsonStr.append("]");
        FcFontSetDestroy(fs);
        FcFini();
        return jsonStr;
    }

    //------- API ---------------------------------
    void uploadFonts(const Poco::Net::HTTPRequest& request,
                     const std::shared_ptr<StreamSocket>& socket)
    {
        if (!OxOOL::Util::isAdminLoggedIn(request, socket))
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_UNAUTHORIZED,
                socket, "Unauthorized access.");
            return;
        }

        OxOOL::HttpHelper::PartHandler partHandler;
        Poco::MemoryInputStream message(&socket->getInBuffer()[0],
                                        socket->getInBuffer().size());

        Poco::Net::HTMLForm form(request, message, partHandler);
        if (partHandler.empty())
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_BAD_REQUEST,
                socket, "No file uploaded.");
            return;
        }

        // 將上傳的字型檔案複製到字型目錄
        const std::vector<std::string> files = partHandler.getReceivedFiles();
        for (const auto& file : files)
        {
            Poco::File srcFile(file);
            const std::string fileName = Poco::Path(file).getFileName();
            Poco::File destFile(fontsDir + "/" + fileName);
            srcFile.copyTo(destFile.path());
            Poco::File destSystemplateFile(OxOOL::ENV::SysTemplate + "/usr/share/fonts/" PACKAGE_NAME + "/" + fileName);
            srcFile.copyTo(destSystemplateFile.path());
        }

        partHandler.removeFiles();

        OxOOL::HttpHelper::sendResponseAndShutdown(socket);
    }
};

OXOOL_MODULE_EXPORT(FontManager);

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
