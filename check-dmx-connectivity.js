'use strict';

const net = require('net');
const dns = require('dns');
const os = require('os');

const DMX_IP = process.env.DMX_IP || '10.0.166.102';
const DEFAULT_PORT = 6454; // ArtNet default port

console.log(`Checking connectivity to DMX controller at ${DMX_IP}:${DEFAULT_PORT}...`);

// First, log local network interfaces
console.log('\n--- Local Network Interfaces ---');
const networkInterfaces = os.networkInterfaces();
Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(iface => {
        if (iface.family === 'IPv4') {
            console.log(`${interfaceName}: ${iface.address} (${iface.internal ? 'internal' : 'external'})`);
        }
    });
});

// Check if DMX IP is reachable via simple TCP connection test
console.log('\n--- Connection Test ---');
const client = new net.Socket();
const timeoutMs = 2000; // 2 seconds timeout

let connectionTimeout = setTimeout(() => {
    client.destroy();
    console.error(`❌ Connection to ${DMX_IP}:${DEFAULT_PORT} timed out after ${timeoutMs}ms`);
    runPingTest();
}, timeoutMs);

client.connect(DEFAULT_PORT, DMX_IP, function() {
    clearTimeout(connectionTimeout);
    console.log(`✅ Successfully connected to ${DMX_IP}:${DEFAULT_PORT}`);
    client.destroy();
    runPingTest();
});

client.on('error', function(err) {
    clearTimeout(connectionTimeout);
    console.error(`❌ Failed to connect to ${DMX_IP}:${DEFAULT_PORT}: ${err.message}`);
    runPingTest();
});

// Check DNS resolution capability (ensure network is functioning)
function runPingTest() {
    console.log('\n--- DNS Resolution Test ---');
    dns.lookup('google.com', (err, address) => {
        if (err) {
            console.error(`❌ DNS resolution failed: ${err.message}. Network may be down.`);
        } else {
            console.log(`✅ DNS resolution working: google.com -> ${address}`);
        }
        
        console.log('\n--- Suggestions ---');
        console.log('1. Make sure the DMX controller is powered on and connected to the network');
        console.log('2. Verify the IP address is correct in your configuration');
        console.log('3. Check if there are any firewalls blocking UDP port 6454');
        console.log('4. Try to ping the DMX controller from command line: ping ' + DMX_IP);
        console.log('5. If on different subnets, ensure routing is properly configured');
        
        console.log('\nTo use a different DMX IP address with this script:');
        console.log('DMX_IP=your.custom.ip.address node check-dmx-connectivity.js');
    });
} 