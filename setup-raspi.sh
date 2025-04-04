#!/bin/bash
# Setup script for HCOP DMX Controller on Raspberry Pi
# Run this script on your Raspberry Pi to clone and setup the project

# Exit on error
set -e

echo "Setting up HCOP DMX Controller..."

# Update and upgrade system packages
echo "Updating and upgrading system packages..."
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get autoremove -y
sudo apt-get clean

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if PM2 is installed (for monitoring only)
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 for monitoring..."
    sudo npm install -g pm2
fi

# Create app directory if it doesn't exist
APP_DIR="$HOME/hcopdmx"
if [ ! -d "$APP_DIR" ]; then
    echo "Creating application directory..."
    mkdir -p "$APP_DIR"
fi

# Navigate to app directory
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
    echo "Cloning repository from GitHub..."
    git clone https://github.com/getitdonestudio/hcopdmx.git .
fi

# Install dependencies
echo "Installing dependencies..."
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

# Start the app with PM2 for monitoring only
echo "Starting application with PM2 for monitoring purposes..."
pm2 start ecosystem.config.js

echo "Status of the dmxserver (PM2 for monitoring only):"
pm2 status

echo ""
echo "Setup complete! The application is now running and managed by systemd."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Useful commands:"
echo "  - Check service status:  sudo systemctl status dmx-server.service"
echo "  - View service logs:     sudo journalctl -u dmx-server.service -f"
echo "  - Monitor with PM2:      pm2 monit"
echo "  - View PM2 logs:         pm2 logs dmxserver" 