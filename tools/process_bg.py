#!/usr/bin/env python3
"""批量处理关卡背景照片 · 48 张 → assets/bg/bg_01.jpg … bg_48.jpg

设计约束（见 PROJECT_MATH_RULES.md §5.17）：
  · 最长边 1024px（手机 / 平板都用 cover 铺满，长边 1024 足够且体积可控）
  · 轻微高斯模糊 blur(3px)，让照片退成背景，不抢前景的数学元素
  · JPEG q80、progressive、optimize，单张目标 ≤ 250 KB
  · **必须剥掉 EXIF / GPS / ICC**：这是孩子的照片，元数据不能带进公开仓库
  · 输出固定两位补零：bg_01.jpg … bg_48.jpg；关卡号 = 图片号（一一对应）

用法：
    # 先看计划，不写文件
    python tools/process_bg.py --src "D:/照片/李旻泽" --dry-run

    # 正式处理（默认覆盖已存在的 bg_NN.jpg）
    python tools/process_bg.py --src "D:/照片/李旻泽"

    # 只补缺的，不覆盖已有
    python tools/process_bg.py --src "D:/照片/李旻泽" --skip-existing

    # 处理后自查（尺寸 / 体积 / EXIF 是否还在）
    python tools/process_bg.py --check
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

# HEIC/HEIF（iPhone 直出）需要额外插件；没装就给一句人话，不静默失败
try:
    import pillow_heif  # type: ignore

    pillow_heif.register_heif_opener()
    HEIC_OK = True
except Exception:                                                 # noqa: BLE001
    HEIC_OK = False

# ---- 固定参数（改这里就等于改全项目规范） ----
MAX_SIDE = 1024          # 最长边
BLUR_RADIUS = 3.0        # 高斯模糊半径
QUALITY = 80             # JPEG 质量
TARGET_KB = 250          # 单张体积上限（超过只提示，不阻断）
LIMIT = 48               # 本次最多处理几张

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
HEIC = {".heic", ".heif"}
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "assets" / "bg"


def human_kb(path: Path) -> int:
    return round(path.stat().st_size / 1024)


def collect(src: Path, limit: int) -> list[Path]:
    """按文件名排序取前 limit 张；只认图片，忽略隐藏文件与其它杂物。"""
    if not src.exists():
        raise SystemExit(f"目录不存在：{src}")
    if not src.is_dir():
        raise SystemExit(f"不是目录：{src}")

    files = [
        p for p in src.iterdir()
        if p.is_file()
        and not p.name.startswith(".")
        and (p.suffix.lower() in SUPPORTED or p.suffix.lower() in HEIC)
    ]
    heic = [p for p in files if p.suffix.lower() in HEIC]
    if heic and not HEIC_OK:
        print(f"⚠ 发现 {len(heic)} 个 HEIC/HEIF 文件，但没装 pillow-heif，将跳过。")
        print("  解决：pip install pillow-heif，或者先用「照片」App 导出成 JPG。")
        files = [p for p in files if p.suffix.lower() not in HEIC]
    files.sort(key=lambda p: (p.name.lower(), p.name))
    if len(files) > limit:
        print(f"⚠ 源目录有 {len(files)} 张图片，只取前 {limit} 张（按文件名排序）")
    return files[:limit]


def strip_metadata(im: Image.Image) -> Image.Image:
    """把 EXIF / GPS / ICC / XMP 全部摘掉——公开仓库里不能留拍摄地信息。"""
    for key in ("exif", "icc_profile", "xmp", "XML:com.adobe.xmp", "photoshop"):
        im.info.pop(key, None)
    return im


def to_rgb(im: Image.Image) -> Image.Image:
    """带透明通道的图先垫白底，不要直接 convert（会变黑）。"""
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, (255, 255, 255))
        canvas.paste(rgba, mask=rgba.split()[-1])
        return canvas
    return im.convert("RGB")


def process_one(src: Path, dst: Path, quality: int, blur: float, max_side: int) -> dict:
    with Image.open(src) as raw:
        # 手机照片的方向写在 EXIF 里，必须先转正再缩放
        im = ImageOps.exif_transpose(raw) or raw
        im = to_rgb(im)

        w, h = im.size
        longest = max(w, h)
        if longest > max_side:
            scale = max_side / float(longest)
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        elif longest < max_side:
            # 小图不放大，避免糊上再糊
            pass

        if blur > 0:
            im = im.filter(ImageFilter.GaussianBlur(blur))

        im = strip_metadata(im)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(
            dst,
            "JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
            subsampling=2,          # 4:2:0，体积更小，模糊后看不出差别
        )

        return {
            "src": src.name,
            "dst": dst.name,
            "w": im.size[0],
            "h": im.size[1],
            "kb": human_kb(dst),
        }


def check(out_dir: Path, expect: int | None) -> int:
    files = sorted(out_dir.glob("bg_*.jpg"))
    print(f"输出目录：{out_dir}")
    print(f"文件数量：{len(files)}" + (f"（期望 {expect}）" if expect else ""))
    problems = 0
    total = 0
    for p in files:
        total += p.stat().st_size
        try:
            with Image.open(p) as im:
                w, h = im.size
                exif = im.info.get("exif")
                has_exif = bool(exif)
                fmt = im.format
        except Exception as exc:                                  # noqa: BLE001
            print(f"  ✗ {p.name} 打不开：{exc}")
            problems += 1
            continue
        kb = human_kb(p)
        flags = []
        if max(w, h) > MAX_SIDE:
            flags.append("尺寸超限")
        if kb > TARGET_KB:
            flags.append("体积偏大")
        if has_exif:
            flags.append("仍有 EXIF")
        if fmt != "JPEG":
            flags.append("不是 JPEG")
        if flags:
            problems += 1
        mark = "✗" if flags else "✓"
        print(f"  {mark} {p.name:12s} {w}×{h}  {kb:4d} KB  {' / '.join(flags)}")
    if files:
        print(f"合计 {round(total / 1024 / 1024, 2)} MB，平均 {round(total / 1024 / len(files))} KB")
    return problems


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="批量处理关卡背景照片（缩放 / 模糊 / 去元数据）")
    ap.add_argument("--src", help="原图目录（只读，不会被改动）")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help=f"输出目录，默认 {DEFAULT_OUT}")
    ap.add_argument("--size", type=int, default=MAX_SIDE, help=f"最长边，默认 {MAX_SIDE}")
    ap.add_argument("--blur", type=float, default=BLUR_RADIUS, help=f"高斯模糊半径，默认 {BLUR_RADIUS}")
    ap.add_argument("--quality", type=int, default=QUALITY, help=f"JPEG 质量，默认 {QUALITY}")
    ap.add_argument("--limit", type=int, default=LIMIT, help=f"最多处理几张，默认 {LIMIT}")
    ap.add_argument("--start", type=int, default=1, help="起始编号，默认 1（bg_01 起）")
    ap.add_argument("--skip-existing", action="store_true", help="已有同名文件则跳过，不覆盖")
    ap.add_argument("--shuffle", action="store_true", help="随机分配（固定种子，可复现）")
    ap.add_argument("--seed", type=int, default=20261030, help="随机种子，默认 20261030")
    ap.add_argument("--dry-run", action="store_true", help="只打印计划，不写文件")
    ap.add_argument("--check", action="store_true", help="只自查输出目录，不处理")
    args = ap.parse_args(argv)

    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir

    if args.check:
        return 1 if check(out_dir, args.limit) else 0

    if not args.src:
        ap.error("缺少 --src（原图目录）；只自查请用 --check")

    src_dir = Path(args.src)
    files = collect(src_dir, args.limit)
    if not files:
        raise SystemExit(f"{src_dir} 里没有可处理的图片（支持 {', '.join(sorted(SUPPORTED))}）")

    if args.shuffle:
        random.Random(args.seed).shuffle(files)
        print(f"随机分配：seed {args.seed}（同样的种子与文件可复现同一套映射）")

    print(f"源目录：{src_dir}")
    print(f"输出目录：{out_dir}")
    print(f"参数：最长边 {args.size} · blur({args.blur}) · q{args.quality} · 共 {len(files)} 张")
    print("")

    done = 0
    skipped = 0
    planned = 0
    results = []

    for i, path in enumerate(files):
        index = args.start + i
        dst = out_dir / f"bg_{index:02d}.jpg"

        if dst.exists() and args.skip_existing:
            print(f"  · {dst.name:12s} 已存在，跳过（{human_kb(dst)} KB）")
            skipped += 1
            continue

        if args.dry_run:
            try:
                with Image.open(path) as im:
                    w, h = im.size
            except Exception as exc:                              # noqa: BLE001
                print(f"  ✗ {path.name} 打不开：{exc}")
                continue
            longest = max(w, h)
            scale = args.size / float(longest) if longest > args.size else 1.0
            tw, th = round(w * scale), round(h * scale)
            print(f"  → {path.name}  {w}×{h}  ⇒  {dst.name}  {tw}×{th}")
            planned += 1
            continue

        try:
            info = process_one(path, dst, args.quality, args.blur, args.size)
        except Exception as exc:                                  # noqa: BLE001
            print(f"  ✗ {path.name} 处理失败：{exc}")
            continue
        results.append(info)
        done += 1
        warn = "  ⚠ 超过 250 KB" if info["kb"] > TARGET_KB else ""
        print(f"  ✓ {info['dst']:12s} {info['w']}×{info['h']}  {info['kb']:4d} KB  ← {info['src']}{warn}")

    if args.dry_run:
        print(f"\n干跑完成：计划输出 {planned} 张，未写任何文件。")
        return 0

    print(f"\n完成：写入 {done} 张，跳过 {skipped} 张。")
    if results:
        total = sum(r["kb"] for r in results)
        print(f"合计约 {round(total / 1024, 2)} MB，平均 {round(total / max(1, len(results)))} KB。")
        print("\n下一步：把 bg_NN.jpg 挂到 levels_data.js（background + assets.images），见 §5.17。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
