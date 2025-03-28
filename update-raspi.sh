#!/bin/bash
# Update script for HCOP DMX Controller on Raspberry Pi
# Run this script on your Raspberry Pi to update the code

# Exit on error
set -e

APP_DIR="/home/pi/hcopdmx"

echo "Updating HCOP DMX Controller..."

# Navigate to app directory
cd "$APP_DIR"

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

# Install any new dependencies
echo "Installing dependencies..."
npm install

# Restart the service
echo "Restarting the service..."
sudo systemctl restart hcopdmx

echo "Status of hcopdmx service:"
sudo systemctl status hcopdmx

echo ""
echo "Update complete! The application has been restarted."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):3000" 