'use strict';
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');

// Helper functions for logs with timestamp
function logWithTimestamp(...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
}

function errorWithTimestamp(...args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}]`, ...args);
}

const PORT = process.env.PORT || 3000;
const CSV_FILE = 'hcop_dmx-channel.csv';

// DMX state simulator for local development
let currentDMXState = Array(512).fill(0);

// DMX programs from CSV
let dmxPrograms = {};

function loadDMXPrograms() {
    return new Promise((resolve, reject) => {
        const tempPrograms = {};
        fs.createReadStream(CSV_FILE)
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                const keyField = Object.keys(row).find(k => k.trim().toLowerCase() === '﻿key' || k.trim().toLowerCase() === 'key');
                const key = keyField ? row[keyField].toLowerCase() : '';
                const channels = Object.values(row)
                    .slice(1)
                    .map(value => parseInt(value, 10) || 0);
                if (key) {
                    tempPrograms[key] = channels;
                }
            })
            .on('error', (err) => {
                errorWithTimestamp('Error reading CSV file:', err);
                reject(err);
            })
            .on('end', () => {
                logWithTimestamp('CSV file loaded successfully:', tempPrograms);
                resolve(tempPrograms);
            });
    });
}

// Simulate sending DMX state
async function simulateDMXState(channels) {
    logWithTimestamp('Simulating DMX state:', channels.slice(0, 10), '... (and more)');
    currentDMXState = [...channels];
    return true;
}

async function startServer() {
    try {
        dmxPrograms = await loadDMXPrograms();

        const app = express();

        // API endpoint: Send DMX program
        app.post('/dmx/:key', async (req, res) => {
            const key = req.params.key.toLowerCase();

            if (dmxPrograms[key]) {
                const state = dmxPrograms[key];
                dmxPrograms.current = state;

                await simulateDMXState(state);
                logWithTimestamp(`Program ${key.toUpperCase()} sent (simulation)`);
                res.json({ success: true, message: `Program ${key.toUpperCase()} sent (simulation)` });
            } else {
                return res.status(404).json({ success: false, message: `Program ${key.toUpperCase()} not found` });
            }
        });

        // API endpoint: Current state
        app.get('/state', (req, res) => {
            const currentState = dmxPrograms?.current || Array(512).fill(0);
            res.json({ success: true, channels: currentState });
        });
        
        // Redirect from / to /de/0000.html
        app.get('/', (req, res) => {
            res.redirect('/de/0000.html');
        });

        // Static files (Frontend)
        app.use(express.static('public', {
            maxAge: '1d' // Files are cached for 1 day in development
        }));
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            logWithTimestamp(`LOCAL DEVELOPMENT SERVER running at http://${getLocalIpAddress()}:${PORT}`);
            logWithTimestamp('DMX functionality is SIMULATED. No real DMX messages will be sent.');
        });
        
        // Signal Handling
        function shutdown() {
            logWithTimestamp('Server shutting down...');
            process.exit(0);
        }

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Resource check (every 5 minutes)
        const resourceCheckInterval = 300000;
        setInterval(() => {
            const load = os.loadavg();
            const freeMem = os.freemem();
            const totalMem = os.totalmem();
            const freeMemMB = Math.round(freeMem / 1024 / 1024);
            const totalMemMB = Math.round(totalMem / 1024 / 1024);
            logWithTimestamp(
                `Resource check: Load: ${load.map(l => l.toFixed(2)).join(', ')} | ` +
                `Memory: ${freeMemMB}MB free of ${totalMemMB}MB`
            );
        }, resourceCheckInterval);

    } catch (error) {
        errorWithTimestamp('Error starting server:', error);
        process.exit(1);
    }
}

// Helper function to get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over non-IPv4 and internal (loopback) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

startServer(); 