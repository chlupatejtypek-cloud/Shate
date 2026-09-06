# Shate

**Shate is a zero-input video production system for AI agents.**

Point any capable agent (Claude Code, Cursor, Codex, Gemini CLI, Arena Agent Mode, …)
at this repository and say *"make a video"*. The agent needs **nothing else** from
you: it picks the channel, the topic, the format, records the voiceover, fetches a
real satisfying background, assembles the file, burns in perfectly-timed captions
and writes the publishing metadata.
Result: `output/<video-slug>/final.mp4` + `metadata.md`, upload-ready, vertical 9:16.

Every step of the pipeline is a **pre-built module in its own file** — any part of
the system can be improved in isolation, without touching the rest.

## How it works (30 seconds)

1. The agent reads this README.
2. The agent runs the eight pipeline steps in order — one file each, in `steps/`.
   The first step selects a channel from `channels/`; every later decision follows
   from that profile.
3. Result: `output/<video-slug>/final.mp4` + `metadata.md` (+ a YouTube upload
   when step 08 credentials are set up).

There are no modes and no questionnaires. If the human adds a hint (a channel name,
a topic, a length) the agent honors it; if not, the agent decides — and writes every
decision down where a human can review it afterwards.

## If you are an AI agent — read this first

You have been pointed at this repository to produce a video.

1. **Read this entire README before doing anything else.**
2. **Do not ask the human for input.** Everything you need is in this repo or is
   yours to decide. The only exceptions are listed under *When you may stop* below.
3. **Create the working folder.** One video = one folder: `output/<video-slug>/`
   (kebab-case, short, descriptive). Every artifact for this video lives inside it —
   nowhere else.
4. **Work through the pipeline in order, one step file at a time.** Each step file is
   self-contained: inputs → procedure → quality bar → outputs. Read it, do the work,
   verify the *Definition of Done*, move on.
5. **Never skip a step.** Later steps assume earlier outputs exist. If an input is
   missing or weak, go back and fix it.
6. **Hold the quality bar.** If the output does not meet a step's Definition of Done,
   iterate inside that step — never compensate for it later.
7. **Write down every decision you make** — in the channel brief (step 01) and the
   script header (step 02). Autonomy is fine; invisible autonomy is not.
8. **Use only the tools the step files name.** FFmpeg for media, `yt-dlp` (directly
   or through the relay) for downloads, your built-in speech tool or ElevenLabs for
   voice. No new infrastructure, no ad-hoc services.
9. **Never invent credentials.** Optional API keys come from `.env` (see
   `.env.example`). A missing optional key means: use the free default path.
10. **When the pipeline is complete**, report: the path to `final.mp4`, the path to
    `metadata.md`, the channel used, and a 3-line summary (hook, core idea, why it
    works).

### When you may stop and talk to the human

Only when something is **impossible**, not when something is undecided:

- the background video cannot be obtained by *any* documented path in step 04
  (direct download **and** relay both failed);
- you have no speech capability at all (no built-in TTS tool **and** no
  `ELEVENLABS_API_KEY`);
- FFmpeg is not installed and you cannot install it.

State exactly what you tried and what is needed, in one message.

## The pipeline — eight pre-built steps

| #  | Step             | File                       | Input                                     | Output                                                 |
|----|------------------|----------------------------|-------------------------------------------|--------------------------------------------------------|
| 01 | Channel          | `steps/01-channels.md`     | `channels/` library (+ optional human hint) | `01-channel/brief.md`                                |
| 02 | Script & research| `steps/02-script.md`       | `brief.md`                                | `02-script/script.md`                                  |
| 03 | Voiceover        | `steps/03-voiceover.md`    | `script.md`                               | `03-voiceover/narration.mp3` + `timestamps.json`       |
| 04 | Background video | `steps/04-background.md`   | `timestamps.json` + `script.md` + `brief.md` | `04-background/background.mp4` + `source.json`      |
| 05 | Assembly         | `steps/05-assembly.md`     | `narration.mp3` + `background.mp4`        | `final.mp4`                                            |
| 06 | Captions         | `steps/06-captions.md`     | `final.mp4` + `timestamps.json`           | `final.mp4` (captions burned in) + `06-captions/` files |
| 07 | Metadata         | `steps/07-metadata.md`     | `final.mp4` + `script.md` + `brief.md`    | `metadata.md` (title, description, tags, hashtags)     |
| 08 | Publish          | `steps/08-publish.md`      | `final.mp4` + `metadata.md` + YouTube OAuth | `08-publish/publish.json` (video URL)                |

The pipeline can grow: new step files are inserted in sequence and the files after
them are renumbered. Improving one step means editing exactly one file.

What each module does:

- **01 — Channel.** Selects the channel this video is for from the profiles in
  `channels/` (round-robin over active channels, unless the human named one), reads
  its profile, and writes a one-page brief: audience, format, length, tone, banned
  topics, recently used topics. *If `channels/` has no usable profile, the agent
  creates one from the template — it does not ask.*
- **02 — Script & research.** Picks a topic that fits the channel and is not in its
  recent history, researches it with sources, tears down comparable viral Shorts,
  and writes a clean script — monologue or dialogue (default voices: girl + guy).
- **03 — Voiceover.** Turns the script into one clean narration file. **Default path
  is the agent's built-in speech tool (free).** ElevenLabs is the optional upgrade
  when a key is present. Lines are levelled and spliced tight; an optional speed
  factor from the channel profile gives the narration a slight tempo lift. The final
  duration becomes the contract for every later step.
- **04 — Background video.** One continuous, **real** satisfying video (Subway
  Surfers, slime, hydraulic press, …) — vertical 9:16, silent, exactly the audio
  length. Downloaded directly when the network allows, or through the **GitHub
  Actions download relay** when the agent is sandboxed. No synthetic backgrounds.
- **05 — Assembly.** Composes narration + background into `final.mp4` with FFmpeg —
  a pure mux, no overlays.
- **06 — Captions.** Word-pop karaoke captions burned into `final.mp4`. Word timing
  is anchored to the *measured* line spans from step 03 (never estimated), so text
  lands on the voice within ~±60 ms. House style: Montserrat ExtraBold, white on
  black outline, bottom-centre.
- **07 — Metadata.** Title, description, tags, hashtags — optimized for the
  algorithm, honest to the video. Also appends the video to the channel's history.
- **08 — Publish.** Uploads `final.mp4` to YouTube with the step-07 metadata
  through a second relay workflow (the sandbox cannot reach googleapis.com, the
  runner can). OAuth consent is a one-time human step; the refresh token only ever
  crosses git as an AES-encrypted blob whose key never leaves private channels.

## Repository layout

| Path | Purpose |
|------|---------|
| `README.md` | You are here. Master instructions + pipeline overview. Read it first, always. |
| `channels/` | The channel library: one profile per channel (`<slug>.md`) + `_template.md`. Step 01 reads from here; step 07 appends history here. |
| `steps/` | One file per pipeline step: inputs → procedure → quality bar → outputs. To improve a part of the pipeline, edit exactly one file. |
| `tools/` | Shared helpers the steps name: `make_captions.py` (step 06), `stitch_voiceover.py` (step 03), vendored caption fonts in `tools/fonts/`. |
| `.github/workflows/download-video.yml` | The **download relay**: a GitHub Actions workflow that fetches and cuts a background video on a GitHub runner and delivers it back through a git branch — for agents whose sandbox cannot reach YouTube. Used by step 04. |
| `.github/workflows/publish-youtube.yml` | The **upload relay**: authenticates to the YouTube Data API and publishes `final.mp4` from a runner (step 08). Exchange + upload reported back through `publish-result/<id>` branches. |
| `secrets/` | Git-ignored OAuth material for step 08 (`client_secrets.json`, encrypted token). Nothing usable ever enters git. |
| `output/` | Finished videos, one folder per video. Output is a **product**, not part of the system — git-ignored, never edit steps from inside it. |
| `.env` | Optional API keys (git-ignored). Copy from `.env.example`. Nothing here is required. |
| `keys.env` | Optional **committed** API keys (owner accepted the leak risk, 2026-09-06). Fallback after `.env`; `.env` wins. Only owner-approved keys belong here. |

## Conventions

- **Target format: vertical 9:16 (1080×1920).** Every final video is TikTok/Shorts-style vertical.
- **The narration drives the length.** The background video is cut to the audio — never the other way around.
- **The narration drives the captions.** Step 06 syncs to the measured line spans
  from step 03 — typography follows the voice, not the other way around.
- **Content language: English.** Script, voiceover, title, description and tags are
  all English unless the channel profile says otherwise.
- **One video = one folder** in `output/`, with one subfolder per step
  (`01-channel/`, `02-script/`, `03-voiceover/`, `04-background/`, …).
- **Free by default.** The default pipeline costs nothing: built-in agent TTS,
  public source video, FFmpeg. Paid services are opt-in through `.env`.
- **Real footage only.** The background is always a real video with recorded
  provenance (`source.json`). Never AI-generated stills, never a frozen frame.
- **FFmpeg is the video workhorse.** Every cut, composition and format conversion is
  a documented FFmpeg command inside a step file.
- **Small, verifiable outputs.** Each step leaves behind a file the next step can
  check. If you cannot point at a file, the step is not done.

## What "perfect" means (global quality bar)

1. **Retention first.** The first 5 seconds must create an open loop; every 15–30
   seconds must give a reason to keep watching.
2. **One video = one promise.** A single, clear idea delivered from start to finish.
3. **Audio is half the experience.** The voiceover must be clean, well-paced and human.
4. **Visuals serve the narration.** The background must fit the mood — continuous,
   clean, free of watermarks; captions land on the voice, word for word.
5. **Nothing generic.** If a part of the video could be transplanted onto any other
   video and still work, rewrite it.

## Setup (for humans)

```bash
ffmpeg -version              # FFmpeg must be installed (the only hard requirement)
python3 -m pip install -U yt-dlp   # for direct downloads (optional if the relay is used)
cp .env.example .env         # optional — only if you want ElevenLabs voices
```

Then add at least one channel profile in `channels/` (copy `_template.md`), or let
the agent create one. That is all.
