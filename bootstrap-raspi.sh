#!/bin/bash
# Bootstrap script for HCOP DMX Controller on a fresh Raspberry Pi OS Lite
# This script will install all necessary dependencies and setup the application
# Run with: curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash

# Exit on error
set -e

echo "============================================================"
echo "  HCOP DMX Controller - Bootstrap Setup"
echo "============================================================"
echo ""
echo "This script will install all necessary dependencies and"
echo "set up the DMX controller application on your Raspberry Pi."
echo ""
echo "Starting installation..."
echo ""

# Update and upgrade system packages
echo "Updating and upgrading system packages..."
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get autoremove -y
sudo apt-get clean

# Install essential packages
echo "Installing essential packages..."
sudo apt-get install -y git curl wget

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Verifying Node.js installation..."
node --version
npm --version

# Install PM2 (for development and monitoring only)
echo "Installing PM2 process manager for development and monitoring..."
sudo npm install -g pm2

# Create app directory
APP_DIR="$HOME/hcopdmx"
echo "Creating application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Check if directory is empty or contains a git repository
if [ -d ".git" ]; then
    echo "Git repository already exists, pulling latest changes..."
    git pull origin main
elif [ "$(ls -A)" ]; then
    echo "Directory is not empty and doesn't contain a git repository."
    echo "Please choose an option:"
    echo "1. Clear the directory and clone the repository (data will be lost)"
    echo "2. Exit the script"
    read -p "Enter your choice (1 or 2): " choice
    case $choice in
        1)
            echo "Clearing directory..."
            rm -rf "$APP_DIR"/*
            git clone https://github.com/getitdonestudio/hcopdmx.git .
            ;;
        2)
            echo "Exiting script."
            exit 0
            ;;
        *)
            echo "Invalid choice. Exiting script."
            exit 1
            ;;
    esac
else
    # Clone the repository
    echo "Cloning the application repository..."
    git clone https://github.com/getitdonestudio/hcopdmx.git .
fi

# Install dependencies
echo "Installing application dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Create systemd service file
echo "Setting up systemd service for automatic startup..."
CURRENT_USER=$(whoami)
NODE_PATH=$(which node)
cat > dmx-server.service << EOL
[Unit]
Description=DMX Server
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_PATH} ${APP_DIR}/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=dmx-server
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Install systemd service
echo "Installing systemd service..."
sudo cp dmx-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dmx-server.service
sudo systemctl start dmx-server.service

echo "Systemd service installed and enabled."
echo ""
echo "To check systemd service status:"
echo "sudo systemctl status dmx-server.service"
echo ""

# Start the application with PM2 for monitoring (does not enable PM2 on startup)
echo "Starting the application with PM2 for monitoring..."
pm2 start ecosystem.config.js

# Display application status
echo "Application status (PM2 is for monitoring only, not startup):"
pm2 status

# Display access information
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo ""
echo "============================================================"
echo "Installation complete!"
echo "You can access the application at: http://$IP_ADDRESS:3000"
echo ""
echo "Useful commands:"
echo "  - Check service status:  sudo systemctl status dmx-server.service"
echo "  - View service logs:     sudo journalctl -u dmx-server.service -f"
echo "  - Monitor with PM2:      pm2 monit"
echo "  - View PM2 logs:         pm2 logs dmxserver"
echo "============================================================" 