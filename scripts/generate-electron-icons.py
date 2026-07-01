#!/usr/bin/env python3
"""Generate electron-builder icon assets from the app logo source."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "electron" / "assets" / "app-icon-source.png"
BUILD_DIR = ROOT / "build"
ELECTRON_ASSETS = ROOT / "electron" / "assets"

LINUX_SIZE = 512
WINDOWS_SIZES = [16, 32, 48, 64, 128, 256]
RUNTIME_ICON_SIZE = 256


def make_square_icon(source: Image.Image, size: int) -> Image.Image:
    source = source.convert("RGBA")
    max_side = max(source.size)
    canvas = Image.new("RGBA", (max_side, max_side), (0, 0, 0, 0))
    offset = ((max_side - source.width) // 2, (max_side - source.height) // 2)
    canvas.paste(source, offset, source)
    padding = int(max_side * 0.08)
    inner = max_side - padding * 2
    fitted = canvas.resize((inner, inner), Image.Resampling.LANCZOS)
    square = Image.new("RGBA", (max_side, max_side), (0, 0, 0, 0))
    square.paste(fitted, (padding, padding), fitted)
    return square.resize((size, size), Image.Resampling.LANCZOS)


def main() -> int:
    if not SOURCE.exists():
        print(f"Missing source icon: {SOURCE}", file=sys.stderr)
        return 1

    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    ELECTRON_ASSETS.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as img:
        linux_icon = make_square_icon(img, LINUX_SIZE)
        linux_path = BUILD_DIR / "icon.png"
        linux_icon.save(linux_path, format="PNG", optimize=True)

        ico_images = [make_square_icon(img, size) for size in WINDOWS_SIZES]
        ico_path = BUILD_DIR / "icon.ico"
        # Pillow uses the first image as the ICO header size; start with 256x256.
        ico_images[-1].save(
            ico_path,
            format="ICO",
            sizes=[(size, size) for size in WINDOWS_SIZES],
            append_images=ico_images[:-1],
        )

        runtime_icon = make_square_icon(img, RUNTIME_ICON_SIZE)
        runtime_path = ELECTRON_ASSETS / "icon.png"
        runtime_icon.save(runtime_path, format="PNG", optimize=True)

    print(f"Wrote {linux_path}")
    print(f"Wrote {ico_path}")
    print(f"Wrote {runtime_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
