#!/bin/bash
# Setup script for HCOP DMX Controller on Raspberry Pi
# Run this script on your Raspberry Pi to clone and setup the project

# Exit on error
set -e

echo "Setting up HCOP DMX Controller..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Create app directory if it doesn't exist
APP_DIR="/home/pi/hcopdmx"
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

# Create systemd service file for auto-starting the application
echo "Creating systemd service..."
sudo tee /etc/systemd/system/hcopdmx.service > /dev/null << EOL
[Unit]
Description=HCOP DMX Controller
After=network.target

[Service]
ExecStart=/usr/bin/node server.js
WorkingDirectory=$APP_DIR
Restart=always
User=pi
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
echo "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable hcopdmx
sudo systemctl restart hcopdmx

echo "Status of hcopdmx service:"
sudo systemctl status hcopdmx

echo ""
echo "Setup complete! The application is now running as a service."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Useful commands:"
echo "  - Check service status: sudo systemctl status hcopdmx"
echo "  - Restart service:      sudo systemctl restart hcopdmx"
echo "  - View logs:            sudo journalctl -u hcopdmx -f" 