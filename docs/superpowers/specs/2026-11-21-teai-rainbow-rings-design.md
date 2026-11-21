# teai — rainbow rings design

Date: 2026-11-21
Size: small change

## Intent
The concentric rings already expand from center to outer edge. Give them a rainbow that is keyed to their current radius: deep brown/amber near the center, through orange, gold, green, cyan, and blue, ending in purple at the outer edge. Energy should still be felt through motion and brightness, not through the color order.

## Goals
- The ring's stroked line itself changes color as the ring emerges from the center and travels outward; no second outline or separate line is added.
- Inner edge reads as brown, outer edge reads as purple, with the full spectrum between.
- Existing speed, line width, nudge softening, glow, particles, nodes, and recording UI stay unchanged.

## Non-goals
- No change to the central glow or drifting particles.
- No new dependencies, assets, launcher scripts, or server code.
- No new controls or settings.

## Constraints
- Destination: `C:\pinokio\api\teai`.
- Static serverless app; `index.html` remains the entry point.
- Current ring loop in `drawField` computes `radius` from `now * speed`, then strokes with a single score-driven `hue`.
- Tests use `node --test tests/*.test.js`.

## Approaches
1. **A — Radius-keyed spectrum (chosen).** Add a pure `ringColor(radiusRatio)` helper that returns hue/saturation/lightness for the current radius ratio. The ring loop uses it for each stroke. Color stays anchored to position even while rings move. Tradeoff: requires one small helper and test.
2. **B — Fixed color per ring.** Assign each of the seven rings a fixed rainbow color at creation. Simpler, but colors drift outward with their rings, so the center would not stay brown and the edge would not stay purple. Rejected.
3. **C — Full-field rainbow.** Apply the spectrum to the glow and particles too. More dramatic, but changes the whole composition and is outside this request. Rejected.

## Design
- Add `ringColor(radiusRatio)` to `resonance.js`, exported alongside existing helpers.
- Clamp input to `0..1`.
- Map hue linearly from `24` (amber-brown) to `280` (violet).
- Keep saturation at roughly `78%`.
- Lift lightness from roughly `30%` at the center to `68%` at the edge so the inner ring reads brown rather than muddy orange and the outer ring stays visibly purple.
- In `index.html`, compute `t = radius / maxRadius` and stroke with `ringColor(t)`.
- Keep score-driven alpha and line width. Add a small alpha floor near the outer edge so the purple ring remains visible instead of fading completely to zero.
- Keep `soften` behavior during nudges.

## Files
- `resonance.js` — new pure `ringColor` helper.
- `index.html` — use `ringColor` in the ring loop.
- `tests/resonance.test.js` — endpoint, midpoint, and clamping tests for `ringColor`.
- `tests/interface.test.js` — static assertion that the ring loop uses `ringColor`.
