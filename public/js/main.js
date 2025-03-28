// Flag: Automatische Transition zum Screensaver aktivieren (true) oder deaktivieren (false)
const enableScreensaverTransition = false;

// Mapping von Tastaturtasten zu Binärwerten
const keyToBinary = {
  a: '0000', b: '0001', c: '0010', d: '0011',
  e: '0100', f: '0101', g: '0110', h: '0111',
  i: '1000', j: '1001', k: '1010', l: '1011',
  m: '1100', n: '1101', o: '1110', p: '1111'
};

// Inverses Mapping: Binärwert -> Taste
const binaryToKey = {};
for (const key in keyToBinary) {
  binaryToKey[keyToBinary[key]] = key;
}

// Funktion zum Senden der DMX-Befehle
async function sendDMXCommand(key) {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = `Sende Programm ${key.toUpperCase()}...`;
  }
  try {
    const response = await fetch(`/dmx/${key}`, { method: 'POST' });
    const data = await response.json();
    if (statusElem) {
      if (data.success) {
        statusElem.textContent = `Programm ${key.toUpperCase()} gesendet.`;
      } else {
        statusElem.textContent = `Fehler: ${data.message}`;
      }
    }
  } catch (error) {
    if (statusElem) {
      statusElem.textContent = 'Fehler beim Senden der Anfrage.';
    }
  }
}

// Event-Listener für Tastatureingaben
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  // Für Tasten a–p: DMX-Befehl senden und Navigation zur entsprechenden Seite
  if (keyToBinary.hasOwnProperty(key)) {
    sendDMXCommand(key);
    const lang = document.body.getAttribute('data-lang');
    const targetPage = keyToBinary[key];
    setTimeout(() => {
      window.location.href = `/${lang}/${targetPage}.html`;
    }, 150);
  }

  // Für DMX-Steuerung: q (All On) und z (All Off)
  if (key === 'q') {
    sendDMXCommand('q');
    // Bei q (All On) wird zur Screensaver-Seite gewechselt, wenn nicht bereits dort
    const lang = document.body.getAttribute('data-lang') || 'de';
    if (!document.body.classList.contains('screensaver')) {
      setTimeout(() => {
        window.location.href = `/${lang}/screensaver.html`;
      }, 150);
    }
  } else if (key === 'z') {
    sendDMXCommand('z');
  }
});

// Event-Listener für die Buttons "All On" und "All Off"
document.getElementById('all-on')?.addEventListener('click', () => {
  sendDMXCommand('q');
  const lang = document.body.getAttribute('data-lang') || 'de';
  if (!document.body.classList.contains('screensaver')) {
    setTimeout(() => {
      window.location.href = `/${lang}/screensaver.html`;
    }, 150);
  }
});
document.getElementById('all-off')?.addEventListener('click', () => {
  sendDMXCommand('z');
});

// Automatisches Senden des DMX-Befehls beim Laden der Seite,
// sofern es sich nicht um die Bildschirmschoner-Seite handelt
document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('screensaver')) {
    const pageValue = document.body.getAttribute('data-page');
    if (pageValue && binaryToKey.hasOwnProperty(pageValue)) {
      sendDMXCommand(binaryToKey[pageValue]);
    }
  }
});

// Inaktivitäts-Überwachung: Nur für normale Seiten (nicht Screensaver)
// und nur wenn die automatische Transition aktiviert ist
if (enableScreensaverTransition && !document.body.classList.contains('screensaver')) {
  let inactivityTimeout;
  function triggerScreensaver() {
    const lang = document.body.getAttribute('data-lang') || 'de';
    sessionStorage.setItem('lastPage', window.location.href);
    // Sende DMX-Befehl q bevor der Screensaver aktiviert wird
    sendDMXCommand('q');
    setTimeout(() => {
      window.location.href = `/${lang}/screensaver.html`;
    }, 150);
  }
  function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(triggerScreensaver, 30000); // 30 Sekunden
  }
  ['keydown', 'mousemove', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer);
  });
  resetInactivityTimer();
} else if (document.body.classList.contains('screensaver')) {
  // Auf der Bildschirmschoner-Seite: Touch- oder Klick-Ereignisse führen zurück zur zuletzt besuchten Seite
  function returnToLastPage() {
    const last = sessionStorage.getItem('lastPage') || '/';
    window.location.href = last;
  }
  document.addEventListener('touchstart', returnToLastPage);
  document.addEventListener('click', returnToLastPage);
}
