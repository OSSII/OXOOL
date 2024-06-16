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

#include <Poco/Path.h>
#include <Poco/File.h>
#include <Poco/Zip/ZipManipulator.h>
#include <Poco/Zip/Decompress.h>
#include <Poco/Zip/ZipFileInfo.h>
#include <Poco/Zip/ZipArchive.h>
#include <Poco/Zip/ZipStream.h>
#include <Poco/StreamCopier.h>

#include <common/Log.hpp>

namespace OxOOL
{

ZipPackage::ZipPackage()
{
}

ZipPackage::ZipPackage(const std::string& localZipFile)
{
    open(localZipFile);
}

ZipPackage::ZipPackage(const char* localZipFile)
{
    open(localZipFile);
}

ZipPackage::~ZipPackage()
{
    if (maInputStream.is_open())
        maInputStream.close();

    mpZipManipulator.reset();
}

ZipPackage& ZipPackage::operator=(const std::string& localZipFile)
{
    open(localZipFile);
    return *this;
}

ZipPackage& ZipPackage::operator=(const char* localZipFile)
{
    open(localZipFile);
    return *this;
}

std::ostringstream ZipPackage::operator[](const std::string& zipFile)
{
    return getContentStream(zipFile);
}

std::ostringstream ZipPackage::operator[](const char* zipFile)
{
    return getContentStream(zipFile);
}

std::ostringstream ZipPackage::operator[](const Poco::Path& zipFile)
{
    return getContentStream(zipFile.toString());
}

bool ZipPackage::ready() const
{
    return mpZipManipulator != nullptr;
}

std::vector<std::string> ZipPackage::getList()
{
    std::vector<std::string> files;
    if (ready())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        const Poco::Zip::ZipArchive& zipArchive = mpZipManipulator->originalArchive();
        // get the list of files in the zip
        for (auto it = zipArchive.headerBegin(); it != zipArchive.headerEnd(); ++it)
            files.emplace_back(it->first);
    }

    return files;
}

bool ZipPackage::getList(const std::string& localZipFile, std::vector<std::string>& list)
{
    list.clear(); // clear the list
    // can read the zip file
    std::ifstream zipStream(localZipFile, std::ios::binary|std::ios::in);
    if (zipStream.is_open())
    {
        const Poco::Zip::ZipArchive zipArchive(zipStream);
        for (auto it = zipArchive.headerBegin(); it != zipArchive.headerEnd(); ++it)
            list.emplace_back(it->first);

        return true;
    }
    else
        LOG_ERR("Failed to open zip file [" << localZipFile << "].");

    return false;
}

bool ZipPackage::exists(const std::string& zipFile)
{
    if (ready() && !zipFile.empty())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        // zip file name not include the leading '/'
        const std::string fileNameCopy = zipFile[0] == '/' ? zipFile.substr(1) : zipFile;
        const Poco::Zip::ZipArchive& zipArchive = mpZipManipulator->originalArchive();
        return zipArchive.findHeader(fileNameCopy) != zipArchive.headerEnd();
    }

    return false;
}

std::ostringstream ZipPackage::getContentStream(const std::string& zipFile)
{
    std::ostringstream oss;
    oss.setstate(std::ios::badbit);

    if (ready() && !zipFile.empty())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        // zip file name not include the leading '/'
        const std::string fileNameCopy = zipFile[0] == '/' ? zipFile.substr(1) : zipFile;
        // get the zip archive reference
        const Poco::Zip::ZipArchive& zipArchive = mpZipManipulator->originalArchive();
        // find the file in the zip archive
        const auto it = zipArchive.findHeader(fileNameCopy);
        if (it != zipArchive.headerEnd())
        {
            const Poco::Zip::ZipLocalFileHeader info = it->second;
            if (info.isFile())
            {
                oss.clear();
                maInputStream.clear();
                Poco::Zip::ZipInputStream zipStream(maInputStream, info);
                Poco::StreamCopier::copyStream(zipStream, oss);
            }
            else
                LOG_ERR("File [" << zipFile << "] is not a file in zip file [" << maLocalZipFile << "].");
        }
        else
            LOG_ERR("File [" << zipFile << "] not found in zip file [" << maLocalZipFile << "].");
    }
    else
        LOG_ERR("Failed to get content of file [" << zipFile << "] from zip file [" << maLocalZipFile << "]."
                << (ready() ? "" : " The zip file is not ready."));

    return oss;
}

bool ZipPackage::getContent(const std::string& zipFile, std::string& content)
{
    std::ostringstream oss = getContentStream(zipFile);

    if (oss.bad())
        return false;

    content = oss.str();
    return true;
}

bool ZipPackage::extract(const std::string& zipfile,
                         const std::string& toDestPath)
{
    std::string content;
    if (!getContent(zipfile, content))
        return false;

    Poco::File destFile(toDestPath);
    // if the destination path exists
    if (destFile.exists())
    {
        // can write to the destination path
        if (destFile.canWrite())
        {
            std::ofstream file(toDestPath +
                (destFile.isDirectory() ?  "/" + Poco::Path(zipfile).getFileName() : ""),
                std::ios::binary|std::ios::trunc);
            if (file.is_open())
            {
                file << content;
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
        Poco::Path parentPath = Poco::Path(destFile.path()).parent().makeDirectory();
        // check if the parent path exists and is writable
        if (Poco::File(parentPath).exists() && Poco::File(parentPath).canWrite())
        {
            std::ofstream file(toDestPath, std::ios::binary|std::ios::trunc);
            if (file.is_open())
            {
                file << content;
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

bool ZipPackage::extractAll(const std::string& destPath)
{
    if (ready())
        return decompressAllFiles(maLocalZipFile, destPath);

    return false;
}

bool ZipPackage::decompressAllFiles(const std::string& localZipFile,
                                    const std::string& destPath)
{
    std::ifstream zipStream(localZipFile, std::ios::binary|std::ios::in);
    if (!zipStream.is_open())
    {
        LOG_ERR("Failed to open zip file [" << localZipFile << "].");
        return false;
    }

    // destPath must be a directory and writable
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

bool ZipPackage::addFile(const std::string& zipFile, const std::string& localFile, bool commitNow)
{
    if (ready() && !readonly())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        mpZipManipulator->addFile(zipFile, localFile);
        if (commitNow)
            commit();

        LOG_DBG("File [" << localFile << "] added to zip file [" << maLocalZipFile << "]."
                << " zip file name: [" << zipFile << "].");
        return true;
    }
    else
        LOG_ERR("Failed to add file [" << localFile << "] to zip file [" << maLocalZipFile << "]."
                << (readonly() ? " The zip file is readonly." : "")
                << (ready() ? "" : " The zip file is not ready."));

    return false;
}

bool ZipPackage::replaceFile(const std::string& zipFile, const std::string& localFile, bool commitNow)
{
    if (ready() && !readonly())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        mpZipManipulator->replaceFile(zipFile, localFile);
        if (commitNow)
            commit();

        LOG_DBG("File [" << localFile << "] replaced in zip file [" << maLocalZipFile << "]."
                << " zip file name: [" << zipFile << "].");
        return true;
    }
    else
        LOG_ERR("Failed to replace file [" << localFile << "] in zip file [" << maLocalZipFile << "]."
                << (readonly() ? " The zip file is readonly." : "")
                << (ready() ? "" : " The zip file is not ready."));

    return false;
}

bool ZipPackage::deleteFile(const std::string& zipFile, bool commitNow)
{
    if (ready() && !readonly())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        mpZipManipulator->deleteFile(zipFile);
        if (commitNow)
            commit();

        LOG_DBG("File [" << zipFile << "] deleted from zip file [" << maLocalZipFile << "].");
        return true;
    }
    else
        LOG_ERR("Failed to delete file [" << zipFile << "] from zip file [" << maLocalZipFile << "]."
                << (readonly() ? " The zip file is readonly." : "")
                << (ready() ? "" : " The zip file is not ready."));

    return false;
}

bool ZipPackage::renameFile(const std::string& oldZipFile, const std::string& newZipFile, bool commitNow)
{
    if (ready() && !readonly())
    {
        const std::lock_guard<std::mutex> lock(maMutex);
        mpZipManipulator->renameFile(oldZipFile, newZipFile);
        if (commitNow)
            commit();

        LOG_DBG("File [" << oldZipFile << "] renamed to [" << newZipFile << "] in zip file [" << maLocalZipFile << "].");
        return true;
    }
    else
        LOG_ERR("Failed to rename file [" << oldZipFile << "] to [" << newZipFile << "] in zip file [" << maLocalZipFile << "]."
                << (readonly() ? " The zip file is readonly." : "")
                << (ready() ? "" : " The zip file is not ready."));

    return false;
}

void ZipPackage::commit()
{
    if (ready() && !readonly())
    {
        const std::lock_guard<std::mutex> lock(maCommitMutex);
        Poco::Zip::ZipArchive zipArchive = mpZipManipulator->commit();
        loadLocalZipFile();
    }
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

    // check if the file can be read
    if (!file.canRead())
    {
        LOG_ERR("Failed to read zip file: " << zipFile);
        return false;
    }

    // check if the file can be written
    mbReadonly = !file.canWrite();
    // set the local zip file
    maLocalZipFile = zipFile;

    loadLocalZipFile(); // reset the local zip file

    return true;
}

void ZipPackage::loadLocalZipFile()
{
    mpZipManipulator.reset(new Poco::Zip::ZipManipulator(maLocalZipFile, false));

    if (maInputStream.is_open())
        maInputStream.close();

    maInputStream.open(maLocalZipFile, std::ios::binary|std::ios::in);
}

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
