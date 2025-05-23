# DMX Server Troubleshooting Guide

This guide provides steps to diagnose and fix common issues with the DMX server.

## Diagnostic Tools

The following diagnostic scripts are available to help troubleshoot issues:

### 1. Check Dependencies
```bash
node check-dependencies.js
```
This script checks if all required Node.js dependencies are installed and verifies that essential files exist.

### 2. Check DMX Connectivity
```bash
node check-dmx-connectivity.js
```
This script tests network connectivity to the DMX controller by attempting to establish a TCP connection to the ArtNet port. It also checks your local network interfaces and DNS resolution.

To use a different DMX IP:
```bash
DMX_IP=192.168.1.100 node check-dmx-connectivity.js
```

### 3. Alternative: systemd Service Setup
```bash
chmod +x setup-systemd.sh
./setup-systemd.sh
```
Creates a systemd service file as an alternative to PM2 for starting the server on boot. This is especially useful if PM2 startup continues to have issues.

## Common Issues and Solutions

### Server Won't Start with PM2

1. Check the PM2 logs:
```bash
pm2 logs
```

2. Verify that all dependencies are installed:
```bash
npm install
```

3. Make sure PM2 is set to start on boot:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi
```

4. If PM2 startup continues to be problematic, try the systemd service approach:
```bash
./setup-systemd.sh
# Then follow the instructions it provides
```

### DMX Communication Issues

1. Verify the DMX controller's IP address is correct in `server.js`.

2. Check network connectivity:
```bash
node check-dmx-connectivity.js
```

3. Ensure the Raspberry Pi and the DMX controller are on the same subnet.

4. Check if the DMX fixtures are properly connected and powered.

### Node.js Issues

1. Check the Node.js version:
```bash
node -v
```
Node.js version 20 or higher is recommended.

2. Reinstall Node.js if necessary using NVM:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install 20
nvm use 20
```

### Root vs User Permission Problems

If you're experiencing PM2 permission issues when running as a normal user versus root:

1. If needed, fix permissions on important files:
```bash
sudo chown -R youruser:youruser .
sudo chown -R youruser:youruser ~/.pm2
```

2. Consider using the systemd service approach which can be more reliable with permission handling.

## Additional Resources

If you continue to experience issues, consider:

1. Checking Raspberry Pi system logs:
```bash
sudo journalctl -e
```

2. Monitoring system resources:
```bash
top
```

3. Checking network configuration:
```bash
ifconfig
```

4. Testing the DMX controller with other software to isolate the issue. 