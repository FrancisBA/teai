# teai

## What it does

`teai` is a self-contained browser app built around an "ambient resonance" idea. Instead of a chat box, it shows a slowly shifting field of light whose color, motion, and glow follow your current energy: voice level if you allow microphone access, plus your typing pace and idle time. When the field stays highly activated, it offers a single quiet nudge at the edge of the screen rather than a notification. Short phrases you type bloom into idea nodes with faint links between related thoughts.

It simulates the *feeling* of instant attunement. It does not read minds, sense thoughts, or experience empathy.

## How to use it

1. Open `teai` in Pinokio. The app loads directly in the browser; there is no install or server step.
2. Optional: click **listen** and allow microphone access so the field can react to ambient sound. If you deny or skip this, typing and pointer activity still drive the field.
3. Type naturally. Faster typing and frequent input warm the field toward amber; stillness lets it settle back to deep blue.
4. Type a short phrase in the bottom field and press Enter to add an idea node. Nodes are kept for the current browser session via local storage.
5. If the field stays intense for a few seconds, a brief whisper appears near the top right and fades on its own.

## Notes

- Everything runs locally in the browser. No accounts, API keys, downloads, network requests, or model files are needed.
- Microphone audio is analyzed in the page and is never recorded, stored, or sent anywhere.
- Requires a browser with Canvas 2D and Web Audio support.

## API

There is no HTTP API in this version. The app is a static page, so there is no endpoint to call. The equivalent access patterns are:

### JavaScript

From the browser devtools console, call the pure helpers directly:

```js
const { updateScore, shouldNudge, makeNode, linkNodes } = window.TeaiResonance
const score = updateScore({
  micLevel: 0.4,
  spectralCentroid: 0.3,
  typingRate: 3,
  idleMs: 0,
  previousScore: 0,
  dtMs: 600
})
console.log(score)
```

### Python

Python cannot call in-page JavaScript, but it can read the static app files from the launcher folder:

```python
from pathlib import Path

root = Path(".")
html = (root / "index.html").read_text(encoding="utf-8")
logic = (root / "resonance.js").read_text(encoding="utf-8")
print("serverless" if "<canvas" in html and "TeaiResonance" in logic else "missing app files")
```

### Curl

There is no local server, but any static file server can expose the folder if needed:

```bash
python -m http.server 8000
curl http://localhost:8000/index.html
```
