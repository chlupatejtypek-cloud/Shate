# Step 03 — Voiceover

> Pipeline step **03 of 7**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 04.

## What you produce

- **`output/<video-slug>/03-voiceover/narration.mp3`** — exactly **one** audio file
  containing the whole narration (a dialogue is stitched into the single file, it is
  never two files)
- **`output/<video-slug>/03-voiceover/timestamps.json`** — total duration + per-line
  and per-section timings + the voices used (+ `speed_factor` when one was applied)

**The duration of `narration.mp3` is the contract for every later step.** Step 04
cuts the background to it; step 05 assembles to it; step 06 syncs captions to it.

## Information you need

| Info | Where it comes from |
|------|---------------------|
| `script.md` (lines + speaker labels + format + voice mapping) | Output of step 02 |
| `narration_speed` (optional, default 1.0) | Channel profile → `01-channel/brief.md` |
| Speech engine | Decided by the rule below — **not by the human** |
| `ELEVENLABS_API_KEY` (optional) | `.env` (fallback: committed `keys.env` — owner-accepted practice, `.env` wins) |

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
- **Check every clip.** Some engines occasionally return a near-silent clip while
  reporting success. Measure `volumedetect` on every part: a line whose mean level
  sits ~10 dB below its neighbours (or whose max is under −40 dB) gets regenerated
  once before you accept it.

### Path B — ElevenLabs (optional upgrade)

- `POST /v1/text-to-speech/{voice_id}`, model `eleven_multilingual_v2` (or the best
  available for the script language), output `mp3_44100_128` or better.
- Voice IDs: `NARRATOR_VOICE_ID`, `VOICE_A_ID`, `VOICE_B_ID` from `.env`. If empty,
  list voices (`GET /v1/voices`), pick by tone and gender mapping, and record the
  IDs in `timestamps.json` (`"engine": "elevenlabs"`).
- One request per line. A line fails → retry up to 3×; still failing → fall back to
  Path A for the whole script (never mix engines within one video).

### Speed factor (optional)

The channel profile (or a human hint) may ask for a **slight tempo lift** — short-form
retention practice — via `narration_speed` in the profile, carried into the brief.
Default is `1.0`; sane range 1.05–1.15.

- Apply `atempo=<speed>` **once**, after loudnorm, to the already-stitched file
  (tempo-only, pitch preserved). Never speed up by cutting pauses.
- Every timestamp in `timestamps.json` is then scaled by `1/speed`, and
  `"speed_factor": <value>` is recorded — steps 04–06 consume the post-tempo
  timeline without any extra math.
- The post-tempo duration must still land inside the brief's `length_seconds`
  window (±10 %); if it falls under the floor, record at 1.0 instead — never
  stretch a too-fast take back down.

Reference implementation: `tools/stitch_voiceover.py` (trim → level → gap →
loudnorm → atempo → post-tempo timestamps). You may use any equivalent; the
quality bar below is the contract.

## Procedure

1. **Parse the script.** Extract the lines in order with speaker labels and spoken
   text (strip timestamps, `(MOOD: …)` cues, and anything in parentheses). Count
   them — this count is checked at the end.
2. **Choose the engine** (rule above) and **resolve the voices**.
3. **Generate audio per line / chunk** into `03-voiceover/parts/NNN-<speaker>.<ext>`.
   Volume-check every clip (Path A checklist) and regenerate near-silent ones.
4. **Stitch everything into one file** with FFmpeg:
   - decode all parts to the same PCM format (`-ar 24000 -ac 1 -sample_fmt s16`)
   - trim head/tail silence under −45 dB on every part (TTS clips carry padding
     that would otherwise become audible holes at splice points); keep ~60 ms head
     / ~100 ms tail for natural onsets
   - level each line to the script's **median RMS** (clamp ±6 dB) so one quiet take
     never whispers next to its neighbours
   - gaps: **~250 ms between different speakers**, ~120 ms between lines of the
     same speaker (dialogue), ~150 ms between monologue chunks — generated with
     `anullsrc` and concatenated via the concat demuxer
   - loudness-normalize once at the end (`loudnorm=I=-16:TP=-1.5:LRA=11`), then the
     optional `atempo` speed factor
   - export the single `narration.mp3` (`-c:a libmp3lame -b:a 192k`)
5. **Measure the final length:**
   `ffprobe -v error -show_entries format=duration -of csv=p=0 narration.mp3`
   → `duration_seconds` (two decimals).
6. **Write `timestamps.json`:**

```json
{
  "engine": "agent-tts",
  "speed_factor": 1.1,
  "duration_seconds": 54.55,
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
   actual part durations (cumulative, including gaps — scaled by `1/speed_factor`
   when one was applied) — never estimates.
7. **Verify the result** (see Definition of Done). Programmatically check the first
   10 seconds and each splice point for silence gaps > 0.6 s or clipping
   (`astats` / `silencedetect`).

## Rules

- The output is **one** audio file. `parts/` may stay, but it is not the deliverable.
- Never add, drop or reorder lines relative to the script.
- Never mix speech engines within one video.
- The narration must be clean: no artifacts at splice points, no double silence,
  consistent loudness across lines.
- Speed factor is a **global stylistic tempo** from the profile/brief — it is never
  used to rescue a script that misses the length window (that is a step 02 rewrite).

## Definition of Done

- [ ] Exactly one `narration.mp3` covering **100 % of the script lines, in order**
- [ ] Dialogue: female (A) + male (B) voices as declared in the script header,
      clearly distinct, natural gap between speakers
- [ ] Every part clip was volume-checked; no line is >6 dB below the median
- [ ] `timestamps.json` exists; `duration_seconds` matches `ffprobe` of the file
- [ ] Line count in `timestamps.json` == line count in the script
- [ ] Engine and voice identifiers recorded (reproducibility)
- [ ] Loudness normalized; no audible artifacts at splice points
- [ ] If a `narration_speed` ≠ 1.0 was applied: `speed_factor` recorded and all
      timings on the post-tempo timeline
- [ ] Duration inside the brief's `length_seconds` window (±10 %); if not, go back
      to step 02 and trim or extend the script — do not stretch the audio
