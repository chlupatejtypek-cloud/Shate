# Step 05 — Assembly

> Pipeline step **05 of 6**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 06.

## What you produce

**`output/<video-slug>/final.mp4`** — the upload-ready video: background +
narration, 1080×1920, H.264/AAC, exactly the narration length.

## Information you need

| Info | Where it comes from |
|------|---------------------|
| `narration.mp3` + `duration_seconds` | `03-voiceover/` |
| `background.mp4` | `04-background/` |

Both must exist and pass their own Definition of Done. Nothing else is needed.
**Do not ask the human anything.**

## Procedure

### 1. Pre-flight

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 03-voiceover/narration.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 04-background/background.mp4
```

The two durations must be within 0.5 s. If not, go back to step 04 — never fix a
length mismatch here.

### 2. Compose

```bash
DUR=63.84   # duration_seconds from timestamps.json

ffmpeg -y \
  -i 04-background/background.mp4 \
  -i 03-voiceover/narration.mp3 \
  -map 0:v:0 -map 1:a:0 \
  -t "$DUR" -shortest \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -r 30 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -af "aresample=48000,apad" \
  -movflags +faststart \
  final.mp4
```

Notes:

- `-t $DUR` with `apad` guarantees the file ends exactly with the narration even if
  the background is a few frames longer or the audio a few ms shorter.
- The background is already 1080×1920; the `scale/crop` filter is a no-op safety
  net, not a substitute for step 04.
- Keep CRF 18 — Shorts/TikTok re-encode anyway; give them a clean master.
- **No captions, no music, no overlays in this step.** They are future step modules
  (insert after 05, renumber). Assembly stays a pure mux.

### 3. Verify

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
        -of default=nw=1 final.mp4
ffmpeg -y -ss 3 -i final.mp4 -frames:v 1 check-3s.jpg
ffmpeg -y -sseof -1 -i final.mp4 -frames:v 1 check-end.jpg
ffmpeg -i final.mp4 -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume"
```

- one video stream (h264, 1080×1920, 30 fps), one audio stream (aac, 48 kHz, stereo)
- duration within 0.3 s of `duration_seconds`
- `max_volume` ≤ −1.0 dB, `mean_volume` around −16 to −20 dB
- the two frames look clean; audio starts within the first 0.3 s (check
  `silencedetect` if unsure)

## Rules

- `final.mp4` lives at the root of the video folder, never inside a step folder.
- Never trim or stretch the narration to fit — the narration *is* the length.
- Re-running the step overwrites `final.mp4`; no version suffixes.

## Definition of Done

- [ ] `output/<video-slug>/final.mp4` exists, 1080×1920, h264 + aac, faststart
- [ ] Duration == `duration_seconds` (±0.3 s)
- [ ] Narration is audible from the first second and not clipped
- [ ] Spot-checked frame at 3 s and last second: clean, no black frames
- [ ] File size sane for the length (roughly 8–25 MB per minute at CRF 18)
