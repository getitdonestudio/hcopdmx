//  
// Funktion, die den Language Switcher dynamisch befüllt
//  
function populateLanguageSwitcher() {
    const languageSwitcher = document.getElementById('languageSwitcher');
    if (!languageSwitcher) return;
  
    // Aktuelle Sprache und Seite aus dem <body>-Attribut auslesen
    const currentLang = document.body.getAttribute('data-lang') || 'de';
    const currentPage = document.body.getAttribute('data-page') || '0000';
  
    // DOM-Fragment für bessere Performance erstellen
    const fragment = document.createDocumentFragment();
    
    // Links für Deutsch und Englisch erstellen
    const linkDE = document.createElement('a');
    linkDE.href = `../de/${currentPage}.html`;
    linkDE.className = `lang-de${currentLang === 'de' ? ' active' : ''}`;
    linkDE.textContent = 'DEU';
    fragment.appendChild(linkDE);
    
    const separator = document.createElement('span');
    separator.textContent = ' | ';
    fragment.appendChild(separator);
    
    const linkEN = document.createElement('a');
    linkEN.href = `../en/${currentPage}.html`;
    linkEN.className = `lang-en${currentLang === 'en' ? ' active' : ''}`;
    linkEN.textContent = 'EN';
    fragment.appendChild(linkEN);
    
    // Fragment zum DOM hinzufügen (nur ein Reflow)
    languageSwitcher.innerHTML = '';
    languageSwitcher.appendChild(fragment);
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
  
    // DOM-Fragment für bessere Performance erstellen
    const fragment = document.createDocumentFragment();
    
    // Erstelle vier Divs entsprechend der Stellen des Binärcodes
    for (let i = 0; i < pageValue.length; i++) {
      const bitDiv = document.createElement('div');
      bitDiv.className = `binary-bit${pageValue[i] === "1" ? " active" : ""}`;
      fragment.appendChild(bitDiv);
    }
    
    // Fragment zum DOM hinzufügen (nur ein Reflow)
    binaryDisplay.innerHTML = '';
    binaryDisplay.appendChild(fragment);
  }
  
  // Registriere einen Event-Listener für das DOMContentLoaded-Event
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Binärcode-Visualisierung aktualisieren
      updateBinaryDisplay();
      
      // Event-Listener für Resize-Events hinzufügen für responsive Anpassungen
      let resizeTimeout;
      window.addEventListener('resize', () => {
        // Debounce für bessere Performance
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          // Hier responsive Anpassungen bei Bedarf
          // Aktuell nur Platzhalter
        }, 150);
      });
    });
  } else {
    // DOMContentLoaded wurde bereits ausgelöst
    updateBinaryDisplay();
  }
  