#!/bin/bash

# Quick install script for Tunnel Server
# Usage: curl -sSL https://raw.githubusercontent.com/XP-TAM/Tunnel/main/quick-install.sh | bash

echo "Downloading Tunnel Server installation script..."
cd /tmp
wget -q -O install.sh https://raw.githubusercontent.com/XP-TAM/Tunnel/main/install.sh 2>/dev/null || \
curl -sSL https://raw.githubusercontent.com/XP-TAM/Tunnel/main/install.sh -o install.sh

if [[ -f install.sh ]]; then
    sudo bash install.sh "$@"
else
    echo "Failed to download installation script"
    exit 1
fi
