#!/usr/bin/env python3
"""批量处理关卡背景照片 · 48 张 → assets/bg/bg_01.jpg … bg_48.jpg

设计约束（2026-10-31 改版，见 PROJECT_MATH_RULES.md §5.17）：
  · **不模糊**：旧版 blur(3px) + 72% 白纱，人物糊成一团；现在保留原始清晰度，
    由 CSS 的 `opacity: .5` 把照片压成背景（`.level-bg-img.is-on`）。
  · **按屏幕比例预裁**：屏幕 390:844，照片无论横竖都裁成 0.462 的竖条，
    裁切窗口以人脸为中心（无脸时用布局文件里的人工中心），保证主体不被切边。
  · 输出 **780×1688**（2 倍屏），JPEG q86 progressive，单张约 140 KB。
  · **必须剥掉 EXIF / GPS / ICC**：这是孩子的照片，元数据不能带进公开仓库。
  · 关卡号 = 图片号（一一对应）；照片与关卡的配对由 `--shuffle --seed 20261030` 固定。

用法：
    # 完全复现线上那一版（推荐）：按 tools/bg_layout.json 逐张裁
    python tools/process_bg.py --src "D:/照片" --layout tools/bg_layout.json

    # 重新自主裁切（人脸检测；没装 opencv 就居中）
    python tools/process_bg.py --src "D:/照片" --shuffle --seed 20261030

    # 只补缺的 / 只看计划 / 自查输出
    python tools/process_bg.py --src "D:/照片" --skip-existing
    python tools/process_bg.py --src "D:/照片" --dry-run
    python tools/process_bg.py --check
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

try:
    import pillow_heif  # type: ignore

    pillow_heif.register_heif_opener()
    HEIC_OK = True
except Exception:                                                 # noqa: BLE001
    HEIC_OK = False

# ---- 固定参数（改这里就等于改全项目规范） ----
SCREEN = (390, 844)       # 参考机型，决定裁切比例
OUT_W, OUT_H = 780, 1688  # 2 倍屏输出
BLUR_RADIUS = 0.0         # 不再模糊
QUALITY = 86
TARGET_KB = 260
LIMIT = 48
DEFAULT_LAYOUT = Path(__file__).resolve().parent / "bg_layout.json"

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
HEIC = {".heic", ".heif"}
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "assets" / "bg"


def human_kb(path: Path) -> int:
    return round(path.stat().st_size / 1024)


def collect(src: Path, limit: int) -> list[Path]:
    if not src.exists():
        raise SystemExit(f"目录不存在：{src}")
    if not src.is_dir():
        raise SystemExit(f"不是目录：{src}")
    files = [
        p for p in src.iterdir()
        if p.is_file() and not p.name.startswith(".")
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
    for key in ("exif", "icc_profile", "xmp", "XML:com.adobe.xmp", "photoshop"):
        im.info.pop(key, None)
    return im


def to_rgb(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, (255, 255, 255))
        canvas.paste(rgba, mask=rgba.split()[-1])
        return canvas
    return im.convert("RGB")


def face_center_x(im: Image.Image) -> float | None:
    """最大人脸的水平中心（0–1）。没装 opencv 或检不到就返回 None。"""
    try:
        import cv2                                    # noqa: PLC0415
        import numpy as np                            # noqa: PLC0415
    except Exception:                                 # noqa: BLE001
        return None
    try:
        small = im.convert("RGB")
        small.thumbnail((900, 900), Image.LANCZOS)
        gray = cv2.cvtColor(np.array(small), cv2.COLOR_RGB2GRAY)
        cas = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cas.detectMultiScale(gray, 1.1, 5, minSize=(24, 24))
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
        return (x + w / 2) / small.width
    except Exception:                                 # noqa: BLE001
        return None


def crop_to_screen(im: Image.Image, center: float) -> Image.Image:
    """按 SCREEN 比例裁一条，center 是裁切窗口的水平中心（0–1，越界自动 clamp）。"""
    W, H = im.size
    aspect = SCREEN[0] / SCREEN[1]
    win_w = int(round(H * aspect))
    if win_w <= W:
        left = max(0.0, min(W - win_w, center * W - win_w / 2))
        return im.crop((int(left), 0, int(left) + win_w, H))
    # 比目标更竖的图：改成按宽裁高
    win_h = int(round(W / aspect))
    top = max(0.0, min(H - win_h, center * H - win_h / 2))
    return im.crop((0, int(top), W, int(top) + win_h))


def process_one(src: Path, dst: Path, quality: int, blur: float,
                center: float | None, use_crop: bool) -> dict:
    with Image.open(src) as raw:
        im = ImageOps.exif_transpose(raw) or raw
        im = to_rgb(im)

        how = "原图"
        if use_crop:
            if center is None:
                center = face_center_x(im)
                how = "人脸"
                if center is None:
                    center, how = 0.5, "居中"
            else:
                how = "布局指定"
            # 人脸略偏左放，人物在画面里就更偏右一点
            im = crop_to_screen(im, center - 0.05 if how == "人脸" else center)

        if blur > 0:
            im = im.filter(ImageFilter.GaussianBlur(blur))

        if im.size != (OUT_W, OUT_H):
            im = im.resize((OUT_W, OUT_H), Image.LANCZOS)

        im = strip_metadata(im)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True,
                subsampling=2)

        return {"src": src.name, "dst": dst.name, "w": im.size[0], "h": im.size[1],
                "kb": human_kb(dst), "how": how}


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
                has_exif = bool(im.info.get("exif"))
                fmt = im.format
        except Exception as exc:                                  # noqa: BLE001
            print(f"  ✗ {p.name} 打不开：{exc}")
            problems += 1
            continue
        kb = human_kb(p)
        flags = []
        if (w, h) != (OUT_W, OUT_H):
            flags.append(f"尺寸应为 {OUT_W}×{OUT_H}")
        if kb > TARGET_KB:
            flags.append("体积偏大")
        if has_exif:
            flags.append("仍有 EXIF")
        if fmt != "JPEG":
            flags.append("不是 JPEG")
        if flags:
            problems += 1
        print(f"  {'✗' if flags else '✓'} {p.name:12s} {w}×{h}  {kb:4d} KB  {' / '.join(flags)}")
    if files:
        print(f"合计 {round(total / 1024 / 1024, 2)} MB，平均 {round(total / 1024 / len(files))} KB")
    return problems


def load_layout(path: Path) -> dict[str, float]:
    """bg_layout.json → {文件名: 裁切中心}。"""
    data = json.loads(path.read_text(encoding="utf-8"))
    return {item["file"]: item["center"] for item in data["items"]}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="批量处理关卡背景照片（裁切 / 去元数据）")
    ap.add_argument("--src", help="原图目录（只读，不会被改动）")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help=f"输出目录，默认 {DEFAULT_OUT}")
    ap.add_argument("--layout", nargs="?", const=str(DEFAULT_LAYOUT), default=None,
                    help="按布局文件逐张裁（默认读 tools/bg_layout.json）")
    ap.add_argument("--no-crop", action="store_true", help="不裁切，只缩放（旧行为）")
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

    centers: dict[str, float] = {}
    if args.layout and not args.no_crop:
        lp = Path(args.layout)
        if not lp.is_absolute():
            lp = ROOT / lp
        if lp.exists():
            centers = load_layout(lp)
            print(f"布局文件：{lp}（{len(centers)} 条裁切中心）")
        else:
            print(f"⚠ 布局文件不存在：{lp}，改用自动人脸定位")

    print(f"源目录：{src_dir}")
    print(f"输出目录：{out_dir}")
    print(f"参数：{OUT_W}×{OUT_H} · blur({args.blur}) · q{args.quality} · 共 {len(files)} 张")

    done = skipped = planned = 0
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
            extra = f"  center={centers[path.name]}" if path.name in centers else ""
            print(f"  → {path.name}  {w}×{h}  ⇒  {dst.name}  {OUT_W}×{OUT_H}{extra}")
            planned += 1
            continue

        try:
            info = process_one(path, dst, args.quality, args.blur,
                               centers.get(path.name), not args.no_crop)
        except Exception as exc:                                  # noqa: BLE001
            print(f"  ✗ {path.name} 处理失败：{exc}")
            continue
        results.append(info)
        done += 1
        warn = f"  ⚠ 超过 {TARGET_KB} KB" if info["kb"] > TARGET_KB else ""
        print(f"  ✓ {info['dst']:12s} {info['w']}×{info['h']}  {info['kb']:4d} KB"
              f"  [{info['how']}]  ← {info['src']}{warn}")

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
