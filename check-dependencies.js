'use strict';

// This script checks if all required dependencies are installed
console.log('Checking for required dependencies...');

try {
    // Express
    require('express');
    console.log('✅ express is installed');
} catch (err) {
    console.error('❌ express is NOT installed. Run: npm install express');
}

try {
    // DMXNet
    require('dmxnet');
    console.log('✅ dmxnet is installed');
} catch (err) {
    console.error('❌ dmxnet is NOT installed. Run: npm install dmxnet');
}

try {
    // CSV Parser
    require('csv-parser');
    console.log('✅ csv-parser is installed');
} catch (err) {
    console.error('❌ csv-parser is NOT installed. Run: npm install csv-parser');
}

try {
    // ArtNet
    require('artnet');
    console.log('✅ artnet is installed');
} catch (err) {
    console.error('❌ artnet is NOT installed. Run: npm install artnet');
}

try {
    // EJS
    require('ejs');
    console.log('✅ ejs is installed');
} catch (err) {
    console.error('❌ ejs is NOT installed. Run: npm install ejs');
}

try {
    // Express Rate Limit
    require('express-rate-limit');
    console.log('✅ express-rate-limit is installed');
} catch (err) {
    console.error('❌ express-rate-limit is NOT installed. Run: npm install express-rate-limit');
}

try {
    // Helmet
    require('helmet');
    console.log('✅ helmet is installed');
} catch (err) {
    console.error('❌ helmet is NOT installed. Run: npm install helmet');
}

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);
const versionNumber = Number(nodeVersion.match(/^v(\d+)/)[1]);
if (versionNumber < 18) {
    console.error(`❌ Node.js version ${nodeVersion} may be too old. Version 18 or higher is recommended.`);
} else {
    console.log('✅ Node.js version is sufficient');
}

// Check file system
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'server.js',
    'hcop_dmx-channel.csv',
    'ecosystem.config.js'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`✅ ${file} exists`);
    } else {
        console.error(`❌ ${file} is missing`);
    }
});

// Check for logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    console.log('❌ logs directory does not exist, creating it...');
    try {
        fs.mkdirSync(logsDir);
        console.log('✅ logs directory created');
    } catch (err) {
        console.error(`❌ Failed to create logs directory: ${err.message}`);
    }
} else {
    console.log('✅ logs directory exists');
}

console.log('\nDependency check complete.');
console.log('If any dependencies are missing, run: npm install');
console.log('If all dependencies are installed but the server still fails to start,');
console.log('check the PM2 logs with: pm2 logs'); 