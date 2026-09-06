# Step 03 — Background video

> Pipeline step **03 of 5**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 04.

## What you produce

- **`output/<video-slug>/03-visuals/background.mp4`** — one continuous video,
  **1080×1920 (9:16)**, silent, length = narration duration (±0.5 s)
- **`output/<video-slug>/03-visuals/source.json`** — where the video came from
  (provenance)

## Information you need

| Info | Where it comes from |
|------|---------------------|
| `duration_seconds` | `timestamps.json` from step 02 |
| Vibe / mood of the video | `script.md` (topic, tone, B-ROLL cues) |
| Specific source (optional) | Human — if the human named a video or category, use it |

If the duration file is missing, go back to step 02 — do not guess.

## Where the video comes from

The base layer of every video is **one continuous satisfying background** — the kind
of footage that loops cleanly and holds attention without a story of its own.
Approved categories (the list is open, the agent may extend it):

- Subway Surfers / endless-runner gameplay
- Slime, kinetic sand, soap cutting
- Hydraulic press, metalworking, industrial loops
- Satisfying cleaning, restoring, packing
- Slow-motion liquids, marble, lava lamps

## Procedure

1. **Pick the source material.** Search YouTube for **vertical (9:16)** videos in an
   approved category that fit the script's vibe. A source must:
   - be 9:16 vertical (Shorts/TikTok-style — then no cropping is needed)
   - be at least `duration_seconds` + 10 s long (check with `yt-dlp --print duration`)
   - be high quality (1080p source preferred)
   - have **no** visible watermark, channel branding, or burned-in subtitles
   - run continuously (no hard cuts inside the part we will use) and loop well
   - carry a mood that matches the script (calm topic → calm footage, high energy → high energy)
   Pick **one** source. (Only if the script has two clearly different moods: two
   sources, split at the section boundary from `timestamps.json`, each cut to its
   share of the duration.)
2. **Download only the part we need** — never the whole source video.
   Helper: `scripts/download_background.py <url> --duration <seconds> --out background.mp4`

   Under the hood: **`yt-dlp` streams the best available video-only format directly
   into `ffmpeg`** (a pipe, no intermediate file). FFmpeg stops after exactly
   `--duration` seconds — so the download ends the moment we have enough. In the
   same pass the stream is normalized:
   - scaled + center-cropped to **1080×1920 (9:16)** (only if the source isn't already 9:16)
   - re-encoded high quality: **H.264, CRF 18**, `faststart`
   - audio **stripped** (`-an`) — the background is always silent
3. **Verify the result** with `ffprobe`:
   - width 1080, height 1920
   - duration within 0.5 s of `duration_seconds`
   - no audio stream
   - visually spot-check the first and last second (clean frame, no watermark)
4. **Write `source.json`:**

```json
{
  "url": "https://youtube.com/...",
  "title": "...",
  "channel": "...",
  "category": "subway-surfers",
  "source_duration_seconds": 312.0,
  "used": { "start_seconds": 0, "end_seconds": 73.4 },
  "note": "only the needed part was downloaded"
}
```

## If the download fails (restricted network, bot check, regional block)

1. Retry once with a fallback format selection.
2. Still failing → **do not improvise.** Ask the human one batched question:
   > "The background video download is blocked in this environment. Give me
   > (a) an alternative source URL, (b) a local file path to a 9:16 video at
   > least `duration_seconds` long, or (c) approval to render a synthetic
   > background."
3. If the human answers **(b)**: use the local file exactly like a downloaded
   stream (steps 2–4 unchanged, `source.json` records the local path).
4. If the human answers **(c)**: generate 5–7 AI stills matching the vibe
   (9:16, no text, no watermarks), render a 30 fps slow push-in with 0.8 s
   crossfades — silent, 1080×1920, CRF 18 — and record
   `"source": "synthetic"` in `source.json` so the human always knows.

## Rules

- **Silent background.** The narration is the only audio track (music is a separate
  future concern) — the source audio is always discarded.
- **No watermarks, no branding, no burned-in subtitles** on the source.
- **Length discipline:** background == audio, ±0.5 s. Never pad with a frozen frame.
- **Copyright:** prefer Creative Commons or the human-approved categories above
  (gameplay of games the human plays, generic satisfying footage). If a source is
  clearly a protected brand montage, pick another one — when unsure, ask.
- Re-running the step must always produce a file named `background.mp4` — no
  `background_final_v2.mp4` naming drift.

## Definition of Done

- [ ] `background.mp4` exists: **1080×1920, 9:16**
- [ ] Duration matches `duration_seconds` from step 02 within ±0.5 s
- [ ] Silent (no audio stream, verified by `ffprobe`)
- [ ] High quality — 1080p source, no visible compression artifacts, sharp
- [ ] **Only the needed part was downloaded** (stream stopped at the right length)
- [ ] No watermark / branding / burned-in subtitles (spot-checked)
- [ ] `source.json` with full provenance exists
- [ ] Mood of the footage fits the script (not random satisfying footage)
