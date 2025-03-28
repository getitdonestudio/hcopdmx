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

### 3. Test ArtNet Communication
```bash
node test-artnet.js
```
This script tests ArtNet communication by sending several test patterns to the DMX controller. It helps verify if the controller is receiving and processing DMX commands correctly.

To use a different DMX IP:
```bash
DMX_IP=192.168.1.100 node test-artnet.js
```

### 4. PM2 Fix Script
```bash
chmod +x fix-pm2.sh
./fix-pm2.sh
```
This script resets the PM2 configuration, creates necessary directories, starts the server with the correct configuration, and sets up PM2 to start on boot.

### 5. PM2 Debug Script (More Detailed Diagnostics)
```bash
chmod +x fix-pm2-debug.sh
./fix-pm2-debug.sh
```
This script provides more detailed diagnostics about the server environment, checks for missing dependencies, and offers more verbose output for troubleshooting.

### 6. Advanced PM2 Fix Script
```bash
chmod +x fix-pm2-advanced.sh
./fix-pm2-advanced.sh
```
This enhanced version offers additional checks for systemd conflicts, different PM2 installation types (global vs local), and more robust error handling to solve complex PM2 issues.

### 7. Check File Permissions
```bash
chmod +x check-permissions.sh
./check-permissions.sh
```
Identifies common permission issues that might prevent the server from starting, particularly focusing on file ownership problems and PM2 directory permissions.

### 8. Alternative: systemd Service Setup
```bash
chmod +x setup-systemd.sh
./setup-systemd.sh
```
Creates a systemd service file as an alternative to PM2 for starting the server on boot. This is especially useful if PM2 startup continues to have issues.

### 9. Simple Server Test
```bash
node server-simple.js
```
This runs a simplified version of the server that only handles basic API requests without the DMX functionality, useful for isolating server issues from DMX issues.

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

3. Check for file permission issues:
```bash
./check-permissions.sh
```

4. Reset the PM2 configuration:
```bash
./fix-pm2-advanced.sh
```

5. Make sure PM2 is set to start on boot:
```bash
# Run the command provided by the fix-pm2.sh script
# It will look something like:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi
```

6. If PM2 startup continues to be problematic, try the systemd service approach:
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

3. Test ArtNet communication:
```bash
node test-artnet.js
```

4. Ensure the Raspberry Pi and the DMX controller are on the same subnet.

5. Check if the DMX fixtures are properly connected and powered.

### Node.js Issues

1. Check the Node.js version:
```bash
node -v
```
Node.js version 18 or higher is recommended.

2. Reinstall Node.js if necessary using NVM:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install 18
nvm use 18
```

### Root vs User Permission Problems

If you're experiencing PM2 permission issues when running as a normal user versus root:

1. Check file ownerships:
```bash
./check-permissions.sh
```

2. If needed, fix permissions on important files:
```bash
sudo chown -R youruser:youruser .
sudo chown -R youruser:youruser ~/.pm2
```

3. Consider using the systemd service approach which can be more reliable with permission handling.

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