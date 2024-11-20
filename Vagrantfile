# -*- mode: ruby -*-
# vi: set ft=ruby :
# Vagrant environment configuration file
#
# Copyright 2024 Buo-ren, Lin <buoren.lin@ossii.com.tw>
# SPDX-License-Identifier: LicenseRef-Proprietary

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://vagrantcloud.com/search.
  # NOTE: Avoid using official box for now as their download link currently will temporary fail whenever a new release is made:
  # Issue Downloading Rocky Linux 9 Vagrant Box - Rocky Linux Tech Help - Rocky Linux Forum
  # https://forums.rockylinux.org/t/issue-downloading-rocky-linux-9-vagrant-box/16627
  #config.vm.box = "rockylinux/8"
  config.vm.box = "generic/rocky8"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network "private_network", ip: "192.168.56.10"

  # Shared folder does not work at the moment, use Rsync to sync files instead
  config.vm.synced_folder ".", "/vagrant", disabled: true

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  config.vm.provider "virtualbox" do |vb|
    vb.cpus = 8

    # Customize the amount of memory on the VM:
    vb.memory = "8192"

    vb.default_nic_type = "virtio"

    vb.name = "OxOffice Online test VM"
  end

  # Enable provisioning with a shell script. Additional provisioners such as
  # Ansible, Chef, Docker, Puppet and Salt are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision "dev-env", type: "shell", path: "dev-assets/deploy-dev-environment.sh"
  config.vm.provision "nextcloud", type: "shell", path: "dev-assets/deploy-nextcloud.sh", run: "never"
end
