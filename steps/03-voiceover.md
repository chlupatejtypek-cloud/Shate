# Step 03 — Voiceover

> Pipeline step **03 of 6**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 04.

## What you produce

- **`output/<video-slug>/03-voiceover/narration.mp3`** — exactly **one** audio file
  containing the whole narration (a dialogue is stitched into the single file, it is
  never two files)
- **`output/<video-slug>/03-voiceover/timestamps.json`** — total duration + per-line
  and per-section timings + the voices used

**The duration of `narration.mp3` is the contract for every later step.** Step 04
cuts the background to it; step 05 assembles to it.

## Information you need

| Info | Where it comes from |
|------|---------------------|
| `script.md` (lines + speaker labels + format + voice mapping) | Output of step 02 |
| Speech engine | Decided by the rule below — **not by the human** |
| `ELEVENLABS_API_KEY` (optional) | `.env` |

## Speech engine — which path to take

```
Do you have a built-in speech / text-to-speech tool in your agent runtime?
  yes ─► Path A (default, free)
  no  ─► is ELEVENLABS_API_KEY set in .env?
           yes ─► Path B (ElevenLabs)
           no  ─► STOP: this is one of the three allowed reasons to talk to the human.
```

If **both** are available, Path A is still the default. Use Path B only when the
channel profile or a human hint explicitly asks for ElevenLabs.

### Path A — built-in agent TTS (default)

Many agent runtimes ship a speech tool (e.g. an `add_voice` / `generate_speech`
pair, or an equivalent). Rules for using it:

- **Voices.** Register one voice per speaker before generating. Dialogue: one
  female voice for `[A]`, one male for `[B]`, matching the script header. If the
  tool auditions candidates, pick by the channel's `tone` (the human may be shown
  the audition — that is fine, it is not a question you are asking).
- **Chunking.** Generate per line for dialogue (clean speaker separation). For
  monologue you may batch consecutive lines into chunks under the tool's character
  limit, split only at sentence boundaries. Keep the line ↔ chunk mapping.
- **Parallelism.** Issue independent chunks in parallel where the tool allows it.
- **Reproducibility.** Record the voice identifiers the tool returned in
  `timestamps.json` (`"engine": "agent-tts"`).
- **Plain text only.** No SSML, no bracketed stage directions, no speaker labels
  inside the spoken text. Strip `(MOOD: …)` cues and timestamps before speaking.

### Path B — ElevenLabs (optional upgrade)

- `POST /v1/text-to-speech/{voice_id}`, model `eleven_multilingual_v2` (or the best
  available for the script language), output `mp3_44100_128` or better.
- Voice IDs: `NARRATOR_VOICE_ID`, `VOICE_A_ID`, `VOICE_B_ID` from `.env`. If empty,
  list voices (`GET /v1/voices`), pick by tone and gender mapping, and record the
  IDs in `timestamps.json` (`"engine": "elevenlabs"`).
- One request per line. A line fails → retry up to 3×; still failing → fall back to
  Path A for the whole script (never mix engines within one video).

## Procedure

1. **Parse the script.** Extract the lines in order with speaker labels and spoken
   text (strip timestamps, `(MOOD: …)` cues, and anything in parentheses). Count
   them — this count is checked at the end.
2. **Choose the engine** (rule above) and **resolve the voices**.
3. **Generate audio per line / chunk** into `03-voiceover/parts/NNN-<speaker>.<ext>`.
4. **Stitch everything into one file** with FFmpeg:
   - decode all parts to the same PCM format (`-ar 24000 -ac 1 -sample_fmt s16`)
   - gaps: **~250 ms between different speakers**, ~120 ms between lines of the
     same speaker (dialogue), ~150 ms between monologue chunks — generated with
     `anullsrc` and concatenated via the concat demuxer
   - loudness-normalize once at the end (`loudnorm=I=-16:TP=-1.5:LRA=11`)
   - export the single `narration.mp3` (`-c:a libmp3lame -b:a 192k`)
5. **Measure the final length:**
   `ffprobe -v error -show_entries format=duration -of csv=p=0 narration.mp3`
   → `duration_seconds` (two decimals).
6. **Write `timestamps.json`:**

```json
{
  "engine": "agent-tts",
  "duration_seconds": 63.84,
  "voices": { "A": "voice-00", "B": "voice-01" },
  "lines": [
    { "id": 1, "speaker": "A", "start": 0.0, "end": 2.1, "text": "..." },
    { "id": 2, "speaker": "B", "start": 2.35, "end": 4.9, "text": "..." }
  ],
  "sections": [
    { "name": "Hook", "start": 0.0, "end": 5.0 },
    { "name": "Body", "start": 5.0, "end": 58.0 },
    { "name": "Close", "start": 58.0, "end": 63.84 }
  ]
}
```

   For monologue, `"voices"` is `{ "narrator": "…" }`. Line timings come from the
   actual part durations (cumulative, including gaps) — never estimates.
7. **Verify the result** (see Definition of Done). Programmatically check the first
   10 seconds and each splice point for silence gaps > 0.6 s or clipping
   (`astats` / `silencedetect`).

## Rules

- The output is **one** audio file. `parts/` may stay, but it is not the deliverable.
- Never add, drop or reorder lines relative to the script.
- Never mix speech engines within one video.
- The narration must be clean: no artifacts at splice points, no double silence,
  consistent loudness.

## Definition of Done

- [ ] Exactly one `narration.mp3` covering **100 % of the script lines, in order**
- [ ] Dialogue: female (A) + male (B) voices as declared in the script header,
      clearly distinct, natural gap between speakers
- [ ] `timestamps.json` exists; `duration_seconds` matches `ffprobe` of the file
- [ ] Line count in `timestamps.json` == line count in the script
- [ ] Engine and voice identifiers recorded (reproducibility)
- [ ] Loudness normalized; no audible artifacts at splice points
- [ ] Duration inside the brief's `length_seconds` window (±10 %); if not, go back
      to step 02 and trim or extend the script — do not stretch the audio
