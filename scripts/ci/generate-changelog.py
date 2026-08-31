#!/usr/bin/env python3
"""
CHANGELOG 自动生成脚本（P2-3 发布/CHANGELOG 自动化）
=====================================================
基于 Git 提交（conventional commits）自动生成 CHANGELOG 草案。

提交规范（本项目已遵循）：
  <type>(<scope>): <description>
  type ∈ feat/fix/docs/refactor/perf/test/chore/ci/build/breaking

用法:
  python3 scripts/ci/generate-changelog.py                 # 基于最近 tag 生成草案到 stdout
  python3 scripts/ci/generate-changelog.py --since v1.0.0  # 指定起始 ref
  python3 scripts/ci/generate-changelog.py --write         # 写入 docs/changelog/draft.md
  python3 scripts/ci/generate-changelog.py --since v1.0.0 --write

说明:
  - 只生成"草案"，供人工复核后合并到 CHANGELOG.md（Keep a Changelog 格式）
  - 不修改 CHANGELOG.md 本身（保留人工维护的版本叙事）
"""
import argparse
import datetime
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 变更类型 → 分组标题
TYPE_GROUPS = [
    ("breaking", "破坏性变更"),
    ("feat", "新增"),
    ("fix", "修复"),
    ("perf", "性能优化"),
    ("refactor", "重构"),
    ("docs", "文档"),
    ("test", "测试"),
    ("build", "构建"),
    ("ci", "CI/CD"),
    ("chore", "杂项"),
]

COMMIT_RE = re.compile(
    r"^(?P<type>feat|fix|docs|refactor|perf|test|chore|ci|build|breaking)"
    r"(?:\((?P<scope>[^)]+)\))?!?: (?P<desc>.+)$"
)


def get_last_tag():
    """返回最近 tag；无 tag 时返回 None。"""
    r = subprocess.run(["git", "describe", "--tags", "--abbrev=0"],
                       cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def get_commits(since):
    """取 git log 提交列表（hash + 主题），since 可为 ref/tag。"""
    args = ["git", "log", "--pretty=format:%h|%s"]
    if since:
        args += [f"{since}..HEAD"]
    else:
        args += ["-100"]  # 无 tag 时默认最近 100 条
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"ERROR: git log 失败: {r.stderr}", file=sys.stderr)
        sys.exit(2)
    commits = []
    for line in r.stdout.strip().splitlines():
        if "|" in line:
            h, _, s = line.partition("|")
            commits.append((h, s))
    return commits


def build_changelog(commits, since):
    """按类型分组生成 Markdown。"""
    grouped = {key: [] for key, _ in TYPE_GROUPS}
    unparsed = []
    for h, subject in commits:
        m = COMMIT_RE.match(subject)
        if not m:
            unparsed.append((h, subject))
            continue
        t = m.group("type")
        scope = m.group("scope")
        desc = m.group("desc").rstrip(".")
        grouped[t].append((h, scope, desc))
    # breaking 归并到 feat 组一起显示更友好？保持独立
    ordered = [(key, title, grouped[key]) for key, title in TYPE_GROUPS if grouped[key]]

    today = datetime.date.today().isoformat()
    lines = [f"# CHANGELOG 草案（自动生成 {today}）", ""]
    if since:
        lines.append(f"> 范围：`{since}..HEAD`，共 {len(commits)} 条提交。自动生成，人工复核后合并。")
    else:
        lines.append(f"> 范围：最近 {len(commits)} 条提交（无 tag 基线）。自动生成，人工复核后合并。")
    lines.append("")
    lines.append("## [未发布]")
    lines.append("")
    for key, title, items in ordered:
        lines.append(f"### {title}")
        lines.append("")
        for h, scope, desc in items:
            sc = f"`{scope}`" if scope else ""
            lines.append(f"- {desc} ({sc} · {h})")
        lines.append("")
    if unparsed:
        lines.append("### 未按规范解析（需人工整理）")
        lines.append("")
        for h, s in unparsed:
            lines.append(f"- {s} ({h})")
        lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="生成 CHANGELOG 草案")
    ap.add_argument("--since", help="起始 ref/tag（如 v1.0.0），默认最近 tag")
    ap.add_argument("--write", action="store_true", help="写入 docs/changelog/draft.md")
    args = ap.parse_args()

    since = args.since or get_last_tag()
    commits = get_commits(since)
    md = build_changelog(commits, since)

    if args.write:
        out = os.path.join(ROOT, "docs", "changelog", "draft.md")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"草案已写入 {out}（{len(commits)} 条提交）")
    else:
        print(md)


if __name__ == "__main__":
    main()
