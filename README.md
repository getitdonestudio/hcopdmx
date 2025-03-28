# HCOP DMX Controller

Eine Node.js-Anwendung zur Steuerung von DMX-Beleuchtung über das Art-Net-Protokoll, optimiert für den Einsatz auf dem Raspberry Pi.

[English version below](#english)

## Funktionen

- Express-basierter Webserver mit mehrsprachiger Benutzeroberfläche
- DMX-Beleuchtungssteuerung über das Art-Net-Protokoll
- Konfigurierbare Beleuchtungsprogramme, die aus CSV-Dateien geladen werden
- Heartbeat-Funktionalität für konsistenten Betrieb
- Ressourcenüberwachung für die Systemzustandskontrolle
- Prozessmanagement über PM2 oder systemd für verbesserte Zuverlässigkeit

## Systemanforderungen

- Raspberry Pi (3 oder neuer empfohlen) oder kompatibler Computer
- Node.js 18.x oder neuer
- Art-Net-kompatibler DMX-Controller/Interface
- Netzwerkverbindung zwischen Raspberry Pi und DMX-Interface

## Installation auf dem Raspberry Pi

### Ein-Zeilen-Bootstrap-Installation (frisches OS)

Wenn Sie mit einer frischen Installation von Raspberry Pi OS Lite beginnen, können Sie unser Bootstrap-Skript verwenden, um alles in einem Schritt einzurichten:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

Nach Abschluss des Skripts müssen Sie den PM2-Startup-Befehl ausführen (der im Terminal angezeigt wird), um den automatischen Start beim Booten zu ermöglichen.

### Automatische Installation (Alternative)

Wenn Git bereits installiert ist:

1. SSH auf Ihren Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Installationsskript herunterladen
```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/setup-raspi.sh
```

3. Das Skript ausführbar machen
```bash
chmod +x setup-raspi.sh
```

4. Das Installationsskript ausführen
```bash
./setup-raspi.sh
```

5. Nach Ausführung des Skripts müssen Sie den PM2-Startup-Befehl ausführen (der im Terminal angezeigt wird), um den automatischen Start beim Booten zu ermöglichen.

6. Sie können auf die Anwendung unter `http://ihre-raspberry-pi-ip:3000` zugreifen.

### Manuelle Installation

Wenn Sie es vorziehen, manuell zu installieren:

1. Node.js installieren (Version 18.x oder höher)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. PM2 für das Prozessmanagement installieren
```bash
sudo npm install -g pm2
```

3. Das Repository klonen
```bash
mkdir -p /home/pi/hcopdmx
cd /home/pi/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

4. Abhängigkeiten installieren
```bash
npm install
```

5. Die Anwendung konfigurieren
   - Bearbeiten Sie `server.js`, um die richtige IP-Adresse für Ihr Art-Net-Gerät einzustellen
   - Modifizieren Sie `hcop_dmx-channel.csv`, wenn Sie die DMX-Programme anpassen möchten

6. Die Anwendung mit PM2 starten
```bash
pm2 start ecosystem.config.js
```

7. Die PM2-Konfiguration speichern, um sie über Neustarts hinweg beizubehalten
```bash
pm2 save
```

8. PM2 für den Systemstart konfigurieren
```bash
pm2 startup
# Führen Sie den angezeigten Befehl aus
```

## Aktualisieren der Anwendung

### Automatisches Update (Empfohlen)

1. SSH auf Ihren Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Das Update-Skript ausführen
```bash
/home/pi/hcopdmx/update-raspi.sh
```

Das Skript wird automatisch:
- Die neuesten Änderungen von GitHub abrufen
- Neue Abhängigkeiten installieren
- Die Anwendung mit PM2 neu starten

### Manuelles Update

1. SSH auf Ihren Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. In das Anwendungsverzeichnis wechseln
```bash
cd /home/pi/hcopdmx
```

3. Die neuesten Änderungen abrufen
```bash
git pull origin main
```

4. Neue Abhängigkeiten installieren
```bash
npm install
```

5. Die Anwendung neu starten
```bash
pm2 restart dmxserver
```

## Verwaltung der Anwendung

### PM2-Befehle

Die Anwendung läuft mit PM2 für zuverlässiges Prozessmanagement. Hier sind einige nützliche Befehle:

- Anwendungsstatus prüfen: `pm2 status`
- Anwendungsprotokolle anzeigen: `pm2 logs dmxserver`
- Anwendung in Echtzeit überwachen: `pm2 monit`
- Anwendung neu starten: `pm2 restart dmxserver`
- Anwendung stoppen: `pm2 stop dmxserver`
- Anwendung starten: `pm2 start dmxserver`

### Alternative: systemd-Service

Wenn Sie Probleme mit PM2 beim automatischen Start haben, können Sie alternativ einen systemd-Service einrichten:

1. Gehen Sie in das Fehlersuche-Verzeichnis
```bash
cd /home/pi/hcopdmx/troubleshooting
```

2. Führen Sie das systemd-Setup-Skript aus
```bash
./setup-systemd.sh
```

3. Führen Sie die angezeigten Befehle aus, um den Service zu installieren und zu aktivieren

### Konfiguration von DMX-Programmen

DMX-Programme werden in der Datei `hcop_dmx-channel.csv` mit folgendem Format definiert:
- Jede Zeile stellt ein Beleuchtungsprogramm dar
- Die erste Spalte ist der Programmschlüssel (der Identifikator, der in API-Aufrufen verwendet wird)
- Jede weitere Spalte stellt einen DMX-Kanalwert dar (0-255)

Beispiel:
```
Key;Channel1;Channel2;Channel3
a;255;0;0
b;0;255;0
c;0;0;255
```

### API-Endpunkte

Die Anwendung stellt folgende API-Endpunkte bereit:

- `POST /dmx/:key` - Ein DMX-Programm aktivieren (ersetzen Sie `:key` durch den Programmbezeichner aus der CSV)
- `GET /state` - Den aktuellen DMX-Status abrufen

### Web-Interface

Die Anwendung bietet eine Weboberfläche, die zugänglich ist unter:
- `http://ihre-raspberry-pi-ip:3000`

Die Oberfläche unterstützt mehrere Sprachen mit Seiten in den Verzeichnissen `/de/` (Deutsch) und `/en/` (Englisch).

## Fehlerbehebung

Falls Probleme auftreten, bietet das Repository verschiedene Diagnose-Tools im Verzeichnis `troubleshooting/`. Hier sind die wichtigsten:

### Typische Probleme

1. **Anwendung startet nicht**
   - PM2-Logs prüfen: `pm2 logs dmxserver`
   - Node.js-Version überprüfen: `node --version` (sollte 18.x oder neuer sein)
   - Berechtigungen des Anwendungsverzeichnisses prüfen: `ls -la /home/pi/hcopdmx`

2. **DMX funktioniert nicht**
   - IP-Adresskonfiguration in `server.js` überprüfen
   - Sicherstellen, dass Ihr DMX-Interface eingeschaltet und mit dem Netzwerk verbunden ist
   - Überprüfen, ob Ihr DMX-Interface das Art-Net-Protokoll unterstützt
   - Netzwerkkonnektivität prüfen: `ping ihre-dmx-interface-ip`

3. **Automatischer Start funktioniert nicht**
   - Benutzen Sie die Diagnose-Tools im `troubleshooting/`-Verzeichnis
   - Prüfen Sie die Berechtigungen mit `./troubleshooting/check-permissions.sh`
   - Versuchen Sie, PM2 zu reparieren mit `./troubleshooting/fix-pm2-advanced.sh`
   - Alternativ verwenden Sie den systemd-Service: `./troubleshooting/setup-systemd.sh`

### Erweiterte Diagnose-Tools

Im Verzeichnis `troubleshooting/` finden Sie mehrere nützliche Skripte:

- `check-dependencies.js` - Überprüft, ob alle erforderlichen Node.js-Abhängigkeiten installiert sind
- `check-dmx-connectivity.js` - Testet die Netzwerkverbindung zum DMX-Controller
- `test-artnet.js` - Sendet Testmuster, um die Art-Net-Kommunikation zu überprüfen
- `fix-pm2-advanced.sh` - Repariert PM2-Konfigurationsprobleme und überprüft Konflikte
- `setup-systemd.sh` - Richtet einen systemd-Service als Alternative zu PM2 ein

## Entwicklung

### Lokales Entwicklungs-Setup

Für die lokale Entwicklung ohne Raspberry Pi:
1. Klonen Sie das Repository auf Ihren Entwicklungsrechner
2. Installieren Sie die Abhängigkeiten: `npm install`
3. Starten Sie den lokalen Entwicklungsserver: `node server-local.js`
4. Zugriff auf die Anwendung unter `http://localhost:3000`

Der lokale Server bietet simulierte DMX-Funktionalität zum Testen.

### Verzeichnisstruktur

- `server.js` - Hauptanwendungsdatei
- `server-local.js` - Entwicklungsversion mit simuliertem DMX
- `hcop_dmx-channel.csv` - DMX-Programmdefinitionen
- `ecosystem.config.js` - PM2-Konfiguration
- `setup-raspi.sh` - Raspberry Pi-Einrichtungsskript
- `bootstrap-raspi.sh` - Ein-Zeilen-Bootstrap-Skript für frische Installationen
- `update-raspi.sh` - Raspberry Pi-Update-Skript
- `troubleshooting/` - Diagnose- und Fehlerbehebungswerkzeuge
- `public/` - Webschnittstellen-Dateien
  - `de/` - Deutsche Schnittstelle
  - `en/` - Englische Schnittstelle
  - `css/` - Stylesheets
  - `js/` - JavaScript-Dateien
  - `img/` - Bilder und Symbole

## Lizenz

ISC Lizenz

---

<a name="english"></a>
# HCOP DMX Controller (English)

A Node.js application to control DMX lighting via Art-Net protocol, optimized for Raspberry Pi deployment.

## Features

- Express-based web server with a multi-language interface
- DMX lighting control via Art-Net protocol
- Configurable lighting programs loaded from CSV files
- Heartbeat functionality to ensure consistent operation
- Resource monitoring for system health
- Process management via PM2 or systemd for improved reliability

## System Requirements

- Raspberry Pi (3 or newer recommended) or compatible computer
- Node.js 18.x or newer
- Art-Net compatible DMX controller/interface
- Network connection between Raspberry Pi and DMX interface

## Installation on Raspberry Pi

### One-line Bootstrap Installation (Fresh OS)

If you're starting with a fresh installation of Raspberry Pi OS Lite, you can use our bootstrap script to set up everything in one step:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

After the script completes, you'll need to run the PM2 startup command (which will be displayed in the terminal) to enable automatic startup on boot.

### Automatic Installation (Alternative)

If you already have git installed:

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Download the setup script
```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/setup-raspi.sh
```

3. Make the script executable
```bash
chmod +x setup-raspi.sh
```

4. Run the setup script
```bash
./setup-raspi.sh
```

5. After the script runs, you'll need to run the PM2 startup command (which will be displayed in the terminal) to enable automatic startup on boot.

6. Access the application at `http://your-raspberry-pi-ip:3000`

### Manual Installation

If you prefer to install manually:

1. Install Node.js (version 18.x or later)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install PM2 for process management
```bash
sudo npm install -g pm2
```

3. Clone the repository
```bash
mkdir -p /home/pi/hcopdmx
cd /home/pi/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

4. Install dependencies
```bash
npm install
```

5. Configure the application
   - Edit `server.js` to set the proper IP address for your Art-Net device
   - Modify `hcop_dmx-channel.csv` if you want to adjust the DMX programs

6. Start the application with PM2
```bash
pm2 start ecosystem.config.js
```

7. Save the PM2 configuration to persist across reboots
```bash
pm2 save
```

8. Configure PM2 to start on system boot
```bash
pm2 startup
# Run the command that is displayed
```

## Updating the Application

### Automatic Update (Recommended)

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Run the update script
```bash
/home/pi/hcopdmx/update-raspi.sh
```

The script will automatically:
- Pull the latest changes from GitHub
- Install any new dependencies
- Restart the application with PM2

### Manual Update

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Navigate to the application directory
```bash
cd /home/pi/hcopdmx
```

3. Pull the latest changes
```bash
git pull origin main
```

4. Install any new dependencies
```bash
npm install
```

5. Restart the application
```bash
pm2 restart dmxserver
```

## Managing the Application

### PM2 Commands

The application runs using PM2 for reliable process management. Here are some useful commands:

- Check application status: `pm2 status`
- View application logs: `pm2 logs dmxserver`
- Monitor application in real-time: `pm2 monit`
- Restart application: `pm2 restart dmxserver`
- Stop application: `pm2 stop dmxserver`
- Start application: `pm2 start dmxserver`

### Alternative: systemd Service

If you're having issues with PM2 autostart, you can alternatively set up a systemd service:

1. Go to the troubleshooting directory
```bash
cd /home/pi/hcopdmx/troubleshooting
```

2. Run the systemd setup script
```bash
./setup-systemd.sh
```

3. Follow the displayed commands to install and enable the service

### Configuring DMX Programs

DMX programs are defined in the `hcop_dmx-channel.csv` file with the following format:
- Each row represents a lighting program
- The first column is the program key (the identifier used in API calls)
- Each additional column represents a DMX channel value (0-255)

Example:
```
Key;Channel1;Channel2;Channel3
a;255;0;0
b;0;255;0
c;0;0;255
```

### API Endpoints

The application provides the following API endpoints:

- `POST /dmx/:key` - Activate a DMX program (replace `:key` with the program identifier from the CSV)
- `GET /state` - Get the current DMX state

### Web Interface

The application provides a web interface accessible at:
- `http://your-raspberry-pi-ip:3000`

The interface supports multiple languages with pages in `/de/` (German) and `/en/` (English) directories.

## Troubleshooting

If issues arise, the repository provides various diagnostic tools in the `troubleshooting/` directory. Here are the most important ones:

### Common Issues

1. **Application Not Starting**
   - Check PM2 logs: `pm2 logs dmxserver`
   - Check Node.js version: `node --version` (should be 18.x or newer)
   - Check application directory permissions: `ls -la /home/pi/hcopdmx`

2. **DMX Not Working**
   - Check the IP address configuration in `server.js`
   - Ensure your DMX interface is powered on and connected to the network
   - Verify your DMX interface supports Art-Net protocol
   - Check network connectivity: `ping your-dmx-interface-ip`

3. **Autostart Not Working**
   - Use the diagnostic tools in the `troubleshooting/` directory
   - Check permissions with `./troubleshooting/check-permissions.sh`
   - Try fixing PM2 with `./troubleshooting/fix-pm2-advanced.sh`
   - Alternatively, use the systemd service: `./troubleshooting/setup-systemd.sh`

### Advanced Diagnostic Tools

In the `troubleshooting/` directory, you'll find several useful scripts:

- `check-dependencies.js` - Verifies all required Node.js dependencies are installed
- `check-dmx-connectivity.js` - Tests network connectivity to the DMX controller
- `test-artnet.js` - Sends test patterns to verify Art-Net communication
- `fix-pm2-advanced.sh` - Fixes PM2 configuration issues and checks for conflicts
- `setup-systemd.sh` - Sets up a systemd service as an alternative to PM2

## Development

### Local Development Setup

For local development without a Raspberry Pi:
1. Clone the repository to your development machine
2. Install dependencies: `npm install`
3. Run the local development server: `node server-local.js`
4. Access the application at `http://localhost:3000`

The local server provides simulated DMX functionality for testing.

### Directory Structure

- `server.js` - Main application file
- `server-local.js` - Development version with simulated DMX
- `hcop_dmx-channel.csv` - DMX program definitions
- `ecosystem.config.js` - PM2 configuration
- `setup-raspi.sh` - Raspberry Pi setup script
- `bootstrap-raspi.sh` - One-line bootstrap script for fresh installations
- `update-raspi.sh` - Raspberry Pi update script
- `troubleshooting/` - Diagnostic and troubleshooting tools
- `public/` - Web interface files
  - `de/` - German interface
  - `en/` - English interface
  - `css/` - Stylesheets
  - `js/` - JavaScript files
  - `img/` - Images and icons

## License

ISC License 