'use strict';
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const dgram = require('dgram');
const os = require('os');
const path = require('path');

// Timestamps für Logs
function logWithTimestamp(...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
}

function errorWithTimestamp(...args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}]`, ...args);
}

const PORT = 3000;
const CSV_FILE = 'hcop_dmx-channel.csv';
const SETTINGS_FILE = 'settings.json';

// Default settings
const DEFAULT_SETTINGS = {
    screensaver: {
        timeDelay: 120000, // 2 minutes
        mode: 'dimToOn',
        lightPower: 255,
        transitionSpeed: 1000
    },
    system: {
        lastUpdated: new Date().toISOString()
    },
    lightPower: 255, // Add default normal light power (100%)
    linkLightPowers: true // Default: link normal and screensaver light power
};

// Global settings object
let appSettings = { ...DEFAULT_SETTINGS };

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            appSettings = JSON.parse(data);
            logWithTimestamp('Settings loaded successfully');
        } else {
            // If file doesn't exist, create it with default settings
            saveSettings(DEFAULT_SETTINGS);
            logWithTimestamp('Created default settings file');
        }
    } catch (error) {
        errorWithTimestamp('Error loading settings:', error);
        // If there's an error, use default settings
        appSettings = { ...DEFAULT_SETTINGS };
    }
}

// Save settings to file
function saveSettings(settings) {
    try {
        // Update last updated timestamp
        settings.system = {
            ...settings.system,
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        appSettings = { ...settings };
        logWithTimestamp('Settings saved successfully');
        return true;
    } catch (error) {
        errorWithTimestamp('Error saving settings:', error);
        return false;
    }
}

// ArtNet configuration
const ARTNET_PORT = 6454;
const ARTNET_HOST = '10.0.166.102';
const UNIVERSE = 1;
const NET = 0; // Common default
const SUBNET = 0; // Common default

// Create UDP socket for ArtNet communication
const socket = dgram.createSocket('udp4');

// Set up socket error handling
socket.on('error', (err) => {
    errorWithTimestamp('UDP Socket Error:', err);
});

// ArtNet packet header (constant part)
const ARTNET_HEADER = Buffer.from([
    0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00, // "Art-Net" - 8 bytes
    0x00, 0x50, // OpCode ArtDMX (0x5000) - 2 bytes
    0x00, 0x0e, // Protocol version (14) - 2 bytes
    0x00, // Sequence - 1 byte
    0x00, // Physical - 1 byte
]);

logWithTimestamp('ArtNet raw UDP sender initialisiert. Ziel-IP: ' + ARTNET_HOST);

// DMX-Programme aus CSV laden
let dmxPrograms = {};

function loadDMXPrograms() {
    return new Promise((resolve, reject) => {
        const tempPrograms = {};
        fs.createReadStream(CSV_FILE)
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                const keyField = Object.keys(row).find(k => k.trim().toLowerCase() === '﻿key' || k.trim().toLowerCase() === 'key');
                const key = keyField ? row[keyField].toLowerCase() : '';
                
                // Convert CSV values to binary (0/1) - any non-zero value is considered "on"
                const channelStates = Object.values(row)
                    .slice(1)
                    .map(value => (parseInt(value, 10) > 0) ? 1 : 0);
                
                if (key) {
                    // Store the binary states, actual DMX values will be calculated at runtime
                    tempPrograms[key] = channelStates;
                }
            })
            .on('error', (err) => {
                errorWithTimestamp('Fehler beim Einlesen der CSV-Datei:', err);
                reject(err);
            })
            .on('end', () => {
                logWithTimestamp('CSV-Datei erfolgreich geladen. Programme:', Object.keys(tempPrograms).join(', '));
                resolve(tempPrograms);
            });
    });
}

// Function to scale binary values to actual DMX values based on settings
function scaleDMXValues(binaryChannels, lightPowerSetting = null) {
    // If no specific lightPower provided, use the normal lightPower setting
    const lightPower = lightPowerSetting !== null ? lightPowerSetting : appSettings.lightPower;
    
    // Scale binary values (0/1) to DMX values (0-255) based on lightPower setting
    return binaryChannels.map(state => state === 1 ? Math.round(lightPower) : 0);
}

// Function to directly send an ArtNet DMX packet
function sendArtNetDMX(channels) {
    // Calculate high and low bytes for subnet/universe
    const subUni = ((SUBNET & 0x0F) << 4) | (UNIVERSE & 0x0F);
    const netSubUni = ((NET & 0x7F) << 8) | subUni;
    
    // Split netSubUni into high and low bytes
    const highByte = (netSubUni >> 8) & 0xFF;
    const lowByte = netSubUni & 0xFF;
    
    // Channel data length (2 bytes)
    const len = channels.length;
    const lenHi = (len >> 8) & 0xFF;
    const lenLo = len & 0xFF;
    
    // Build the full ArtNet packet
    const artnetPacket = Buffer.alloc(18 + channels.length);
    
    // Copy header to packet
    ARTNET_HEADER.copy(artnetPacket, 0);
    
    // Add sequence number (cycle from 1-255)
    const sequence = (global.artnetSequence || 0) + 1;
    global.artnetSequence = sequence > 255 ? 1 : sequence;
    artnetPacket[12] = global.artnetSequence;
    
    // Add universe information
    artnetPacket[14] = lowByte;  // Universe LSB (universe, part of subnet)
    artnetPacket[15] = highByte; // Universe MSB (net, part of subnet)
    
    // Add length
    artnetPacket[16] = lenHi;    // Data length MSB
    artnetPacket[17] = lenLo;    // Data length LSB
    
    // Add channel data
    for (let i = 0; i < channels.length; i++) {
        artnetPacket[18 + i] = channels[i];
    }
    
    // Send the packet via UDP
    return new Promise((resolve, reject) => {
        socket.send(artnetPacket, 0, artnetPacket.length, ARTNET_PORT, ARTNET_HOST, (err) => {
            if (err) {
                errorWithTimestamp('Fehler beim Senden des ArtNet-Pakets:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Function to set a DMX program directly with multiple sends for reliability
async function setDMXProgram(programKey, useScreensaverPower = false) {
    if (!dmxPrograms[programKey]) {
        errorWithTimestamp(`Programm ${programKey.toUpperCase()} nicht gefunden`);
        return false;
    }
    
    try {
        // Get the binary channel states
        const binaryChannels = dmxPrograms[programKey];
        
        // Determine which light power setting to use
        let lightPowerToUse;
        if (useScreensaverPower) {
            lightPowerToUse = appSettings.screensaver.lightPower;
        } else {
            lightPowerToUse = appSettings.lightPower;
        }
        
        // Scale binary values to actual DMX values
        const channels = scaleDMXValues(binaryChannels, lightPowerToUse);
        
        logWithTimestamp(`Setze DMX-Programm ${programKey.toUpperCase()} direkt...`);
        
        // Send multiple packets for reliability
        const retries = 5; // Increased from 3 to 5
        const waitTime = 30; // ms (reduced from 50 to 30)
        
        for (let i = 0; i < retries; i++) {
            try {
                await sendArtNetDMX(channels);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            } catch (err) {
                errorWithTimestamp(`Fehler beim Senden des ArtNet-Pakets (Versuch ${i+1}):`, err);
                // Continue with next retry
            }
        }
        
        // Store current state
        dmxPrograms.current = [...channels];
        
        logWithTimestamp(`DMX-Programm ${programKey.toUpperCase()} erfolgreich gesetzt.`);
        return true;
    } catch (error) {
        errorWithTimestamp(`Fehler beim Setzen des DMX-Programms ${programKey.toUpperCase()}:`, error);
        return false;
    }
}

// Function to interpolate between two DMX states
function interpolateDMX(startChannels, endChannels, progress) {
    return startChannels.map((start, i) => {
        const end = endChannels[i];
        return Math.round(start + (end - start) * progress);
    });
}

// Function to fade between DMX states
async function fadeDMX(startChannels, endChannels, duration) {
    const steps = Math.max(2, Math.ceil(duration / 50)); // Update every 50ms
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentChannels = interpolateDMX(startChannels, endChannels, progress);
        await sendArtNetDMX(currentChannels);
        if (i < steps) {
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
    }
}

// Function to fade to a DMX program
async function fadeToProgram(programKey, duration, useScreensaverPower = false) {
    if (!dmxPrograms[programKey]) {
        errorWithTimestamp(`Programm ${programKey.toUpperCase()} nicht gefunden`);
        return false;
    }
    
    try {
        // Get the binary channel states
        const binaryChannels = dmxPrograms[programKey];
        
        // Determine which light power setting to use
        let lightPowerToUse;
        if (useScreensaverPower) {
            lightPowerToUse = appSettings.screensaver.lightPower;
        } else {
            lightPowerToUse = appSettings.lightPower;
        }
        
        // Scale binary values to actual DMX values
        const targetChannels = scaleDMXValues(binaryChannels, lightPowerToUse);
        
        // Get current state or create zero state if none exists
        const currentChannels = dmxPrograms.current || new Array(targetChannels.length).fill(0);
        
        logWithTimestamp(`Fade zu DMX-Programm ${programKey.toUpperCase()} über ${duration}ms...`);
        
        // Perform the fade
        await fadeDMX(currentChannels, targetChannels, duration);
        
        // Store new current state
        dmxPrograms.current = [...targetChannels];
        
        logWithTimestamp(`Fade zu DMX-Programm ${programKey.toUpperCase()} erfolgreich abgeschlossen.`);
        return true;
    } catch (error) {
        errorWithTimestamp(`Fehler beim Faden zu DMX-Programm ${programKey.toUpperCase()}:`, error);
        return false;
    }
}

async function startServer() {
    try {
        // Load DMX programs and settings
        dmxPrograms = await loadDMXPrograms();
        loadSettings();

        const app = express();
        
        // Add JSON parsing middleware
        app.use(express.json());

        // API-Endpunkt: Direct DMX control (for pulsating and cycling modes)
        app.post('/dmx/direct', async (req, res) => {
            try {
                const { channels, useScreensaverPower } = req.body;
                
                if (!channels || !Array.isArray(channels)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid or missing channels array' 
                    });
                }
                
                // For direct control, we're assuming channels already contain actual DMX values
                // and not binary states (for compatibility with existing functionality)
                
                // Log the request for debugging
                logWithTimestamp(`Direct DMX control: Setting ${channels.length} channels directly. Sample values: [${channels.slice(0, 5).join(', ')}...]`);
                
                // Send multiple packets for reliability (similar to setDMXProgram)
                const retries = 3;
                const waitTime = 30; // ms
                
                for (let i = 0; i < retries; i++) {
                    try {
                        await sendArtNetDMX(channels);
                        if (i < retries - 1) {
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    } catch (err) {
                        errorWithTimestamp(`Fehler beim Senden des ArtNet-Pakets (Direktmodus, Versuch ${i+1}):`, err);
                        // Continue with next retry
                    }
                }
                
                // Store current state
                dmxPrograms.current = [...channels];
                
                logWithTimestamp(`DMX-Kanäle direkt gesetzt. Anzahl: ${channels.length}`);
                
                res.json({ 
                    success: true, 
                    message: 'DMX channels set directly'
                });
            } catch (error) {
                errorWithTimestamp('Error setting DMX channels directly:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Error setting DMX channels directly'
                });
            }
        });

        // API-Endpunkt: Get a specific DMX program (for the cycling mode)
        app.get('/dmx/program/:key', (req, res) => {
            const key = req.params.key.toLowerCase();
            
            if (dmxPrograms[key]) {
                res.json({ 
                    success: true, 
                    key: key,
                    channels: dmxPrograms[key]
                });
            } else {
                res.status(404).json({ 
                    success: false, 
                    message: `Program ${key.toUpperCase()} not found` 
                });
            }
        });

        // API-Endpunkt: DMX-Programm senden
        app.post('/dmx/:key', async (req, res) => {
            const programKey = req.params.key.toLowerCase();
            const success = await setDMXProgram(programKey);
            res.json({ success });
        });

        // API-Endpunkt für Übergänge - nutzt jetzt direktes Setzen
        app.post('/dmx/transition/:fromKey/:toKey', async (req, res) => {
            const fromKey = req.params.fromKey.toLowerCase();
            const toKey = req.params.toKey.toLowerCase();
            
            if (toKey !== 'z' && !dmxPrograms[toKey]) {
                return res.status(404).json({ 
                    success: false, 
                    message: `Programm ${toKey.toUpperCase()} nicht gefunden` 
                });
            }

            try {
                // Direkt zum Zielzustand wechseln ohne Übergang
                const success = await setDMXProgram(toKey);
                
                if (success) {
                    logWithTimestamp(`Direkter Wechsel zu Programm ${toKey.toUpperCase()} erfolgreich.`);
                    return res.json({ 
                        success: true, 
                        message: `Programm ${toKey.toUpperCase()} aktiviert.`,
                        completed: true
                    });
                } else {
                    return res.status(500).json({ 
                        success: false, 
                        message: `Fehler beim Setzen von Programm ${toKey.toUpperCase()}.`
                    });
                }
            } catch (error) {
                errorWithTimestamp('Fehler beim Setzen des DMX-Programms:', error);
                res.status(500).json({ success: false, message: 'Interner Serverfehler beim Setzen des DMX-Programms' });
            }
        });

        // API-Endpunkt für sanfte Übergänge mit Fading
        app.post('/dmx/fade/:key', async (req, res) => {
            const programKey = req.params.key.toLowerCase();
            const duration = parseInt(req.query.duration) || 1000;
            const useScreensaverPower = req.query.screensaver === 'true';
            const success = await fadeToProgram(programKey, duration, useScreensaverPower);
            res.json({ success });
        });

        // API-Endpunkt: Aktueller Zustand
        app.get('/state', (req, res) => {
            const currentState = dmxPrograms?.current || Array(512).fill(0);
            res.json({ success: true, channels: currentState });
        });
        
        // API-Endpunkt zum Auflisten aller verfügbaren DMX-Programme
        app.get('/dmx/programs', (req, res) => {
            const programs = Object.keys(dmxPrograms).filter(key => key !== 'current');
            res.json({ success: true, programs });
        });
        
        // API endpoints for settings
        app.get('/api/settings', (req, res) => {
            res.json(appSettings);
        });
        
        app.post('/api/settings', (req, res) => {
            try {
                const newSettings = req.body;
                
                // Validate settings
                if (!newSettings) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid settings format'
                    });
                }
                
                // Apply new settings but keep any existing settings that weren't specified
                const updatedSettings = {
                    ...appSettings,
                    screensaver: {
                        ...appSettings.screensaver,
                        ...(newSettings.screensaver || {})
                    }
                };
                
                // Update lightPower and linkLightPowers if provided
                if (newSettings.lightPower !== undefined) {
                    updatedSettings.lightPower = newSettings.lightPower;
                }
                
                if (newSettings.linkLightPowers !== undefined) {
                    updatedSettings.linkLightPowers = newSettings.linkLightPowers;
                    
                    // If linking is enabled, synchronize screensaver lightPower with normal lightPower
                    if (newSettings.linkLightPowers && newSettings.lightPower !== undefined) {
                        updatedSettings.screensaver.lightPower = newSettings.lightPower;
                    }
                }
                
                const success = saveSettings(updatedSettings);
                
                if (success) {
                    logWithTimestamp('Settings updated:', JSON.stringify({
                        lightPower: updatedSettings.lightPower,
                        linkLightPowers: updatedSettings.linkLightPowers,
                        screensaver: updatedSettings.screensaver
                    }));
                    return res.json({
                        success: true,
                        message: 'Settings updated successfully',
                        settings: updatedSettings
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to save settings'
                    });
                }
            } catch (error) {
                errorWithTimestamp('Error updating settings:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error while updating settings'
                });
            }
        });
        
        app.post('/api/settings/reset', (req, res) => {
            try {
                const success = saveSettings(DEFAULT_SETTINGS);
                
                if (success) {
                    logWithTimestamp('Settings reset to defaults');
                    return res.json(DEFAULT_SETTINGS);
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to reset settings'
                    });
                }
            } catch (error) {
                errorWithTimestamp('Error resetting settings:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error while resetting settings'
                });
            }
        });
        
        // API-Endpunkt: Temporary settings for testing modes
        app.post('/api/settings/temp', (req, res) => {
            try {
                // Apply the settings temporarily without saving to file
                const tempSettings = {
                    ...appSettings,
                    screensaver: {
                        ...appSettings.screensaver,
                        ...req.body.screensaver
                    }
                };
                
                res.json({ success: true, message: 'Temporary settings applied', settings: tempSettings });
                logWithTimestamp(`Temporary settings applied: ${JSON.stringify(tempSettings.screensaver)}`);
            } catch (err) {
                errorWithTimestamp('Error applying temporary settings:', err);
                res.status(500).json({ success: false, message: 'Error applying temporary settings' });
            }
        });
        
        // Redirect von / zu /de/0000.html
        app.get('/', (req, res) => {
            res.redirect('/de/0000.html');
        });

        // Redirect old SPA URLs to new clean URLs
        app.get('/spa/:lang/:page.html', (req, res) => {
            res.redirect(`/${req.params.lang}/${req.params.page}.html`);
        });

        // SPA Handling: Redirect spa root to language page
        app.get('/spa', (req, res) => {
            res.redirect('/de/0000.html');
        });

        // Ensure static files are served first (content fragments, js, css, etc)
        app.use(express.static('public', {
            maxAge: '100d' // Dateien werden 100 Tag im Cache gehalten
        }));

        // SPA route handling - serve index.html for all language/page routes
        app.get('/:lang/:page.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Direct settings page route
        app.get('/settings.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'settings.html'));
        });

        const server = app.listen(PORT, '0.0.0.0', () => {
            logWithTimestamp(`Server läuft unter http://localhost:${PORT}`);
        });
        
        // Signal Handling
        function shutdown() {
            logWithTimestamp('DMX-Server wird beendet...');
            // Set all channels to 0 before closing
            const zeroChannels = Array(512).fill(0);
            sendArtNetDMX(zeroChannels)
                .then(() => {
                    logWithTimestamp('DMX-Kanäle auf 0 gesetzt.');
                    socket.close(() => {
                        process.exit(0);
                    });
                })
                .catch(() => {
                    socket.close(() => {
                        process.exit(1);
                    });
                });
        }

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Unerwartete Fehler abfangen
        process.on('uncaughtException', (err) => {
            errorWithTimestamp('Uncaught Exception:', err);
            // PM2 wird den Prozess ggf. neu starten
        });

        process.on('unhandledRejection', (reason, promise) => {
            errorWithTimestamp('Unhandled Rejection:', reason, 'Promise:', promise);
        });

        // Heartbeat: Alle 60 Sekunden den letzten Zustand erneut senden
        const heartbeatInterval = 30000; // 30 * 1000 ms (reduced from 60000)
        let heartbeatErrorCount = 0;
        
        const heartbeatTimer = setInterval(async () => {
            try {
                if (dmxPrograms.current) {
                    await sendArtNetDMX(dmxPrograms.current);
                    logWithTimestamp('Heartbeat: Letzten DMX-Wert erneut gesendet');
                    // Reset error count on success
                    heartbeatErrorCount = 0;
                } else {
                    logWithTimestamp('Heartbeat: Kein aktueller DMX-Zustand gefunden');
                }
            } catch (err) {
                heartbeatErrorCount++;
                errorWithTimestamp(`Fehler im Heartbeat-Intervall (${heartbeatErrorCount}):`, err);
                
                // If we've had multiple failures, try resending more aggressively
                if (heartbeatErrorCount > 3) {
                    try {
                        // Try to resend the current state with multiple attempts
                        logWithTimestamp('Versuche DMX-Zustand wiederherzustellen...');
                        
                        // If we have a current state, resend it multiple times
                        if (dmxPrograms.current) {
                            for (let i = 0; i < 3; i++) {
                                await sendArtNetDMX(dmxPrograms.current);
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            logWithTimestamp('DMX-Zustand wiederhergestellt');
                        }
                        
                        heartbeatErrorCount = 0;
                    } catch (recoveryErr) {
                        errorWithTimestamp('Fehler bei der Wiederherstellung des DMX-Zustands:', recoveryErr);
                    }
                }
            }
        }, heartbeatInterval);

        // Initial program - set all channels to 0
        await setDMXProgram('z');
        logWithTimestamp('Server initialisiert und bereit.');

    } catch (error) {
        errorWithTimestamp('Fehler beim Starten des Servers:', error);
        process.exit(1);
    }
}

startServer(); 