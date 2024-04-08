/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <OxOOL/OxOOL.h>
#include <OxOOL/ConvertBroker.h>
#include <OxOOL/Module/Base.h>
#include <OxOOL/ModuleManager.h>

#include <Poco/Version.h>
#include <Poco/Net/HTTPRequest.h>

#include <net/Socket.hpp>

#include "ModuleAgent.hpp"

std::chrono::microseconds ModuleAgent::AgentTimeoutMicroS = std::chrono::seconds(60);

ModuleAgent::ModuleAgent(const std::string& threadName)
    : SocketPoll(threadName)
{
    purge();
    startThread();
}

void ModuleAgent::handleRequest(OxOOL::Module::Ptr module,
                    const Poco::Net::HTTPRequest& request,
                    SocketDisposition& disposition)
{
    setBusy(true); // 設定忙碌狀態

    mpSavedModule = module;
    mpSavedSocket = std::static_pointer_cast<StreamSocket>(disposition.getSocket());
// Poco 版本小於 1.10，maRequest 必須 parse 才能產生
#if POCO_VERSION < 0x010A0000
    {
        (void)request;
        StreamSocket::MessageMap map;
        Poco::MemoryInputStream message(&mpSavedSocket->getInBuffer()[0],
                                        mpSavedSocket->getInBuffer().size());
        if (!mpSavedSocket->parseHeader("Client", message, maRequest, &map))
        {
            LOG_ERR("Create HTTPRequest fail! stop running");
            stopRunning();
            return;
        }
        maRequest.setURI(request.getURI());
    }
#else // 否則直接複製
    maRequest = request;
#endif

    disposition.setMove([=](const std::shared_ptr<Socket>& moveSocket)
    {
        insertNewSocket(moveSocket);
        startRunning();
    });
}

void ModuleAgent::pollingThread()
{
    while (SocketPoll::continuePolling() && !SigUtil::getTerminationFlag())
    {
        // 正在處理請求
        if (isBusy())
        {
            if ((mpSavedSocket != nullptr && mpSavedSocket->isClosed()) && !isModuleRunning())
            {
                purge(); // 清理資料，恢復閒置狀態，可以再利用
            }
        }
        const int64_t rc = poll(AgentTimeoutMicroS);
        if (rc == 0) // polling timeout.
        {
            // 現在時間
            const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
            auto durationTime = std::chrono::duration_cast<std::chrono::microseconds>(now - mpLastIdleTime);
            // 閒置超過預設時間，就脫離迴圈
            if (durationTime >= AgentTimeoutMicroS)
            {
                break;
            }
        }
        else if (rc > 0) // Number of Events signalled.
        {
            // 被 wakeup，紀錄目前時間
            mpLastIdleTime = std::chrono::steady_clock::now();
        }
        else // error
        {
            // do nothing.
        }
    }

    // 執行緒已經結束，觸發清理程序
    OxOOL::ModuleManager &manager = OxOOL::ModuleManager::instance();
    manager.cleanupDeadAgents();

    // 觸發 ConvertBroker 清理程序
    OxOOL::ConvertBroker::cleanup();
}

bool ModuleAgent::isIdle() const
{
    return isAlive() && !isBusy();
}

void ModuleAgent::startRunning()
{
    // 讓 thread 執行，流程交還給 Main thread.
    // 凡是加進 Callback 執行的 function 都是在 agent thread 排隊執行
    addCallback([this]()
    {
        setModuleRunning(true);
        // client address equals to "::1", it means the client is localhost.
        if (mpSavedSocket->clientAddress() == "::1")
        {
            mpSavedSocket->setClientAddress("127.0.0.1");
        }
        // client address prefix is "::ffff:", it means the client is IPv4.
        else if (Util::startsWith(mpSavedSocket->clientAddress(), "::ffff:"))
        {
            const std::string ipv4ClientAddress = mpSavedSocket->clientAddress().substr(7);
            mpSavedSocket->setClientAddress(ipv4ClientAddress);
        }

        mpSavedModule->handleRequest(maRequest, mpSavedSocket); // Restful API

        stopRunning();
    });
}


void ModuleAgent::stopRunning()
{
    setModuleRunning(false); // 模組已經結束
    wakeup();  // 喚醒 thread.(就是 ModuleAgent::pollingThread() loop)
}

void ModuleAgent::setBusy(bool onOff)
{
    mbBusy = onOff;
}

bool ModuleAgent::isBusy() const
{
    return mbBusy;
}


void ModuleAgent::setModuleRunning(bool onOff)
{
    mbModuleRunning = onOff;
}


bool ModuleAgent::isModuleRunning() const
{
    return mbModuleRunning;
}

void ModuleAgent::purge()
{
    // 觸發 ConvertBroker 清理程序
    OxOOL::ConvertBroker::cleanup();

    mpSavedModule = nullptr;
    mpSavedSocket = nullptr;
    setModuleRunning(false);
    setBusy(false);
    mpLastIdleTime = std::chrono::steady_clock::now(); // 紀錄最近閒置時間
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
