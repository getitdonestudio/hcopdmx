'use strict';
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const dmxlib = require('dmxnet');
const os = require('os');

// Hilfsfunktionen für Logs mit Zeitstempel
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

// Use environment variable for IP or default to localhost for testing
const DMX_IP = process.env.DMX_IP || '127.0.0.1';

// DMXNet-Konfiguration
const dmxnet = new dmxlib.dmxnet({
    verbose: 2, // Bei Bedarf anpassen (0 = keine Logs, 2 = sehr ausführlich)
    oem: 0x1234,
    shortname: "DMXNode",
    longname: "DMX Controller Node",
    port: 6454,
    refreshRate: 40
});

const sender = dmxnet.newSender({
    ip: DMX_IP,
    subnet: 0,
    universe: 1,
    net: 0,
});

logWithTimestamp(`ArtNet-Sender gestartet. Ziel-IP: ${DMX_IP}`);

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
                const channels = Object.values(row)
                    .slice(1)
                    .map(value => parseInt(value, 10) || 0);
                if (key) {
                    tempPrograms[key] = channels;
                }
            })
            .on('error', (err) => {
                errorWithTimestamp('Fehler beim Einlesen der CSV-Datei:', err);
                reject(err);
            })
            .on('end', () => {
                logWithTimestamp('CSV-Datei erfolgreich geladen:', tempPrograms);
                resolve(tempPrograms);
            });
    });
}

// Funktion zum Senden des aktuellen DMX-States mit Wiederholungsversuchen bei Netzwerkfehlern
async function sendDMXState(channels, retries = 3) {
    for (let i = 0; i < channels.length; i++) {
        try {
            sender.setChannel(i, channels[i]);
        } catch (err) {
            errorWithTimestamp(`Fehler beim Setzen des Kanals ${i}:`, err);
        }
    }

    // Transmit mit Retry
    let attempt = 0;
    while (attempt <= retries) {
        try {
            sender.transmit();
            if (attempt > 0) {
                logWithTimestamp(`DMX-Daten nach ${attempt} Wiederholungsversuch(en) erfolgreich gesendet.`);
            }
            break; // Erfolg, Schleife beenden
        } catch (err) {
            errorWithTimestamp(`Fehler beim Übertragen der DMX-Daten (Versuch ${attempt + 1}):`, err);
            // Wenn es sich um ein Netzwerk-Problem handelt, erneut versuchen
            if (err.code === 'ENETUNREACH' && attempt < retries) {
                errorWithTimestamp('Netzwerkproblem erkannt. Warte 5 Sekunden vor erneutem Versuch...');
                await new Promise(res => setTimeout(res, 5000));
            } else {
                // Bei anderen Fehlern oder nach Erschöpfung der Versuche abbrechen
                break;
            }
        }
        attempt++;
    }
}

async function startServer() {
    try {
        dmxPrograms = await loadDMXPrograms();

        const app = express();

        // Fehler-Event-Listener für den Sender
        if (typeof sender.on === 'function') {
            sender.on('error', (err) => {
                errorWithTimestamp('Sender-Fehler aufgetreten:', err);
            });
        }

        // API-Endpunkt: DMX-Programm senden
        app.post('/dmx/:key', async (req, res) => {
            const key = req.params.key.toLowerCase();

            if (dmxPrograms[key]) {
                const currentState = dmxPrograms[key];
                dmxPrograms.current = currentState;

                // Kanäle sequentiell aktualisieren mit setTimeout, dann senden
                // Hier beibehalten, aber nach dem Setzen transmit via sendDMXState
                const setChannelsSequentially = async (channels, index = 0) => {
                    if (index < channels.length) {
                        try {
                            sender.setChannel(index, channels[index]);
                            await new Promise(resolve => setTimeout(resolve, 5));
                            return setChannelsSequentially(channels, index + 1);
                        } catch (err) {
                            errorWithTimestamp(`Fehler beim Setzen des Kanals ${index}:`, err);
                            await new Promise(resolve => setTimeout(resolve, 5));
                            return setChannelsSequentially(channels, index + 1);
                        }
                    }
                };

                await setChannelsSequentially(currentState);
                await sendDMXState(currentState, 3);
                logWithTimestamp(`Programm ${key.toUpperCase()} gesendet:`, currentState);
                res.json({ success: true, message: `Programm ${key.toUpperCase()} gesendet` });
            } else {
                return res.status(404).json({ success: false, message: `Programm ${key.toUpperCase()} nicht gefunden` });
            }
        });

        // API-Endpunkt: Aktueller Zustand
        app.get('/state', (req, res) => {
            const currentState = dmxPrograms?.current || Array(512).fill(0);
            res.json({ success: true, channels: currentState });
        });
        
        // Redirect von / zu /de/0000.html
        app.get('/', (req, res) => {
        res.redirect('/de/0000.html');
        });


        // Statische Dateien (Frontend)
        app.use(express.static('public', {
            maxAge: '100d' // Dateien werden 100 Tag im Cache gehalten
          }));
        const server = app.listen(PORT, '0.0.0.0', () => {
            logWithTimestamp(`Server läuft unter http://${os.hostname()}:${PORT}`);
            logWithTimestamp(`Aktuelle IP-Adresse: ${getLocalIpAddress()}`);
        });
        

        // Signal Handling
        function shutdown() {
            logWithTimestamp('Sender wird gestoppt...');
            try {
                sender.stop();
            } catch (err) {
                errorWithTimestamp('Fehler beim Stoppen des Senders:', err);
            }
            logWithTimestamp('DMXNet beendet.');
            process.exit(0);
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

        // Heartbeat: Alle 360 Sekunden den letzten Zustand erneut senden (mit Retry)
        const heartbeatInterval = 360000; // 360 * 1000 ms
        setInterval(async () => {
            try {
                const currentState = dmxPrograms.current || Array(512).fill(0);
                await sendDMXState(currentState, 3);
                logWithTimestamp('Heartbeat: Letzten DMX-Wert erneut gesendet');
            } catch (err) {
                errorWithTimestamp('Allgemeiner Fehler im Heartbeat-Intervall:', err);
            }
        }, heartbeatInterval);

        // Ressourcen-Check (alle 300 Sekunden)
        // Loggt CPU-Last und freien Speicher
        const resourceCheckInterval = 300000; // 300 * 1000 ms (alle 5 Min)
        setInterval(() => {
            const load = os.loadavg(); // [1min, 5min, 15min]
            const freeMem = os.freemem();
            const totalMem = os.totalmem();
            const freeMemMB = Math.round(freeMem / 1024 / 1024);
            const totalMemMB = Math.round(totalMem / 1024 / 1024);
            logWithTimestamp(
                `Ressourcen-Check: Load: ${load.map(l => l.toFixed(2)).join(', ')} | ` +
                `Speicher: ${freeMemMB}MB frei von ${totalMemMB}MB`
            );
        }, resourceCheckInterval);

    } catch (error) {
        errorWithTimestamp('Fehler beim Starten des Servers:', error);
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