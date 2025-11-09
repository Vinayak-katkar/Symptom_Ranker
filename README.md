# Symptom Ranker — Static Website

A small multi-page static website that includes a client-side demo to organize symptoms, add approximate timelines (days ago), and see a ranked list of potential matches with general precautions.

- Home (`index.html`): Overview and CTA
- Tool (`symptom-ranker.html`): The interactive demo
- About (`about.html`): What this does (and does not do)
- Privacy (`privacy.html`): Local-only storage, no server

This is educational only. Not medical advice.

## How to run

You can open `index.html` directly in your browser, or use a lightweight local server for better routing and caching.

### Option 1: Open directly
- Double-click `index.html` to open it in your default browser.

### Option 2: VS Code Live Server (recommended)
1. Install the "Live Server" extension in VS Code.
2. Right-click `index.html` and choose "Open with Live Server".

### Option 3: Python simple server (optional)
```powershell
# In the project folder
python -m http.server 8080
# Then visit http://localhost:8080
```

## Accessibility & persistence
- Search uses a combobox pattern with a listbox and keyboard navigation (↑/↓/Enter/Escape).
- Selected symptoms and timelines persist to `localStorage` and are restored on reload.
- "Clear All" removes local state.

## Customize
- Edit `assets/symptom-ranker.js` to adjust data (symptoms, diseases, precautions) or logic.
- Edit `assets/styles.css` to tweak appearance.
