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
    /// @param zipFile - zip file
    ZipPackage(const std::string& zipFile);

    /// @brief constructor
    /// @param zipFile - zip file
    ZipPackage(const char* zipFile);

    /// @brief copy constructor
    /// @param ZipPackage
    ZipPackage(const ZipPackage&);

    ~ZipPackage();

    /// @brief assignment operator
    /// @param zipFile
    /// @return ZipPackage&
    ZipPackage& operator=(const std::string& zipFile);
    /// @brief assignment operator
    /// @param zipFile
    /// @return ZipPackage&
    ZipPackage& operator=(const char* zipFile);
    /// @brief assignment operator
    /// @param ZipPackage
    /// @return ZipPackage&
    ZipPackage& operator=(const ZipPackage&);

    /// @brief get the file from the zip
    /// @param fileName - file name
    /// @return std::ostringstream
    std::ostringstream operator[](const std::string& fileName);
    /// @brief get the file from the zip
    /// @param fileName
    /// @return std::ostringstream
    std::ostringstream operator[](const char* fileName);
    /// @brief get the file from the zip
    /// @param path - file path
    /// @return std::ostringstream
    std::ostringstream operator[](const Poco::Path& path);

    /// @brief get the list of files in the zip
    /// @return std::vector<std::string>
    std::vector<std::string> getList() const;

    /// @brief check if the file exists in the zip
    bool exists(const std::string& fileName);

    /// @brief get the content of the file from the zip
    /// @param fileName
    /// @return std::ostringstream
    /// @note the file is in the ostringstream. if the file does not exist, the ostringstream.bad() will be true
    std::ostringstream getContentStream(const std::string& fileName);

    /// @brief extract the file from the zip to the destination path
    /// @param fromZipfileName - file name
    /// @param toDestPath - destination path.
    /// @note If path is a directory, the file will be decompressed in that directory, keeping the original file name.
    ///       If path is a file, the file will be overwritten.
    /// @return bool true if the file is extracted, false otherwise
    bool extract(const std::string& fromZipfileName,
                 const std::string& toDestPath);

    /// @brief extract all files from the zip to the destination path
    /// @param destPath - destination path
    /// @return bool true if all files are extracted, false otherwise
    bool extractAll(const std::string& destPath);

    /// @brief decompress all files from the zip to the destination path
    /// @param zipFile - zip file
    /// @param destPath - destination path
    /// @return bool true if all files are decompressed, false otherwise
    static bool decompressAllFiles(const std::string& zipFile, const std::string& destPath);

private:
    /// @brief open a zip file
    /// @param zipFile
    /// @return bool true if the file is valid, false otherwise
    bool open(const std::string& zipFile);

private:
    /// @brief zip file
    std::string maZipFile;

    std::mutex maMutex;
    std::ifstream maStream;
    std::unique_ptr<Poco::Zip::ZipArchive> mpZip;

}; // class ZipPackage

} // namespace OxOOL

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
