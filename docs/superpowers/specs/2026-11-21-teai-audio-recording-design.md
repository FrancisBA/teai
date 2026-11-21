# teai — named audio recordings design

Date: 2026-11-21

## Intent

Let the user capture audio deliberately, name it by typing, and review it later inside `teai`. The typed name is the link between the moment and the stored clip; "learning" here means the app remembers named clips, not model training.

## Goals

- Explicit "record" and "stop" controls; never record without a click.
- After stopping, a name input appears; saving is blocked until a non-empty name is typed.
- Named clips are listed with duration and date, and support play, rename, download, and delete.
- All audio stays in the browser; no network calls or backend.
- Existing ambient field, nudges, and idea nodes keep working unchanged.

## Non-goals / anti-goals

- No automatic or background recording, transcription, or speech recognition.
- No upload, cloud sync, or sharing.
- No ML training or behavioral adaptation from names.
- No new launcher scripts, dependencies, build step, or server.

## Constraints

- Destination: `C:\pinokio\api\teai` (PINOKIO_HOME resolved to `C:\pinokio`).
- Pinokio serverless app: static files only, `index.html` remains the entry point, `pinokio.js` keeps its default menu item.
- Browser APIs: `MediaRecorder`, `getUserMedia`, IndexedDB, object URLs, anchor downloads.
- Microphone permission is shared with the existing "listen" control; if denied, recording is unavailable and the UI says so.
- Storage is per-browser and subject to quota; save failures must be visible and non-destructive.

## Approaches considered

1. **A — Local clip library (chosen).** Record with `MediaRecorder`, name on stop, store blob in IndexedDB with metadata. Review list with play/rename/download/delete. Fits the serverless design and keeps audio local. Tradeoff: quota limits and browser codec support.
2. **B — Name then download only.** Simpler, but no in-app review list, which conflicts with "saving for review".
3. **C — Backend storage.** Rejected: violates the serverless, no-upload design.

Chosen: **A**.

## Design details

### UI

- Add `record` and `stop` controls next to `listen`; only one is visible at a time.
- While recording, show a quiet elapsed timer and a pulsing dot; no modal dialogs.
- On stop, reveal a panel with a single name input and `save` / `discard` actions.
- Below the field, a `library` section lists saved clips: name, duration, date, play/pause, rename, download, delete.
- Recording does not pause the resonance field; the existing mic analyser may share the same stream.

### Data

- IndexedDB database `teai`, object store `recordings`, key path `id`.
- Record shape: `{ id, name, createdAt, durationMs, mimeType, blob }`.
- Names are required, trimmed, and capped at 80 characters. Renaming uses the same validation.
- `createdAt` uses `Date.now()`; `durationMs` is measured from record start to stop.

### Behavior

- Request mic access on first record; reuse the existing stream when possible.
- `MediaRecorder` chooses a supported MIME type from `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, falling back to the browser default.
- Stop produces a blob; the name panel holds it in memory until saved or discarded.
- Playback creates an object URL and revokes it when playback ends or the clip is deleted.
- Delete asks for confirmation and removes both the record and any active object URL.
- Every IndexedDB operation handles errors; failures show a short inline message and leave existing clips intact.

### Files

- `index.html` — recording controls, naming panel, library UI, IndexedDB access.
- `tests/interface.test.js` — static assertions for the new controls and APIs.
- `README.md` — document recording, naming, review, storage location, and privacy.

## Left to the builder

- Implement IndexedDB helpers with tests where practical.
- Verify the app still launches and the full test suite passes.
