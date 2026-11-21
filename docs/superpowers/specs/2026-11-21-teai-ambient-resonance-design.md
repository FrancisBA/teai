# teai — Ambient Resonance design

Date: 2026-11-21

## Intent

Build a runnable first version of `teai` ("Tele empathic") that feels like instant, quiet attunement rather than a chat box. The app is a self-contained browser experience: a fluid light field that reacts to the user's voice and typing, whisper-quiet nudges, and a shared canvas where ideas bloom as nodes.

## Goals

- One-click launchable as a Pinokio serverless web app.
- Works fully offline with no API keys, accounts, install step, or backend.
- Immediate visual response to mic energy/tone and typing cadence.
- Organic, calm aesthetic: no text boxes, no buttons-heavy dashboard.
- Mobile-friendly responsive canvas.

## Non-goals / anti-goals

- No claim of real mind reading, biological empathy, or biometric sensing.
- No LLM, external API, weather/calendar integration, smart-light control, wearables, or AR.
- No latency-hiding tricks that depend on a server.

## Constraints

- `PINOKIO_HOME` is `C:\pinokio`; destination is `C:\pinokio\api\teai`.
- Pinokio serverless apps use `index.html` at the launcher root plus `pinokio.json` metadata; no `install.js`/`start.js` are needed.
- Browser APIs only: Web Audio (mic), keyboard/pointer events, Canvas 2D, `localStorage`.
- Mic access requires user permission and a secure context (Pinokio serves the app locally).

## Approaches considered

1. **A — Self-contained browser demo (chosen).** `index.html` + JS canvas. Heuristic mood/energy mapping from mic and typing drives the visual field, nudges, and idea nodes. Fastest to run, zero dependencies, fully reproducible. Tradeoff: simulated intelligence, not real AI.
2. **B — Local backend + optional LLM.** More genuinely predictive, but needs install, a model/API key, and adds latency that fights the concept.
3. **C — Hardware/multimodal.** Wearables, AR, lighting. Not practical without extra devices.

Chosen: **A**. It best matches the "feel" goal and Pinokio's serverless app model; B can layer on later.

## Design details

### Runtime inputs

- Optional microphone permission for ambient energy/tone.
- Keyboard cadence and pointer movement as fallback/alternative signal.
- User-typed idea fragments on the shared canvas (short phrase input, not a chat box).

### Behavior

- A canvas "resonance field": layered ripples/particles whose color, speed, and amplitude follow a smoothed calm↔activated score.
- Signal fusion: mic RMS/spectral centroid + typing speed/pause length + idle time → one score, updated with easing so transitions feel organic.
- Whisper nudges: after sustained high activation, briefly slow/dim the field and show a single short phrase (e.g. "soften your breath") near the edge; no pop-ups.
- Shared canvas: pressing a key opens a minimal phrase entry; submitted phrases appear as nodes that bloom, with glowing links to nodes created nearby in time.
- No persistence requirement beyond keeping nodes for the current session.

### Files

- `index.html` — self-contained UI, styles, and logic.
- `pinokio.json` — metadata (title `teai`, description, black icon fallback).
- `README.md` — what it does, how to use, and JS/Python/curl notes explaining there is no HTTP API in this version.

## Left to the builder

- Implement the canvas rendering and signal smoothing.
- Add graceful degradation when mic is denied or unavailable.
- Verify the app launches via `pterm run`/`pterm status` and is reachable in a browser.
