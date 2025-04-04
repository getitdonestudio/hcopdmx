#!/bin/bash
# Setup script for enabling HTTPS on HCOP DMX Controller
# This script generates self-signed SSL certificates and configures the server

# Exit on error
set -e

APP_DIR="$HOME/hcopdmx"
CERT_DIR="$APP_DIR/certs"

echo "Setting up HTTPS for HCOP DMX Controller..."

# Create certificates directory
mkdir -p "$CERT_DIR"

# Generate self-signed certificate
echo "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERT_DIR/private-key.pem" \
  -out "$CERT_DIR/certificate.pem" \
  -subj "/C=DE/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

echo "SSL certificate generated."

# Update server.js to support HTTPS
echo "Updating server to support HTTPS..."
cd "$APP_DIR"

# Create a backup of the original server.js
cp server.js server.js.backup

# Create a script to modify the server code
cat > update-server.js << 'EOL'
const fs = require('fs');
const path = require('path');

// Read the server.js file
const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if HTTPS is already added
if (serverContent.includes('https.createServer')) {
  console.log('HTTPS support already configured');
  process.exit(0);
}

// Add fs and https imports at the top near other imports
serverContent = serverContent.replace(
  "const dgram = require('dgram');",
  "const dgram = require('dgram');\nconst https = require('https');\nconst http = require('http');"
);

// Find the part where the Express server is started
const serverStartRegex = /app\.listen\(PORT, .*?\)/s;
const httpsServerCode = `
// HTTPS Configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs/private-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/certificate.pem'))
};

// Create both HTTP and HTTPS servers
http.createServer(app).listen(PORT, () => {
  logInfo(\`HTTP Server running on port \${PORT}\`);
});

https.createServer(httpsOptions, app).listen(PORT + 1, () => {
  logInfo(\`HTTPS Server running on port \${PORT + 1}\`);
});

// Log access information
logInfo(\`Access the application at: http://\${getLocalIpAddress()}:\${PORT}\`);
logInfo(\`Secure access at: https://\${getLocalIpAddress()}:\${PORT + 1}\`);`;

// Replace app.listen with both HTTP and HTTPS servers
if (serverStartRegex.test(serverContent)) {
  serverContent = serverContent.replace(serverStartRegex, httpsServerCode);
} else {
  console.error('Could not find the server start code in server.js');
  process.exit(1);
}

// Add function to get local IP address if it doesn't exist
if (!serverContent.includes('function getLocalIpAddress()')) {
  const ipAddressFunction = `
// Function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}`;
  
  // Add the function before the server start
  serverContent = serverContent.replace(httpsServerCode, ipAddressFunction + '\n\n' + httpsServerCode);
}

// Write the updated file
fs.writeFileSync(serverPath, serverContent);
console.log('Server updated to support HTTPS');
EOL

# Run the update script
node update-server.js

echo "Server updated to support HTTPS."

# Restart the service
echo "Restarting the DMX server service..."
sudo systemctl restart dmx-server.service

echo ""
echo "HTTPS setup complete!"
echo "You can now access the application securely at:"
echo "https://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "Note: Since we're using a self-signed certificate, your browser may show a security warning."
echo "You can safely proceed past this warning for your local application."
echo ""
echo "To use without warnings, you would need to add the certificate to your browser/device's trusted certificates."
echo "" 