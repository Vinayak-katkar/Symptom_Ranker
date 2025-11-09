# Symptom Ranker — Static Website

A small multi-page static website that includes a client-side demo to organize symptoms, add approximate timelines (days ago), and see a ranked list of potential matches with general precautions.

- Home (`index.html`): Overview and CTA
- Tool (`symptom-ranker.html`): The interactive demo
- About (`about.html`): What this does (and does not do)
- Privacy (`privacy.html`): Local-only storage, no server

This is educational only. Not medical advice.

## How to run (web)

Open `index.html` directly, or use a lightweight local server.

### Option 1: Open directly
- Double-click `index.html`.

### Option 2: VS Code Live Server (recommended)
1. Install the "Live Server" extension.
2. Right-click `index.html` → "Open with Live Server".

### Option 3: Python simple server
```powershell
# From project root
python -m http.server 8080
# Visit http://localhost:8080
```

## Java console version
The ranking logic also exists as a Java program: `java/SymptomRanker.java`.

Compile & run:
```powershell
javac java\SymptomRanker.java
java -cp java SymptomRanker
```
Follow prompts to enter symptoms (comma-separated), days ago for each, and top N results.

## Accessibility & persistence
- Search uses a combobox pattern with a listbox and keyboard navigation (↑/↓/Enter/Escape).
- Selected symptoms and timelines persist to `localStorage` and are restored on reload.
- "Clear All" removes local state.

## Customize
- Edit `assets/symptom-ranker.js` for frontend logic.
- Edit `assets/styles.css` for styling.
- Edit `java/SymptomRanker.java` for Java logic.
