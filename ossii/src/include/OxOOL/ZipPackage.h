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

#pragma once

#include <memory>
#include <fstream>
#include <string>
#include <mutex>

namespace Poco
{
class Path;
namespace Zip
{
class ZipArchive;
class ZipManipulator;
} // namespace Zip
} // namespace Poco

namespace OxOOL
{

/// @brief ZipPackage class
/// @note This code does not support encrypted zip files.
class ZipPackage
{
public:
    ZipPackage();

    /// @brief constructor
    /// @param localZipFile - local zip file full path
    ZipPackage(const std::string& localZipFile);

    /// @brief constructor
    /// @param localZipFile - local zip file full path
    ZipPackage(const char* localZipFile);

    ~ZipPackage();

    /// @brief assignment operator
    /// @param localZipFile - local zip file full path
    /// @return ZipPackage&
    ZipPackage& operator=(const std::string& localZipFile);
    /// @brief assignment operator
    /// @param localZipFile - local zip file full path
    /// @return ZipPackage&
    ZipPackage& operator=(const char* localZipFile);

    /// @brief get the file from the zip
    /// @param zipFile - zip file
    /// @return std::ostringstream
    std::ostringstream operator[](const std::string& zipFile);
    /// @brief get the file from the zip
    /// @param zipFile - zip file
    /// @return std::ostringstream
    std::ostringstream operator[](const char* zipFile);
    /// @brief get the file from the zip
    /// @param zipFile - zip file
    /// @return std::ostringstream
    std::ostringstream operator[](const Poco::Path& zipFile);

    /// @brief check if the zip file is ready
    /// @return bool true if the zip file is ready, false otherwise
    bool ready() const;

    /// @brief check if the zip file is readonly
    /// @return bool true if the zip file is readonly, false otherwise
    bool readonly() const { return mbReadonly; }

    /// @brief get the list of files in the zip
    /// @return std::vector<std::string>
    std::vector<std::string> getList();

    /// @brief get the list of files in specified zip file
    /// @param localZipFile - local zip file full path
    /// @param list - stored list
    /// @return bool true if the list is got, false otherwise
    static bool getList(const std::string& localZipFile, std::vector<std::string>& list);

    /// @brief check if the file exists in the zip
    /// @param zipFile - zip file
    /// @return bool true if the file exists, false otherwise
    bool exists(const std::string& zipFile);

    /// @brief get the content stream of the file from the zip
    /// @param zipFile - zip file
    /// @return std::ostringstream
    /// @note the file is in the ostringstream. if the file does not exist, the ostringstream.bad() will be true
    std::ostringstream getContentStream(const std::string& zipFile);

    /// @brief get the content of the file from the zip
    /// @param zipFile - zip file
    /// @param content - stored content
    /// @return bool true if the file is got, false otherwise
    /// @note the file is in the content. if the file does not exist, the content will be empty
    bool getContent(const std::string& zipFile, std::string& content);

    /// @brief extract the file from the zip to the destination path
    /// @param zipFile - zip file
    /// @param toDestPath - destination path.
    /// @note If path is a directory, the file will be decompressed in that directory, keeping the original file name.
    ///       If path is a file, the file will be overwritten.
    /// @return bool true if the file is extracted, false otherwise
    bool extract(const std::string& zipFile, const std::string& toDestPath);

    /// @brief extract all files from the zip to the destination path
    /// @param destPath - destination path
    /// @return bool true if all files are extracted, false otherwise
    bool extractAll(const std::string& destPath);

    /// @brief decompress all files from the local zip file to the destination path
    /// @param localZipFile - local zip file full path
    /// @param destPath - destination path
    /// @return bool true if all files are decompressed, false otherwise
    static bool decompressAllFiles(const std::string& localZipFile, const std::string& destPath);

    /// @brief add a file to the zip
    /// @param zipFile - zip file
    /// @param localFile - local file
    /// @param commitNow - commit now
    /// @note If zip file exists, the file will be overwritten.
    /// @return bool true if the file is added, false otherwise
    bool addFile(const std::string& zipFile, const std::string& localFile, bool commitNow = true);

    bool replaceFile(const std::string& zipFile, const std::string& localFile, bool commitNow = true);

    bool deleteFile(const std::string& zipFile, bool commitNow = true);

    bool renameFile(const std::string& oldZipFile, const std::string& newZipFile, bool commitNow = true);

    /// @brief commit the changes and reload the zip file
    void commit();

private:
    /// @brief open a zip file
    /// @param zipFile
    /// @return bool true if the file is valid, false otherwise
    bool open(const std::string& zipFile);

    /// @brief load local zip file
    void loadLocalZipFile();

private:

    std::string maLocalZipFile; // local zip file full path
    std::ifstream maInputStream;

    std::mutex maMutex;
    std::mutex maCommitMutex;
    bool mbReadonly;
    std::unique_ptr<Poco::Zip::ZipManipulator> mpZipManipulator;

}; // class ZipPackage

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
