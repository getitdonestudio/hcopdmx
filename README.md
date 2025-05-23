# HCOP DMX Controller

Eine Node.js-Anwendung zur Steuerung von DMX-Beleuchtung über das Art-Net-Protokoll, optimiert für den Einsatz auf Raspberry Pi-Geräten.

## Schnellnavigation

- [Funktionen](#funktionen)
- [Systemanforderungen](#systemanforderungen)
- [Installation auf Raspberry Pi](#installation-auf-raspberry-pi)
  - [Ein-Zeilen-Bootstrap-Installation](#ein-zeilen-bootstrap-installation-frisches-os)
  - [Manuelle Installation](#manuelle-installation)
- [Anwendung aktualisieren](#anwendung-aktualisieren)
- [Anwendung verwalten](#anwendung-verwalten)
  - [Systemd-Befehle](#systemd-befehle)
  - [Überwachung mit PM2](#überwachung-mit-pm2)
- [Konfiguration](#konfiguration)
  - [DMX-Programme](#dmx-programme-konfigurieren)
  - [Bildschirmschoner-Modi](#bildschirmschoner-modi)
  - [Protokollierung](#anwendungs-logs)
  - [DMX-Kanal-Skalierung](#dmx-kanal-skalierung)
  - [Geheime Einstellungen](#geheime-einstellungen-zugriff)
- [API-Endpunkte](#api-endpunkte)
- [Fehlerbehebung](#fehlerbehebung)
- [Entwicklung](#entwicklung)
  - [Arduino-Controller-Setup](#arduino-controller-setup)

## Funktionen

- Express-basierter Webserver mit mehrsprachiger Benutzeroberfläche
- DMX-Beleuchtungssteuerung über das Art-Net-Protokoll
- Konfigurierbare Beleuchtungsprogramme aus CSV-Dateien geladen
- Bildschirmschoner-Modi mit verschiedenen Animationsmustern
- DMX-Kanal-Skalierung für Energieverwaltung
- Heartbeat-Funktionalität für konsistenten Betrieb
- Umfassende Fehlerbehandlung mit Wiederholungsmechanismen
- Erweiterte Protokollierung mit Rotation
- Ressourcenüberwachung für Systemzustandskontrolle
- Systemd-Service für zuverlässigen Autostart und PM2 für Überwachung
- Schriftgrößenanpassung für Barrierefreiheit
- Modus-spezifische Tastaturnavigation
- Bildschirmschoner-Watchdog für automatische Wiederherstellung

## Systemanforderungen

- Raspberry Pi (3 oder neuer empfohlen), RevPi oder kompatibler Computer
- Raspberry Pi OS Lite (Bullseye oder neuer) oder Debian Bookworm
- Node.js 20.x oder neuer
- Art-Net-kompatible DMX-Controller/Schnittstelle
- Netzwerkverbindung zwischen Raspberry Pi und DMX-Schnittstelle

## Installation auf Raspberry Pi

### Ein-Zeilen-Bootstrap-Installation (frisches OS)

Für eine frische Installation von Raspberry Pi OS Lite oder RevPi mit Debian Bookworm verwenden Sie unser Bootstrap-Skript, um alles in einem Schritt einzurichten:

> **Hinweis für RevPi/Bookworm-Benutzer:** Sie müssen möglicherweise zuerst curl installieren:
> ```bash
> sudo apt-get update
> sudo apt-get install -y curl
> ```

Führen Sie dann das Bootstrap-Skript aus:

```bash
curl -sSL https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh | bash
```

Alternativ, wenn curl nicht verfügbar ist, können Sie wget verwenden (normalerweise vorinstalliert):

```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/bootstrap-raspi.sh
chmod +x bootstrap-raspi.sh
./bootstrap-raspi.sh
```

Das Skript installiert alle notwendigen Abhängigkeiten (Node.js, Git, PM2), richtet das Projekt ein und konfiguriert den Systemd-Service für automatischen Start beim Booten. Es startet auch PM2 für Überwachungszwecke, aber der eigentliche Autostart wird über Systemd verwaltet.

### Alternative Installation mit Setup-Skript

Wenn Git bereits installiert ist:

1. SSH zu Ihrem Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Installationsskript herunterladen
```bash
wget https://raw.githubusercontent.com/getitdonestudio/hcopdmx/main/setup-raspi.sh
```

3. Skript ausführbar machen
```bash
chmod +x setup-raspi.sh
```

4. Installationsskript ausführen
```bash
./setup-raspi.sh
```

5. Sie können auf die Anwendung unter `http://ihre-raspberry-pi-ip:3000` zugreifen.

### Manuelle Installation

Wenn Sie eine manuelle Installation bevorzugen:

1. Node.js installieren (Version 20.x oder höher)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Git und andere Abhängigkeiten installieren
```bash
sudo apt-get install -y git curl wget
```

3. Optional: PM2 für Überwachung installieren
```bash
sudo npm install -g pm2
```

4. Repository klonen
```bash
mkdir -p ~/hcopdmx
cd ~/hcopdmx
git clone https://github.com/getitdonestudio/hcopdmx.git .
```

5. Abhängigkeiten installieren
```bash
npm install
```

6. Anwendung konfigurieren
   - Bearbeiten Sie `server.js`, um die korrekte IP-Adresse für Ihr Art-Net-Gerät zu setzen
   - Ändern Sie `hcop_dmx-channel.csv`, wenn Sie die DMX-Programme anpassen möchten

7. Systemd-Service für automatischen Start einrichten
```bash
./setup-systemd.sh
```

## Anwendung aktualisieren

### Automatisches Update (empfohlen)

1. SSH zu Ihrem Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Update-Skript ausführen
```bash
~/hcopdmx/update-raspi.sh
```

Das Skript wird automatisch:
- Die neuesten Änderungen von GitHub abrufen
- Neue Abhängigkeiten installieren
- Die Anwendung neu starten

### Manuelles Update

1. SSH zu Ihrem Raspberry Pi
```bash
ssh pi@ihre-raspberry-pi-ip
```

2. Zum Anwendungsverzeichnis wechseln
```bash
cd ~/hcopdmx
```

3. Neueste Änderungen abrufen
```bash
git pull origin main
```

4. Neue Abhängigkeiten installieren
```bash
npm install
```

5. Anwendung neu starten
```bash
sudo systemctl restart dmx-server.service
```

## Anwendung verwalten

### Systemd-Befehle

Die Anwendung läuft als Systemd-Service für zuverlässigen Autostart. Hier sind nützliche Befehle:

- Service-Status prüfen: `sudo systemctl status dmx-server.service`
- Anwendungsprotokolle anzeigen: `sudo journalctl -u dmx-server.service -f`
- Anwendung neu starten: `sudo systemctl restart dmx-server.service`
- Anwendung stoppen: `sudo systemctl stop dmx-server.service`
- Anwendung starten: `sudo systemctl start dmx-server.service`
- Autostart aktivieren: `sudo systemctl enable dmx-server.service`
- Autostart deaktivieren: `sudo systemctl disable dmx-server.service`

### Überwachung mit PM2

Obwohl der Autostart über Systemd erfolgt, ist PM2 für Überwachungszwecke installiert:

- Status anzeigen: `pm2 status`
- Echtzeitüberwachung: `pm2 monit`
- Protokolle anzeigen: `pm2 logs dmxserver`

## Konfiguration

### Geheime Einstellungen-Zugriff

Die Anwendung bietet einen sicheren Weg, auf die Einstellungsseite zuzugreifen:

1. Klicken Sie 5-mal innerhalb von 3 Sekunden in die obere rechte Ecke des Bildschirms
2. Wenn Sie dazu aufgefordert werden, geben Sie das Passwort ein: `250628`

Diese versteckte Zugriffsmethode ist darauf ausgelegt, versehentliche Änderungen an der Systemkonfiguration zu verhindern und dennoch autorisierten Benutzern bei Bedarf Zugang zu den Einstellungen zu gewähren.

### Anwendungs-Logs

Die Anwendung verwendet ein eingebautes Protokollierungssystem mit folgenden Funktionen:

- Protokollstufen: `debug`, `info`, `warn`, `error`
- Protokolldatei-Rotation bei Überschreitung von 5MB
- Konfigurierbare Heartbeat-Protokollreduzierung
- Optionale Konsolenausgabe

#### Protokollierung konfigurieren

Bearbeiten Sie das `LOG_CONFIG`-Objekt in `server.js`, um das Protokollierungsverhalten anzupassen:

```javascript
const LOG_CONFIG = {
    level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    heartbeatInterval: 5, // Nur alle X Mal Heartbeat protokollieren
    maxFileSize: 5 * 1024 * 1024, // 5MB maximale Protokolldateigröße
    logFile: 'dmx-server.log',
    logToConsole: true
};
```

Sie können auch die `LOG_LEVEL`-Umgebungsvariable beim Start der Anwendung setzen:

```bash
LOG_LEVEL=debug node server.js
```

### DMX-Kanal-Skalierung

Die Anwendung unterstützt zwei Arten der DMX-Kanal-Skalierung:

1. **Binäre Skalierung** - Skaliert binäre (0/1) Werte aus der CSV-Datei zu tatsächlichen DMX-Werten (0-255) basierend auf der Lichtleistungseinstellung

2. **Erweiterte Skalierung** - Skaliert alle DMX-Kanalwerte einheitlich basierend auf einem Zielleistungsniveau mit Option zur Beibehaltung von Nullen

Diese Funktion ermöglicht präzise Kontrolle der Beleuchtungsintensität sowohl für normalen Betrieb als auch für Bildschirmschoner-Modi.

### DMX-Programme konfigurieren

DMX-Programme werden in der Datei `hcop_dmx-channel.csv` mit folgendem Format definiert:
- Jede Zeile repräsentiert ein Beleuchtungsprogramm
- Die erste Spalte ist der Programmschlüssel (die Kennung, die in API-Aufrufen verwendet wird)
- Jede weitere Spalte repräsentiert einen DMX-Kanalwert (0 oder 1)

Beispiel:
```
Key;Channel1;Channel2;Channel3;Channel4
a;0;0;1;1
b;0;1;1;0
c;1;1;0;0
```

Die binären Werte (0/1) werden automatisch auf die entsprechenden DMX-Werte (0-255) basierend auf der Lichtleistungseinstellung skaliert.

### Bildschirmschoner-Modi

Die Anwendung bietet mehrere Bildschirmschoner-Modi:

- **Dimmen zu An** - Erhellt Kanäle allmählich von null auf volle Helligkeit
- **Dimmen zu Aus** - Dimmt Kanäle allmählich von voller Helligkeit auf null
- **Zyklisch** - Durchläuft angegebene DMX-Programme mit Übergängen
- **Pulsierend** - Erzeugt einen Atmungseffekt durch Modulation der Kanalhelligkeit
- **Disco** - Ändert zufällig Farben für eine dynamische Lichtshow

Jeder Modus ist über die Einstellungsoberfläche konfigurierbar.

#### Bildschirmschoner-Wiederherstellungssystem

Die Anwendung enthält ein ausgeklügeltes Wiederherstellungssystem für Bildschirmschoner-Modi:

- **Watchdog-Timer** - Erkennt und erholt sich automatisch von hängenden Modi
- **Fehlerverfolgung** - Zählt Fehler und wechselt Modi bei zu vielen Fehlern
- **Ratenbegrenzung** - Verhindert Überlastung des DMX-Controllers mit zu vielen Befehlen
- **Zustandsaktualisierung** - Aktualisiert regelmäßig den Basiszustand, um veraltete Daten zu verhindern
- **Sanfter Fallback** - Fällt auf einfachere Modi zurück, wenn komplexe Modi fehlschlagen

### Benutzeroberflächen-Funktionen

- **Mehrsprachige Unterstützung** - Benutzeroberfläche verfügbar in Deutsch und Englisch
- **Tastaturnavigation** - Benutzerdefinierte Tastenbehandlung für effiziente Steuerung
  - Tasten A-P: Direkter Zugriff auf DMX-Programme
  - Taste Q: Alle Lichter an / Bildschirmschoner-Modus
  - Taste Z: Alle Lichter aus
  - Im Bildschirmschoner-Modus navigieren A-P-Tasten direkt zum entsprechenden Programm
- **Schriftgrößensteuerung** - Anpassbare Textgröße für Barrierefreiheit
- **Schnellsteuerung** - Ein-Klick-Zugriff auf häufig verwendete Funktionen
- **Responsives Design** - Passt sich verschiedenen Bildschirmgrößen an

### Fehlerwiederherstellung und Zuverlässigkeitsfunktionen

Die Anwendung enthält mehrere Zuverlässigkeitsfunktionen:

- **CSV-Ladewiederholung** - Versucht die CSV-Datei mehrmals mit zunehmenden Verzögerungen zu laden, wenn das anfängliche Laden fehlschlägt
- **DMX-Paketübertragungswiederholung** - Sendet jedes DMX-Paket mehrmals mit konfigurierbaren Wiederholungen
- **Einstellungssicherung** - Sichert automatisch Einstellungen und kann aus Sicherung wiederherstellen, wenn die Hauptdatei beschädigt wird
- **Heartbeat-Wiederherstellung** - Erkennt und erholt sich automatisch von Verbindungsproblemen durch erneutes Senden von DMX-Paketen

## API-Endpunkte

Die Anwendung bietet folgende API-Endpunkte:

- `POST /dmx/:key` - DMX-Programm aktivieren (ersetzen Sie `:key` durch die Programmkennung aus der CSV)
- `POST /dmx/fade/:key` - Zu einem DMX-Programm mit angegebener Dauer einblenden
- `POST /dmx/direct` - DMX-Kanalwerte direkt für erweiterte Steuerung setzen

## Fehlerbehebung

Für detaillierte Informationen zur Fehlerbehebung lesen Sie bitte die Datei [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Das System enthält zwei Diagnosetools zur Identifizierung und Behebung von Problemen:

### 1. Abhängigkeiten prüfen
```bash
node check-dependencies.js
```
Dieses Skript prüft, ob alle erforderlichen Node.js-Abhängigkeiten installiert sind und ob wichtige Dateien existieren.

### 2. DMX-Konnektivität prüfen
```bash
node check-dmx-connectivity.js
```
Dieses Skript testet die Netzwerkverbindung zum DMX-Controller, indem es versucht, eine TCP-Verbindung zum ArtNet-Port herzustellen. Es prüft auch Ihre lokalen Netzwerkschnittstellen und DNS-Auflösung.

Um eine andere DMX-IP zu verwenden:
```bash
DMX_IP=192.168.1.100 node check-dmx-connectivity.js
```

**Hinweis**: Einige der in der Fehlerbehebungsdatei erwähnten Tools wie `test-artnet.js`, `server-simple.js` und verschiedene Fix-Skripte sind möglicherweise nicht in der aktuellen Version des Repositories enthalten. Wenden Sie sich an die Entwickler, wenn Sie diese zusätzlichen Fehlerbehebungstools benötigen.

## Entwicklung

### Arduino-Controller-Setup

Das Projekt enthält einen Arduino-Sketch (`hcopButton.ino`) zum Erstellen einer physischen Steuerungsschnittstelle:

- Verwendet 4 Tasten verbunden mit Pins 3, 4, 5 und 6
- Steuert 4 Relais verbunden mit Pins 10, 11, 12 und 13
- Ordnet 16 mögliche Tastenkombinationen den Tastaturtasten A-P zu
- Sendet Tastendrücke an den Host-Computer, der den DMX-Server betreibt
- Enthält Debug-Modus für Diagnoseausgabe über den seriellen Monitor

Um den Arduino-Controller einzurichten:

1. Verbinden Sie Tasten mit Pins 3, 4, 5, 6 mit entsprechenden Pull-up-Widerständen
2. Verbinden Sie Relais mit Pins 10, 11, 12, 13
3. Laden Sie den `hcopButton.ino`-Sketch auf einen Arduino mit USB-Tastaturunterstützung hoch (z.B. Arduino Leonardo oder Pro Micro)
4. Verbinden Sie den Arduino mit demselben Computer, der den DMX-Server betreibt 