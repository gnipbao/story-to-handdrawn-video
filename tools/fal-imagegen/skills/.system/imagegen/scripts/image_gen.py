#!/usr/bin/env python3
"""Codex imagegen CLI contract, backed by FAL AI.

scripts/story-to-video.mjs generates illustrations by shelling out to
    $CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py
which ships with Codex and therefore does not exist on a CI runner. This file
implements the same contract on top of fal_image.py from delphichi/2025trip,
so pointing CODEX_HOME at tools/fal-imagegen/ makes `--generator api` work
anywhere, with no changes to the renderer.

Contract expected by runImage2() in scripts/story-to-video.mjs:

    image_gen.py {generate|edit} --model MODEL [--image REF]... \
        --prompt-file FILE --size WxH --quality QUALITY --out OUT.png [--force]

Differences bridged here:
  generate/edit  -> --endpoint text-to-image / edit
  --image        -> --ref (repeatable)
  --size WxH     -> --aspect-ratio plus an exact image_size via --extra, because
                    the ffmpeg crops downstream assume the master's exact pixels
  --out PATH     -> fal_image.py names files itself, so render into a temp dir
                    and move the single result to PATH
  --force        -> without it, an existing --out is left alone

Environment:
  FAL_KEY        required by fal_image.py
  FAL_IMAGE_CLI  path to fal_image.py (default: ../fal_image.py next to this file)
"""

from __future__ import annotations

import argparse
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def find_fal_cli() -> Path:
    configured = os.environ.get("FAL_IMAGE_CLI", "").strip()
    candidates = [Path(configured)] if configured else []
    candidates += [
        HERE / "fal_image.py",
        HERE.parent / "fal_image.py",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    sys.exit(
        "fal_image.py not found. Set FAL_IMAGE_CLI to its path, or place it "
        f"next to {HERE}."
    )


def parse_size(size: str) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in size.lower().split("x", 1))
    except ValueError:
        sys.exit(f"--size must look like 1024x1536, got {size!r}")
    if width <= 0 or height <= 0:
        sys.exit(f"--size must be positive, got {size!r}")
    return width, height


def aspect_ratio(width: int, height: int) -> str:
    divisor = math.gcd(width, height)
    return f"{width // divisor}:{height // divisor}"


def main() -> None:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("operation", choices=("generate", "edit"))
    parser.add_argument("--model", default="gpt-image-2")
    parser.add_argument("--image", action="append", default=[])
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--size", default="1024x1024")
    parser.add_argument("--quality", default="high")
    parser.add_argument("--out", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    out = Path(args.out).expanduser()
    if out.exists() and not args.force:
        print(f"[fal-imagegen] {out} exists; pass --force to regenerate.")
        return

    prompt_file = Path(args.prompt_file).expanduser().resolve()
    if not prompt_file.is_file():
        sys.exit(f"Prompt file not found: {prompt_file}")

    refs = [Path(image).expanduser().resolve() for image in args.image]
    missing = [str(ref) for ref in refs if not ref.is_file()]
    if missing:
        sys.exit("Reference image(s) not found: " + ", ".join(missing))

    # `edit` needs at least one reference; fall back rather than fail, since the
    # first scene of a story legitimately has none.
    endpoint = "edit" if (args.operation == "edit" and refs) else "text-to-image"
    if args.operation == "edit" and not refs:
        print("[fal-imagegen] edit requested without references; using text-to-image.")

    width, height = parse_size(args.size)
    command = [
        sys.executable,
        str(find_fal_cli()),
        "--model", args.model,
        "--endpoint", endpoint,
        "--prompt-file", str(prompt_file),
        "--aspect-ratio", aspect_ratio(width, height),
        "--num-images", "1",
        "--quality", args.quality,
        "--output-format", "png",
        # Pin the exact pixels: story-to-video.mjs crops the master with
        # `crop=1024:1024:0:512`, which only lines up at the requested size.
        "--extra", f'{{"image_size": {{"width": {width}, "height": {height}}}}}',
    ]
    for ref in refs:
        command += ["--ref", str(ref)]

    with tempfile.TemporaryDirectory() as staging:
        command += ["--output-dir", staging]
        print("[fal-imagegen] " + " ".join(command), file=sys.stderr)
        subprocess.run(command, check=True)

        produced = sorted(Path(staging).glob("*.png"))
        if not produced:
            sys.exit("fal_image.py produced no PNG.")
        if len(produced) > 1:
            print(f"[fal-imagegen] {len(produced)} images returned; keeping the first.")
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(produced[0]), out)

    print(f"[fal-imagegen] wrote {out}")


if __name__ == "__main__":
    main()
