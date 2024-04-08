/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <Poco/SharedLibrary.h>

namespace OxOOL::Module
{
    class Module;
} // namespace OxOOL::Module

/// @brief 模組 Library 管理
class ModuleLibrary final : public Poco::SharedLibrary
{
public:
    ModuleLibrary();

    ModuleLibrary(const std::string& path);

    ModuleLibrary(OxOOL::Module::Ptr module);

    ~ModuleLibrary();

    /// @brief 載入 Library
    /// @param path Library 絕對路徑
    /// @return
    bool load(const std::string& path);

    /// @brief 是否有模組
    /// @return
    bool hasModule() const { return mpModule != nullptr; };

    /// @brief 取得模組
    /// @return
    OxOOL::Module::Ptr getModule() const { return mpModule; };

    /// @brief 使用 Base 模組
    void useBaseModule();

private:
    /// @brief 模組
    OxOOL::Module::Ptr mpModule;
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
