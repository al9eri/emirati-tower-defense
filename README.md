# Emirati Tower Defense

A lightweight, zero-dependency **HTML5 Canvas & JavaScript strategy game** featuring UAE-inspired heritage defense towers, dynamic enemy wave progression, and tactical resource management.

---

## Features

- **Zero External Dependencies:** Built with pure HTML5 Canvas, CSS3, and vanilla JavaScript (`game.js`).
- **Tactical Tower System:** Multiple tower archetypes with distinct range, fire rate, projectile behavior, and upgrade paths.
- **Wave Progression Engine:** Escalating enemy waves with varied movement speeds, hit points, and gold rewards.
- **Interactive HUD:** Real-time gold economy, wave status controls, and tower placement validation.

---

## Running Locally

Simply open `index.html` in any modern web browser, or serve the directory locally:

```bash
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

---

## Project Structure

```text
├── index.html   # Game layout, HUD controls, and Canvas mount
├── styles.css   # Responsive UI styling and theme palette
└── game.js      # Game loop, entity state machine, pathing, and rendering engine
```
