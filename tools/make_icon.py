#!/usr/bin/env python3
"""把指定照片裁成网页 App 图标（头到腰的上半身）。

用法：
    python tools/make_icon.py "源图.jpg"
    python tools/make_icon.py "源图.jpg" --box 0.11,0.05,0.89,0.57

--box 用相对坐标 left,top,right,bottom 指定裁剪框；默认取竖向 5%~57%，
即「头部到腰」的上半身。输出：
    icons/icon-512.png
    icons/icon-192.png
    icons/apple-touch-icon-180.png
    icons/icon-maskable-512.png   （奶油底 + 80% 安全区）
    icons/favicon-32.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"


def crop_square(img: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    w, h = img.size
    left, top, right, bottom = box
    x0, y0 = int(left * w), int(top * h)
    x1, y1 = int(right * w), int(bottom * h)

    # 以较短的边为准收成正方形，保持人物居中
    side = min(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    x0 = max(0, min(w - side, cx - side // 2))
    y0 = max(0, min(h - side, cy - side // 2))
    return img.crop((x0, y0, x0 + side, y0 + side))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--box", default="0.10,0.05,0.90,0.58",
                        help="相对裁剪框 left,top,right,bottom")
    args = parser.parse_args()

    src = Path(args.source)
    if not src.exists():
        print(f"找不到源图：{src}", file=sys.stderr)
        return 1

    box = tuple(float(x) for x in args.box.split(","))
    if len(box) != 4:
        print("--box 需要 4 个 0~1 的数字", file=sys.stderr)
        return 1

    OUT.mkdir(exist_ok=True)
    img = Image.open(src).convert("RGB")
    square = crop_square(img, box)  # type: ignore[arg-type]

    for size in (512, 192, 180, 32):
        name = {
            512: "icon-512.png",
            192: "icon-192.png",
            180: "apple-touch-icon-180.png",
            32: "favicon-32.png",
        }[size]
        square.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print(f"  + icons/{name}")

    # maskable：内容缩到 80%，四周留奶油底，避免被系统圆形裁切切到脸
    canvas = Image.new("RGB", (512, 512), (255, 248, 236))
    inner = square.resize((410, 410), Image.LANCZOS)
    mask = Image.new("L", (410, 410), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 409, 409), fill=255)
    canvas.paste(inner, (51, 51), mask)
    canvas.save(OUT / "icon-maskable-512.png", optimize=True)
    print("  + icons/icon-maskable-512.png")

    print("完成。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
