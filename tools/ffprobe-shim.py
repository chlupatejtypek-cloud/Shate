#!/usr/bin/env python3
"""Minimal ffprobe replacement backed by PyAV (sandbox has no ffmpeg/ffprobe
from apt; ffmpeg itself comes from imageio-ffmpeg).

Supports the option subset the Shate pipeline uses:
  -v error
  -select_streams v:0 | a | a:0
  -show_entries format=duration | stream=width,height,... | format=X:stream=Y
  -of csv=p=0 | default=nw=1
Anything unrecognised is treated as the input file.
"""
import sys

import av


def r_frame_rate(stream):
    rate = stream.average_rate or stream.base_rate
    try:
        return f"{rate.numerator}/{rate.denominator}"
    except Exception:
        return "0/0"


def main(argv):
    select = None
    entries = []
    out_fmt = "default"
    infile = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "-v":
            i += 2
            continue
        if arg == "-select_streams":
            select = argv[i + 1]
            i += 2
            continue
        if arg == "-show_entries":
            entries.append(argv[i + 1])
            i += 2
            continue
        if arg == "-of":
            out_fmt = argv[i + 1]
            i += 2
            continue
        if arg.startswith("-"):
            i += 1
            continue
        infile = arg
        i += 1

    if not infile:
        print("ffprobe-shim: no input file", file=sys.stderr)
        return 1

    # flatten "a:b,c=d" entry groups
    want_format, want_stream = set(), set()
    for group in entries:
        for part in group.split(":"):
            key, _, fields = part.partition("=")
            if key == "format":
                want_format.update(f.strip() for f in fields.split(","))
            elif key == "stream":
                want_stream.update(f.strip() for f in fields.split(","))

    csv_mode = out_fmt.startswith("csv")
    lines = []

    with av.open(infile) as container:
        if want_format:
            dur = container.duration
            for f in sorted(want_format):
                if f == "duration":
                    val = "" if dur is None else f"{dur / 1_000_000:.6f}"
                    lines.append(("format", "duration", val))

        for stream in container.streams:
            stype = stream.type  # 'video' / 'audio'
            if select:
                kind = select.split(":")[0]
                if kind == "v" and stype != "video":
                    continue
                if kind == "a" and stype != "audio":
                    continue
            elif not want_stream:
                continue

            vals = {}
            vals["codec_type"] = "video" if stype == "video" else stype
            vals["codec_name"] = stream.codec_context.name or ""
            if stype == "video":
                vals["width"] = str(stream.codec_context.width)
                vals["height"] = str(stream.codec_context.height)
                vals["r_frame_rate"] = r_frame_rate(stream)
                vals["sample_rate"] = ""
                vals["channels"] = ""
            else:
                vals["sample_rate"] = str(stream.codec_context.sample_rate or "")
                vals["channels"] = str(stream.codec_context.channels or "")
                vals["width"] = ""
                vals["height"] = ""
                vals["r_frame_rate"] = "0/0"

            order = ["codec_type", "codec_name", "width", "height",
                     "r_frame_rate", "sample_rate", "channels"]
            fields = [f for f in order if (not want_stream or f in want_stream)]
            for f in fields:
                if vals.get(f, ""):
                    lines.append(("stream", f, vals[f]))

    if csv_mode:
        print(",".join(v for _s, _k, v in lines if v != ""))
    else:
        for _s, k, v in lines:
            print(f"{k}={v}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
