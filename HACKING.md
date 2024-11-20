# HACKING

Explains the process to develop the product in a reproducible testing environment.

## Branch naming convention

Please use the following branch naming convention:

_variant_-_major version number_\[-_personal branch identifier_\]

**NOTE:** Avoid using / in the branch name as it can cause problem in the distribution tarball creation logic.

## Prerequisites

The following prerequisites must be met in order to complete the following standard procedure:

* The development host must have the following software installed and have its commands available in the command search PATHs:
    + (Optional) GNU Bash  
      For improving documentation of the command options used in the provision process, manually translate the command if your default shell isn't compatible with Bash.
    + curl  
      For testing the service from the development host.
    + OpenSSH client  
      For accessing the guest VM shell and deploying the product source tree.
    + Rsync  
      For deploying the product source tree.
    + Vagrant  
      For provisioning the test VM.
    + VirtualBox  
      For provisioning the test VM.
* The development host shall have 8GiB of available primary memory(RAM).

  Other hardware configurations may work but the build may fail if the memory is exhausted during the product build process.
* The development host must have Internet access.
* You must have a local clone of the Git repository(e.g. the .git directory must be in the source tree).
* Currently the development host's OpenSSH client configuration file will be overwritten during the process, make a backup if you maintain your own client configuration.

## Provision the virtual machine used for testing

Execute the following instructions to provision the virtual machine used for testing:

1. Launch your preferred text terminal emulator application.
1. Change the working directory to the project's source tree.
1. Run the following command to provision the test VM:

    ```bash
    vagrant up
    ```

   **NOTE:** You can reprovision an existing test VM by running the following command:

    ```bash
    vagrant provision
    ```

1. Install externally acquired 10.0.1-dev OxOffice RPM packages that is compatible with OxOffice V5.
1. (Optional) Run the following command to create a snapshot to reduce time required for reprovision:

    ```bash
    vagrant snapshot save v5-clean-updated
    ```

1. Run the following command to export and install the OpenSSH client configuration:

    ```bash
    vagrant ssh-config > ~/.ssh/config
    ```

   **WARNING:** If you maintain your own OpenSSH client configuration the aforementioned command will _overwrite your configuration file_, you need to instead manually merge the configuration from the `vagrant ssh-config` command's output.

   You should now be able to acquire a remote shell of the test VM by running the following command:

    ```bash
    ssh default
    ```

## Deploy Nextcloud

1. Run the following command to automatically provision a Nextcloud 24 service instance in your test VM:

    ```bash
    vagrant provision default --provision-with nextcloud
    ```

   After service provision you should be able to access it by browsing <http://192.168.56.10/nextcloud/>.
1. Install and Enable the Nextcloud Office app by browsing <http://192.168.56.10/nextcloud/index.php/settings/apps/office/richdocuments> URL and click the "Download and enable" blue button at the right panel.
1. (Optional) Run the following command to create a snapshot to reduce time required for reprovision:

    ```bash
    vagrant snapshot save nextcloud-ready
    ```

## Build product

1. Deploy the product's source tree by running the following commands:

    ```bash
    rsync_opts=(
        # Synchronize file modification time to support incremental synchronization
        --times

        # Synchronize Unix file permissions
        --perms

        # Synchronize symbolic links
        --links

        # Synchronize subdirs as well
        --recursive

        # Report progress
        --verbose
    )
    rsync "${rsync_opts[@]}" ./ default:oxool/
    ```

   **NOTE:** DO NOT exclude the Git repository directory(.git) as it will be used during the build.
1. Acquire guest VM shell by running the following command:

    ```bash
    vagrant ssh
    ```

1. Change the working directory to the source tree directory by running the following command:

    ```bash
    cd ~/oxool
    ```

1. Run the following command to build the build configuration program:

    ```bash
    ./autogen.sh
    ```

1. Run the following command to build the product:

    ```bash
    make --jobs="$(nproc)"
    ```

1. Run the following command to start the built service in-place:

    ```bash
    make run
    ```

   **NOTE:** The build must be configured with the `--with-debug` command option for this to work.

1. Run the following command from the development host to verify whether the service has functioned properly:

    ```bash
    curl http://192.168.56.10:9980
    ```

   it should have the following response:

    ```txt
    OK
    ```

1. Configure the Nextcloud integration by following the instructions at [將 Nextcloud 與 OxOOL Community 的連線建起來 | 在 Rocky Linux 8 下安裝 Nextcloud 24 | 晟鑫科技線上手冊](https://docs.ossii.com.tw/link/138#bkmrk-%E5%B0%87-nextcloud-%E8%88%87-oxool-)

   Use the `192.168.56.10:9980` address as the Collabora Online service URL, then ensure the the "Disable certificate authentication" checkbox is toggled.

1. Return to the main page of the Nextcloud service then try to create and edit Open Document Format files to verify that the OxOffice Online integration is working.

## References

The following material are referenced during the writing of this documentation:

* [在 Rocky Linux 8 環境下編譯 OxOffice Online v4 社群版 | 晟鑫科技線上手冊](https://docs.ossii.com.tw/books/oxoffice-online-%E6%8A%80%E8%A1%93%E6%89%8B%E5%86%8A/page/rocky-linux-8-oxoffice-online-v4-D8J)
