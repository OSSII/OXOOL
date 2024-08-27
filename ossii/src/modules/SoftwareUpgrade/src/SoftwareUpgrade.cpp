/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <algorithm>
#include <fstream>

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

class SoftwareUpgrade : public OxOOL::Module::Base
{
public:
    /// @brief Module constructor.
    SoftwareUpgrade()
    {
        // Put your code here.
    }

    /// Module deconstructor.
    virtual ~SoftwareUpgrade()
    {
        // Put your code here.
    }

    /// @brief 模組載入完畢後，初始化工作，只會在載入完畢後呼叫一次
    /// After the module is loaded, the initialization work will only be called once after
    /// the module is loaded.
    void initialize() override
    {
        maApiMap.setServiceURI(getDetail().serviceURI);
        maApiMap.set("/upload", maApiMap.POST, CALLBACK(&SoftwareUpgrade::upload));

        // get osRelease
        auto osRelease = OxOOL::Util::getOsRelease();
        const std::string osName = osRelease["ID"]; // lower case distro name (e.g. ubuntu, centos)
        if (osName == "centos" || osName == "rhel" || osName == "fedora" || osName == "redhat" || osName == "arch" ||
            osName == "oracle" || osName == "suse" || osName == "opensuse" ||
            osName == "scientific" || osName == "cloudlinux" || osName == "amazon" ||
            osName == "rocky" || osName == "almalinux" || osName == "clearos")
        {
            maPackageBase = "rpm";
        }
        else if (osName == "debian" || osName == "ubuntu" || osName == "mint")
        {
            maPackageBase = "deb";
        }
        else
        {
            // 找看看有沒有 rpm 指令
            if (system("rpm --version > /dev/null 2>&1") == 0)
            {
                maPackageBase = "rpm";
            }
            else if (system("dpkg --version > /dev/null 2>&1") == 0)
            {
                maPackageBase = "deb";
            }
        }

        LOG_DBG("SoftwareUpgrade service initialized.");
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
    void handleAdminMessage(const OxOOL::SendTextMessageFn& sendTextMessage,
                            const StringVector& tokens) override
    {
        if (tokens.equals(0, "getPackageBase"))
        {
            sendAdminTextFrame(sendTextMessage, "packageBase:" + maPackageBase);
        }

        // 安裝升級檔
        else if (tokens.equals(0, "upgradePackage") && tokens.size() == 1)
        {
            // 開始安裝套件
            std::string installTestCmd, installCmd;
            if (maPackageBase == "rpm")
            {
                installTestCmd = "sudo rpm -Uvh --force --test `find -name \"*.rpm\"` 2>&1";
                installCmd = "sudo rpm -Uvh --force `find -name \"*.rpm\"` 2>&1";
            }
            else if (maPackageBase == "deb")
            {
                installTestCmd = "sudo dpkg -i --force-all --dry-run `find -name \"*.deb\"` 2>&1";
                installCmd = "sudo dpkg -i --force-all `find -name \"*.deb\"` 2>&1";
            }
            else
            {
                sendAdminTextFrame(sendTextMessage, "upgradeMsg:Unsupported package installation system!");
                sendAdminTextFrame(sendTextMessage, "upgradeFail");
                return;
            }

            // 紀錄目前工作目錄
            const std::string currentPath = Poco::Path::current();
            // 上傳的檔案
            const Poco::Path workFile(maPartHandler.getFilename());
            // 上傳檔案所在路徑
            const std::string workPath = workFile.parent().toString();

            // 進入暫存目錄
            if (chdir(workPath.c_str()) != 0)
            {
                sendAdminTextFrame(sendTextMessage, "upgradeMsg:Unable to enter the temporary directory!");
                sendAdminTextFrame(sendTextMessage, "upgradeFail");
                return;
            }

            // 取延伸檔名
            std::string extName = workFile.getExtension();
            // 延伸檔名轉小寫
            std::transform(extName.begin(), extName.end(), extName.begin(), ::tolower);

            std::string uncompressCmd;
            if (extName == "zip")
                uncompressCmd = "unzip \"" + workFile.getFileName() + "\" 2>&1";
            else if (extName == "gz" || extName == "tgz")
                uncompressCmd = "tar zxvf \"" + workFile.getFileName() + "\" 2>&1";
            else if (extName == "rpm" || extName == "deb")
            {
                // do nothing
            }
            else
            {
                sendAdminTextFrame(sendTextMessage, "upgradeMsg:Unknown file type!");
                sendAdminTextFrame(sendTextMessage, "upgradeFail");
                return;
            }

            FILE *fp;
            char buffer[128];
            std::ifstream in;
            int retcode; // 指令結束狀態碼

            // 一、是否需要先解壓縮
            if (!uncompressCmd.empty())
            {
                sendAdminTextFrame(sendTextMessage, "upgradeMsg:File uncompressing...", true);
                sendAdminTextFrame(sendTextMessage, "upgradeInfo:Command: " + uncompressCmd + "\n\n", true);
                fp = popen(uncompressCmd.c_str(), "r");
                while (fgets(buffer, sizeof(buffer), fp))
                {
                    // 傳回輸出內容
                    sendAdminTextFrame(sendTextMessage, "upgradeInfo:" + std::string(buffer), true);
                }
                retcode = pclose(fp);
                // 指令執行有錯
                if (retcode != 0)
                {
                    maPartHandler.removeFiles(); // 砍掉該檔案
                    sendAdminTextFrame(sendTextMessage, "uncompressPackageFail");
                    return;
                }
            }

            // 二、測試是否能升級
            sendAdminTextFrame(sendTextMessage, "upgradeMsg:Test whether it can be upgraded.", true);
            sendAdminTextFrame(sendTextMessage, "upgradeInfo:Command: " + installTestCmd + "\n\n", true);
            fp = popen(installTestCmd.c_str(), "r");
            while (fgets(buffer, sizeof(buffer), fp))
            {
                // 傳回輸出內容
                sendAdminTextFrame(sendTextMessage, "upgradeInfo:" + std::string(buffer), true);
            }
            retcode = pclose(fp);
            // 指令執行有錯
            if (retcode != 0)
            {
                maPartHandler.removeFiles(); // 砍掉該檔案
                sendAdminTextFrame(sendTextMessage, "upgradePackageTestFail");
                return;
            }

            // 三、正式升級
            sendAdminTextFrame(sendTextMessage, "upgradeMsg:Start the real upgrade.", true);
            sendAdminTextFrame(sendTextMessage, "upgradeInfo:Command: " + installCmd + "\n\n", true);
            fp = popen(installCmd.c_str(), "r");
            while (fgets(buffer, sizeof(buffer), fp))
            {
                // 傳回輸出內容
                sendAdminTextFrame(sendTextMessage, "upgradeInfo:" + std::string(buffer), true);
            }
            retcode = pclose(fp);
            // 指令執行有錯
            if (retcode != 0)
            {
                maPartHandler.removeFiles(); // 砍掉該檔案
                sendAdminTextFrame(sendTextMessage, "upgradeFail");
                return;
            }

            // 回到之前的工作目錄
            if (chdir(currentPath.c_str())) {/* do nothing */};
            maPartHandler.removeFiles(); // 砍掉該檔案
            sendAdminTextFrame(sendTextMessage, "upgradeSuccess");
        }
    }

private:
    /// @brief api URI
    OxOOL::Module::Map maApiMap;

    std::string maPackageBase;

    OxOOL::HttpHelper::PartHandler maPartHandler;

    //------- API ---------------------------------
    void upload(const Poco::Net::HTTPRequest& request,
                     const std::shared_ptr<StreamSocket>& socket)
    {
        if (!OxOOL::Util::isAdminLoggedIn(request, socket))
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_UNAUTHORIZED,
                socket, "Unauthorized access.");
            return;
        }

        Poco::MemoryInputStream message(&socket->getInBuffer()[0],
                                        socket->getInBuffer().size());

        Poco::Net::HTMLForm form(request, message, maPartHandler);
        if (maPartHandler.empty())
        {
            OxOOL::HttpHelper::sendErrorAndShutdown(Poco::Net::HTTPResponse::HTTP_BAD_REQUEST,
                socket, "No file uploaded.");
            return;
        }

        OxOOL::HttpHelper::sendResponseAndShutdown(socket);
    }
};

OXOOL_MODULE_EXPORT(SoftwareUpgrade);

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
