# Step 02 — Script & research

> Pipeline step **02 of 6**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 03.

## What you produce

A ready-to-record script: **`output/<video-slug>/02-script/script.md`**

## Information you need

| Info | Where it comes from |
|------|---------------------|
| Channel brief (audience, promise, format, length, tone, pillars, bans, recent topics) | `01-channel/brief.md` — output of step 01 |
| Topic | **You decide** — unless the brief lists a human hint |
| Angle, structure, exact length | **You decide** |

Everything you need is in the brief. **Do not ask the human anything.** Every choice
you make goes into the script header so it can be reviewed later.

## Procedure

### 1. Nail the topic

- Choose a topic inside one of the brief's **topic pillars** that (a) fits the
  audience and promise, (b) has real current interest or search demand, (c) contains
  a natural curiosity gap or twist.
- It must **not** appear in *Recently used topics* and must not touch anything under
  *Never*.
- Generate 3–5 candidates, score them on the three criteria, pick the best. Write
  the candidates and the one-line rationale in the research notes.
- A weak topic cannot be saved by a strong script — if the best candidate still feels
  weak, generate five more.

### 2. Rename the working folder (once)

Now that the topic is fixed, rename `output/<provisional-slug>/` to a short,
descriptive kebab-case slug (`microwave-blind-spot`, not `curious-minute-2026-09-06`).
This is the only step that renames the folder; every later step uses the new name.

### 3. Deep research on the topic

- Gather enough substance to fill the whole script: facts, numbers, stories,
  examples, counterarguments, what's currently happening in this space.
- **Record a source for every fact** (link). No source → don't use it, or frame it
  clearly as opinion.
- Collect **3–5 possible angles** on the same topic. You choose one in step 5.

### 4. Study viral scripts of this genre

- Research how scripts of **this exact video type** go viral for **this audience**:
  hook patterns, retention techniques, pacing, structure, payoffs.
- Use the brief's *Reference videos* if present; otherwise find **2–3 real
  high-performing Shorts/TikToks** on similar topics and get their transcripts.
- Tear each one down: the hook (verbatim), where the re-hooks are, how the structure
  works, where viewers likely drop, what the payoff is.
- Extract **3–5 concrete lessons** you will actually apply — specific ("open
  mid-action, no greeting", "front-load the payoff", "new beat every 20 s"), never
  generic ("make it engaging").

### 5. Choose the angle and design the structure

- Pick the strongest angle. Define **the one promise** for this video (it must serve
  the channel's promise from the brief). One sentence.
- Design the structure:
  - **Hook** (0:00–0:05) — an open loop, in the channel's `hook_style`
  - **Setup** — why this matters to the viewer, fast
  - **Body** — 3–5 beats; every beat has its own mini-hook and a reason to stay
  - **Payoff** — the promise, delivered clearly
  - **Close** — the channel's `cta` pattern, max 5–10 seconds, no long goodbyes

### 6. Write the script

Format comes from the brief (`format`, `voices`):

- **Monologue:** lines labeled `[NARRATOR]`
- **Dialogue:** lines labeled `[A]` and `[B]` with the brief's gender mapping
  (default: A female, B male)

Rules:

- Write for the **ear**, not the eye: short lines, spoken rhythm. Dialogue lines
  under ~15 words each.
- First line is the hook, verbatim. No greetings, no "in this video we will…".
- Every 15–30 seconds: a new question, claim, or visual-change cue.
- Facts stay factual; personality lives in the lines (especially in dialogue).
- Mark mood shifts inline as `(MOOD: …)` — step 04 uses them only if the video
  needs two background segments; most videos need none.
- Add approximate timestamps per section. Estimate length at ~2.5 words/second
  for dialogue, ~2.7 for monologue; it must land inside the brief's `length_seconds`.
- Language: the brief's `language`.

### 7. Self-review (mandatory)

Read the script out loud. Check every item in the Definition of Done below. Fix,
then re-check. Maximum 3 iterations; if something still fails, say so honestly in
the research notes instead of hiding it.

## Output format — `02-script/script.md` must contain

```
# <Working title>

channel:      <slug>
topic:        <the topic>
angle:        <one line>
format:       monologue | dialogue     # dialogue: A=female, B=male (or as in brief)
audience:     <from brief>
length:       <estimated seconds> (target <min>-<max>)
tone:         <from brief>
background:   <category from brief, or override with reason>

## Hook (0:00–0:05)
<verbatim first lines>

## The promise
<one sentence>

## Script
[0:00] [A] …
[0:07] [B] …   (MOOD: …)
…

## Research notes
- Topic candidates & why this one: …
- Angles considered: …
- Teardown lessons applied: …
- Facts & sources: <fact> — <link>
```

## Definition of Done

- [ ] Topic is inside a pillar, not in recent history, not in *Never*
- [ ] Working folder renamed to the final `<video-slug>`
- [ ] First line is a hook that creates an open loop (no greeting, no context)
- [ ] One promise, stated in one sentence, delivered in the payoff
- [ ] A re-hook or new beat every 15–30 seconds
- [ ] Written for the ear: out-loud pass done, short lines, no "written" phrasing
- [ ] Format and voice mapping declared in the header — **binding for step 03**
- [ ] Every fact has a source in the research notes
- [ ] Estimated length within the brief's `length_seconds`
- [ ] All decisions visible in the header for human review
