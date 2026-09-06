# Step 02 — Voiceover

> Pipeline step **02 of 5**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 03.

## What you produce

- **`output/<video-slug>/02-voiceover/narration.mp3`** — exactly **one** audio file
  containing the whole narration (monologue or dialogue — a dialogue is stitched
  into the single file, it is never two files)
- **`output/<video-slug>/02-voiceover/timestamps.json`** — total duration + per-line
  and per-section timings + the voice IDs used

**The duration of `narration.mp3` is the contract for every later step.** Step 03
cuts the background to it; step 04 assembles to it.

## Information you need

| Info | Where it comes from |
|------|---------------------|
| `script.md` (lines + speaker labels + format) | Output of step 01 |
| `ELEVENLABS_API_KEY` | `.env`. **If missing: stop and ask the human. Never invent a key.** |
| Voice IDs | `.env` (`NARRATOR_VOICE_ID`, `VOICE_A_ID`, `VOICE_B_ID`) or the agent picks (rule below) |

If anything is missing or ambiguous, ask in one batched question before generating.

## Voice selection

- **Monologue:** one voice for `[NARRATOR]`.
- **Dialogue:** `[A]` → female voice, `[B]` → male voice (the mapping declared in
  the script header — it is binding).
- If the voice ID is **not** in `.env`: the agent lists ElevenLabs voices
  (`GET /v1/voices`), picks the best fit for the script's tone and audience, and
  records the chosen ID in `timestamps.json` so the video can be re-generated with
  the same voices later.
- Never swap a speaker to another voice mid-script.

## Procedure

1. **Parse the script.** Extract the lines in order with speaker labels and text.
   Count them — this count is checked at the end.
2. **Resolve the voices** (see above).
3. **Generate audio per line** with the ElevenLabs TTS API
   (helper: `scripts/tts.py` — the only place that talks to ElevenLabs):
   - model: `eleven_multilingual_v2` (or the best available for English)
   - each line is generated separately → natural prosody per utterance and clean
     speaker separation for dialogues
   - a line fails → retry up to 3×; still failing → stop and report, never skip it
4. **Stitch everything into one file** (FFmpeg concat, via `scripts/tts.py`):
   - decode all lines to the same PCM format (24 kHz, mono, 16-bit)
   - gaps: **~250 ms between different speakers**, ~120 ms between lines of the same
     speaker (dialogue), ~150 ms between monologue chunks
   - export the single `narration.mp3` (192 kbps)
5. **Measure the final length** with `ffprobe` → `duration_seconds`.
6. **Write `timestamps.json`:**

```json
{
  "duration_seconds": 73.4,
  "voices": { "narrator": "voice-id" },
  "lines": [
    { "id": 1, "speaker": "A", "start": 0.0, "end": 2.1, "text": "..." },
    { "id": 2, "speaker": "B", "start": 2.35, "end": 4.9, "text": "..." }
  ],
  "sections": [
    { "name": "Hook", "start": 0.0, "end": 5.0 },
    { "name": "Body", "start": 5.0, "end": 60.0 }
  ]
}
```

   For dialogue, `"voices"` is `{ "A": "voice-id", "B": "voice-id" }`.
   Line timings come from the actual generated files (cumulative), not guesses.
7. **Verify the result** (see Definition of Done) — including listening to (or at
   least programmatically checking) the first 10 seconds and the splice points.

## Rules

- The output is **one** audio file. Never leave per-line files as the deliverable
  (intermediate files may stay in a `parts/` subfolder, clearly not the output).
- Never add, drop or reorder lines relative to the script.
- The narration must be clean: no TTS artifacts at splice points, no double
  silence, consistent volume (normalize loudness at the end).

## Definition of Done

- [ ] Exactly one `narration.mp3` covering **100 % of the script lines, in order**
- [ ] Dialogue: female (A) + male (B) voices (or as configured), clearly distinct,
      natural gap between speakers
- [ ] `timestamps.json` exists; `duration_seconds` matches `ffprobe` of the file
- [ ] Line count in `timestamps.json` == line count in the script
- [ ] Voice IDs recorded (reproducibility)
- [ ] No audible artifacts at splice points; consistent loudness
- [ ] Ready for step 03: the duration number is available
