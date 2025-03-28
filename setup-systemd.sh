#!/bin/bash
# Script to set up a systemd service for the DMX server
# This is an alternative to PM2 startup

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

# Instructions for installation
echo ""
echo "====================================================="
echo "To install the service, run these commands:"
echo ""
echo "sudo cp dmx-server.service /etc/systemd/system/"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable dmx-server.service"
echo "sudo systemctl start dmx-server.service"
echo ""
echo "To check status:"
echo "sudo systemctl status dmx-server.service"
echo ""
echo "To view logs:"
echo "sudo journalctl -u dmx-server.service -f"
echo "=====================================================" 