/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
  * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <fstream>
#include <vector>

#include <OxOOL/Util.h>
#include <OxOOL/HttpHelper.h>
#include <OxOOL/ModuleManager.h>
#include <OxOOL/Module/Base.h>

#include <Poco/File.h>
#include <Poco/Net/HTTPRequest.h>
#include <Poco/Net/HTMLForm.h>

#include <net/Socket.hpp>
#include <net/NetUtil.hpp>
#include <common/Log.hpp>

/**
 * @brief 用於模組開發階段使用
 *
 * 用法：curl http(s)://localhost:9980/moduletest?config={xml 絕對路徑}
 *
 */
class ModuleTesting : public OxOOL::Module::Base
{
public:

    enum COLOR
    {
        GREEN = 0,
        YELLOW,
        RED
    };

    ModuleTesting()
    {
        maTestingFiles.emplace_back("/dev/shm/.oxoolmoduletesting");
        maTestingFiles.emplace_back("/tmp/.oxoolmoduletesting"); // 未來會移除
    }

    ~ModuleTesting()
    {
        removeTestingFiles();
    }

    void initialize() override
    {
        createTestingFile();
    }

    void handleRequest(const Poco::Net::HTTPRequest& request,
                       const std::shared_ptr<StreamSocket>& socket) override
    {
        // 檢查是否來自 localhost
        if (!net::isLocalhost(socket->clientAddress()))
        {
            LOG_ERR(logTitle() << "Deny module testing requests from non-localhost.");
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_FORBIDDEN, socket);
            return;
        }

        // 回應訊息內容
        std::string responseMsg;

        Poco::Net::HTMLForm form(request);
        const std::string configFile = form.get("config", "");
        // 不是 GET 或沒有指定 xml config
        if (!OxOOL::HttpHelper::isGET(request) || configFile.empty())
        {
            responseMsg = "Usage:\n"
                        + OxOOL::HttpHelper::getProtocol()
                        + request.getHost() + OxOOL::HttpHelper::getServiceURI(getDetail().serviceURI)
                        + "?config={The module's xml config absolute path.}";
        }
        else
        {
            // 檔案存在，就令 Module Manager 載入
            if (Poco::File(configFile).exists())
            {
                // 模組管理物件
                OxOOL::ModuleManager& moduleManager = OxOOL::ModuleManager::instance();
                const std::string modulePath = Poco::Path(configFile).makeParent().toString() + ".libs";
                // 載入 config 及 shared library
                if (!moduleManager.loadModuleConfig(configFile, modulePath))
                {
                    responseMsg = "Failed to load '" + configFile + "', please check the xml configuration for errors.";
                }
                else
                {
                    OxOOL::Module::Ptr module = moduleManager.getModuleByConfigFile(configFile);
                    OxOOL::Module::Detail detail = module->getDetail();

                    std::ostringstream oss;
                    oss << "Module details:"
                        << "\n\tID: " << module->getId()
                        << "\n\tName: " << detail.name
                        << "\n\tService URI: " << (detail.serviceURI.empty() ? colorString("<None>", YELLOW) : OxOOL::HttpHelper::getServiceURI(detail.serviceURI))
                        << "\n\tVerson: " << detail.version
                        << "\n\tSummary: " << detail.summary
                        << "\n\tLicense: " << detail.license
                        << "\n\tAuthor: " << detail.author
                        << "\n\tDescrtption: " << detail.description
                        << "\n\tDocument root: " << module->getDocumentRoot()
                        << "\n\tBrowser URI: " << (module->getBrowserURI().empty() ? colorString("<None>", GREEN) : OxOOL::HttpHelper::getServiceURI(module->getBrowserURI()))
                        << "\n\tAdmin privilege: " << (detail.adminPrivilege ? "Yes" : "No")
                        << "\n\tAdmin icon: " << detail.adminIcon
                        << "\n\tAdmin item: " << detail.adminItem
                        << "\n\tAdmin URI: " << (module->getAdminURI().empty() ? colorString("<None>", GREEN) : OxOOL::HttpHelper::getServiceURI(module->getAdminURI()));

                    responseMsg = oss.str();
                }
            }
            else
            {
                responseMsg = "Cannot find '" + configFile + "'.";
            }
        }
        OxOOL::HttpHelper::sendResponseAndShutdown(socket, (responseMsg.empty() ? "" : responseMsg + "\n"));
    }

private:
    /// @brief 移除測試 URL 檔
    void removeTestingFiles()
    {
        for (const auto& file : maTestingFiles)
        {
            if (Poco::File(file).exists())
                Poco::File(file).remove();
        }
    }

    /// @brief 建立測試 URL 檔
    void createTestingFile()
    {
        for (const auto& file : maTestingFiles)
        {
            std::ofstream out(file, std::ios::trunc|std::ios::out|std::ios::binary);
            if (out.is_open())
            {
                out << OxOOL::HttpHelper::getProtocol()
                    << "localhost:" << OxOOL::HttpHelper::getPortNumber()
                    << OxOOL::HttpHelper::getServiceURI(getDetail().serviceURI)
                    << "?config=";
                out.close();
                LOG_DBG(logTitle() << file << " create successfully.");
            }
            else
            {
                LOG_ERR(logTitle() << "Unable to create" << file);
            }
        }
    }

    /// @brief 顏色化字串
    std::string colorString(const std::string& str, COLOR color)
    {
        const std::string greenColor = "\033[1;32m";
        const std::string yellowColor = "\033[1;33m";
        const std::string redColor = "\033[1;31m";
        const std::string resetColor = "\033[0m";

        switch (color)
        {
            case GREEN:
                return greenColor + str + resetColor;
            case YELLOW:
                return yellowColor + str + resetColor;
            case RED:
                return redColor + str + resetColor;
            default:
                return str;
        }
    }

private:
    std::vector<std::string> maTestingFiles;
};

OXOOL_MODULE_EXPORT(ModuleTesting);

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
