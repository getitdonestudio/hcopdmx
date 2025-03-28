# HCOP DMX Controller

Eine Node.js-Anwendung zur Steuerung von DMX-Beleuchtung über das Art-Net-Protokoll, optimiert für den Einsatz auf dem Raspberry Pi.

[English version below](#english)

## Funktionen

- Express-basierter Webserver mit mehrsprachiger Benutzeroberfläche
- DMX-Beleuchtungssteuerung über das Art-Net-Protokoll
- Konfigurierbare Beleuchtungsprogramme, die aus CSV-Dateien geladen werden
- Heartbeat-Funktionalität für konsistenten Betrieb
- Ressourcenüberwachung für die Systemzustandskontrolle
- Systemd-Service für zuverlässigen Autostart und PM2 für Monitoring

## Systemanforderungen

- Raspberry Pi (3 oder neuer empfohlen) oder kompatibler Computer
- Raspberry Pi OS Lite (Bullseye oder neuer empfohlen)
- Node.js 18.x oder neuer
- Art-Net-kompatibler DMX-Controller/Interface
- Netzwerkverbindung zwischen Raspberry Pi und DMX-Interface

## Installation auf dem Raspberry Pi

### Ein-Zeilen-Bootstrap-Installation (frisches OS)

Bei einer frischen Installation von Raspberry Pi OS Lite verwenden Sie unser Bootstrap-Skript, um alles in einem Schritt zu installieren:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

Das Skript installiert alle nötigen Abhängigkeiten (Node.js, Git, PM2), richtet das Projekt ein und konfiguriert den systemd-Service für automatischen Start beim Booten. Es startet außerdem PM2 für Monitoring-Zwecke, aber der eigentliche Autostart wird über systemd verwaltet.

### Alternative Installation mit Setup-Skript

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

5. Sie können auf die Anwendung unter `http://ihre-raspberry-pi-ip:3000` zugreifen.

### Manuelle Installation

Wenn Sie es vorziehen, manuell zu installieren:

1. Node.js installieren (Version 18.x oder höher)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Git und weitere Abhängigkeiten installieren
```bash
sudo apt-get install -y git curl wget
```

3. Optional: PM2 für Monitoring installieren
```bash
sudo npm install -g pm2
```

4. Das Repository klonen
```bash
mkdir -p ~/hcopdmx
cd ~/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

5. Abhängigkeiten installieren
```bash
npm install
```

6. Die Anwendung konfigurieren
   - Bearbeiten Sie `server.js`, um die richtige IP-Adresse für Ihr Art-Net-Gerät einzustellen
   - Modifizieren Sie `hcop_dmx-channel.csv`, wenn Sie die DMX-Programme anpassen möchten

7. Systemd-Service für automatischen Start einrichten
```bash
./setup-systemd.sh
```

## Aktualisieren der Anwendung

### Automatisches Update (Empfohlen)

1. SSH auf Ihren Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Das Update-Skript ausführen
```bash
~/hcopdmx/update-raspi.sh
```

Das Skript wird automatisch:
- Die neuesten Änderungen von GitHub abrufen
- Neue Abhängigkeiten installieren
- Die Anwendung neustarten

### Manuelles Update

1. SSH auf Ihren Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. In das Anwendungsverzeichnis wechseln
```bash
cd ~/hcopdmx
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
sudo systemctl restart dmx-server.service
```

## Verwaltung der Anwendung

### Systemd-Befehle

Die Anwendung läuft als systemd-Service für zuverlässigen Autostart. Hier sind nützliche Befehle:

- Service-Status prüfen: `sudo systemctl status dmx-server.service`
- Anwendungsprotokolle anzeigen: `sudo journalctl -u dmx-server.service -f`
- Anwendung neu starten: `sudo systemctl restart dmx-server.service`
- Anwendung stoppen: `sudo systemctl stop dmx-server.service`
- Anwendung starten: `sudo systemctl start dmx-server.service`
- Autostart aktivieren: `sudo systemctl enable dmx-server.service`
- Autostart deaktivieren: `sudo systemctl disable dmx-server.service`

### Monitoring mit PM2

Obwohl der Autostart über systemd erfolgt, ist PM2 für Monitoring-Zwecke installiert:

- Status anzeigen: `pm2 status`
- Echtzeit-Monitoring: `pm2 monit`
- Logs anzeigen: `pm2 logs dmxserver`

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

### Häufige Probleme und Lösungen

1. **Die Anwendung startet nicht nach der Installation**
   - Systemd-Status überprüfen: `sudo systemctl status dmx-server.service`
   - Logs anzeigen: `sudo journalctl -u dmx-server.service -f`
   - Node.js-Version überprüfen: `node --version` (sollte 18.x oder neuer sein)
   - Berechtigungen des Anwendungsverzeichnisses prüfen: `ls -la ~/hcopdmx`
   - Sicherstellen, dass server.js ausführbar ist: `chmod +x ~/hcopdmx/server.js`

2. **Fehler: "Port already in use" (Port bereits in Benutzung)**
   - Prüfen, ob mehrere Instanzen der Anwendung laufen: `ps aux | grep node`
   - Falls PM2 die Anwendung auch startet: `pm2 stop dmxserver && pm2 delete dmxserver && pm2 save`
   - Systemd-Service neu starten: `sudo systemctl restart dmx-server.service`

3. **DMX funktioniert nicht**
   - IP-Adresskonfiguration in `server.js` überprüfen
   - Sicherstellen, dass Ihr DMX-Interface eingeschaltet und mit dem Netzwerk verbunden ist
   - Netzwerkkonnektivität prüfen: `ping ihre-dmx-interface-ip`
   - Firewall-Einstellungen prüfen: `sudo iptables -L`
   - Art-Net verwendet üblicherweise UDP Port 6454: `sudo lsof -i UDP:6454`

4. **Raspberry Pi startet die Anwendung nicht automatisch**
   - Systemd-Service-Status prüfen: `sudo systemctl status dmx-server.service`
   - Autostart aktivieren, falls nicht aktiviert: `sudo systemctl enable dmx-server.service`
   - Systemd-Logs überprüfen: `sudo journalctl -u dmx-server.service`
   - Service neu installieren: `./setup-systemd.sh`

5. **Node.js Fehler und Abstürze**
   - Node.js Version überprüfen: `node --version`
   - Speichernutzung überprüfen: `free -m`
   - CPU-Auslastung überprüfen: `htop` (installieren mit `sudo apt install htop`)
   - Node.js Abstürze in den Logs suchen: `sudo journalctl -u dmx-server.service | grep -i error`

### Raspberry Pi Systemdiagnose

1. **Überprüfen der Systemressourcen**
   - CPU- und Speicherauslastung: `htop`
   - Festplattenspeicher: `df -h`
   - Temperatur: `vcgencmd measure_temp`
   - Übertaktung und Spannungsdrosselung: `vcgencmd get_throttled`

2. **Netzwerkprobleme**
   - IP-Konfiguration anzeigen: `ip addr show`
   - Netzwerkverbindungen testen: `ping 8.8.8.8`
   - DNS-Auflösung testen: `nslookup google.com`
   - Aktive Netzwerkverbindungen: `ss -tuln`

3. **Systemlogs**
   - Kernellogs: `dmesg | tail`
   - Systemlogs: `sudo journalctl -xe`
   - Bootvorgänge: `sudo journalctl -b`

### Wiederherstellungsmaßnahmen

1. **Neuinstallation der Anwendung**
   ```bash
   cd ~
   mv hcopdmx hcopdmx.bak
   curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
   ```

2. **Node.js neu installieren**
   ```bash
   sudo apt-get remove nodejs -y
   sudo apt-get autoremove -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version
   ```

3. **Service-Reset**
   ```bash
   sudo systemctl stop dmx-server.service
   sudo systemctl disable dmx-server.service
   sudo rm /etc/systemd/system/dmx-server.service
   sudo systemctl daemon-reload
   cd ~/hcopdmx
   ./setup-systemd.sh
   ```

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
- `setup-systemd.sh` - Script zur Einrichtung des systemd-Services
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
- Systemd service for reliable autostart and PM2 for monitoring

## System Requirements

- Raspberry Pi (3 or newer recommended) or compatible computer
- Raspberry Pi OS Lite (Bullseye or newer recommended)
- Node.js 18.x or newer
- Art-Net compatible DMX controller/interface
- Network connection between Raspberry Pi and DMX interface

## Installation on Raspberry Pi

### One-line Bootstrap Installation (Fresh OS)

If you're starting with a fresh installation of Raspberry Pi OS Lite, you can use our bootstrap script to set up everything in one step:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

The script installs all necessary dependencies (Node.js, Git, PM2), sets up the project, and configures the systemd service for automatic startup on boot. It also starts PM2 for monitoring purposes, but the actual autostart is managed through systemd.

### Alternative Installation with Setup Script

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

5. Access the application at `http://your-raspberry-pi-ip:3000`

### Manual Installation

If you prefer to install manually:

1. Install Node.js (version 18.x or later)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install Git and other dependencies
```bash
sudo apt-get install -y git curl wget
```

3. Optional: Install PM2 for monitoring
```bash
sudo npm install -g pm2
```

4. Clone the repository
```bash
mkdir -p ~/hcopdmx
cd ~/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

5. Install dependencies
```bash
npm install
```

6. Configure the application
   - Edit `server.js` to set the proper IP address for your Art-Net device
   - Modify `hcop_dmx-channel.csv` if you want to adjust the DMX programs

7. Set up the systemd service for autostart
```bash
./setup-systemd.sh
```

## Updating the Application

### Automatic Update (Recommended)

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Run the update script
```bash
~/hcopdmx/update-raspi.sh
```

The script will automatically:
- Pull the latest changes from GitHub
- Install any new dependencies
- Restart the application

### Manual Update

1. SSH into your Raspberry Pi
```bash
ssh pi@your-raspberry-pi-ip
```

2. Navigate to the application directory
```bash
cd ~/hcopdmx
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
sudo systemctl restart dmx-server.service
```

## Managing the Application

### Systemd Commands

The application runs as a systemd service for reliable autostart. Here are useful commands:

- Check service status: `sudo systemctl status dmx-server.service`
- View application logs: `sudo journalctl -u dmx-server.service -f`
- Restart application: `sudo systemctl restart dmx-server.service`
- Stop application: `sudo systemctl stop dmx-server.service`
- Start application: `sudo systemctl start dmx-server.service`
- Enable autostart: `sudo systemctl enable dmx-server.service`
- Disable autostart: `sudo systemctl disable dmx-server.service`

### Monitoring with PM2

While autostart is handled by systemd, PM2 is installed for monitoring purposes:

- Check status: `pm2 status`
- Real-time monitoring: `pm2 monit`
- View logs: `pm2 logs dmxserver`

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

### Common Issues and Solutions

1. **Application Not Starting After Installation**
   - Check systemd status: `sudo systemctl status dmx-server.service`
   - View logs: `sudo journalctl -u dmx-server.service -f`
   - Check Node.js version: `node --version` (should be 18.x or newer)
   - Check application directory permissions: `ls -la ~/hcopdmx`
   - Ensure server.js is executable: `chmod +x ~/hcopdmx/server.js`

2. **Error: "Port already in use"**
   - Check if multiple instances are running: `ps aux | grep node`
   - If PM2 is also starting the app: `pm2 stop dmxserver && pm2 delete dmxserver && pm2 save`
   - Restart systemd service: `sudo systemctl restart dmx-server.service`

3. **DMX Not Working**
   - Check the IP address configuration in `server.js`
   - Ensure your DMX interface is powered on and connected to the network
   - Check network connectivity: `ping your-dmx-interface-ip`
   - Check firewall settings: `sudo iptables -L`
   - Art-Net typically uses UDP port 6454: `sudo lsof -i UDP:6454`

4. **Raspberry Pi Not Auto-starting the Application**
   - Check systemd service status: `sudo systemctl status dmx-server.service`
   - Enable autostart if not enabled: `sudo systemctl enable dmx-server.service`
   - Check systemd logs: `sudo journalctl -u dmx-server.service`
   - Reinstall the service: `./setup-systemd.sh`

5. **Node.js Errors and Crashes**
   - Check Node.js version: `node --version`
   - Check memory usage: `free -m`
   - Check CPU usage: `htop` (install with `sudo apt install htop`)
   - Look for Node.js crashes in logs: `sudo journalctl -u dmx-server.service | grep -i error`

### Raspberry Pi System Diagnostics

1. **Checking System Resources**
   - CPU and memory usage: `htop`
   - Disk space: `df -h`
   - Temperature: `vcgencmd measure_temp`
   - Throttling and undervoltage: `vcgencmd get_throttled`

2. **Network Issues**
   - Display IP configuration: `ip addr show`
   - Test network connectivity: `ping 8.8.8.8`
   - Test DNS resolution: `nslookup google.com`
   - Active network connections: `ss -tuln`

3. **System Logs**
   - Kernel logs: `dmesg | tail`
   - System logs: `sudo journalctl -xe`
   - Boot processes: `sudo journalctl -b`

### Recovery Measures

1. **Reinstalling the Application**
   ```bash
   cd ~
   mv hcopdmx hcopdmx.bak
   curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
   ```

2. **Reinstalling Node.js**
   ```bash
   sudo apt-get remove nodejs -y
   sudo apt-get autoremove -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version
   ```

3. **Service Reset**
   ```bash
   sudo systemctl stop dmx-server.service
   sudo systemctl disable dmx-server.service
   sudo rm /etc/systemd/system/dmx-server.service
   sudo systemctl daemon-reload
   cd ~/hcopdmx
   ./setup-systemd.sh
   ```

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
- `setup-systemd.sh` - Script to set up the systemd service
- `public/` - Web interface files
  - `de/` - German interface
  - `en/` - English interface
  - `css/` - Stylesheets
  - `js/` - JavaScript files
  - `img/` - Images and icons

## License

ISC License 