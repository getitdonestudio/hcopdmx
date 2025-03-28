'use strict';

const DmxNet = require('dmxnet');
const fs = require('fs');

// Configure DMX IP based on environment variable or use default
const DMX_IP = process.env.DMX_IP || '10.0.166.102';

console.log(`Testing ArtNet communication with ${DMX_IP}...`);

// Create dmxnet instance
const dmxNetOptions = {
    log: true,
    oem: 0,
    sName: 'Test ArtNet Controller',
    lName: 'Test ArtNet DMX Controller',
    hosts: [DMX_IP]  // The DMX controller IP address
};

const dmxnet = new DmxNet(dmxNetOptions);

// Create a sender
console.log(`Creating ArtNet sender to ${DMX_IP}...`);
const sender = dmxnet.newSender({
    ip: DMX_IP,
    subnet: 0,
    universe: 0,
    net: 0
});

// Write log function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}`;
    console.log(logMessage);
    
    // Also log to file
    fs.appendFileSync('artnet-test.log', logMessage + '\n');
}

// Test pattern sequence
const testPatterns = [
    { name: 'All off', values: Array(512).fill(0) },
    { name: 'All on', values: Array(512).fill(255) },
    { name: 'Channel 1 only', values: Array(512).fill(0).fill(255, 0, 1) },
    { name: 'Channel 2 only', values: Array(512).fill(0).fill(255, 1, 2) },
    { name: 'First 10 channels', values: Array(512).fill(0).fill(255, 0, 10) }
];

let currentTest = 0;

// Error event
sender.on('error', (err) => {
    log(`❌ ArtNet Sender ERROR: ${err}`);
});

// Test completion handler
function endTests() {
    log('✅ Test sequence completed');
    log('If you did not see any error messages, the ArtNet communication is working correctly.');
    log('Check the DMX fixtures to verify if they responded to the test patterns.');
    log('If fixtures did not respond, verify:');
    log('1. IP address is correct');
    log('2. Network subnet settings');
    log('3. DMX fixtures are properly connected and powered');
    log('4. DMX controller is configured correctly');
    
    // Turn all channels off at the end
    sender.fillChannels(0, 512, 0);
    
    // Give time for the final command to be sent before exiting
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

// Run tests sequentially
function runNextTest() {
    if (currentTest >= testPatterns.length) {
        endTests();
        return;
    }
    
    const test = testPatterns[currentTest];
    log(`Running test: ${test.name}`);
    
    // Send the test pattern
    for (let i = 0; i < test.values.length; i++) {
        sender.setChannel(i, test.values[i]);
    }
    
    // Move to next test after delay
    currentTest++;
    setTimeout(runNextTest, 2000);
}

// Start the test sequence
log('Starting ArtNet test sequence...');
try {
    fs.writeFileSync('artnet-test.log', `${new Date().toISOString()} - ArtNet Test Started\n`);
    runNextTest();
} catch (error) {
    log(`❌ Test failed: ${error.message}`);
    process.exit(1);
} 