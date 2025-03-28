#!/bin/bash
# Script to fix PM2 configuration issues
# This will reset PM2 and set up the service properly

# Display script header
echo "====================================================="
echo "DMX Server PM2 Configuration Fix Script"
echo "====================================================="
echo ""

# Check if npm and node are installed
echo "Checking system requirements..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js is installed: $NODE_VERSION"
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "✅ npm is installed: $NPM_VERSION"
fi

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2. Try running: sudo npm install -g pm2"
        exit 1
    fi
else
    PM2_VERSION=$(pm2 -v)
    echo "✅ PM2 is installed: $PM2_VERSION"
fi

# Run dependency check
echo ""
echo "Checking Node.js dependencies..."
node check-dependencies.js
echo ""

# Stop existing PM2 processes
echo "Stopping all PM2 processes..."
pm2 kill

# Create logs directory if it doesn't exist
echo "Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Check network connectivity to DMX controller
echo ""
echo "Checking DMX controller connectivity..."
node check-dmx-connectivity.js
echo ""

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
echo "If you see the server running above, the configuration was successful."
echo ""
echo "To check logs if the server failed to start:"
echo "  pm2 logs"
echo ""
echo "You can access the application at http://$(hostname -I | awk '{print $1}'):3000" 