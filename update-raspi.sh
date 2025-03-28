#!/bin/bash
# Update script for HCOP DMX Controller on Raspberry Pi
# Run this script on your Raspberry Pi to update the code

# Exit on error
set -e

APP_DIR="$HOME/hcopdmx"

echo "Updating HCOP DMX Controller..."

# Navigate to app directory
cd "$APP_DIR"

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

# Install any new dependencies
echo "Installing dependencies..."
npm install

# Restart the application with PM2
echo "Restarting the application with PM2..."
pm2 restart dmxserver || pm2 start ecosystem.config.js

# Check if any PM2 configuration has changed
if [ -f "ecosystem.config.js" ]; then
    echo "Updating PM2 configuration..."
    pm2 delete dmxserver 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
fi

echo "Status of dmxserver:"
pm2 status

echo ""
echo "Update complete! The application has been restarted."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Useful commands:"
echo "  - Check app status:   pm2 status"
echo "  - Restart app:        pm2 restart dmxserver"
echo "  - View logs:          pm2 logs dmxserver"
echo "  - Monitor app:        pm2 monit" 