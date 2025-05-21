# LaTeX zu HTML Konvertierungsregeln

Diese Regeln wurden aus der Analyse mehrerer erfolgreicher Konvertierungen von LaTeX-Dateien zu HTML abgeleitet und helfen dabei, zukünftige Konvertierungen konsistent durchzuführen.

## 1. Allgemeine Struktur

- Jede HTML-Datei beginnt mit einem einheitlichen CSS-Stil-Block für Gleichungen:
  ```css
  <style>
    .equation {
      display: block;
      text-align: center;
      margin: 1.5em 0;
    }
    .katex { font-size: 1.1em; }
    .katex-display { overflow: auto hidden; }
  </style>
  ```

- LaTeX-Überschriften werden zu HTML-Überschriften:
  - `\newpage \addsec{...}` → `<h1>...</h1>`
  - `\subsection*{...}` → `<h2>...</h2>`

- Jeder Paragraph wird mit `<p>...</p>` umgeben

## 2. Mathematische Konstanten

- Boltzmann-Konstante: `\kboltz` → `k_B` (einfacher tiefgestellter Index)
- Plancksches Wirkungsquantum:
  - `\SI{6.62607015d-34}{\joule\second}` → `6.626\,070\,15 \times 10^{-34} \text{Js}`
- Gravitationskonstante:
  - `\SI{6.67430(15)d-11}{\cubic\metre\per\kilogram\per\square\second}` → `6.674\,30 \pm 0.000\,15 \times 10^{-11} \frac{\text{m}^3}{\text{kg}\,\text{s}^2}`
  - Beachte: Unsicherheiten in Klammern (15) werden als `\pm 0.000\,15` geschrieben
- Einheitendarstellung:
  - `\SI{...}{\joule \per \kelvin}` → `... \text{J/K}` oder als Bruch `\frac{\text{J}}{\text{K}}`
  - Einheiten werden je nach Kontext als direkter Text oder als Bruch formatiert:
    - Für Plancksche Konstante: `\text{Js}` statt `\frac{\text{J}}{\text{s}}`
    - Für Gravitationskonstante: `\frac{\text{m}^3}{\text{kg}\,\text{s}^2}` als Bruch

## 3. Formeln und Gleichungen

- Gleichungen werden in speziellen Absätzen eingefasst:
  ```html
  <p class="equation">
  \begin{equation*}
    ... Formelinhalt ...
  \end{equation*}
  </p>
  ```

- Spezielle Operatoren:
  - `\Tr` → `\textrm{Tr}` für den Spur-Operator
  - Bei Klammern in Formeln `\left(` und `\right)` für bessere Lesbarkeit verwenden
  
- Zifferngruppierung mit `\,` beibehalten: `1.380\,649`

## 4. Spezielle LaTeX-Formatierungen

- Texthervorhebungen:
  - `\emph{...}` → `<em>...</em>`
  - `\textit{...}` → `<em>...</em>`

- Anführungszeichen:
  - `\enquote{...}` oder `\enquote*{...}` → `&raquo;...&laquo;` (deutsche Anführungszeichen)

- Zitate:
  - `\begin{quote}...\end{quote}` → `<blockquote>...</blockquote>`

- Typografische Anpassungen:
  - `~--` oder ähnliche Gedankenstriche → einfaches `--` 
  - `d.\,h.\ ` → `d. h.`
  - `\dots` → `...`

## 5. LaTeX-spezifische Bereinigungen

- LaTeX-Kommentare (mit % beginnend) entfernen
- Metainformationen entfernen:
  - `\label{...}` entfernen
  - `CK $\rightarrow$ ok` und ähnliche Markierungen entfernen

## 6. Besonderheiten

- Bei komplexen mathematischen Strukturen wie Matrizen den KaTeX-kompatiblen Syntax verwenden
- Spezielle LaTeX-Makros durch ihre HTML/KaTeX-Äquivalente ersetzen
- Bei deutschsprachigen Texten auf korrekte Anführungszeichen und Umlaute achten

## Beispiele

### Beispiel 1: Einfache Gleichung
```latex
\begin{equation*}
  E=h\,\nu\,.
\end{equation*}
```
wird zu:
```html
<p class="equation">
\begin{equation*}
  E=h\,\nu\,.
\end{equation*}
</p>
```

### Beispiel 2: Konstante mit Einheit
```latex
h=\SI{6.62607015d-34}{\joule\second}
```
wird zu:
```html
h = 6.626\,070\,15 \times 10^{-34} \text{Js}
```

### Beispiel 3: Boltzmann-Konstante
```latex
\kboltz=\SI{1.380649d-23}{\joule \per \kelvin}
```
wird zu:
```html
k_B = 1.380\,649 \times 10^{-23} \text{Js}
```

### Beispiel 4: Gravitationskonstante
```latex
G = \SI{6.67430(15)d-11}{\cubic\metre\per\kilogram\per\square\second}
```
wird zu:
```html
G = 6.674\,30 \pm 0.000\,15 \times 10^{-11} \frac{\text{m}^3}{\text{kg}\,\text{s}^2}
``` 