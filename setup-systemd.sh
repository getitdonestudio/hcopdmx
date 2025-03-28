#!/bin/bash
# Script to set up a systemd service for the DMX server
# This is the recommended method for autostarting the server on boot

# Display script header
echo "====================================================="
echo "DMX Server systemd Service Setup Script"
echo "====================================================="
echo ""

# Get the current directory and user
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)
NODE_PATH=$(which node)

# Create systemd service file
echo "Creating systemd service file..."
cat > dmx-server.service << EOL
[Unit]
Description=DMX Server
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${CURRENT_DIR}
ExecStart=${NODE_PATH} ${CURRENT_DIR}/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=dmx-server
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

echo "Service file created: dmx-server.service"

# Installation
echo ""
echo "Installing the systemd service..."
sudo cp dmx-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dmx-server.service
sudo systemctl start dmx-server.service

echo ""
echo "====================================================="
echo "Service installed successfully!"
echo ""
echo "To check status:"
echo "sudo systemctl status dmx-server.service"
echo ""
echo "To view logs:"
echo "sudo journalctl -u dmx-server.service -f"
echo "=====================================================" 