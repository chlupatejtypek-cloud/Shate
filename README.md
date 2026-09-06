# Shate

**Shate is a video production system for AI agents.**
Point any capable agent (Claude Code, Cursor, Codex, Gemini CLI, …) at this repository
with one idea — or just a channel name — and it will follow the instructions in here
to produce a finished, upload-ready vertical video: a research-backed script, a
professional voiceover, a curated satisfying background, a fully assembled video
file, and the metadata for publishing.

Every step of the pipeline is a **pre-built module in its own file** — any part of
the system can be improved in isolation, without touching the rest.

## How it works (30 seconds)

1. The agent reads this README.
2. The agent determines the mode and collects any missing information (channel, topic in guided mode…).
3. The agent runs the pipeline steps in order — one file each, in `steps/`.
4. Result: `output/<video-slug>/final.mp4` + `metadata.md`, ready to upload.

## Modes

| Mode | What the human provides | What the agent decides |
|------|------------------------|------------------------|
| **Autonomous (default)** | The target channel (that's the only required input) | Everything: topic, angle, format (monologue or dialogue), length, tone — all tuned to fit the channel |
| **Guided** | A topic or idea (optionally with constraints) | Angle, format, length, tone, execution |

If the human does not specify a mode, run **Autonomous**. If the channel is unknown,
ask before starting. Every decision the agent makes in Autonomous mode is written
into the script header (the output of step 01), so a human can review all of them in
one place.

## If you are an AI agent — read this first

You have been pointed at this repository to produce a video.

1. **Read this entire README before doing anything else.**
2. **Determine the mode and get what it requires.** Default is Autonomous — the only
   required human input is the target channel (ask if missing). In Guided mode the
   human provides the topic. If it is unclear which mode applies, ask.
3. **Ask for missing information — never guess.** Each step file lists the
   information it needs. If some of it was not provided earlier, ask the human
   **in one batched question** before starting that step. Never invent the answers.
4. **Create the working folder.** One video = one folder: `output/<video-slug>/`
   (kebab-case, short, descriptive). Every artifact for this video lives inside it —
   nowhere else.
5. **Work through the pipeline in order, one step file at a time.** Each step file is
   self-contained: inputs → procedure → quality bar → outputs. Read it, do the work,
   verify the "Definition of Done", move on.
6. **Never skip a step.** Later steps assume earlier outputs exist. If an input is
   missing or weak, go back and fix it.
7. **Hold the quality bar.** If the output does not meet a step's Definition of Done,
   iterate inside that step — never compensate for it later.
8. **Do not improvise infrastructure.** Anything that touches an external service or
   media files goes through `scripts/`. If a script is missing a flag you need, or a
   step file is ambiguous, stop and ask.
9. **Never invent credentials.** API keys come from `.env` (see `.env.example`).
   If one is missing, stop and ask.
10. **When the pipeline is complete**, report: the path to `final.mp4`, the path to
    the metadata file, and a 3-line summary (hook, core idea, why it works).

## The pipeline — pre-built steps

Each row is a ready-made step module. The pipeline can grow: new step files are
inserted in sequence and the files after them are renumbered. Improving one step
means editing exactly one file.

| #  | Step              | File                     | Input                              | Output                                   |
|----|-------------------|--------------------------|------------------------------------|------------------------------------------|
| 01 | Script & research | `steps/01-script.md`     | channel (autonomous) / topic (guided) | `01-script/script.md`                 |
| 02 | Voiceover         | `steps/02-voiceover.md`  | `script.md`                        | `02-voiceover/narration.mp3` + `timestamps.json` |
| 03 | Background video  | `steps/03-visuals.md`    | `timestamps.json` + `script.md`    | `03-visuals/background.mp4` + `source.json` |
| —  | *(the pipeline grows here — new step files are inserted in sequence)* | | | |
| 04 | Assembly          | `steps/04-assembly.md`   | `narration.mp3` + `background.mp4` | `final.mp4`                             |
| 05 | Metadata          | `steps/05-metadata.md`   | `final.mp4` + `script.md`          | `metadata.md` (title, description, tags) |

What each pre-built module does:

- **01 — Script & research.** Picks the topic (Autonomous mode: based on the target
  channel), does deep research on it, studies how viral scripts in this genre work
  for this audience, tears down comparable YouTube videos, and writes a clean,
  well-structured script — monologue or dialogue (default voices: girl + guy,
  configurable). *First step of the pipeline: it asks the human for any missing
  information before writing a single word.*
- **02 — Voiceover.** Turns the script into clean, human-sounding narration with
  ElevenLabs (one voice for monologue, female + male voices for dialogue), stitches
  everything into **a single audio file**, and measures its final length — that
  length becomes the contract for every later step.
- **03 — Background video.** Picks one continuous satisfying video (Subway Surfers,
  slime, hydraulic press, …) that fits the script's vibe — vertical 9:16, high
  quality, exactly the length of the audio. Downloads **only the part that is
  needed** (the stream stops as soon as enough) and strips the source audio.
- **04 — Assembly.** Composes narration + background into the final `final.mp4` with FFmpeg.
- **05 — Metadata.** Title, description and tags — optimized for the algorithm,
  honest to the video.

## Repository layout

| Path        | Purpose                                                                                  |
|-------------|------------------------------------------------------------------------------------------|
| `README.md` | You are here. Master instructions + pipeline overview. Read it first, always.             |
| `steps/`    | One file per pipeline step: inputs → procedure → quality bar → outputs. To improve a part of the pipeline, edit exactly one file. |
| `scripts/`  | Deterministic helpers the agent runs (TTS, media downloads, FFmpeg assembly). The only place that talks to external APIs or modifies media. |
| `templates/`| Reusable artifacts that step files reference (metadata template, prompt snippets).        |
| `output/`   | Finished videos, one folder per video. Output is a **product**, not part of the system — never edit steps from inside it. |
| `.env`      | API keys (git-ignored). Copy from `.env.example`.                                          |

## Conventions

- **Target format: vertical 9:16 (1080×1920).** Every final video is TikTok/Shorts-style vertical.
- **The narration drives the length.** The background video is cut to the audio — never the other way around.
- **Content language: English.** Script, voiceover, title, description and tags are
  all English, unless the human explicitly overrides this for a specific video.
- **One video = one folder** in `output/`, with one subfolder per step
  (`01-script/`, `02-voiceover/`, `03-visuals/`, …).
- **API keys live only in `.env`** and are read by `scripts/` — never hardcoded,
  never printed.
- **FFmpeg is the video workhorse.** Every cut, composition and format conversion
  goes through `scripts/` or a documented FFmpeg command inside a step file.
- **Small, verifiable outputs.** Each step leaves behind a file the next step can
  check. If you cannot point at a file, the step is not done.

## What "perfect" means (global quality bar)

1. **Retention first.** The first 5 seconds must create an open loop; every 15–30
   seconds must give a reason to keep watching.
2. **One video = one promise.** A single, clear idea delivered from start to finish.
3. **Audio is half the experience.** The voiceover must be clean, well-paced and human.
4. **Visuals serve the narration.** The background must fit the mood — and it must be
  continuous, clean and free of watermarks.
5. **Nothing generic.** If a part of the video could be transplanted onto any other
   video and still work, rewrite it.

## Setup (for humans)

```bash
# one-time, per machine
ffmpeg                                   # must be installed
python3 -m pip install -r requirements.txt
cp .env.example .env                     # then fill in your keys
```

That is all the agent needs besides this README and the step files.
