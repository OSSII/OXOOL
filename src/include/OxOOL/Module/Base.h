
// Base.h
//
// Library: OxOOL
//
// Definition of the Module class interface.
//
// Copyright (c) 2022, OSS Integeral Institute Co Ltd.
// and Contributors.
//

#pragma once
#include <OxOOL/OxOOL.h>

#include <memory>
#include <thread>

#include <Poco/Net/HTTPRequest.h>
#include <Poco/MemoryStream.h>

#include <net/Socket.hpp>
#include <wsd/RequestDetails.hpp>

#define MODULE_METHOD_IS_ABSTRACT "@OxOOL::Module::Base"

namespace OxOOL
{
namespace Module
{

struct Detail
{
    std::string name;
    std::string serviceURI;
    std::string version;
    std::string summary;
    std::string author;
    std::string license;
    std::string description;
    bool adminPrivilege = false;
};

class Base
{
public:
    Base(){};
    virtual ~Base(){};

    const Detail& getDetail() const { return detail; }
    void setDetail(const Detail& newDetial) { detail = newDetial; }

    const std::string& getDocumentRoot() const { return rootPath; }
    void setDocumentRoot(const std::string& documentRoot) { rootPath = documentRoot; }

public:
    virtual void handleRequest(const RequestDetails& requestDetails,
                               const Poco::Net::HTTPRequest& request,
                               const std::shared_ptr<StreamSocket>& socket);

    virtual std::string handleAdminMessage(const std::string& message);

    virtual std::string handleClientMessage(const std::string& message);

protected:

    /// @brief 解析模組實際請求位址
    /// @param requestDetails
    /// @return 實際的請求位址
    std::string parseRealURI(const RequestDetails& requestDetails) const;

protected:
    Detail detail;

    std::string rootPath; // 模組文件位置
};

typedef std::shared_ptr<Base> Ptr;

} // namespace Module
} // namespace OxOOL

// Define a pointer type to the entry point.
typedef OxOOL::Module::Ptr (*OxOOLModuleEntry)();

#define OXOOL_MODULE_ENTRY_SYMBOL "oxoolModuleInfo"
#define OXOOL_MODULE_ENTRY_FUNC oxoolModuleInfo()

#define OXOOL_MODULE_EXPORT(ClassName) \
    extern "C" OxOOL::Module::Ptr OXOOL_MODULE_ENTRY_FUNC { return std::make_shared<ClassName>(); }
