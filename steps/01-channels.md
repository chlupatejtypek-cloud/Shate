# Step 01 — Channel

> Pipeline step **01 of 6**. Self-contained: read this whole file, do the work,
> verify the Definition of Done, then hand off to step 02.

## What you produce

**`output/<video-slug>/01-channel/brief.md`** — a one-page brief that every later
step reads instead of the full channel profile. Also: the video's working folder.

(You do not know the final topic yet, so pick a **provisional slug** from the channel
name and date, e.g. `curious-minute-2026-09-06`. Step 02 may rename the folder once
the topic is fixed — it is the only step allowed to.)

## Information you need

| Info | Where it comes from |
|------|---------------------|
| Channel profiles | `channels/*.md` (everything except `_template.md`) |
| Optional hint from the human | Their message, if any ("for channel X", "about Y", "60 seconds") |

Nothing else. **Do not ask the human anything.**

## Procedure

### 1. Pick the channel

1. List `channels/*.md`, ignore `_template.md`, parse the YAML block of each.
2. Keep only `status: active`.
3. Selection rule, in priority order:
   - The human named a channel (by name or slug) → that one.
   - The human gave a topic but no channel → the active channel whose pillars fit
     the topic best (say why in the brief).
   - Otherwise → **round-robin**: the active channel with the **oldest last entry in
     its History table** (a channel with an empty history counts as oldest). Ties →
     alphabetical by slug.
4. **No active profile exists** (empty library, or only paused ones) → create one:
   copy `channels/_template.md` to `channels/<slug>.md`, fill in every field with a
   sensible general-interest configuration (use `channels/curious-minute.md` as the
   model), set `status: active`, and continue with it. Say so in the brief. Do not
   ask.

### 2. Read the profile fully

Read the header, pillars, bans, references and **the whole History table**. The
history is what keeps the channel from repeating itself.

### 3. Apply human hints

If the human gave hints, they override the profile for **this video only**
(topic, length, format, background category, language). Record every override.
Never write hints back into the profile.

### 4. Write the brief

Create `output/<video-slug>/01-channel/brief.md`:

```
# Brief — <channel name> — <date>

channel:         <slug>
selected_by:     human-named | topic-fit | round-robin | auto-created
platform:        <…>
language:        <…>
audience:        <…>
promise:         <…>
format:          dialogue | monologue        # from format_default unless overridden
voices:          A=female, B=male            # or narrator=<gender>
length_seconds:  <min>-<max>
tone:            <…>
hook_style:      <…>
background:      <category>
cta:             <…>

## Topic pillars
<copied>

## Never
<copied>

## Reference videos
<copied, or "none">

## Recently used topics (do not repeat)
<last 20 History rows: topic only, newest first — or "none">

## Human hints applied
<list of overrides, or "none">
```

## Rules

- Step 01 **reads** profiles; it never edits an existing one (only step 07 appends
  history). The single exception is creating a brand-new profile when none exists.
- One channel per video. Never blend two profiles.
- Keep the brief under one screen. Everything downstream should be decidable from it
  without opening the profile again.

## Definition of Done

- [ ] Exactly one active channel selected, and `selected_by` says how
- [ ] `output/<video-slug>/01-channel/brief.md` exists and has every header field
- [ ] Recently used topics listed (so step 02 can avoid them)
- [ ] Human hints (if any) listed as overrides — profile file untouched
- [ ] If a profile was auto-created: it is saved in `channels/` and marked in the brief
