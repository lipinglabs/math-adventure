#!/usr/bin/env python3
"""豆包语音合成大模型 2.0 · 按关卡批量生成独立 mp3。

设计原则（见 PROJECT_MATH_RULES.md §2）：
  · 密钥只从环境变量 DOUBAO_API_KEY 或 config/secrets.local.json 读取，绝不硬编码
  · 一次成型：已存在的 mp3 默认跳过，避免音色漂移；重做必须显式 --force
  · 不做循环重试：单条失败立即记账并跳过，最后一次性汇总（配额是钱）
  · 输出独立 .mp3 文件，绝不内联 base64

用法：
    python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01 --dry-run
    python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01
    python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01 --force --only q1 q2

探针（验证音色 / 语速，不写清单）：
    python tools/gen_tts.py --probe --text "One plus one equals two." \
        --lang en --mood teach --out tmp/probe.mp3
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"
RESOURCE_ID = "seed-tts-2.0"

# 全英文铁律：唯一允许的音色（PROJECT_MATH_RULES §2.3）
# 严禁任何 zh_female_* 中文音色。
SPEAKER_EN = "en_female_allison_uranus_bigtts"          # Allison，英文温柔女声

# 语速 0.85 倍：0 = 1.0 倍，100 = 2.0 倍，近似 1 + rate/100 → 0.85 ≈ -15
DEFAULT_RATE = -15

MOODS = {
    "teach": (
        "用温柔、清晰、稍慢的语气朗读，像蹲下来给三岁的小朋友讲一件新事物。"
        "句与句之间留一点呼吸感，不要播音腔。"
    ),
    "ask": (
        "用亲切、带一点期待的语气提问，句尾自然上扬，像在和孩子面对面说话。"
    ),
    "praise": (
        "用非常开心、惊喜的语气说这句话，像妈妈看到孩子闯关成功时脱口而出的夸奖。"
        "要带笑意，句尾明显上扬，真实口语，不要播音腔。"
    ),
    "encourage": (
        "用温柔、鼓励、不催促的语气说这句话，像在孩子做错题时轻轻拍拍他。"
    ),
    "count": (
        "用轻快、一节一节的节奏朗读，像带着孩子一起数数，每个数字之间稍作停顿。"
    ),
}


# --------------------------------------------------------------------------
# 基础工具
# --------------------------------------------------------------------------

def load_api_key() -> str:
    key = os.environ.get("DOUBAO_API_KEY", "").strip()
    if key:
        return key

    root = Path(__file__).resolve().parent.parent
    secret = root / "config" / "secrets.local.json"
    if secret.exists():
        try:
            data = json.loads(secret.read_text(encoding="utf-8"))
            key = str(data.get("doubaoApiKey", "")).strip()
        except (json.JSONDecodeError, OSError):
            key = ""
        if key:
            return key

    sys.exit(
        "缺少密钥：请设置环境变量 DOUBAO_API_KEY，"
        "或在 config/secrets.local.json 写入 {\"doubaoApiKey\": \"...\"}"
    )


def build_payload(text: str, speaker: str, rate: int, instruction: str,
                  pitch: int = 0, sample_rate: int = 24000,
                  bit_rate: int | None = None) -> dict:
    """context_texts 必须放进 additions 的 JSON 字符串里。

    实测放在 req_params 顶层会被服务端静默忽略（时长与无指令完全一致），
    放进 additions 才真正生效。
    """
    additions: dict = {"disable_markdown_filter": True}
    if instruction:
        additions["context_texts"] = [instruction]

    req: dict = {
        "text": text,
        "speaker": speaker,
        "audio_params": {
            "format": "mp3",
            "sample_rate": sample_rate,
            "speech_rate": rate,
        },
        "additions": json.dumps(additions, ensure_ascii=False),
    }
    if bit_rate:
        req["audio_params"]["bit_rate"] = bit_rate
    if pitch:
        req["post_process"] = {"pitch": pitch}

    return {"user": {"uid": "math-adventure"}, "req_params": req}


def parse_frames(raw_text: str) -> bytes:
    decoder = json.JSONDecoder()
    idx = 0
    audio = bytearray()
    length = len(raw_text)

    while idx < length:
        while idx < length and raw_text[idx] in " \r\n\t":
            idx += 1
        if idx >= length:
            break
        obj, idx = decoder.raw_decode(raw_text, idx)
        code = obj.get("code", 0)
        if code == 20000000:          # 结束帧
            break
        if code and code > 0:
            raise RuntimeError(f"code={code} message={obj.get('message')}")
        if isinstance(obj.get("data"), str) and obj["data"]:
            audio.extend(base64.b64decode(obj["data"]))

    return bytes(audio)


def synthesize(api_key: str, text: str, speaker: str, rate: int, instruction: str,
               pitch: int = 0, sample_rate: int = 24000,
               bit_rate: int | None = None) -> bytes:
    body = json.dumps(
        build_payload(text, speaker, rate, instruction, pitch, sample_rate, bit_rate),
        ensure_ascii=False,
    ).encode("utf-8")

    request = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "X-Api-Key": api_key,
            "X-Api-Resource-Id": RESOURCE_ID,
            "X-Api-Request-Id": str(uuid.uuid4()),
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read().decode("utf-8", errors="replace")
            logid = response.headers.get("X-Tt-Logid", "")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        logid = exc.headers.get("X-Tt-Logid", "") if exc.headers else ""
        raise RuntimeError(f"HTTP {exc.code}（Logid={logid}）：{detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"网络错误：{exc.reason}") from exc

    audio = parse_frames(raw)
    if not audio:
        raise RuntimeError(f"响应成功但没有音频数据（Logid={logid}）")
    return audio


# --------------------------------------------------------------------------
# 清单校验
# --------------------------------------------------------------------------

DIGITS = re.compile(r"[0-9]")
CJK = re.compile(r"[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]")


def audit(spec: dict, lines: list[dict]) -> list[str]:
    problems: list[str] = []
    seen_keys: set[str] = set()
    seen_text: dict[tuple[str, str], str] = {}

    for item in lines:
        key = item.get("key", "")
        text = item.get("text", "")
        lang = item.get("lang", "en")

        if not key or not re.fullmatch(r"[a-z0-9_]+", key):
            problems.append(f"key 非法（只允许小写字母/数字/下划线）：{key!r}")
        if key in seen_keys:
            problems.append(f"key 重复：{key}")
        seen_keys.add(key)

        # 全英文铁律：任何非 en 语种都不允许
        if lang != "en":
            problems.append(f"{key}：lang={lang!r}，全英文铁律只允许 en")

        if not text.strip():
            problems.append(f"{key}：文本为空")
            continue

        norm = " ".join(text.lower().split())
        prev = seen_text.get((lang, norm))
        if prev:
            problems.append(f"文本重复：{prev} 与 {key} 都是「{text}」")
        else:
            seen_text[(lang, norm)] = key

        # 台词里不许出现中文字符（含中文标点）
        if CJK.search(text):
            problems.append(f"{key}：台词含中文字符，违反全英文铁律")

        # 阿拉伯数字会被读成逐个数字，破坏连读节奏
        if DIGITS.search(text):
            problems.append(f"{key}：台词含阿拉伯数字，必须写成 One / Two 这类英文单词")

        words = len(text.split())
        if words > 14:
            problems.append(f"{key}：单句 {words} 个单词，超过 14 词上限，建议拆句")

    # 语速范围
    rate = spec.get("rate", DEFAULT_RATE)
    if not -50 <= int(rate) <= 100:
        problems.append(f"rate 超出 -50~100：{rate}")

    return problems


def load_spec(path: Path) -> dict:
    try:
        spec = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"读取清单失败：{path}（{exc}）")
    if not isinstance(spec.get("lines"), list):
        sys.exit("清单格式错误：缺少 lines 数组")
    return spec


def voice_for(spec: dict, lang: str) -> str:
    if lang != "en":
        raise ValueError(f"全英文铁律：不允许 lang={lang}（只允许 en）")
    voice = spec.get("voice") or {}
    return voice.get("en") or SPEAKER_EN


def write_manifest(out_dir: Path, spec: dict, lines: list[dict]) -> Path:
    rows = [
        "# 语音清单（自动生成，勿手改）",
        "",
        f"- 关卡：`{spec.get('level', out_dir.name)}`",
        f"- 条目：**{len(lines)}**",
        f"- 语速：{spec.get('rate', DEFAULT_RATE)}（约 {(100 + int(spec.get('rate', DEFAULT_RATE))) / 100:.2f} 倍）",
        "",
        "| key | 语种 | 文本 | 文件 |",
        "| --- | --- | --- | --- |",
    ]
    for item in lines:
        target = out_dir / f"{item['key']}.mp3"
        state = f"{target.stat().st_size} B" if target.exists() else "待生成"
        rows.append(f"| `{item['key']}` | {item.get('lang', 'zh')} | {item['text']} | {state} |")

    path = out_dir / "manifest.md"
    path.write_text("\n".join(rows) + "\n", encoding="utf-8")
    return path


# --------------------------------------------------------------------------
# 主流程
# --------------------------------------------------------------------------

def run_probe(args: argparse.Namespace, api_key: str) -> int:
    if not args.text:
        sys.exit("--probe 需要 --text")
    if args.lang != "en":
        sys.exit("全英文铁律：只允许 --lang en")

    speaker = args.speaker or SPEAKER_EN
    instruction = MOODS.get(args.mood, MOODS["teach"])
    audio = synthesize(api_key, args.text, speaker, args.rate, instruction,
                       pitch=args.pitch, sample_rate=args.sample_rate)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    print(f"已生成 {out}（{len(audio)} 字节，音色 {speaker}，语速 {args.rate}）")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("lines", nargs="?", help="台词清单 JSON")
    parser.add_argument("--out", help="mp3 输出目录")
    parser.add_argument("--force", action="store_true", help="覆盖已存在的 mp3")
    parser.add_argument("--only", nargs="*", help="只处理指定 key")
    parser.add_argument("--dry-run", action="store_true", help="只校验与打印，不调用接口")

    parser.add_argument("--probe", action="store_true", help="单条试听探针")
    parser.add_argument("--text", help="探针文本")
    parser.add_argument("--speaker", help="探针音色")
    parser.add_argument("--lang", default="en", choices=["en"], help="全英文铁律，只允许 en")
    parser.add_argument("--mood", default="teach", choices=list(MOODS))
    parser.add_argument("--rate", type=int, default=DEFAULT_RATE)
    parser.add_argument("--pitch", type=int, default=0)
    parser.add_argument("--sample-rate", type=int, default=24000)

    args = parser.parse_args()
    api_key = load_api_key()

    if args.probe:
        return run_probe(args, api_key)

    if not args.lines or not args.out:
        sys.exit("用法：python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01")

    spec_path = Path(args.lines)
    spec = load_spec(spec_path)
    lines = spec["lines"]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    problems = audit(spec, lines)
    manifest = write_manifest(out_dir, spec, lines)
    print(f"清单已写出：{manifest}（共 {len(lines)} 条）")

    if problems:
        print("校验未通过：", file=sys.stderr)
        for item in problems:
            print("  · " + item, file=sys.stderr)
        return 1
    print("校验通过：全英文、key 唯一、文本无重复、无阿拉伯数字。")

    rate = int(spec.get("rate", DEFAULT_RATE))
    pitch = int(spec.get("pitch", 0))
    sample_rate = int(spec.get("sampleRate", 24000))

    targets = [x for x in lines if not args.only or x["key"] in args.only]
    todo = [x for x in targets if args.force or not (out_dir / f"{x['key']}.mp3").exists()]
    print(f"待生成 {len(todo)} 条，跳过已存在 {len(targets) - len(todo)} 条。")

    if args.dry_run:
        for item in todo:
            print(f"  · {item['key']:<18} {item.get('lang', 'zh')}  「{item['text']}」")
        return 0

    done = 0
    failed: list[tuple[str, str]] = []
    total_bytes = 0

    for item in todo:
        key = item["key"]
        lang = item.get("lang", "zh")
        text = item["text"]
        mood = item.get("mood", "teach")
        speaker = voice_for(spec, lang)
        line_rate = int(item.get("rate", rate))
        line_pitch = int(item.get("pitch", pitch if lang == "zh" else 0))
        instruction = MOODS.get(mood, MOODS["teach"])

        try:
            audio = synthesize(api_key, text, speaker, line_rate, instruction,
                               pitch=line_pitch, sample_rate=sample_rate)
        except RuntimeError as exc:
            failed.append((key, str(exc)))
            print(f"  x {key:<18} {exc}")
            continue

        target = out_dir / f"{key}.mp3"
        target.write_bytes(audio)
        done += 1
        total_bytes += len(audio)
        print(f"  + {key:<18} {len(audio):>7} B  {speaker:<34} {text[:26]}")

    print(f"\n新生成 {done} 条，失败 {len(failed)} 条，共 {total_bytes} 字节。")
    if failed:
        print("失败清单（未重试，稍后统一处理）：", file=sys.stderr)
        for key, err in failed:
            print(f"  · {key}：{err[:200]}", file=sys.stderr)
        return 1

    write_manifest(out_dir, spec, lines)
    return 0


if __name__ == "__main__":
    sys.exit(main())
