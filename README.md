# HCOP DMX Controller

A Node.js application to control DMX lighting via Art-Net protocol, optimized for Raspberry Pi deployment.

## Features

- Express-based web server with a multi-language interface
- DMX lighting control via Art-Net protocol
- Configurable lighting programs loaded from CSV files
- Heartbeat functionality to ensure consistent operation
- Resource monitoring for system health
- PM2 process management for improved reliability

## System Requirements

- Raspberry Pi (3 or newer recommended) or compatible computer
- Node.js 18.x or newer
- Art-Net compatible DMX controller/interface
- Network connection between Raspberry Pi and DMX interface

## Installation on Raspberry Pi

### One-line Bootstrap Installation (Fresh OS)

If you're starting with a fresh installation of Raspberry Pi OS Lite, you can use our bootstrap script to set up everything in one step:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

After the script completes, you'll need to run the PM2 startup command (which will be displayed in the terminal) to enable automatic startup on boot.

### Automatic Installation (Alternative)

If you already have git installed:

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Download the setup script
```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/setup-raspi.sh
```

3. Make the script executable
```bash
chmod +x setup-raspi.sh
```

4. Run the setup script
```bash
./setup-raspi.sh
```

5. After the script runs, you'll need to run the PM2 startup command (which will be displayed in the terminal) to enable automatic startup on boot.

6. Access the application at `http://your-raspberry-pi-ip:3000`

### Manual Installation

If you prefer to install manually:

1. Install Node.js (version 18.x or later)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install PM2 for process management
```bash
sudo npm install -g pm2
```

3. Clone the repository
```bash
mkdir -p /home/pi/hcopdmx
cd /home/pi/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

4. Install dependencies
```bash
npm install
```

5. Configure the application
   - Edit `server.js` to set the proper IP address for your Art-Net device
   - Modify `hcop_dmx-channel.csv` if you want to adjust the DMX programs

6. Start the application with PM2
```bash
pm2 start ecosystem.config.js
```

7. Save the PM2 configuration to persist across reboots
```bash
pm2 save
```

8. Configure PM2 to start on system boot
```bash
pm2 startup
# Run the command that is displayed
```

## Updating the Application

### Automatic Update (Recommended)

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Run the update script
```bash
/home/pi/hcopdmx/update-raspi.sh
```

The script will automatically:
- Pull the latest changes from GitHub
- Install any new dependencies
- Restart the application with PM2

### Manual Update

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Navigate to the application directory
```bash
cd /home/pi/hcopdmx
```

3. Pull the latest changes
```bash
git pull origin main
```

4. Install any new dependencies
```bash
npm install
```

5. Restart the application
```bash
pm2 restart dmxserver
```

## Managing the Application

### PM2 Commands

The application runs using PM2 for reliable process management. Here are some useful commands:

- Check application status: `pm2 status`
- View application logs: `pm2 logs dmxserver`
- Monitor application in real-time: `pm2 monit`
- Restart application: `pm2 restart dmxserver`
- Stop application: `pm2 stop dmxserver`
- Start application: `pm2 start dmxserver`

### Configuring DMX Programs

DMX programs are defined in the `hcop_dmx-channel.csv` file with the following format:
- Each row represents a lighting program
- The first column is the program key (the identifier used in API calls)
- Each additional column represents a DMX channel value (0-255)

Example:
```
Key;Channel1;Channel2;Channel3
a;255;0;0
b;0;255;0
c;0;0;255
```

### API Endpoints

The application provides the following API endpoints:

- `POST /dmx/:key` - Activate a DMX program (replace `:key` with the program identifier from the CSV)
- `GET /state` - Get the current DMX state

### Web Interface

The application provides a web interface accessible at:
- `http://your-raspberry-pi-ip:3000`

The interface supports multiple languages with pages in `/de/` (German) and `/en/` (English) directories.

## Troubleshooting

### Application Not Starting

If the application doesn't start, check:
1. PM2 logs: `pm2 logs dmxserver`
2. Node.js version: `node --version` (should be 18.x or newer)
3. Application directory permissions: `ls -la /home/pi/hcopdmx`

### DMX Not Working

If DMX control is not working:
1. Check the IP address configuration in `server.js`
2. Ensure your DMX interface is powered on and connected to the network
3. Verify your DMX interface supports Art-Net protocol
4. Check network connectivity: `ping your-dmx-interface-ip`

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
- `public/` - Web interface files
  - `de/` - German interface
  - `en/` - English interface
  - `css/` - Stylesheets
  - `js/` - JavaScript files
  - `img/` - Images and icons

## License

ISC License 