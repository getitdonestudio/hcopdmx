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
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
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

# Check if the repo exists, if not clone it
if [ ! -d "$APP_DIR/.git" ]; then
    echo "Cloning repository from GitHub..."
    git clone https://github.com/getitdonestudio/hcopdmx.git .
else
    echo "Repository already exists, pulling latest changes..."
    git pull origin main
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the app with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration to start on boot
echo "Saving PM2 configuration to start on boot..."
pm2 save

# Setup PM2 to start on system boot
# This will output a command that needs to be run manually
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo ""
echo "============================================================"
echo "IMPORTANT: Copy and run the command shown above (if any)"
echo "to enable PM2 startup on boot."
echo "============================================================"
echo ""

echo "Status of the dmxserver:"
pm2 status

echo ""
echo "Setup complete! The application is now running managed by PM2."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Useful commands:"
echo "  - Check app status:   pm2 status"
echo "  - Restart app:        pm2 restart dmxserver"
echo "  - View logs:          pm2 logs dmxserver"
echo "  - Monitor app:        pm2 monit" 