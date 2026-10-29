#!/usr/bin/env python3
"""通过 GitHub Git Data API 推送提交（本机 git push 被拦截，只能用这条通道）。

用法：
    python tools/push_via_api.py "提交说明"
    python tools/push_via_api.py "提交说明" --dry-run

规则（见 PROJECT_MATH_RULES.md §1）：
  · 必须带 base_tree，否则会删掉远端新增文件
  · 空仓库首次提交自动切换为「无 base_tree / 无 parents / 新建 ref」
  · 文件清单里一旦出现 secret / .local.json，直接中止
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

OWNER = "lipinglabs"
REPO = "math-adventure"
BRANCH = "main"
ROOT = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {".git", ".shots", ".edge-profile", "tmp", "__pycache__", "node_modules", ".idea", ".vscode"}
EXCLUDE_SUFFIX = {".pyc", ".log", ".tmp"}
FORBIDDEN_PARTS = ("secret", ".local.json")


def collect_files() -> list[str]:
    files: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        if path.suffix.lower() in EXCLUDE_SUFFIX:
            continue
        lowered = str(rel).lower()
        if any(token in lowered for token in FORBIDDEN_PARTS):
            continue
        files.append(rel.as_posix())
    return sorted(files)


def gh(method: str, path: str, payload: dict | None = None) -> dict:
    cmd = ["gh", "api", path, "--method", method]
    tmp = None
    if payload is not None:
        fd, tmp = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)
        cmd += ["--input", tmp]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    finally:
        if tmp:
            os.remove(tmp)
    if out.returncode != 0:
        raise RuntimeError(f"gh api 失败 {method} {path}: {out.stderr.strip()[:400]}")
    return json.loads(out.stdout) if out.stdout.strip() else {}


def try_head() -> str | None:
    try:
        return gh("GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")["object"]["sha"]
    except RuntimeError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("message", nargs="?", default="更新")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    files = collect_files()
    leaked = [f for f in files if any(t in f.lower() for t in FORBIDDEN_PARTS)]
    if leaked:
        print("中止：清单里出现疑似密钥文件：", leaked, file=sys.stderr)
        return 2

    total = sum((ROOT / f).stat().st_size for f in files)
    print(f"待推送 {len(files)} 个文件，共 {total / 1024:.1f} KB：")
    for rel in files:
        print(f"  · {rel:<40} {(ROOT / rel).stat().st_size:>9} B")

    if args.dry_run:
        return 0

    head = try_head()
    if not head:
        # Git Data API 在「完全空仓库」上会返回 409 Git Repository is empty，
        # 因此先用 Contents API 写一个 README 制造首个提交，再走后续流程。
        seed_path = ROOT / "README.md"
        if not seed_path.exists():
            print("空仓库需要一个 README.md 作为首个提交", file=sys.stderr)
            return 2
        gh("PUT", f"repos/{OWNER}/{REPO}/contents/README.md", {
            "message": "chore: 初始化仓库",
            "content": base64.b64encode(seed_path.read_bytes()).decode("ascii"),
            "branch": BRANCH,
        })
        head = try_head()
        print(f"已创建首个提交：{head}")

    base_tree = gh("GET", f"repos/{OWNER}/{REPO}/git/commits/{head}")["tree"]["sha"]
    print(f"当前提交：{head}")

    tree = []
    for rel in files:
        data = (ROOT / rel).read_bytes()
        blob = gh("POST", f"repos/{OWNER}/{REPO}/git/blobs", {
            "content": base64.b64encode(data).decode("ascii"),
            "encoding": "base64",
        })
        tree.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})

    tree_sha = gh("POST", f"repos/{OWNER}/{REPO}/git/trees",
                  {"base_tree": base_tree, "tree": tree})["sha"]

    commit_sha = gh("POST", f"repos/{OWNER}/{REPO}/git/commits", {
        "message": args.message,
        "tree": tree_sha,
        "parents": [head],
    })["sha"]

    gh("PATCH", f"repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}",
       {"sha": commit_sha, "force": True})

    print(f"已推送：{commit_sha}")
    print(f"https://github.com/{OWNER}/{REPO}/commit/{commit_sha}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
