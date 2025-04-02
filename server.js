'use strict';
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const dgram = require('dgram');
const os = require('os');
const path = require('path');

// Logging configuration
const LOG_CONFIG = {
    level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    heartbeatInterval: 5, // Only log heartbeat every X times
    maxFileSize: 5 * 1024 * 1024, // 5MB max log file size
    logFile: 'dmx-server.log',
    logToConsole: true,
    dmxDirectLogInterval: 100 // Only log every 100th direct DMX command (rate limiting)
};

// Log levels and their priorities
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

// Current heartbeat counter
let heartbeatCounter = 0;
let dmxDirectCounter = 0;

// Check if a message should be logged based on current level
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_CONFIG.level];
}

// Rotate log file if it's too large
function checkLogFileSize() {
    try {
        if (!LOG_CONFIG.logFile) return;
        
        if (fs.existsSync(LOG_CONFIG.logFile)) {
            const stats = fs.statSync(LOG_CONFIG.logFile);
            if (stats.size > LOG_CONFIG.maxFileSize) {
                const backupFile = `${LOG_CONFIG.logFile}.old`;
                if (fs.existsSync(backupFile)) {
                    fs.unlinkSync(backupFile);
                }
                fs.renameSync(LOG_CONFIG.logFile, backupFile);
            }
        }
    } catch (err) {
        console.error(`Error rotating log file: ${err.message}`);
    }
}

// Enhanced logging functions
function logWithTimestamp(level, ...args) {
    // Skip if log level is too low
    if (!shouldLog(level)) return;
    
    // Filter out high-frequency messages
    const message = args.join(' ');
    
    // Rate-limit heartbeat messages
    if (level === 'info' && message.includes('Heartbeat:')) {
        heartbeatCounter++;
        if (heartbeatCounter % LOG_CONFIG.heartbeatInterval !== 0) {
            return;
        }
    }
    
    // Rate-limit direct DMX control messages
    if (level === 'info' && message.includes('Direct DMX control:')) {
        dmxDirectCounter++;
        if (dmxDirectCounter % LOG_CONFIG.dmxDirectLogInterval !== 0) {
            return;
        }
    }
    
    // Rate-limit DMX channels directly set messages
    if (level === 'info' && message.includes('DMX-Kanäle direkt gesetzt.')) {
        // Skip completely since this is redundant with the Direct DMX control message
        return;
    }
    
    // Always log screensaver mode starts, but skip interval updates
    if (level === 'info' && message.includes('screensaverMode') && !message.includes('Starting')) {
        // Skip interval update logs for screensaver mode
        return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Check/rotate log file if logging to file
    if (LOG_CONFIG.logFile) {
        checkLogFileSize();
        try {
            fs.appendFileSync(LOG_CONFIG.logFile, logMessage + '\n');
        } catch (err) {
            console.error(`Failed to write to log file: ${err.message}`);
        }
    }
    
    // Console output if enabled
    if (LOG_CONFIG.logToConsole) {
        if (level === 'error') {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Simplified logging functions with levels
function logDebug(...args) {
    logWithTimestamp('debug', ...args);
}

function logInfo(...args) {
    logWithTimestamp('info', ...args);
}

function logWarn(...args) {
    logWithTimestamp('warn', ...args);
}

function logError(...args) {
    logWithTimestamp('error', ...args);
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
            try {
                const parsedSettings = JSON.parse(data);
                
                // Validate critical settings
                if (!parsedSettings.screensaver || typeof parsedSettings.screensaver !== 'object') {
                    throw new Error('Invalid screensaver settings');
                }
                
                appSettings = parsedSettings;
                logInfo('Settings loaded successfully');
                
                // Create backup of valid settings
                const backupFile = `${SETTINGS_FILE}.backup`;
                fs.writeFileSync(backupFile, data, 'utf8');
                
                return true;
            } catch (parseError) {
                logError('Error parsing settings file:', parseError);
                
                // Try to load from backup
                const backupFile = `${SETTINGS_FILE}.backup`;
                if (fs.existsSync(backupFile)) {
                    try {
                        const backupData = fs.readFileSync(backupFile, 'utf8');
                        appSettings = JSON.parse(backupData);
                        logInfo('Restored settings from backup file');
                        
                        // Save the restored settings back to main file
                        fs.writeFileSync(SETTINGS_FILE, backupData, 'utf8');
                        return true;
                    } catch (backupError) {
                        logError('Error loading backup settings:', backupError);
                    }
                }
                
                // If all else fails, use default settings
                appSettings = { ...DEFAULT_SETTINGS };
                saveSettings(DEFAULT_SETTINGS);
                logInfo('Reset to default settings due to parse error');
                return false;
            }
        } else {
            // If file doesn't exist, create it with default settings
            saveSettings(DEFAULT_SETTINGS);
            logInfo('Created default settings file');
            return true;
        }
    } catch (error) {
        logError('Error accessing settings file:', error);
        // If there's an error, use default settings
        appSettings = { ...DEFAULT_SETTINGS };
        return false;
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
        
        // Create a backup of current settings before saving new ones
        if (fs.existsSync(SETTINGS_FILE)) {
            try {
                const currentData = fs.readFileSync(SETTINGS_FILE, 'utf8');
                const backupFile = `${SETTINGS_FILE}.backup`;
                fs.writeFileSync(backupFile, currentData, 'utf8');
            } catch (backupError) {
                logError('Error creating settings backup:', backupError);
            }
        }
        
        // Write settings to temp file first
        const tempFile = `${SETTINGS_FILE}.temp`;
        fs.writeFileSync(tempFile, JSON.stringify(settings, null, 2), 'utf8');
        
        // Validate the written file
        try {
            const checkData = fs.readFileSync(tempFile, 'utf8');
            JSON.parse(checkData); // Try to parse to verify
            
            // If successful, rename temp file to settings file
            fs.renameSync(tempFile, SETTINGS_FILE);
            appSettings = { ...settings };
            
            logInfo('Settings saved successfully');
            return true;
        } catch (validationError) {
            logError('Error validating settings file:', validationError);
            
            // Clean up temp file
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            
            return false;
        }
    } catch (error) {
        logError('Error saving settings:', error);
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
    logError('UDP Socket Error:', err);
});

// ArtNet packet header (constant part)
const ARTNET_HEADER = Buffer.from([
    0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00, // "Art-Net" - 8 bytes
    0x00, 0x50, // OpCode ArtDMX (0x5000) - 2 bytes
    0x00, 0x0e, // Protocol version (14) - 2 bytes
    0x00, // Sequence - 1 byte
    0x00, // Physical - 1 byte
]);

logInfo('ArtNet raw UDP sender initialisiert. Ziel-IP: ' + ARTNET_HOST);

// DMX-Programme aus CSV laden
let dmxPrograms = {};

function loadDMXPrograms() {
    return new Promise((resolve, reject) => {
        const tempPrograms = {};
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptLoad = () => {
            fs.createReadStream(CSV_FILE)
                .on('error', (err) => {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        logError(`Fehler beim Öffnen der CSV-Datei (Versuch ${retryCount}/${maxRetries}):`, err);
                        setTimeout(attemptLoad, 1000 * retryCount); // Retry with increasing delay
                    } else {
                        logError('Maximale Anzahl von Versuchen erreicht. Konnte CSV-Datei nicht laden:', err);
                        reject(err);
                    }
                })
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
                    if (retryCount < maxRetries) {
                        retryCount++;
                        logError(`Fehler beim Einlesen der CSV-Datei (Versuch ${retryCount}/${maxRetries}):`, err);
                        setTimeout(attemptLoad, 1000 * retryCount);
                    } else {
                        logError('Maximale Anzahl von Versuchen erreicht. Konnte CSV-Datei nicht verarbeiten:', err);
                        reject(err);
                    }
                })
                .on('end', () => {
                    const programKeys = Object.keys(tempPrograms);
                    if (programKeys.length === 0) {
                        if (retryCount < maxRetries) {
                            retryCount++;
                            logError(`CSV-Datei enthält keine Programme (Versuch ${retryCount}/${maxRetries})`);
                            setTimeout(attemptLoad, 1000 * retryCount);
                        } else {
                            logError('Maximale Anzahl von Versuchen erreicht. CSV-Datei enthält keine Programme.');
                            reject(new Error('CSV-Datei enthält keine Programme'));
                        }
                    } else {
                        logInfo('CSV-Datei erfolgreich geladen. Programme:', programKeys.join(', '));
                        resolve(tempPrograms);
                    }
                });
        };
        
        attemptLoad();
    });
}

// Function to scale binary values to actual DMX values based on settings
function scaleDMXValues(binaryChannels, lightPowerSetting = null) {
    // If no specific lightPower provided, use the normal lightPower setting
    const lightPower = lightPowerSetting !== null ? lightPowerSetting : appSettings.lightPower;
    
    // Ensure lightPower is within valid DMX range (0-255)
    const normalizedPower = Math.max(0, Math.min(255, Math.round(lightPower)));
    
    // Scale binary values (0/1) to DMX values (0-255) based on lightPower setting
    return binaryChannels.map(state => state === 1 ? normalizedPower : 0);
}

/**
 * Utility function to scale any DMX channel values consistently
 * @param {Array} channels - Array of channel values
 * @param {number} targetPower - Target power level (0-255)
 * @param {boolean} preserveZeros - If true, zeros remain zeros
 * @returns {Array} - Scaled channel values
 */
function scaleDMXChannels(channels, targetPower, preserveZeros = true) {
    // Ensure target power is within valid DMX range (0-255)
    const normalizedPower = Math.max(0, Math.min(255, Math.round(targetPower)));
    
    return channels.map(value => {
        if (value === 0 && preserveZeros) {
            return 0; // Keep zeros as zeros if preserveZeros is true
        }
        
        if (normalizedPower === 0) {
            return 0; // Short-circuit if target power is 0
        }
        
        if (normalizedPower === 255) {
            return value; // No scaling needed if target power is maximum
        }
        
        // Scale the value proportionally
        return Math.round((value / 255) * normalizedPower);
    });
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
    
    return new Promise((resolve, reject) => {
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptSend = () => {
            // Attempt to send the packet
            socket.send(artnetPacket, 0, artnetPacket.length, ARTNET_PORT, ARTNET_HOST, (err) => {
                if (err) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        logError(`UDP send error (retry ${retryCount}/${maxRetries}):`, err);
                        setTimeout(attemptSend, 200 * retryCount); // Increasing backoff
                    } else {
                        logError('Max UDP send retries reached. Error:', err);
                        reject(err);
                    }
                } else {
                    if (retryCount > 0) {
                        logInfo(`ArtNet packet sent successfully after ${retryCount} retries`);
                    }
                    resolve();
                }
            });
        };
        
        attemptSend();
    });
}

// Function to set a DMX program directly with multiple sends for reliability
async function setDMXProgram(programKey, useScreensaverPower = false) {
    if (!dmxPrograms[programKey]) {
        logError(`Programm ${programKey.toUpperCase()} nicht gefunden`);
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
        
        logInfo(`Setze DMX-Programm ${programKey.toUpperCase()} direkt...`);
        
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
                logError(`Fehler beim Senden des ArtNet-Pakets (Versuch ${i+1}):`, err);
                // Continue with next retry
            }
        }
        
        // Store current state
        dmxPrograms.current = [...channels];
        
        logInfo(`DMX-Programm ${programKey.toUpperCase()} erfolgreich gesetzt.`);
        return true;
    } catch (error) {
        logError(`Fehler beim Setzen des DMX-Programms ${programKey.toUpperCase()}:`, error);
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
        logError(`Programm ${programKey.toUpperCase()} nicht gefunden`);
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
        
        logInfo(`Fade zu DMX-Programm ${programKey.toUpperCase()} über ${duration}ms...`);
        
        // Perform the fade
        await fadeDMX(currentChannels, targetChannels, duration);
        
        // Store new current state
        dmxPrograms.current = [...targetChannels];
        
        logInfo(`Fade zu DMX-Programm ${programKey.toUpperCase()} erfolgreich abgeschlossen.`);
        return true;
    } catch (error) {
        logError(`Fehler beim Faden zu DMX-Programm ${programKey.toUpperCase()}:`, error);
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
                
                // Validate request body
                if (!channels || !Array.isArray(channels)) {
                    logError('Invalid DMX direct request: missing or invalid channels array');
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid or missing channels array' 
                    });
                }
                
                // Log the request with minimal info - just log the count without channel samples
                // This reduces log verbosity for screensaver modes
                logInfo(`Direct DMX control: Setting ${channels.length} channels`);
                
                // Determine which light power setting to use if specified
                let lightPowerToUse = null;
                if (useScreensaverPower === true) {
                    lightPowerToUse = appSettings.screensaver.lightPower;
                }
                
                // Send multiple packets for reliability (similar to setDMXProgram)
                const retries = 3;
                const waitTime = 30; // ms
                
                let sendSuccess = false;
                
                for (let i = 0; i < retries; i++) {
                    try {
                        await sendArtNetDMX(channels);
                        
                        // Add a small delay between retries
                        if (i < retries - 1) {
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                        
                        sendSuccess = true;
                    } catch (err) {
                        logError(`Fehler beim Senden des ArtNet-Pakets (Direktmodus, Versuch ${i+1}):`, err);
                        // Continue with next retry
                    }
                }
                
                if (!sendSuccess) {
                    logError('All DMX direct packet send attempts failed');
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to send DMX packets after multiple attempts' 
                    });
                }
                
                // Store current state
                dmxPrograms.current = [...channels];
                
                // Skip this log message to reduce verbosity - it's redundant with the one above
                // logInfo(`DMX-Kanäle direkt gesetzt. Anzahl: ${channels.length}`);
                
                return res.json({ 
                    success: true, 
                    message: 'DMX channels set directly',
                    channelCount: channels.length
                });
            } catch (error) {
                logError('Error setting DMX channels directly:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error while setting DMX channels' 
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
                    logInfo(`Direkter Wechsel zu Programm ${toKey.toUpperCase()} erfolgreich.`);
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
                logError('Fehler beim Setzen des DMX-Programms:', error);
                res.status(500).json({ success: false, message: 'Interner Serverfehler beim Setzen des DMX-Programms' });
            }
        });

        // API-Endpunkt für sanfte Übergänge mit Fading
        app.post('/dmx/fade/:key', async (req, res) => {
            try {
                const programKey = req.params.key.toLowerCase();
                
                // Validate program key
                if (!dmxPrograms[programKey]) {
                    logError(`DMX fade request: Program ${programKey.toUpperCase()} not found`);
                    return res.status(404).json({ 
                        success: false, 
                        message: `Program ${programKey.toUpperCase()} not found` 
                    });
                }
                
                // Parse and validate parameters
                const duration = parseInt(req.query.duration, 10) || 1000;
                const useScreensaverPower = req.query.screensaver === 'true';
                
                logInfo(`Fade-Anfrage: Programm ${programKey.toUpperCase()}, Dauer: ${duration}ms, Screensaver-Modus: ${useScreensaverPower}`);
                
                // Execute the fade transition
                const success = await fadeToProgram(programKey, duration, useScreensaverPower);
                
                if (success) {
                    logInfo(`Fade zu Programm ${programKey.toUpperCase()} erfolgreich abgeschlossen.`);
                    return res.json({ 
                        success: true, 
                        message: `Fade transition to program ${programKey.toUpperCase()} completed successfully`,
                        program: programKey,
                        duration: duration
                    });
                } else {
                    logError(`Fehler beim Fade-Übergang zu Programm ${programKey.toUpperCase()}`);
                    return res.status(500).json({ 
                        success: false, 
                        message: `Error during fade transition to program ${programKey.toUpperCase()}`
                    });
                }
            } catch (error) {
                logError('Unhandled error in fade transition:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error during fade transition'
                });
            }
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
        
        // API endpoint for client-side logging
        app.post('/api/log', (req, res) => {
            try {
                const { level, message } = req.body;
                
                // Validate input
                if (!message || !level || !['debug', 'info', 'warn', 'error'].includes(level)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid log data. Required: level (debug|info|warn|error) and message'
                    });
                }
                
                // Log the message using the appropriate log level
                switch (level) {
                    case 'debug':
                        logDebug(message);
                        break;
                    case 'info':
                        logInfo(message);
                        break;
                    case 'warn':
                        logWarn(message);
                        break;
                    case 'error':
                        logError(message);
                        break;
                }
                
                // Also log directly to console for immediate visibility
                console.log(`[CLIENT] ${message}`);
                
                return res.json({
                    success: true,
                    message: 'Log message recorded'
                });
            } catch (error) {
                logError('Error in client logging endpoint:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing log request'
                });
            }
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
                    logInfo('Settings updated:', JSON.stringify({
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
                logError('Error updating settings:', error);
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
                    logInfo('Settings reset to defaults');
                    return res.json(DEFAULT_SETTINGS);
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to reset settings'
                    });
                }
            } catch (error) {
                logError('Error resetting settings:', error);
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
                logInfo(`Temporary settings applied: ${JSON.stringify(tempSettings.screensaver)}`);
            } catch (err) {
                logError('Error applying temporary settings:', err);
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
            logInfo(`Server läuft unter http://localhost:${PORT}`);
        });
        
        // Signal Handling
        function shutdown() {
            logInfo('DMX-Server wird beendet...');
            // Set all channels to 0 before closing
            const zeroChannels = Array(512).fill(0);
            sendArtNetDMX(zeroChannels)
                .then(() => {
                    logInfo('DMX-Kanäle auf 0 gesetzt.');
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
            logError('Uncaught Exception:', err);
            // PM2 wird den Prozess ggf. neu starten
        });

        process.on('unhandledRejection', (reason, promise) => {
            logError('Unhandled Rejection:', reason, 'Promise:', promise);
        });

        // Heartbeat: Alle 60 Sekunden den letzten Zustand erneut senden
        const heartbeatInterval = 30000; // 30 * 1000 ms (reduced from 60000)
        let heartbeatErrorCount = 0;
        
        const heartbeatTimer = setInterval(async () => {
            try {
                if (dmxPrograms.current) {
                    await sendArtNetDMX(dmxPrograms.current);
                    logInfo('Heartbeat: Letzten DMX-Wert erneut gesendet');
                    // Reset error count on success
                    heartbeatErrorCount = 0;
                } else {
                    logInfo('Heartbeat: Kein aktueller DMX-Zustand gefunden');
                }
            } catch (err) {
                heartbeatErrorCount++;
                logError(`Fehler im Heartbeat-Intervall (${heartbeatErrorCount}):`, err);
                
                // If we've had multiple failures, try resending more aggressively
                if (heartbeatErrorCount > 3) {
                    try {
                        // Try to resend the current state with multiple attempts
                        logInfo('Versuche DMX-Zustand wiederherzustellen...');
                        
                        // If we have a current state, resend it multiple times
                        if (dmxPrograms.current) {
                            for (let i = 0; i < 3; i++) {
                                await sendArtNetDMX(dmxPrograms.current);
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            logInfo('DMX-Zustand wiederhergestellt');
                        }
                        
                        heartbeatErrorCount = 0;
                    } catch (recoveryErr) {
                        logError('Fehler bei der Wiederherstellung des DMX-Zustands:', recoveryErr);
                    }
                }
            }
        }, heartbeatInterval);

        // Initial program - set all channels to 0
        await setDMXProgram('z');
        logInfo('Server initialisiert und bereit.');

    } catch (error) {
        logError('Fehler beim Starten des Servers:', error);
        process.exit(1);
    }
}

startServer(); 