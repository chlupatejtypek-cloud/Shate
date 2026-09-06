# Step 01 — Script & research

> Pipeline step **01 of 5**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 02.

## What you produce

A ready-to-record script: **`output/<video-slug>/01-script/script.md`**

## Information you need before starting

| Info | Where it comes from |
|------|---------------------|
| Target channel (which channel the video is for, what it's about) | Human. **If missing, ask.** |
| Mode | Human, or default → **Autonomous** |
| Topic | Human (Guided mode) · **you** (Autonomous mode) |
| Format: monologue or dialogue | Human, or **you** (Autonomous mode) |
| Target audience | Derive from the channel — then state it explicitly in the script header |
| Target length | Derive from the channel's typical format — state it explicitly |
| Tone / style | Derive from the channel — state it explicitly |

**Rule:** before you write a single word, check the table above. If anything you
actually need is missing, ask the human **in one batched question**. Never invent
answers for things the human should decide (channel, topic in Guided mode).
Everything you decide yourself in Autonomous mode gets written into the script
header so it can be reviewed later.

### Mode A — Autonomous (default)

You make every creative decision: topic, angle, format, length, tone. Your job is to
make those decisions fit the target channel so well that the finished video looks
like it belongs there.

### Mode B — Guided

The human gave you a topic or idea (maybe with constraints). Keep their topic;
everything else is still your decision.

## Procedure

### 1. Nail the topic (Autonomous mode)

- Study the target channel first: what it covers, which of its videos perform
  best, what its audience comes for.
- Pick a topic that (a) fits the channel, (b) has real current interest or search
  demand, (c) contains a natural curiosity gap or twist.
- Write your choice + a one-line rationale in the research notes.
- If the topic feels weak, try up to three more. A weak topic cannot be saved by a
  strong script.

### 2. Deep research on the topic

- Gather enough substance to fill the whole script: facts, numbers, stories,
  examples, counterarguments, what's currently happening in this space.
- **Record a source for every fact** (link). No source → don't use it, or frame it
  clearly as opinion.
- Collect **3–5 possible angles** on the same topic — different ways it could be
  told. You will choose one in step 4.

### 3. Study viral scripts of this genre

- Research how scripts of **this exact video type** go viral for **this audience**:
  hook patterns, retention techniques, pacing, structure, payoffs.
- Find **2–3 real YouTube videos** on similar topics (preferably successful ones)
  and get their transcripts/scripts.
- Tear each one down: the hook (verbatim), where the re-hooks are, how the structure
  works, where viewers likely drop, what the payoff is.
- Extract **3–5 concrete lessons** you will actually apply — specific ("open
  mid-action, no greeting", "front-load the payoff", "new beat every 20s"), never
  generic ("make it engaging").

### 4. Choose the angle and design the structure

- Pick the strongest angle. Define **the one promise**: what the viewer gets by
  watching to the end. One sentence.
- Design the structure:
  - **Hook** (0:00–0:05) — an open loop: mid-action, or a claim you can't ignore
  - **Setup** — why this matters to the viewer, fast
  - **Body** — 3–5 beats; every beat has its own mini-hook and a reason to stay
  - **Payoff** — the promise, delivered clearly
  - **Close** — short CTA or loop-back, max 5–10 seconds, no long goodbyes

### 5. Write the script

Choose the format (Autonomous mode default for dialogues: **girl (A) + guy (B)**;
monologue is a perfectly valid choice when the topic suits it):

- **Monologue:** lines labeled `[NARRATOR]`
- **Dialogue:** lines labeled `[A]` (female voice) and `[B]` (male voice) — or
  whatever the human configured

Rules:

- Write for the **ear**, not the eye: short lines, spoken rhythm. Dialogue lines
  under ~15 words each.
- First line is the hook, verbatim. No greetings, no "in this video we will…".
- Every 15–30 seconds: a new question, claim, or visual-change cue.
- Facts stay factual; personality lives in the lines (especially in dialogue).
- Mark visual/B-roll ideas inline as `(B-ROLL: …)` — step 03 consumes these.
- Add approximate timestamps per section.

### 6. Self-review (mandatory)

Read the script out loud. Check every item in the Definition of Done below. Fix,
then re-check. Maximum 3 iterations; if something still fails, say so honestly in
your handoff to the human instead of hiding it.

## Output format — `01-script/script.md` must contain

```
# <Working title>

channel:      <target channel>
mode:         autonomous | guided
topic:        <the topic>
format:       monologue | dialogue     # for dialogue: voices = A female, B male (or as configured)
audience:     <target audience>
length:       <target length>
tone:         <tone>

## Hook (0:00–0:05)
<verbatim first lines>

## The promise
<one sentence>

## Script
[0:00] [A] …
[0:07] [B] …   (B-ROLL: …)
…

## Research notes
- Angles considered: …
- Teardown lessons applied: …
- Facts & sources: <fact> — <link>
```

## Definition of Done

- [ ] First line is a hook that creates an open loop (no greeting, no context)
- [ ] One promise, stated in one sentence, delivered in the payoff
- [ ] A re-hook or new beat every 15–30 seconds
- [ ] Written for the ear: out-loud pass done, short lines, no "written" phrasing
- [ ] Format declared in the header — **this is binding for step 02's voice setup**
- [ ] Every fact has a source in the research notes
- [ ] B-ROLL cues present, so step 03 has something concrete to work with
- [ ] Estimated length within the target
- [ ] All Autonomous-mode decisions visible in the header for human review
