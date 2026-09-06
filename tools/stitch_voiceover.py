#!/usr/bin/env python3
"""Step 03 stitcher (reference implementation, see steps/03-voiceover.md):
concatenate 03-voiceover/parts/*.mp3 into narration.mp3 — 24 kHz mono s16,
head/tail silence trim per part, per-line RMS levelling (±6 dB), 250/120 ms
speaker gaps, single loudnorm pass, optional atempo speed factor — then write
timestamps.json on the post-tempo timeline.
"""
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

import av  # PyAV — ffprobe substitute (sandbox has no ffprobe)

VID_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("output/prune-on-purpose")
PARTS = VID_DIR / "03-voiceover" / "parts"
OUT = VID_DIR / "03-voiceover"

TEXTS = {
    1: "Your fingers don't prune because they soak up water. Your brain does it on purpose.",
    2: "It's soggy skin. Everyone knows that.",
    3: "Everyone's wrong. I can prove it.",
    4: "Prove it.",
    5: "In the 1930s, doctors saw patients with one damaged arm nerve — those fingers never wrinkled. Same bath, same water.",
    6: "If it were soaking, a broken nerve wouldn't matter.",
    7: "Exactly. Soaking is passive. This is a switch your body flips.",
    8: "Your nerves squeeze the blood vessels under your fingertips. The tissue shrinks, the skin folds — pruney fingers are even paler.",
    9: "But why bother?",
    10: "Grip. In 2013, people with pruney fingers moved wet marbles twelve percent faster. Dry marbles? No difference.",
    11: "Tire treads.",
    12: "Rain tires. The ridges channel water away, so your skin actually grips. Think ancestors grabbing wet fruit, wet fish.",
    13: "Then why aren't we pruney all the time?",
    14: "Probably costs fingertip sensitivity — so wrinkle mode stays optional.",
    15: "Wrinkle mode. Love it.",
    16: "Next bath, check your hands. That's not water damage. That's engineering.",
}
# line-id -> section name
SECTIONS = [(1, 4, "Hook"), (5, 14, "Body"), (15, 16, "Close")]
GAP_DIFF = 0.250
GAP_SAME = 0.120
LEVEL_CLAMP_LOW_DB = -6.0
LEVEL_CLAMP_HIGH_DB = 16.0  # short TTS lines sometimes render as whispers; the
                            # volume-check already forces one regen, after that a
                            # big digital gain is cleaner than a quiet line
# Human-requested speed-up (2026-09-06): slight tempo lift for retention.
# atempo preserves pitch; all timings below are scaled to the post-tempo timeline.
SPEED = 1.10


def duration(path: Path) -> float:
    """Exact media duration in seconds (container duration can be None)."""
    with av.open(str(path)) as c:
        if c.duration:  # container metadata (mp3) — matches ffprobe
            return c.duration / 1_000_000
        total = 0
        for packet in c.demux(audio=0):
            if packet.dts is not None and packet.duration:
                end = float((packet.dts + packet.duration) * packet.time_base)
                total = max(total, end)
            elif packet.pts is not None and packet.duration:
                end = float((packet.pts + packet.duration) * packet.time_base)
                total = max(total, end)
        return total


def rms_db(path: Path):
    """Overall RMS level in dB via ffmpeg astats (None if unmeasurable)."""
    r = subprocess.run(["ffmpeg", "-i", str(path), "-af", "astats", "-f", "null", "-"],
                       capture_output=True, text=True)
    hits = re.findall(r"RMS level dB:\s*(-?\d+(?:\.\d+)?)", r.stderr)
    return float(hits[-1]) if hits else None  # last = Overall section


def main() -> int:
    parts = sorted(PARTS.glob("*.mp3"))
    if len(parts) != 16:
        print(f"expected 16 parts, found {len(parts)}: {[p.name for p in parts]}", file=sys.stderr)
        return 1

    # per-line levelling: target the median RMS, clamp to ±6 dB
    rms = {p: rms_db(p) for p in parts}
    median = statistics.median(v for v in rms.values() if v is not None)
    gain = {p: max(LEVEL_CLAMP_LOW_DB, min(LEVEL_CLAMP_HIGH_DB, median - rms[p])) for p in parts}
    for p in parts:
        flag = "" if abs(gain[p]) < 0.5 else f"  gain {gain[p]:+.1f} dB"
        print(f"{p.name}: rms {rms[p]:.1f} dB (median {median:.1f}){flag}")

    lines = []
    t = 0.0
    prev_speaker = None
    concat_inputs = []
    for p in parts:
        m = re.match(r"(\d+)-([AB])\.mp3$", p.name)
        line_id, speaker = int(m.group(1)), m.group(2)
        # level → trim head/tail silence (< −45 dB) → 24k mono s16.
        # Two silenceremove passes: chained start/stop trims in one graph are
        # rejected by ffmpeg 7 ("Error parsing filterchain").
        trimmed = OUT / f"_trim_{line_id:03d}.wav"
        head = OUT / f"_head_{line_id:03d}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(p),
             "-af", f"volume={gain[p]:.2f}dB,"
                    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,aresample=24000",
             "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", str(head)],
            check=True, capture_output=True)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(head),
             "-af", "silenceremove=stop_periods=-1:stop_threshold=-45dB:stop_duration=0.08:stop_silence=0.1",
             str(trimmed)], check=True, capture_output=True)
        head.unlink()
        dur = duration(trimmed)
        if dur < 0.2:
            print(f"WARNING: line {line_id} trimmed to {dur:.3f}s — clip likely silent, regenerate it")
        if t > 0:
            gap = GAP_SAME if speaker == prev_speaker else GAP_DIFF
            sil = OUT / f"_sil_{line_id:03d}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                 "-t", str(gap), "-ar", "24000", "-ac", "1", "-sample_fmt", "s16", str(sil)],
                check=True, capture_output=True)
            concat_inputs.append(sil)
            t += gap
        lines.append({"id": line_id, "speaker": speaker,
                      "start": round(t, 2), "end": round(t + dur, 2),
                      "text": TEXTS[line_id]})
        t += dur
        prev_speaker = speaker
        concat_inputs.append(trimmed)

    # concat demuxer: decode to common PCM, loudnorm once, then the speed factor
    lst = OUT / "_concat.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in concat_inputs))
    final = OUT / "narration.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-af", f"aresample=24000,loudnorm=I=-16:TP=-1.5:LRA=11,atempo={SPEED}",
         "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "192k", str(final)],
        check=True, capture_output=True)

    # scale every timing to the post-tempo timeline
    for l in lines:
        l["start"] = round(l["start"] / SPEED, 2)
        l["end"] = round(l["end"] / SPEED, 2)
    gap_post = GAP_DIFF / SPEED

    total = duration(final)
    sections = []
    for first, last, name in SECTIONS:
        sections.append({
            "name": name,
            "start": next(l["start"] for l in lines if l["id"] == first),
            "end": next(l["end"] for l in lines if l["id"] == last) + (gap_post if last < 16 else 0.0),
        })
    sections[-1]["end"] = round(total, 2)

    ts = {
        "engine": "agent-tts",
        "speed_factor": SPEED,
        "duration_seconds": round(total, 2),
        "voices": {"A": "voice-00 (female)", "B": "voice-01 (male)"},
        "lines": lines,
        "sections": sections,
    }
    (OUT / "timestamps.json").write_text(json.dumps(ts, indent=2, ensure_ascii=False) + "\n")
    for p in OUT.glob("_sil_*.wav"):
        p.unlink()
    for p in OUT.glob("_trim_*.wav"):
        p.unlink()
    lst.unlink()
    print(f"narration.mp3 duration = {total:.2f}s, lines = {len(lines)}, speed = {SPEED}x")
    if not (45 * 0.9 <= total <= 70 * 1.1):
        print("WARNING: outside brief window ±10%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
