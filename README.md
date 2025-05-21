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
  - [Secret Settings Access](#secret-settings-access)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
  - [Arduino Controller Setup](#arduino-controller-setup)
  - [Local Development Setup](#local-development-setup)

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

### Secret Settings Access

The application provides a secure way to access the settings page:

1. Click 5 times within 3 seconds in the top-right corner of the screen
2. When prompted, enter the password: `250628`

This hidden access method is designed to prevent accidental changes to the system configuration while still allowing authorized users to access settings when needed.

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
- Each subsequent column represents a DMX channel value (0 or 1)

Example:
```
Key;Channel1;Channel2;Channel3;Channel4
a;0;0;1;1
b;0;1;1;0
c;1;1;0;0
```

The binary values (0/1) are automatically scaled to the appropriate DMX values (0-255) based on the light power setting.

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

## Troubleshooting

For detailed troubleshooting information, please refer to the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file.

The system includes two diagnostic tools to help identify and fix issues:

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

**Note**: Some of the tools mentioned in the troubleshooting file like `test-artnet.js`, `server-simple.js`, and various fix scripts may not be included in the current version of the repository. Please contact the developers if you need these additional troubleshooting tools.

## Development

### Arduino Controller Setup

The project includes an Arduino sketch (`hcopButton.ino`) for creating a physical control interface:

- Uses 4 buttons connected to pins 3, 4, 5, and 6
- Controls 4 relays connected to pins 10, 11, 12, and 13
- Maps 16 possible button combinations to keyboard keys A-P
- Sends keystrokes to the host computer running the DMX server
- Includes debug mode for diagnostic output via serial monitor

To set up the Arduino controller:

1. Connect buttons to pins 3, 4, 5, 6 with appropriate pull-up resistors
2. Connect relays to pins 10, 11, 12, 13
3. Upload the `hcopButton.ino` sketch to an Arduino with USB keyboard support (e.g., Arduino Leonardo or Pro Micro)
4. Connect the Arduino to the same computer running the DMX server