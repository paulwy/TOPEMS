#!/usr/bin/env python3
"""禁止脚本层对「裸 core_users」做数据操作（身份表错位回归防线）。

背景（2026-11-26 事故）：
  身份权威表是 iam.users（20260926 迁移迁入，2026-10-28 收敛后 public.core_users 废弃）。
  scripts/dev/update-admin-password.sh 曾 UPDATE 裸 core_users —— 本机按 search_path
  落到 public.core_users（47 行旧镜像），生产该表 0 行。两次「重置成功」都是假阳性：
  真正被改的表没人读，改口令的服务读的是 iam.users。

判定：
  脚本（.sh/.py/.js/.mjs/.ts）里出现未带 schema 前缀的 core_users 标识符即报错。
  - public.core_users / iam.core_users 等显式限定不计入（RLS 校准、镜像巡检等合法用途）。
  - 纯注释行（# / -- / // /*）跳过，避免把说明文字当违法引用。
  - 同行的魔数豁免：`allow-bare-core-users`（用于确有必要的迁移/临时脚本，需 review）。
  - database/ 与 database/init/ 下不扫描：那里是建表 DDL 与历史快照。

用法：
  python3 scripts/ci/check-bare-user-table.py            # 全量扫描 scripts/ cli/
  python3 scripts/ci/check-bare-user-table.py --changed-only   # 只扫暂存区改动
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ("scripts", "cli")
SUFFIXES = {".sh", ".bash", ".py", ".js", ".mjs", ".ts"}
ALLOW_MARK = "allow-bare-core-users"

# 只在「SQL 动词 + 裸表名」同现时判定，避免把 tablename='core_users'
# 这类字符串比较、以及说明性文字误判成引用。
BARE_AFTER_DML = re.compile(
    r"(?is)\b(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM|FROM|JOIN|TRUNCATE\s+TABLE|TRUNCATE)"
    r"\s+(?:TABLE\s+)?(?<![.\w])core_users(?![.\w])"
)
COMMENT_PREFIX = ("#", "--", "//", "/*", "*")

def git_staged_files() -> list[Path]:
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout
    files = []
    for line in out.splitlines():
        p = ROOT / line.strip()
        if p.suffix in SUFFIXES and any(part in SCAN_DIRS for part in p.parts):
            if p.is_file():
                files.append(p)
    return files

def walk_files() -> list[Path]:
    files: list[Path] = []
    for d in SCAN_DIRS:
        base = ROOT / d
        if not base.is_dir():
            continue
        for p in base.rglob("*"):
            if p.is_file() and p.suffix in SUFFIXES:
                files.append(p)
    return files

def is_comment(line: str) -> bool:
    s = line.strip()
    return s.startswith(COMMENT_PREFIX)

def scan(path: Path) -> list[tuple[int, str]]:
    hits: list[tuple[int, str]] = []
    if path.resolve() == Path(__file__).resolve():
        return hits  # 本检查器自身说明文字不算违规
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return hits
    for no, line in enumerate(text.splitlines(), 1):
        if ALLOW_MARK in line or is_comment(line):
            continue
        if BARE_AFTER_DML.search(line):
            hits.append((no, line.strip()))
    return hits

def main() -> int:
    changed_only = "--changed-only" in sys.argv[1:]
    files = git_staged_files() if changed_only else walk_files()
    if not files:
        print(f"[bare-user-table] PASS（扫描 0 个脚本{'，暂存区无变更' if changed_only else ''}）")
        return 0

    total = 0
    for p in files:
        hits = scan(p)
        if not hits:
            continue
        rel = p.relative_to(ROOT)
        for no, line in hits:
            total += 1
            print(f"❌ {rel}:{no}: 裸 core_users 引用 → {line[:120]}")

    if total:
        print(f"\n[bare-user-table] FAILED：{total} 处裸 core_users。")
        print("  身份权威表是 iam.users；public.core_users 已废弃（2026-10-28 收敛）。")
        print("  修法：把标识符写全（iam.users / public.core_users），或先按候选表解析再拼 SQL。")
        return 1

    print(f"[bare-user-table] PASS（扫描 {len(files)} 个脚本，0 命中）")
    return 0

if __name__ == "__main__":
    sys.exit(main())
