## OxOffice Online Module.

**Module name:** %MODULE_NAME%

**Summary:** %MODULE_SUMMARY%

**License:** %MODULE_LICENSE%

**Author:** %MODULE_AUTHOR%

**Description:** %MODULE_DESCRIPTION%

--------------------------------------------

**src/**

C++ based shared library for module. Automatically loaded during OxOOL execution time,and manage the specified service URI.

The service URI is defined in module.xml.in.

**html/**

If you don't want to implement a C++ module, you can leave <load>xxxx.so<load> in module.xml.in blank, and in the html directory, create a normal type of webpage, OxOOL will manage it automatically.

The default web page name is index.html or index.php (will be supported in the future).

**browser/**

If you want to add online editing functionality, you can implement the browser-side Javascript module in this directory.

For implementation details, please refer to the README file in this directory.

**admin/**

If you have a console management interface, Please enter the name of the option to be displayed, Defined in <adminItem> in module.xml.in.

This will allow you to see your admin interface at the following URL:

http(s)://yourhost:9980/browser/dist/admin/

Console management uses some fremawork:

JQuery 3.7.1 and Bootstrap 5.3

You can also include other javascript packages in your project.

For implementation details, please refer to the README file in this directory.

**module.xml.in**

Module definition configuration file in XML format.

All module behaviors are defined here.

If you want to change settings or attributes, please use the 'oxool-xml-config' command to avoid conflicts with XML-specific characters.

For details, please refer to the __ModuleConfiguration.md__ description.

##### __Build the module manually:__

```
./autogen.sh
./configure
make
```

##### __Compile the RPM package steps:__

```
./autogen.sh
./configure
make dist
rpmbuild -tb oxool-module-[name]....tag.gz
```

Then you will see oxool-module-[name]-...x86_64.rpm in \~/rpmbuild/RPMS/x86_64/

##### __Compile the DEB package steps:__

```
./autogen.sh
./configure
dpkg-buildpackage -b -rfakeroot -uc -us
```

Then you will see oxool-module-[name]\_...-1.amd64.deb in perent directory.

##### __Test during development:__

Please use 'make run' to enable the test environment.

Then in the project directory, modify and compile the code, To view the results locally, you can enter the command:

```
make run
```

Then you can test your mod through browser or curl command.

##### __Support various languages:__

```
make l10n
```

You will then see a file called %MODULE_NAME%.pot in the po directory.

You can copy %MODULE_NAME%.pot as an iso 639-1 compliant .po file. For example:
```
cp po/%MODULE_NAME%.pot po/zh-TW.po
```

Then edit it with any text editor or proprietary po editor.
When installed in this way, the relevant json format files will be automatically generated.

By the way, please remind: copy the new po file, please don't forget to use 'git add' to add it.

## Enjoy.
