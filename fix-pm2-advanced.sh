#!/bin/bash
# Advanced PM2 configuration fix script
# This will reset PM2, check for systemd conflicts, and provide detailed diagnostics

# Display script header
echo "====================================================="
echo "Advanced DMX Server PM2 Configuration Fix Script"
echo "====================================================="
echo ""

# Function to check systemd status
check_systemd() {
    echo "Checking for systemd service conflicts..."
    if systemctl list-units --type=service | grep -q "pm2\|dmx"; then
        echo "⚠️ Found potentially conflicting systemd services:"
        systemctl list-units --type=service | grep -E "pm2|dmx"
        echo ""
        echo "Consider disabling conflicting services with:"
        echo "sudo systemctl stop SERVICE_NAME"
        echo "sudo systemctl disable SERVICE_NAME"
        return 1
    else
        echo "✅ No conflicting systemd services found."
        return 0
    fi
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️ This script is running as root. It's better to run as a regular user."
    echo "   PM2 should be installed and run as the user who will maintain the application."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if npm and node are installed
echo "Checking system requirements..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
else
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    echo "✅ Node.js is installed: $NODE_VERSION"
    if [ "$NODE_MAJOR" -lt 14 ]; then
        echo "⚠️ Node.js version is quite old. Consider upgrading to v18 or higher."
    fi
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "✅ npm is installed: $NPM_VERSION"
fi

# Check for local user PM2 installation vs global
PM2_LOCAL=$(npm list --depth=0 | grep pm2 || echo "")
PM2_GLOBAL=""
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    PM2_GLOBAL="global"
    echo "✅ PM2 is installed globally: $PM2_VERSION"
else
    if [ -n "$PM2_LOCAL" ]; then
        echo "✅ PM2 is installed locally. Will use npx pm2."
        PM2_CMD="npx pm2"
    else
        echo "❌ PM2 is not installed. Installing PM2 globally..."
        npm install -g pm2
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install PM2 globally. Trying locally..."
            npm install pm2
            if [ $? -ne 0 ]; then
                echo "❌ Failed to install PM2. Please install manually."
                exit 1
            else
                PM2_CMD="npx pm2"
                echo "✅ PM2 installed locally. Will use npx pm2."
            fi
        else
            PM2_CMD="pm2"
            PM2_GLOBAL="global"
            echo "✅ PM2 installed globally."
        fi
    fi
fi

# Set the PM2 command based on installation type
if [ -z "$PM2_CMD" ]; then
    PM2_CMD="pm2"
fi

# Check for systemd conflicts
check_systemd

# Run dependency check
echo ""
echo "Checking Node.js dependencies..."
node check-dependencies.js
echo ""

# Check file permissions
echo "Checking file permissions..."
ls -la server.js ecosystem.config.js
echo ""

# Stop existing PM2 processes
echo "Stopping all PM2 processes..."
$PM2_CMD kill || echo "No PM2 processes were running."

# Create logs directory if it doesn't exist
echo "Creating logs directory with proper permissions..."
mkdir -p logs
chmod 755 logs

# Check network connectivity to DMX controller
echo ""
echo "Checking DMX controller connectivity..."
node check-dmx-connectivity.js
echo ""

# Start the application with correct server.js
echo "Starting application with proper server.js..."
$PM2_CMD start ecosystem.config.js
sleep 2

# Check if the process started successfully
if $PM2_CMD list | grep -q "online"; then
    echo "✅ Server started successfully!"
else
    echo "⚠️ Server may have failed to start. Checking logs..."
    $PM2_CMD logs --lines 20
fi

# Save the PM2 configuration
echo "Saving PM2 configuration..."
$PM2_CMD save

# Set up PM2 to start on boot
echo "Setting up PM2 to start on boot (may require sudo rights)..."
if [ "$PM2_GLOBAL" = "global" ]; then
    PM2_STARTUP_CMD=$($PM2_CMD startup | grep "sudo env")
    echo ""
    echo "============================================================"
    echo "IMPORTANT: Run the following command to enable startup on boot:"
    echo "$PM2_STARTUP_CMD"
    echo "Then run: pm2 save"
    echo "============================================================"
else
    echo "⚠️ PM2 is installed locally, which doesn't support startup scripts."
    echo "Consider installing PM2 globally or using the systemd script."
    echo "To install PM2 globally: sudo npm install -g pm2"
fi

echo ""
echo "Testing if PM2 daemon stays running..."
echo "Sleeping for 5 seconds..."
sleep 5

# Check if PM2 daemon is still running
if pgrep -x "PM2" > /dev/null || pgrep -x "pm2" > /dev/null; then
    echo "✅ PM2 daemon is running."
else
    echo "⚠️ PM2 daemon may have stopped. This could indicate a problem."
    echo "Consider using systemd service instead (run setup-systemd.sh)."
fi

# Display status
echo "Current PM2 status:"
$PM2_CMD status

echo ""
echo "PM2 configuration has been reset and fixed."
echo "If you see the server running above, the configuration was successful."
echo ""
echo "To check logs if the server failed to start:"
echo "  $PM2_CMD logs"
echo ""
echo "You can access the application at http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "If you continue to have issues with PM2 startup, try the alternative systemd service:"
echo "./setup-systemd.sh" 