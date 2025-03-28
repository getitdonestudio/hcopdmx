# HCOP DMX Controller

A Node.js application to control DMX lighting via Art-Net protocol, designed to run on Raspberry Pi or similar devices.

## Features

- Express-based web server with a simple interface
- DMX lighting control via Art-Net
- Configurable lighting programs loaded from CSV
- Heartbeat functionality to ensure consistent operation
- Resource monitoring for system health

## Setup

### Prerequisites

- Node.js (v12 or later recommended)
- npm

### Installation

1. Clone this repository
```bash
git clone [your-repository-url]
cd hcopdmx
```

2. Install dependencies
```bash
npm install
```

3. Configure the DMX settings in `server.js`
   - Set the target IP address for the Art-Net device
   - Adjust other network parameters as needed

4. Run the application
```bash
node server.js
```

## Configuration

- DMX programs are loaded from `hcop_dmx-channel.csv`
- CSV format: `Key;Channel1;Channel2;...;ChannelN`
- Each row defines a lighting program that can be triggered via API

## Usage

- Access the web interface at `http://[your-device-ip]:3000`
- Trigger lighting programs via `POST /dmx/:key` where `:key` corresponds to a row in the CSV file
- Check current DMX state via `GET /state`

## Development

- Modify `server.js` to adjust server functionality
- Frontend files are in the `public` directory
- Add new lighting programs by editing the CSV file 