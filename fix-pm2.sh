#!/bin/bash
# Script to fix PM2 configuration issues
# This will reset PM2 and set up the service properly

# Stop existing PM2 processes
echo "Stopping all PM2 processes..."
pm2 kill

# Create logs directory if it doesn't exist
echo "Creating logs directory..."
mkdir -p logs

# Start the application with correct server.js
echo "Starting application with proper server.js..."
pm2 start ecosystem.config.js

# Save the PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot
echo "Setting up PM2 to start on boot (may require sudo rights)..."
PM2_STARTUP_CMD=$(pm2 startup | grep "sudo env")
echo ""
echo "============================================================"
echo "IMPORTANT: Run the following command to enable startup on boot:"
echo "$PM2_STARTUP_CMD"
echo "============================================================"
echo ""

# Display status
echo "Current PM2 status:"
pm2 status

echo ""
echo "PM2 configuration has been reset and fixed."
echo "Make sure to run the startup command above with sudo rights."
echo "You can access the application at http://$(hostname -I | awk '{print $1}'):3000" 