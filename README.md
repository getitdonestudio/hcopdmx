# HCOP DMX Controller

A Node.js application for controlling DMX lighting via the Art-Net protocol, optimized for use on Raspberry Pi devices.

## Quick Navigation

- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation-on-raspberry-pi)
  - [One-line Bootstrap Installation](#one-line-bootstrap-installation-fresh-os)
  - [Manual Installation](#manual-installation)
- [Updating](#updating-the-application)
- [Managing the Application](#managing-the-application)
  - [Systemd Commands](#systemd-commands)
  - [Monitoring with PM2](#monitoring-with-pm2)
- [Configuration](#configuration)
  - [DMX Programs](#configuring-dmx-programs)
  - [Screensaver Modes](#screensaver-modes)
  - [Logging](#application-logs)
  - [DMX Channel Scaling](#dmx-channel-scaling)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Features

- Express-based web server with multilingual user interface
- DMX lighting control via the Art-Net protocol
- Configurable lighting programs loaded from CSV files
- Screensaver modes with various animation patterns
- DMX channel scaling for power management
- Heartbeat functionality for consistent operation
- Comprehensive error handling with retry mechanisms
- Advanced logging system with rotation
- Resource monitoring for system health control
- Systemd service for reliable autostart and PM2 for monitoring
- Font size adjustment for accessibility
- Mode-specific keyboard navigation
- Screensaver watchdog for automatic recovery

## System Requirements

- Raspberry Pi (3 or newer recommended), RevPi, or compatible computer
- Raspberry Pi OS Lite (Bullseye or newer) or Debian Bookworm
- Node.js 20.x or newer
- Art-Net compatible DMX controller/interface
- Network connection between Raspberry Pi and DMX interface

## Installation on Raspberry Pi

### One-line Bootstrap Installation (fresh OS)

For a fresh installation of Raspberry Pi OS Lite or RevPi with Debian Bookworm, use our bootstrap script to set up everything in one step:

> **Note for RevPi/Bookworm users:** You may need to install curl first:
> ```bash
> sudo apt-get update
> sudo apt-get install -y curl
> ```

Then run the bootstrap script:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

Alternatively, if curl is not available, you can use wget (usually pre-installed):

```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh
chmod +x bootstrap-raspi.sh
./bootstrap-raspi.sh
```

The script installs all necessary dependencies (Node.js, Git, PM2), sets up the project, and configures the systemd service for automatic startup on boot. It also starts PM2 for monitoring purposes, but the actual autostart is managed through systemd.

### Alternative Installation with Setup Script

If Git is already installed:

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Download installation script
```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/setup-raspi.sh
```

3. Make the script executable
```bash
chmod +x setup-raspi.sh
```

4. Run the installation script
```bash
./setup-raspi.sh
```

5. You can access the application at `http://your-raspberry-pi-ip:3000`.

### Manual Installation

If you prefer to install manually:

1. Install Node.js (version 20.x or higher)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install Git and other dependencies
```bash
sudo apt-get install -y git curl wget
```

3. Optional: Install PM2 for monitoring
```bash
sudo npm install -g pm2
```

4. Clone the repository
```bash
mkdir -p ~/hcopdmx
cd ~/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

5. Install dependencies
```bash
npm install
```

6. Configure the application
   - Edit `server.js` to set the correct IP address for your Art-Net device
   - Modify `hcop_dmx-channel.csv` if you want to customize the DMX programs

7. Set up systemd service for automatic startup
```bash
./setup-systemd.sh
```

## Updating the Application

### Automatic Update (Recommended)

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Run the update script
```bash
~/hcopdmx/update-raspi.sh
```

The script will automatically:
- Fetch the latest changes from GitHub
- Install new dependencies
- Restart the application

### Manual Update

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Change to the application directory
```bash
cd ~/hcopdmx
```

3. Fetch the latest changes
```bash
git pull origin main
```

4. Install new dependencies
```bash
npm install
```

5. Restart the application
```bash
sudo systemctl restart dmx-server.service
```

## Managing the Application

### Systemd Commands

The application runs as a systemd service for reliable autostart. Here are useful commands:

- Check service status: `sudo systemctl status dmx-server.service`
- View application logs: `sudo journalctl -u dmx-server.service -f`
- Restart application: `sudo systemctl restart dmx-server.service`
- Stop application: `sudo systemctl stop dmx-server.service`
- Start application: `sudo systemctl start dmx-server.service`
- Enable autostart: `sudo systemctl enable dmx-server.service`
- Disable autostart: `sudo systemctl disable dmx-server.service`

### Monitoring with PM2

Although autostart is done through systemd, PM2 is installed for monitoring purposes:

- Show status: `pm2 status`
- Real-time monitoring: `pm2 monit`
- View logs: `pm2 logs dmxserver`

## Configuration

### Application Logs

The application uses a built-in logging system with the following features:

- Log levels: `debug`, `info`, `warn`, `error`
- Log file rotation when size exceeds 5MB
- Configurable heartbeat logging reduction
- Optional console output

#### Configuring Logging

Edit the `LOG_CONFIG` object in `server.js` to customize logging behavior:

```javascript
const LOG_CONFIG = {
    level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    heartbeatInterval: 5, // Only log heartbeat every X times
    maxFileSize: 5 * 1024 * 1024, // 5MB max log file size
    logFile: 'dmx-server.log',
    logToConsole: true
};
```

You can also set the `LOG_LEVEL` environment variable when starting the application:

```bash
LOG_LEVEL=debug node server.js
```

### DMX Channel Scaling

The application supports two types of DMX channel scaling:

1. **Binary Scaling** - Scales binary (0/1) values from the CSV file to actual DMX values (0-255) based on the light power setting

2. **Advanced Scaling** - Scales any DMX channel values consistently based on a target power level with an option to preserve zeros

This feature allows for precise control of lighting intensity for both normal operation and screensaver modes.

### Configuring DMX Programs

DMX programs are defined in the `hcop_dmx-channel.csv` file with the following format:
- Each row represents a lighting program
- The first column is the program key (the identifier used in API calls)
- Each subsequent column represents a DMX channel value (0-255)

Example:
```
Key;Channel1;Channel2;Channel3
a;255;0;0
b;0;255;0
c;0;0;255
```

### Screensaver Modes

The application features several screensaver modes:

- **Dim to On** - Gradually brightens channels from zero to full brightness
- **Dim to Off** - Gradually dims channels from full brightness to zero
- **Cycling** - Cycles through specified DMX programs with transitions
- **Pulsating** - Creates a breathing effect by modulating channel brightness
- **Disco** - Randomly changes colors for a dynamic light show

Each mode is configurable through the settings interface.

#### Screensaver Recovery System

The application includes a sophisticated recovery system for screensaver modes:

- **Watchdog Timer** - Detects and recovers from stuck modes automatically
- **Error Tracking** - Counts errors and switches modes if too many occur
- **Rate Limiting** - Prevents overwhelming the DMX controller with too many commands
- **State Refresh** - Periodically refreshes base state to prevent stale data
- **Graceful Fallback** - Falls back to simpler modes if complex modes fail

### User Interface Features

- **Multilingual Support** - Interface available in German and English
- **Keyboard Navigation** - Custom key handling for efficient control
  - Keys A-P: Direct access to DMX programs
  - Key Q: All lights on / screensaver mode
  - Key Z: All lights off
  - In screensaver mode, A-P keys navigate directly to corresponding program
- **Font Size Controls** - Adjustable text size for accessibility
- **Quick Controls** - One-click access to commonly used functions
- **Responsive Design** - Adapts to different screen sizes

### Error Recovery and Reliability Features

The application includes several reliability features:

- **CSV Loading Retry** - Attempts to load the CSV file multiple times with increasing delays if the initial load fails
- **DMX Packet Transmission Retry** - Sends each DMX packet multiple times with configurable retries
- **Settings Backup** - Automatically backs up settings and can restore from backup if the main file becomes corrupted
- **Heartbeat Recovery** - Automatically detects and recovers from connection issues by resending DMX packets

## API Endpoints

The application provides the following API endpoints:

- `POST /dmx/:key` - Activate a DMX program (replace `:key` with the program identifier from the CSV)
- `POST /dmx/fade/:key` - Fade to a DMX program with a specified duration
- `POST /dmx/direct` - Directly set DMX channel values for advanced control
- `GET /dmx/program/:key` - Get a specific DMX program's channel values
- `GET /dmx/programs` - List all available DMX programs
- `GET /state` - Get the current DMX state
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `POST /api/settings/reset` - Reset settings to defaults

### Web Interface

The application provides a web interface accessible at:
- `http://your-raspberry-pi-ip:3000`

The interface supports multiple languages with pages in the `/de/` (German) and `/en/` (English) directories.

## Troubleshooting

### Common Issues and Solutions

1. **Application Not Starting After Installation**
   - Check systemd status: `sudo systemctl status dmx-server.service`
   - View logs: `sudo journalctl -u dmx-server.service -f`
   - Check Node.js version: `node --version` (should be 18.x or newer)
   - Check application directory permissions: `ls -la ~/hcopdmx`
   - Ensure server.js is executable: `chmod +x ~/hcopdmx/server.js`

2. **Error: "Port already in use"**
   - Check if multiple instances are running: `ps aux | grep node`
   - If PM2 is also starting the app: `pm2 stop dmxserver && pm2 delete dmxserver && pm2 save`
   - Restart systemd service: `sudo systemctl restart dmx-server.service`

3. **DMX Not Working**
   - Check the IP address configuration in `server.js`
   - Ensure your DMX interface is powered on and connected to the network
   - Check network connectivity: `ping your-dmx-interface-ip`
   - Check firewall settings: `sudo iptables -L`
   - Art-Net typically uses UDP port 6454: `sudo lsof -i UDP:6454`

4. **Screensaver Modes Stop Working**
   - Check browser console for errors
   - Try switching to a different screensaver mode
   - The system includes automatic recovery mechanisms that should handle most issues
   - If problems persist, restart the server: `sudo systemctl restart dmx-server.service`

5. **Raspberry Pi Not Auto-starting the Application**
   - Check systemd service status: `sudo systemctl status dmx-server.service`
   - Enable autostart if not enabled: `sudo systemctl enable dmx-server.service`
   - Check systemd logs: `sudo journalctl -u dmx-server.service`
   - Reinstall the service: `./setup-systemd.sh`

6. **Node.js Errors and Crashes**
   - Check Node.js version: `node --version`
   - Check memory usage: `free -m`
   - Check CPU usage: `htop` (install with `sudo apt install htop`)
   - Look for Node.js crashes in logs: `sudo journalctl -u dmx-server.service | grep -i error`

### Raspberry Pi System Diagnostics

1. **Checking System Resources**
   - CPU and memory usage: `htop`
   - Disk space: `df -h`
   - Temperature: `vcgencmd measure_temp`
   - Throttling and undervoltage: `vcgencmd get_throttled`

2. **Network Issues**
   - Display IP configuration: `ip addr show`
   - Test network connectivity: `ping 8.8.8.8`
   - Test DNS resolution: `nslookup google.com`
   - Active network connections: `ss -tuln`

3. **System Logs**
   - Kernel logs: `dmesg | tail`
   - System logs: `sudo journalctl -xe`
   - Boot processes: `sudo journalctl -b`

### Recovery Measures

1. **Reinstalling the Application**
   ```bash
   cd ~
   mv hcopdmx hcopdmx.bak
   curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
   ```

2. **Reinstalling Node.js**
   ```bash
   sudo apt-get remove nodejs -y
   sudo apt-get autoremove -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version
   ```

3. **Service Reset**
   ```bash
   sudo systemctl stop dmx-server.service
   sudo systemctl disable dmx-server.service
   sudo rm /etc/systemd/system/dmx-server.service
   sudo systemctl daemon-reload
   cd ~/hcopdmx
   ./setup-systemd.sh
   ```

## Development

### Local Development Setup

For local development without a Raspberry Pi:
1. Clone the repository to your development machine
2. Install dependencies: `npm install`
3. Run the local development server: `node server-local.js`
4. Access the application at `http://localhost:3000`

The local server provides simulated DMX functionality for testing.

### Directory Structure

- `server.js` - Main application file
- `server-local.js` - Development version with simulated DMX
- `hcop_dmx-channel.csv` - DMX program definitions
- `ecosystem.config.js` - PM2 configuration
- `setup-raspi.sh` - Raspberry Pi setup script
- `bootstrap-raspi.sh` - One-line bootstrap script for fresh installations
- `update-raspi.sh` - Raspberry Pi update script
- `setup-systemd.sh` - Script to set up the systemd service
- `public/` - Web interface files
  - `de/` - German interface
  - `en/`