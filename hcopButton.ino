#include <Keyboard.h> // Bibliothek für die Tastatureingabe

// Pins für die Taster
const int buttonPins[4] = {3, 4, 5, 6};
// Pins für die Relais
const int relayPins[4] = {10, 11, 12, 13};

// Variablen, um den aktuellen Zustand zu speichern
int buttonState[4] = {0, 0, 0, 0};
int lastButtonState[4] = {1, 1, 1, 1}; // Anfangszustand HIGH wegen INPUT_PULLUP
int currentState = 0;                  // Der gespeicherte Zustand als binäre Zahl
int lastState = -1;                    // Letzter Zustand, um Änderungen zu verfolgen

// Debugging-Variablen
boolean debugMode = false;              // Debug-Modus aktivieren
unsigned long lastButtonTimes[4] = {0, 0, 0, 0}; // Zeitstempel der letzten Betätigung
int buttonPressCount[4] = {0, 0, 0, 0}; // Zähler für Betätigungen
unsigned long entprellZeit = 200;       // Entprellungszeit in ms

// Zeichen für die Tastatureingabe (Index entspricht binärer Zahl)
char keyMap[16] = {
    'a',  // 0000
    'b',  // 0001
    'c',  // 0010
    'd',  // 0011
    'e',  // 0100
    'f',  // 0101
    'g',  // 0110
    'h',  // 0111
    'i',  // 1000
    'j',  // 1001
    'k',  // 1010
    'l',  // 1011
    'm',  // 1100
    'n',  // 1101
    'o',  // 1110
    'p'   // 1111
};

void setup() {
  // Taster-Pins als Eingänge mit Pull-Up-Widerstand konfigurieren
  for (int i = 0; i < 4; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  // Relais-Pins als Ausgänge konfigurieren
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], LOW); // Relais inaktiv (aktive HIGH-Logik)
  }

  // Starte die Keyboard-Funktion
  Keyboard.begin();

  // Serielle Kommunikation starten
  Serial.begin(9600);
  
  if (debugMode) {
    Serial.println("==================================================");
    Serial.println("DIAGNOSTISCHER MODUS AKTIVIERT");
    Serial.println("==================================================");
    Serial.println("Pin-Konfiguration:");
    for (int i = 0; i < 4; i++) {
      Serial.print("Button ");
      Serial.print(i + 1);
      Serial.print(" auf Pin ");
      Serial.print(buttonPins[i]);
      Serial.print(", Relais auf Pin ");
      Serial.println(relayPins[i]);
    }
    Serial.println("==================================================");
  }
}

void loop() {
  unsigned long aktuelleZeit = millis();
  
  // Taster-Zustände auslesen
  for (int i = 0; i < 4; i++) {
    int vorherigenZustand = buttonState[i];
    buttonState[i] = digitalRead(buttonPins[i]);
    
    // Zustandsänderungen im Debug-Modus verfolgen
    if (debugMode && vorherigenZustand != buttonState[i]) {
      Serial.print("DEBUG: Button ");
      Serial.print(i + 1);
      Serial.print(" (Pin ");
      Serial.print(buttonPins[i]);
      Serial.print(") änderte Zustand zu ");
      Serial.print(buttonState[i] == LOW ? "GEDRÜCKT" : "LOSGELASSEN");
      Serial.print(" um ");
      Serial.print(aktuelleZeit);
      Serial.println("ms");
    }

    // Toggle-Logik: Zustand ändern, wenn der Taster von HIGH auf LOW geht
    if (buttonState[i] == LOW && lastButtonState[i] == HIGH) {
      // Berechnen der Zeit seit der letzten Betätigung
      unsigned long zeitSeitLetztemDruck = aktuelleZeit - lastButtonTimes[i];
      lastButtonTimes[i] = aktuelleZeit;
      buttonPressCount[i]++;
      
      if (debugMode) {
        Serial.print("DEBUG: Button ");
        Serial.print(i + 1);
        Serial.print(" gedrückt! Zeit seit letztem Druck: ");
        Serial.print(zeitSeitLetztemDruck);
        Serial.print("ms | Anzahl Betätigungen: ");
        Serial.println(buttonPressCount[i]);
      }
      
      // Entprellungsverzögerung
      delay(entprellZeit);
      
      // Zustand umschalten
      currentState ^= (1 << i);

      // Zu sendendes Zeichen bestimmen
      char keyToSend = keyMap[currentState];

      // Zeichen senden
      Keyboard.print(keyToSend);

      // Binären Zustand und Tasteneingabe ausgeben
      Serial.print("Binär: ");
      for (int j = 3; j >= 0; j--) {
        Serial.print((currentState >> j) & 1);
      }
      Serial.print(" | Dezimal: ");
      Serial.print(currentState);
      Serial.print(" | Zeichen: ");
      Serial.println(keyToSend);
    }

    // Aktuellen Zustand speichern
    lastButtonState[i] = buttonState[i];
  }

  // LEDs basierend auf dem Binärzustand steuern (nur bei Änderung)
  if (currentState != lastState) {
    if (debugMode) {
      Serial.print("DEBUG: Zustandsänderung erkannt! Alt: ");
      Serial.print(lastState);
      Serial.print(" Neu: ");
      Serial.println(currentState);
    }
    
    for (int i = 0; i < 4; i++) {
      boolean relaisZustand = currentState & (1 << i);
      digitalWrite(relayPins[i], relaisZustand ? HIGH : LOW);
      
      if (debugMode) {
        Serial.print("DEBUG: Relais ");
        Serial.print(i + 1);
        Serial.print(" (Pin ");
        Serial.print(relayPins[i]);
        Serial.print(") gesetzt auf ");
        Serial.println(relaisZustand ? "EIN (HIGH)" : "AUS (LOW)");
      } else {
        Serial.print("Relais ");
        Serial.print(i + 1);
        Serial.println(relaisZustand ? " EIN" : " AUS");
      }
    }
    lastState = currentState; // Letzten Zustand aktualisieren
  }
}
