/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#pragma once

#include <OxOOL/Module/Base.h>

#include <Poco/SharedLibrary.h>
#include <Poco/Exception.h>

#include <common/Log.hpp>

/// @brief 模組 Library 管理
class ModuleLibrary final
{
public:
    ModuleLibrary() : mpModule(nullptr)
    {
    }

    ModuleLibrary(OxOOL::Module::Ptr module) : mpModule(module)
    {
    }

    ~ModuleLibrary()
    {
        // 釋放模組資源
        mpModule.reset();

        // 再卸載 Library，否則會 crash
        if (maLibrary.isLoaded())
            maLibrary.unload();
    }

    /// @brief 載入 Library
    /// @param path Library 絕對路徑
    /// @return
    bool load(const std::string& path)
    {
        try
        {
            maLibrary.load(path);
            if (maLibrary.hasSymbol(OXOOL_MODULE_ENTRY_SYMBOL))
            {
                auto moduleEntry = reinterpret_cast<OxOOLModuleEntry>(maLibrary.getSymbol(OXOOL_MODULE_ENTRY_SYMBOL));
                mpModule = moduleEntry(); // 取得模組
                LOG_DBG("Successfully loaded '" << path << "'.");
                return true;
            }
            else // 不是 OxOOL 模組物件就卸載
            {
                LOG_DBG("'" << path << "' is not a valid OxOOL module.");
                maLibrary.unload();
            }
        }
        // 已經載入過了
        catch(const Poco::LibraryAlreadyLoadedException& e)
        {
            LOG_ERR(path << "' has already been loaded.");
        }
        // 無法載入
        catch(const Poco::LibraryLoadException& e)
        {
            LOG_ERR(path << "' cannot be loaded.");
        }

        return false;
    }

    OxOOL::Module::Ptr getModule() const { return mpModule; }

    void useBaseModule()
    {
        mpModule = std::make_shared<OxOOL::Module::Base>();
    }

private:
    Poco::SharedLibrary maLibrary;
    OxOOL::Module::Ptr mpModule;
};

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
