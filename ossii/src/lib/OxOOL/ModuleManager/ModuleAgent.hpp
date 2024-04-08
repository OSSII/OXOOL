/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

namespace OxOOL::module
{
    class Module;
} // namespace OxOOL::module

namespace Poco::Net
{
    class HTTPRequest;
} // namespace Poco::Net

class SocketPoll;
class StreamSocket;

class ModuleAgent final : public SocketPoll
{

public:
    ModuleAgent(const std::string& threadName);

    ~ModuleAgent() {}

    static std::chrono::microseconds AgentTimeoutMicroS; // = std::chrono::seconds(60);

    void handleRequest(OxOOL::Module::Ptr module,
                        const Poco::Net::HTTPRequest& request,
                        SocketDisposition& disposition);

    bool isIdle() const;

private:
    void pollingThread() override;

    /// @brief 從執行緒代理請求
    void startRunning();

    /// @brief 代理請求結束
    void stopRunning();

    /// @brief 設定是否忙碌旗標
    /// @param onOff
    void setBusy(bool onOff);

    /// @brief 是否忙碌
    /// @return true: 是
    bool isBusy() const;

    /// @brief 設定模組是否執行中
    /// @param onOff
    void setModuleRunning(bool onOff);

    /// @brief 模組是否正在執行
    /// @return true: 是
    bool isModuleRunning() const;

    /// @brief 清除最近代理的資料，並恢復閒置狀態
    void purge();

    /// @brief 最近閒置時間
    std::chrono::steady_clock::time_point mpLastIdleTime;

    /// @brief 與 Client 的 socket
    std::shared_ptr<StreamSocket> mpSavedSocket;

    /// @brief 要代理的模組
    OxOOL::Module::Ptr mpSavedModule;
    /// @brief HTTP Request
    Poco::Net::HTTPRequest maRequest;

    /// @brief 是否正在代理請求
    std::atomic<bool> mbBusy;
    /// @brief 模組正在處理代理送去的請求
    std::atomic<bool> mbModuleRunning;
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
