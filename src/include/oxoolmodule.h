/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This file is part of the OxOffice Online project.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#ifndef INCLUDED_OXOOLMODULE_H
#define INCLUDED_OXOOLMODULE_H

#include <map>
#include <string>
#include "config.h"
#include "Socket.hpp"
#include "DocumentBroker.hpp"

#include <Poco/Net/HTTPRequest.h>
#include <Poco/MemoryStream.h>

// base class for all shapes
class oxoolmodule {
    public:
        virtual void handleRequest(std::weak_ptr<StreamSocket>, Poco::MemoryInputStream&, Poco::Net::HTTPRequest&, SocketDisposition&)=0;
        void setMutex(std::mutex* oDocBrokersMutex, 
                std::map<std::string, std::shared_ptr<DocumentBroker> > &oDocBrokers, 
                std::string id)
        {
            DocBrokersMutex = oDocBrokersMutex;
            DocBrokers = &oDocBrokers;
            _id = id;
        }
        virtual std::string getHTMLFile(std::string fileName)
        {
            return fileName;
        }
        std::string extension_dir = "/var/lib/oxool/";
        std::mutex* DocBrokersMutex;
        std::map<std::string, std::shared_ptr<DocumentBroker>> *DocBrokers;
        std::string _id;
};
typedef oxoolmodule *maker_t();
extern std::map<std::string, maker_t *, std::less<std::string> > apilist;
// our global factory
#ifdef  __cplusplus
extern "C" {
#endif

#ifdef  __cplusplus
}
#endif /* __cplusplus */

#endif /* INCLUDED_OXOOLMODULE_H */

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
