#!/bin/bash
# Script to check for permission issues with the DMX server
# This can help identify common permission problems that prevent startup

echo "====================================================="
echo "DMX Server Permission Check Script"
echo "====================================================="
echo ""

# Check current user and directory
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Home directory: $HOME"

# Check file ownerships
echo ""
echo "Checking file ownerships..."
echo "Server file: $(ls -l server.js)"
echo "Ecosystem file: $(ls -l ecosystem.config.js)"
echo "CSV data file: $(ls -l hcop_dmx-channel.csv 2>/dev/null || echo "Not found")"

# Check directory permissions
echo ""
echo "Checking directory permissions..."
echo "Current directory: $(ls -ld .)"
echo "Logs directory: $(ls -ld logs 2>/dev/null || echo "Not found")"
echo "Node modules: $(ls -ld node_modules 2>/dev/null || echo "Not found")"

# Check global npm permissions
echo ""
echo "Checking npm global permissions..."
NPM_PREFIX=$(npm config get prefix)
echo "npm prefix: $NPM_PREFIX"
echo "npm prefix ownership: $(ls -ld $NPM_PREFIX 2>/dev/null || echo "Not found")"

# Check PM2 directories
echo ""
echo "Checking PM2 directories..."
PM2_HOME="${PM2_HOME:-$HOME/.pm2}"
echo "PM2_HOME=$PM2_HOME"
echo "PM2 home directory: $(ls -ld $PM2_HOME 2>/dev/null || echo "Not found")"
echo "PM2 logs: $(ls -ld $PM2_HOME/logs 2>/dev/null || echo "Not found")"

# Check systemd directories for PM2 service
echo ""
echo "Checking systemd user units..."
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
echo "User systemd directory: $(ls -ld $SYSTEMD_USER_DIR 2>/dev/null || echo "Not found")"
if [ -d "$SYSTEMD_USER_DIR" ]; then
    echo "PM2 service in user systemd: $(ls -l $SYSTEMD_USER_DIR/pm2* 2>/dev/null || echo "Not found")"
fi

# Check system systemd directories
echo ""
echo "Checking system-wide systemd units..."
if [ -d "/etc/systemd/system" ]; then
    echo "PM2 service in system systemd: $(ls -l /etc/systemd/system/pm2* 2>/dev/null || echo "Not found")"
fi

# Display key findings and recommendations
echo ""
echo "====================================================="
echo "Recommendations based on findings:"
echo "====================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️ You are running as root. Running Node.js applications as root is not recommended."
    echo "   Consider creating and using a dedicated non-root user."
fi

# Check file ownership issues
CURRENT_USER=$(whoami)
SERVER_OWNER=$(stat -c '%U' server.js 2>/dev/null || ls -l server.js | awk '{print $3}')
if [ "$SERVER_OWNER" != "$CURRENT_USER" ]; then
    echo "⚠️ The server.js file is owned by $SERVER_OWNER but you are $CURRENT_USER."
    echo "   This might cause permission issues. Consider changing ownership:"
    echo "   sudo chown $CURRENT_USER:$CURRENT_USER server.js"
fi

# Check global npm without sudo
if [[ "$NPM_PREFIX" == "/usr/local" || "$NPM_PREFIX" == "/usr" ]]; then
    NPM_OWNER=$(stat -c '%U' $NPM_PREFIX 2>/dev/null || ls -ld $NPM_PREFIX | awk '{print $3}')
    if [ "$NPM_OWNER" != "$CURRENT_USER" ]; then
        echo "⚠️ Your npm global directory ($NPM_PREFIX) is not owned by you."
        echo "   This may cause issues when installing global packages like PM2."
        echo "   Consider using a user-owned npm prefix or use nvm instead."
    fi
fi

# Check PM2 home directory
if [ ! -d "$PM2_HOME" ]; then
    echo "⚠️ The PM2 home directory ($PM2_HOME) doesn't exist."
    echo "   This might indicate PM2 hasn't been started yet or there are permission issues."
else
    PM2_HOME_OWNER=$(stat -c '%U' $PM2_HOME 2>/dev/null || ls -ld $PM2_HOME | awk '{print $3}')
    if [ "$PM2_HOME_OWNER" != "$CURRENT_USER" ]; then
        echo "⚠️ The PM2 home directory is owned by $PM2_HOME_OWNER but you are $CURRENT_USER."
        echo "   This might cause startup issues. Consider fixing permissions:"
        echo "   sudo chown -R $CURRENT_USER:$CURRENT_USER $PM2_HOME"
    fi
fi

# Check if logs directory exists
if [ ! -d "logs" ]; then
    echo "⚠️ The logs directory doesn't exist. Create it with:"
    echo "   mkdir -p logs"
    echo "   chmod 755 logs"
fi

echo ""
echo "For more detailed debugging, try running the fix-pm2-advanced.sh script."
echo "If PM2 continues to have issues, consider using the systemd service setup:"
echo "./setup-systemd.sh" 