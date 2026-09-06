# Step 06 — Captions

> Pipeline step **06 of 7**. Inserted 2026-09-06 at the human's request;
> metadata moved to step 07. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 07.

## What you produce

- **`output/<video-slug>/06-captions/captions.ass`** — the caption track
  (word-pop karaoke, ready to re-render or restyle)
- **`output/<video-slug>/06-captions/word_timing.json`** — per-word timings used
  (audit trail for the sync)
- **`output/<video-slug>/final.mp4`** — **replaced**: captions burned into the
  video from step 05, same audio stream, same duration

## Information you need

| Info | Where it comes from |
|------|---------------------|
| Line spans + spoken text (+ `speed_factor`) | `03-voiceover/timestamps.json` — measured, post-tempo timeline |
| `final.mp4` | output of step 05 |
| Duration contract | `duration_seconds` in `timestamps.json` |

The captions must show **exactly the spoken words** — never paraphrase, never add
text the narrator does not say. **Do not ask the human anything.**

## Style spec (the house look)

| Property | Value |
|----------|-------|
| Font | Montserrat ExtraBold, vendored in `tools/fonts/` (pass via `fontsdir`) |
| Size | 90 px on the 1080×1920 PlayRes |
| Colour | white fill, black outline 6 px, soft shadow 3 px |
| Position | bottom-centre (ASS alignment 2), `MarginV 330`, ≥ 70 px side margins |
| Grouping | word-pop: 1–3 words on screen, ≤ 11 chars, ≤ 0.85 s; break at sentence ends |
| Animation | subtle 110 % grow-in over ~85 ms (`\t`) — no sliding, no karaoke colour fills |
| Case | UPPERCASE display text |

The implementation lives in `tools/make_captions.py`. Tune look constants at the
top of that file; the numbers above are the contract, not a suggestion.

## Sync method — how the timing is made ("musí to být hodně dobře slazené")

1. **Anchors are measured, never estimated.** Line start/end come from the actual
   audio durations in `timestamps.json` (already post-tempo if a speed factor was
   applied in step 03).
2. **Words inside a line are interpolated**: each word's share of the line span is
   proportional to its length, with pause bonuses after `. ! ?` (+4 char-equivalents)
   and `, ; : —` (+2). Trimmed TTS pacing is uniform, so this lands words within
   ~±60 ms. The last word closes exactly on the measured line end.
3. Caption groups appear up to 30 ms **before** their first word and the previous
   group disappears 40 ms before the next one starts — text never overlaps, never
   trails the voice.
4. If a future speech engine provides real word timestamps (e.g. ElevenLabs
   `with-timestamps`), use them in place of the interpolation, keep the same
   grouping code.

## Procedure

1. `python3 tools/make_captions.py output/<video-slug>` → `06-captions/captions.ass`.
2. Skim the `.ass`: every covered second of narration has an event; no empty text;
   event count sane (roughly 1–1.5 per second of audio).
3. Burn in, one re-encode, audio untouched:

```bash
ffmpeg -y -i final.mp4 \
  -vf "subtitles='06-captions/captions.ass':fontsdir=$(pwd)/tools/fonts" \
  -c:v libx264 -preset slow -crf 18 -r 30 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart \
  06-captions/final-captioned.mp4
mv 06-captions/final-captioned.mp4 final.mp4
```

4. Verify (and **look at the frames with your own eyes**):

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height \
        -of default=nw=1 final.mp4      # unchanged shape: 1080x1920 h264+aac, same length
ffmpeg -y -ss 1.5  -i final.mp4 -frames:v 1 cap-check-hook.jpg
ffmpeg -y -ss 30   -i final.mp4 -frames:v 1 cap-check-mid.jpg
ffmpeg -y -sseof -2 -i final.mp4 -frames:v 1 cap-check-end.jpg
```

## Rules

- Captions render the **spoken** text verbatim (display casing may change, words may not).
- Never cover the centre of the frame; never sit under platform UI chrome — the
  `MarginV 330` floor exists for Shorts/TikTok overlays.
- One re-encode at CRF 18; audio is stream-copied, never re-encoded.
- `final.mp4` keeps its name and place — re-running this module reproduces it from
  the step-05 state, so keep a copy of the pre-caption file only while working.
- The `.ass` and `word_timing.json` stay in `06-captions/` as the audit trail.

## Definition of Done

- [ ] `captions.ass` + `word_timing.json` exist; word count matches the script exactly
- [ ] Three extracted frames (hook / middle / near end) inspected visually: correct
      words on screen at that moment, Montserrat rendered (not a fallback font),
      no overflow past margins, no text during narration gaps
- [ ] `final.mp4` still 1080×1920, h264+aac, duration unchanged (±0.1 s)
- [ ] No caption event longer than 0.85 s, none shorter than ~0.12 s
- [ ] Re-running the module regenerates `final.mp4` deterministically
