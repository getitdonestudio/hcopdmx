#!/bin/bash
# Script to resolve conflict between PM2 and systemd
# This script will disable one of the startup methods to prevent port conflicts

echo "====================================================="
echo "DMX Server Startup Conflict Resolution"
echo "====================================================="
echo ""

echo "The issue is that both PM2 and systemd are trying to start the server,"
echo "which results in port conflicts (EADDRINUSE error)."
echo ""
echo "Choose which startup method you prefer:"
echo "1) PM2 (keeps existing setup, disables systemd service)"
echo "2) systemd (recommended, disables PM2 startup)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "Keeping PM2 and disabling systemd service..."
        sudo systemctl stop dmx-server.service
        sudo systemctl disable dmx-server.service
        
        # Ensure PM2 is properly set up for startup
        echo "Setting up PM2 startup..."
        PM2_STARTUP_CMD=$(pm2 startup | grep "sudo env")
        echo "Run this command to enable PM2 startup (if not already done):"
        echo "$PM2_STARTUP_CMD"
        echo ""
        echo "Then save the PM2 configuration:"
        echo "pm2 save"
        ;;
        
    2)
        echo "Keeping systemd and disabling PM2 startup..."
        # Stop and remove from PM2
        pm2 stop dmxserver
        pm2 delete dmxserver
        pm2 save
        
        # Disable PM2 startup
        echo "Disabling PM2 startup..."
        sudo systemctl disable pm2-hcop
        
        # Ensure systemd service is enabled
        echo "Enabling systemd service..."
        sudo systemctl enable dmx-server.service
        sudo systemctl start dmx-server.service
        ;;
        
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "Conflict resolution completed."
echo ""
echo "To verify the server is running correctly, use:"
echo "- If using PM2: pm2 status"
echo "- If using systemd: sudo systemctl status dmx-server.service"
echo ""
echo "After rebooting, only one service should start the server." 