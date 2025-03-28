//  
// Funktion, die den Language Switcher dynamisch befüllt
//  
function populateLanguageSwitcher() {
    const languageSwitcher = document.getElementById('languageSwitcher');
    if (!languageSwitcher) return;
  
    // Aktuelle Sprache und Seite aus dem <body>-Attribut auslesen
    const currentLang = document.body.getAttribute('data-lang') || 'de';
    const currentPage = document.body.getAttribute('data-page') || '0000';
  
    // Links für Deutsch und Englisch erstellen
    let linkDE, linkEN;
    if (currentLang === 'de') {
      linkDE = `<a href="../de/${currentPage}.html" class="lang-de active">DEU</a>`;
      linkEN = `<a href="../en/${currentPage}.html" class="lang-en">EN</a>`;
    } else {
      linkDE = `<a href="../de/${currentPage}.html" class="lang-de">DEU</a>`;
      linkEN = `<a href="../en/${currentPage}.html" class="lang-en active">EN</a>`;
    }
    
    // HTML des Switchers setzen
    languageSwitcher.innerHTML = `${linkDE} <span>|</span> ${linkEN}`;
  }
  
  // Die Funktion wird ausgeführt, sobald der DOM geladen wurde
  document.addEventListener('DOMContentLoaded', populateLanguageSwitcher);
  

//
// Funktion zur Aktualisierung der visuellen Darstellung des Binärcodes
//
function updateBinaryDisplay() {
    const binaryDisplay = document.getElementById("binaryDisplay");
    if (!binaryDisplay) return;
    
    // Den Binärcode aus dem data-page-Attribut des <body> lesen (z. B. "0001")
    const pageValue = document.body.getAttribute("data-page");
    if (!pageValue || pageValue.length !== 4) return;
  
    // Erzeuge vier Divs entsprechend der Stellen des Binärcodes.
    // Annahme: Die erste Ziffer (links/oben) entspricht der höchsten Stelle,
    // und die vierte (rechts/unten) der niedrigsten Stelle.
    let html = "";
    for (let i = 0; i < pageValue.length; i++) {
      // Falls der aktuelle Binärwert "1" ist, aktiviere das Div (weiß gefüllt)
      html += `<div class="binary-bit${pageValue[i] === "1" ? " active" : ""}"></div>`;
    }
    binaryDisplay.innerHTML = html;
  }
  
  // Beim Laden der Seite den Binärcode anzeigen lassen
  document.addEventListener("DOMContentLoaded", () => {
    // Bestehende Initialisierungen (z. B. für DMX-Befehle etc.)
    // ...
  
    // Binärcode-Visualisierung aktualisieren
    updateBinaryDisplay();
  });
  