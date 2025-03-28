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
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Verifying Node.js installation..."
node --version
npm --version

# Install PM2
echo "Installing PM2 process manager..."
sudo npm install -g pm2

# Create app directory
APP_DIR="$HOME/hcopdmx"
echo "Creating application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Clone the repository
echo "Cloning the application repository..."
git clone https://github.com/getitdonestudio/hcopdmx.git .

# Install dependencies
echo "Installing application dependencies..."
npm install

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
# Get the startup command without modifying it
PM2_STARTUP_CMD=$(pm2 startup | grep "sudo env")

echo ""
echo "============================================================"
echo "IMPORTANT: Run the following command to enable startup on boot:"
echo "$PM2_STARTUP_CMD"
echo "============================================================"
echo ""

# Display application status
echo "Application status:"
pm2 status

# Display access information
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo ""
echo "============================================================"
echo "Installation complete!"
echo "You can access the application at: http://$IP_ADDRESS:3000"
echo ""
echo "Useful commands:"
echo "  - Check application status: pm2 status"
echo "  - View application logs:    pm2 logs dmxserver"
echo "  - Monitor application:      pm2 monit"
echo "  - Restart application:      pm2 restart dmxserver"
echo "============================================================" 