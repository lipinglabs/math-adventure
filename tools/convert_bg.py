#!/usr/bin/env python3
"""把 assets/bg/*.jpg 转成 WebP（质量 76，method=6），并删除原 JPG。

前提：tools/compress 之前已把原图备份到 backups-optimize-*/assets/。
尺寸保持 780x1688（手机 2x），只换编码；背景是白纱水印，画质余量充足。

用法：
    python tools/convert_bg.py --dry-run   # 只报告预计体积
    python tools/convert_bg.py             # 生成 .webp 并删除 .jpg
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BG = ROOT / "assets" / "bg"
QUALITY = 76


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    jpgs = sorted(BG.glob("*.jpg"))
    if not jpgs:
        print("没有找到 .jpg，可能已经转换过了")
        return 0

    before = after = 0
    for src in jpgs:
        im = Image.open(src).convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="WEBP", quality=QUALITY, method=6)
        data = buf.getvalue()
        before += src.stat().st_size
        after += len(data)
        if not args.dry_run:
            (BG / (src.stem + ".webp")).write_bytes(data)
            src.unlink()

    print(f"文件 {len(jpgs)} 张")
    print(f"JPG {before / 1048576:.2f} MB -> WebP {after / 1048576:.2f} MB "
          f"(省 {(1 - after / before) * 100:.1f}%)")
    if args.dry_run:
        print("dry-run：未写入任何文件")
    else:
        print("已写入 .webp 并删除 .jpg（原图在 backups-optimize-20261114/assets/）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
