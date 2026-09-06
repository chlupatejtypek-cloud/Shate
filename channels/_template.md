# <Channel name>

<!--
Copy this file to channels/<slug>.md (kebab-case). Fill in every field in the
header block — step 01 reads them verbatim. Keep free-text sections short: this is
a profile, not an essay. The `history` section is appended by step 06 after every
video; never edit it by hand except to remove entries.
-->

```yaml
slug:            <kebab-case-slug>          # must equal the file name
name:            <Channel name>
platform:        youtube-shorts | tiktok | instagram-reels | multi
status:          active | paused            # step 01 only picks from active channels
language:        en
niche:           <one line — what the channel is about>
audience:        <who watches — age range, interests, what they come for>
promise:         <the one thing every video on this channel delivers>
format_default:  dialogue | monologue       # what most videos on this channel use
voices:          A=female, B=male           # dialogue mapping (or narrator=<gender>)
length_seconds:  45-75                      # target window for one video
tone:            <3-5 adjectives — e.g. curious, punchy, slightly irreverent>
hook_style:      <how videos on this channel open — e.g. "bold claim, no greeting">
background:      <default satisfying-footage category — e.g. subway-surfers, slime, hydraulic-press>
cta:             <closing line pattern, or "none">
posting_cadence: <e.g. daily / 3x week — informational only>
```

## Topic pillars

<!-- 3–6 recurring topic areas. Step 02 picks a topic inside one of these. -->

- <pillar 1 — one line>
- <pillar 2>
- <pillar 3>

## Never

<!-- Hard bans: subjects, phrasings, claims, styles. Step 02 checks against this list. -->

- <banned thing 1>
- <banned thing 2>

## Reference videos

<!-- 2–5 links to videos (own or others) that show exactly the target style. Step 02
uses them for the teardown. Leave empty if none — the agent will find comparables. -->

- <url — one line on why it is a reference>

## History

<!-- Appended automatically by step 06. Newest at the bottom. One line per video:
date | slug | topic | duration. Step 02 must not reuse a topic listed here. -->

| date | slug | topic | duration |
|------|------|-------|----------|
