#!/bin/bash

OS=`cat /etc/issue | head -c6`

if [ ${OS} = 'Debian' ] ; then
    export DEBIAN_FRONTEND=noninteractive
fi

echo
echo '========================================='
echo 'Installing the necessary system libraries'
echo '========================================='

apt-get -y install software-properties-common

# install PCRE at least 8.32
add-apt-repository -y 'ppa:edd/misc'
apt-get update
apt-get -y install libpcre3-dev


# install the required libraries
apt-get -y install build-essential
apt-get -y install cfortran
apt-get -y install f2c
apt-get -y install fort77
apt-get -y install freeglut3-dev
apt-get -y install g++
apt-get -y install gpg # for Docker image
apt-get -y install graphviz-dev
apt-get -y install libbz2-dev
apt-get -y install libcairo2-dev
apt-get -y install libcurl4-openssl-dev
apt-get -y install libgsl0-dev
apt-get -y install libhdf5-serial-dev
if [ ${OS} = 'Debian' ] ; then
    apt-get -y install libicu-dev
else # OS = 'Ubuntu'
    apt-get -y install libicu-devel
fi
apt-get -y install liblzma-dev
if [ ${OS} = 'Debian' ] ; then
    apt-get -y install default-libmysqlclient-dev
    #apt-get -y install libmariadbclient-dev-compat
else # OS = 'Ubuntu'
    apt-get -y install libmysqlclient-dev
fi
apt-get -y install libnetcdf-dev
apt-get -y install libprotobuf-dev
apt-get -y install libreadline-dev
if [ ${OS} = 'Debian' ] ; then
    apt-get -y install libssl-dev
    #apt-get -y install libssl1.0-dev
else # OS = 'Ubuntu'
    apt-get -y install libssl-dev/trusty
    apt-get -y install libssl1.0.0/trusty
fi
apt-get -y install libxml2-dev
apt-get -y install openmpi-bin
apt-get -y install openmpi-common
if [ ${OS} = 'Debian' ] ; then
    apt-get -y install openssl
else # OS = 'Ubuntu'
    apt-get -y install openssl/trusty
fi
apt-get -y install protobuf-compiler
apt-get -y install xorg-dev
apt-get -y install xvfb

apt-get -y autoremove


# apt-get -y install pandoc
# apt-get -y install pandoc-citeproc

# use manual way below till
# pandoc version 1.12.3 or higher makes it
# must install R package 'rmarkdown' as well
PANDOC_VER='1.19.1'
if [[ ! -f /usr/bin/pandoc || `pandoc --version | head -n1 | cut -c8-` < ${PANDOC_VER} ]] ; then
    wget https://github.com/jgm/pandoc/releases/download/${PANDOC_VER}/pandoc-${PANDOC_VER}-1-amd64.deb
    dpkg -i pandoc-${PANDOC_VER}-1-amd64.deb
else
    echo 'pandoc seems to be up-to-date'
fi

