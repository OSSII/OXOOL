/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * Copyright the OxOffice Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <memory>
#include <fstream>
#include <string>
#include <mutex>

#include <OxOOL/OxOOL.h>
#include <OxOOL/ZipPackage.h>

#include <Poco/Zip/Zip.h>
#include <Poco/Zip/Decompress.h>
#include <Poco/Zip/ZipFileInfo.h>
#include <Poco/Zip/ZipArchive.h>
#include <Poco/Zip/ZipStream.h>
#include <Poco/StreamCopier.h>

#include <common/Log.hpp>

namespace OxOOL
{

ZipPackage::ZipPackage()
    : mpZip(nullptr)
{
}

ZipPackage::ZipPackage(const ZipPackage&)
    : mpZip(nullptr)
{
}

ZipPackage::ZipPackage(const std::string& zipFile)
    : mpZip(nullptr)
{
    open(zipFile);
}

ZipPackage::ZipPackage(const char* zipFile)
    : mpZip(nullptr)
{
    open(zipFile);
}

ZipPackage::~ZipPackage()
{
    if (maStream.is_open())
        maStream.close();

    mpZip.reset();
}

ZipPackage& ZipPackage::operator=(const std::string& zipFile)
{
    open(zipFile);
    return *this;
}

ZipPackage& ZipPackage::operator=(const char* zipFile)
{
    open(zipFile);
    return *this;
}

ZipPackage& ZipPackage::operator=(const ZipPackage&)
{
    return *this;
}

std::ostringstream ZipPackage::operator[](const std::string& fileName)
{
    return getContentStream(fileName);
}

std::ostringstream ZipPackage::operator[](const char* fileName)
{
    return getContentStream(fileName);
}

std::ostringstream ZipPackage::operator[](const Poco::Path& path)
{
    return getContentStream(path.toString());
}

std::vector<std::string> ZipPackage::getList() const
{
    std::vector<std::string> files;
    if (mpZip != nullptr)
    {
        // 讀取檔案列表
        for (auto it = mpZip->headerBegin(); it != mpZip->headerEnd(); ++it)
            files.emplace_back(it->first);
    }

    return files;
}

bool ZipPackage::exists(const std::string& fileName)
{
    if (mpZip != nullptr)
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        return mpZip->findHeader(fileName) != mpZip->headerEnd();
    }

    return false;
}

std::ostringstream ZipPackage::getContentStream(const std::string& fileName)
{
    std::ostringstream oss;
    oss.setstate(std::ios::badbit);
    if (mpZip != nullptr)
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        const Poco::Zip::ZipArchive::FileHeaders::const_iterator it = mpZip->findHeader(fileName);
        if (it != mpZip->headerEnd())
        {
            oss.clear();
            const Poco::Zip::ZipLocalFileHeader info = it->second;
            maStream.clear();
            Poco::Zip::ZipInputStream zipStream(maStream, info);
            Poco::StreamCopier::copyStream(zipStream, oss);
        }
        else
        {
            LOG_ERR("File [" << fileName << "] not found in zip file [" << maZipFile << "].");
        }
    }

    return oss;
}

bool ZipPackage::extract(const std::string& fromZipfileName,
                         const std::string& toDestPath)
{
    Poco::Path zipFileName(fromZipfileName);

    std::ostringstream oss = getContentStream(zipFileName.toString());
    if (oss.bad())
        return false;

    Poco::File destFile(toDestPath);
    // if the destination path exists
    if (destFile.exists())
    {
        // can write to the destination path
        if (destFile.canWrite())
        {
            std::ofstream file(toDestPath +
                               (destFile.isDirectory() ?  "/" + zipFileName.getFileName() : ""),
                               std::ios::binary|std::ios::trunc);
            if (file.is_open())
            {
                file << oss.str();
                return true;
            }
            else
                LOG_ERR("Failed to write file [" << toDestPath << "].");
        }
        else
            LOG_ERR("Destination path [" << toDestPath << "] is not writable.");
    }
    else // if the destination does not exist
    {
        // 檢查父目錄是否存在
        Poco::Path parentPath = Poco::Path(destFile.path()).parent().makeDirectory();
        // 如果父目錄存在且可寫入
        if (Poco::File(parentPath).exists() && Poco::File(parentPath).canWrite())
        {
            std::ofstream file(toDestPath, std::ios::binary|std::ios::trunc);
            if (file.is_open())
            {
                file << oss.str();
                return true;
            }
            else
                LOG_ERR("Failed to write file [" << toDestPath << "].");
        }
        else
            LOG_ERR("Destination path [" << toDestPath << "] is not exists or not writable.");
    }

    return false;
}

bool ZipPackage::decompressAllFiles(const std::string& zipFile,
                                    const std::string& destPath)
{
    // zip file 能讀取
    std::ifstream zipStream(zipFile, std::ios::binary);
    if (!zipStream.is_open())
    {
        LOG_ERR("Failed to open zip file [" << zipFile << "].");
        return false;
    }

    // destPath 必須存在，且是目錄，且能寫入
    Poco::File destFile(destPath);
    destFile.createDirectories(); // 建立目錄
    if (!destFile.exists() || !destFile.isDirectory() || !destFile.canWrite())
    {
        LOG_ERR("Destination path [" << destPath << "] is not exists or not directory or not writable.");
        return false;
    }

    Poco::Zip::Decompress decompress(zipStream, destPath, false, true);
    decompress.decompressAllFiles();
    return true;
}

bool ZipPackage::extractAll(const std::string& destPath)
{
    if (mpZip != nullptr)
        return decompressAllFiles(maZipFile, destPath);

    return false;
}

// private methods here --------------------------------------------------------

bool ZipPackage::open(const std::string& zipFile)
{
    const std::lock_guard<std::mutex> lock(maMutex);

    // Check if the file is exist && is a file
    const Poco::File file(zipFile);
    if (!file.exists() || !file.isFile())
    {
        LOG_ERR("Invalid zip file: " << zipFile);
        return false;
    }

    // try to open the file
    std::ifstream tryStream(zipFile, std::ios::binary);
    if (!tryStream.is_open())
    {
        LOG_ERR("Failed to open zip file: " << zipFile);
        return false;
    }

    if (maStream.is_open())
        maStream.close(); // Close the previous file

    maStream = std::move(tryStream); // Move the new file
    mpZip.reset(new Poco::Zip::ZipArchive(maStream));

    maZipFile = zipFile;

    return true;
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
