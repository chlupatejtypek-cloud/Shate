#!/usr/bin/env python3
"""Step 06 — caption generator.

Reads 03-voiceover/timestamps.json (measured, post-tempo line spans) and writes
06-captions/captions.ass: word-pop karaoke captions for 1080x1920 Shorts.

Sync model: line start/end are *measured* from the actual TTS audio (exact
anchors). Word times inside a line are interpolated char-proportionally with
punctuation pause bonuses — TTS pacing is uniform enough that this lands words
within ~±60 ms of the audio. If a future engine provides real word timestamps,
feed them through the same grouping code instead (see WORD_TIMES override).
"""
import json
import re
import sys
from pathlib import Path

# ------------------------- style (see steps/06-captions.md) -------------------
FONT = "Montserrat ExtraBold"
FONTSIZE = 90
MAX_CHARS = 11        # hard cap: chars per caption group, incl. spaces
MAX_WORDS = 3         # hard cap: words per group
MAX_GROUP_DUR = 0.85  # seconds a group may stay on screen
MIN_GROUP_DUR = 0.22  # shorter tail groups are merged into the previous one
BREAK_AFTER = {".", "!", "?"}          # sentence boundaries break a group
PAUSE_LONG = 4.0      # punctuation weight in "char equivalents": . ! ?
PAUSE_SHORT = 2.0     # , ; : —
POP = r"{\t(0,85,\fscx110\fscy110)}"   # subtle grow-in, reads great at speed


def ass_time(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    c = int(round((t - int(t)) * 100))
    if c == 100:
        s, c = s + 1, 0
    return f"{h}:{m:02d}:{s:02d}.{c:02d}"


def split_tokens(text: str):
    """Words + standalone punctuation dashes."""
    return text.replace("—", " — ").split()


def timed_words(line):
    """Interpolate word spans inside the measured line span."""
    s, e = line["start"], line["end"]
    tokens = split_tokens(line["text"])
    words, weights = [], []
    for tok in tokens:
        if tok in {"—", "-", "–"}:            # dash = pause on previous word
            if weights:
                weights[-1] += PAUSE_SHORT
            continue
        w = max(2, len(tok))
        if tok[-1:] in BREAK_AFTER:
            w += PAUSE_LONG
        elif tok[-1:] in {",", ";", ":"}:
            w += PAUSE_SHORT
        words.append(tok.strip())
        weights.append(w)
    total = sum(weights) or 1
    span = max(0.2, e - s)
    t = s
    out = []
    for word, w in zip(words, weights):
        d = span * w / total
        out.append({"word": word, "start": t, "end": t + d})
        t += d
    out[-1]["end"] = e                       # close exactly on the anchor
    return out


def group_words(words):
    groups, cur = [], []
    for wd in words:
        text = " ".join(w["word"] for w in cur + [wd])
        dur = wd["end"] - (cur[0]["start"] if cur else wd["start"])
        if (cur
                and (len(text) > MAX_CHARS
                     or len(cur) >= MAX_WORDS
                     or dur > MAX_GROUP_DUR
                     or cur[-1]["word"][-1:] in BREAK_AFTER)):
            groups.append(cur)
            cur = []
        cur.append(wd)
    if cur:
        groups.append(cur)
    # merge a too-short tail group into its predecessor
    if len(groups) > 1:
        g = groups[-1]
        if g[-1]["end"] - g[0]["start"] < MIN_GROUP_DUR and \
                len(" ".join(w["word"] for w in groups[-2] + g)) <= MAX_CHARS + 3:
            groups[-2].extend(g)
            groups.pop()
    return groups


def build_events(lines, video_dur):
    events = []
    for i, line in enumerate(lines):
        words = timed_words(line)
        groups = group_words(words)
        next_line_start = lines[i + 1]["start"] if i + 1 < len(lines) else video_dur
        for j, g in enumerate(groups):
            start = max(line["start"], g[0]["start"] - 0.03)
            if j + 1 < len(groups):
                end = groups[j + 1][0]["start"] - 0.04
            else:
                end = min(line["end"] + 0.25, next_line_start - 0.04)
            end = max(start + 0.12, min(end, video_dur))
            text = POP + " ".join(w["word"] for w in g).upper()
            events.append((start, end, text))
    return events


def main():
    vid = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("output/prune-on-purpose")
    ts = json.loads((vid / "03-voiceover" / "timestamps.json").read_text())
    dur = float(ts["duration_seconds"])
    out_dir = vid / "06-captions"
    out_dir.mkdir(parents=True, exist_ok=True)

    events = build_events(ts["lines"], dur)
    header = f"""[Script Info]
Title: Shate captions — {vid.name}
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Encoding, MarginL, MarginR, MarginV, Alignment
Style: Cap,{FONT},{FONTSIZE},&H00FFFFFF,&H000019FF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,6,3,1,70,70,330,2

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    body = "".join(
        f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{text}\n"
        for s, e, text in events)
    (out_dir / "captions.ass").write_text(header + body, encoding="utf-8")

    audit = [{"line": line["id"], "speaker": line["speaker"],
              "words": [{k: round(v, 3) if isinstance(v, float) else v
                         for k, v in w.items()} for w in timed_words(line)]}
             for line in ts["lines"]]
    (out_dir / "word_timing.json").write_text(json.dumps(audit, indent=1, ensure_ascii=False))
    print(f"{len(events)} caption events -> {out_dir/'captions.ass'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
