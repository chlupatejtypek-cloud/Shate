# Step 07 — Metadata

> Pipeline step **07 of 8** (numbered 2026-09-06 when step 06 — Captions was
> inserted; step 08 — Publish added same day). Self-contained: read this whole
> file, do the work, verify the Definition of Done, then hand off to step 08
> (or report to the human when publishing is skipped).

## What you produce

- **`output/<video-slug>/metadata.md`** — title, description, tags, hashtags,
  thumbnail note, ready to paste into the upload form
- **One new row in the channel's History table** (`channels/<slug>.md`) — so the
  next run does not repeat this topic

## Information you need

| Info | Where it comes from |
|------|---------------------|
| Topic, promise, hook, facts & sources | `02-script/script.md` |
| Channel, platform, audience, cta | `01-channel/brief.md` |
| Final duration | `final.mp4` (`ffprobe`) |

**Do not ask the human anything.**

## Procedure

### 1. Title (the hook, compressed)

- ≤ 60 characters (Shorts truncate around there on phones).
- Restates the curiosity gap of the hook — never the answer.
- No ALL CAPS, max one emoji, no "#shorts" in the title (it goes in the hashtags).
- Write 5 candidates, pick one, keep the other four in the file as alternates.

### 2. Description

- First line: one sentence that would work as the tweet for this video (it is the
  only line visible before "more").
- Then 2–3 short lines: what the viewer learns, in the channel's tone.
- Then the sources: every fact in the script's research notes gets its link here.
  Honesty is part of the brand.
- Then the channel's `cta` line if it has one.
- Then the hashtag block (see 4).
- Total under 1,000 characters on Shorts, under 2,200 on TikTok/Reels.

### 3. Tags (YouTube "tags" field)

- 10–15 tags, ≤ 500 characters total.
- Order: exact topic phrase → broader topic → channel name → format ("shorts",
  "explained", "did you know") → audience-language variants.
- No misleading tags. If a tag would not pass the "does this video actually cover
  it?" test, drop it.

### 4. Hashtags

- 3–5, in the description: `#shorts` (YouTube) / `#fyp` (TikTok) + 2–3 topical.
- Never more than 5 — platforms treat hashtag walls as spam.

### 5. Thumbnail / cover note

Shorts pick a frame automatically; TikTok/Reels let you choose one. Write down the
timestamp of the best frame (usually 1–3 s in, where the hook lands) and a 3–5 word
overlay suggestion. Do not render a thumbnail — that is a future step module.

### 6. Write `metadata.md`

```
# <Final title>

channel:     <slug>
platform:    <…>
duration:    <mm:ss>
final_file:  output/<video-slug>/final.mp4
language:    en

## Title
<final title>

Alternates:
- …
- …

## Description
<paste-ready block>

## Tags
tag one, tag two, …

## Hashtags
#shorts #… #…

## Cover
frame: 00:02 — overlay: "…"

## Publishing notes
- best posting window for this audience: <…>
- pin this comment: "<one line that restates the promise or asks the loop-back question>"
```

### 7. Append to the channel history

Add one row to the History table at the end of `channels/<slug>.md`:

```
| 2026-09-06 | microwave-blind-spot | Why microwaves have a cold spot | 63.84 s |
```

This is the **only** edit any step makes to a channel profile. Do not change
anything else in the file.

### 8. Final report to the human

One message:

- path to `final.mp4`, path to `metadata.md`
- channel used and how it was selected
- 3 lines: the hook, the core idea, why it works for this audience
- anything that fell short of a Definition of Done, honestly

## Rules

- Everything in `metadata.md` must be true of the video. No promises the video does
  not keep.
- Sources go in the description. Always.
- One row per video in the channel history — even if the human never uploads it.

## Definition of Done

- [ ] `metadata.md` exists with title (≤ 60 chars), description, 10–15 tags,
      3–5 hashtags, cover note
- [ ] Every fact from the script has its source link in the description
- [ ] Title restates the hook's gap, not the answer
- [ ] Channel History table has the new row
- [ ] Final report delivered to the human
