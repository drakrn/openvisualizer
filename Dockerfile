# Base image
FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    python2         \
    python-pip      \
    python2.7-dev   \
    nano            \
    tree            \
    sed             \
    git             \
    wget            \
    curl            \
    iproute2        \
    iputils-ping    \
    net-tools       

WORKDIR /root

RUN git clone https://github.com/drakrn/openvisualizer.git && \
    cd openvisualizer && \
    python2 -m pip install -e .
    
RUN git clone https://github.com/openwsn-berkeley/openwsn-fw.git &&  \
    ln -s /usr/bin/python2 /usr/bin/python && \
    cd openwsn-fw && \
    scons board=python toolchain=gcc oos_openwsn

RUN echo "export OPENWSN_FW_BASE=/root/openwsn-fw" >> .bashrc