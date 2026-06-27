#!/usr/bin/env python3
"""
文档健康度检查脚本
用法: python3 scripts/check_docs_health.py

检查内容:
1. 文档是否有「最后更新日期」标记
2. 超过 90 天未更新的文档（可能过时）
3. 含 TODO / 待更新 / @deprecated 标记的文档
4. 文档数量统计
"""

import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

DOCS_DIR = Path(__file__).parent.parent / "docs"
STALE_DAYS = 90

# 日期格式匹配: 2026-06-27, 2026/06/27 等
DATE_PATTERNS = [
    r"(?:最后更新|更新日期|Last updated|Updated)[：: ]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})",
    r"^>.*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})",
]

TODO_PATTERNS = [
    r"\bTODO\b",
    r"\bFIXME\b",
    r"待更新",
    r"待完善",
    r"@deprecated",
    r"废弃",
    r"过时",
]


def parse_date(date_str: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def find_date(content: str) -> datetime | None:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
        if m:
            d = parse_date(m.group(1))
            if d:
                return d
    return None


def has_todo_markers(content: str) -> list[str]:
    found = []
    for pattern in TODO_PATTERNS:
        if re.search(pattern, content):
            found.append(pattern)
    return found


def categorize(path: Path) -> str:
    rel = path.relative_to(DOCS_DIR)
    parts = rel.parts
    if len(parts) > 1:
        return parts[0]
    return "根目录"


def main():
    if not DOCS_DIR.exists():
        print(f"错误: 找不到 docs 目录: {DOCS_DIR}")
        sys.exit(1)

    md_files = list(DOCS_DIR.rglob("*.md"))
    total = len(md_files)

    no_date = []
    stale = []
    todo_docs = []
    categories = {}
    now = datetime.now()
    stale_threshold = now - timedelta(days=STALE_DAYS)

    for f in md_files:
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue

        cat = categorize(f)
        categories[cat] = categories.get(cat, 0) + 1

        rel_path = f.relative_to(DOCS_DIR)

        date = find_date(content)
        if not date:
            no_date.append(rel_path)
        elif date < stale_threshold:
            days = (now - date).days
            stale.append((rel_path, date, days))

        markers = has_todo_markers(content)
        if markers:
            todo_docs.append((rel_path, markers))

    print("=" * 60)
    print("📋 文档健康度检查报告")
    print(f"📅 检查日期: {now.strftime('%Y-%m-%d')}")
    print(f"📂 文档总数: {total}")
    print("=" * 60)

    print(f"\n📊 分类统计:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat:20s} {count:3d} 个")

    print(f"\n⚠️  没有更新日期的文档 ({len(no_date)} 个):")
    if no_date:
        for p in sorted(no_date):
            print(f"  - {p}")
    else:
        print("  ✅ 全部都有更新日期")

    print(f"\n⏰ 可能过时的文档（>{STALE_DAYS}天未更新, {len(stale)} 个):")
    if stale:
        stale.sort(key=lambda x: -x[2])
        for p, d, days in stale[:20]:
            print(f"  - {p}  ({d.strftime('%Y-%m-%d')}, {days}天前)")
        if len(stale) > 20:
            print(f"  ... 还有 {len(stale) - 20} 个")
    else:
        print("  ✅ 没有发现长时间未更新的文档")

    print(f"\n📝 含 TODO/待更新/废弃标记的文档 ({len(todo_docs)} 个):")
    if todo_docs:
        for p, markers in sorted(todo_docs):
            marker_str = ", ".join(m.replace("\\b", "") for m in markers[:3])
            print(f"  - {p}  [{marker_str}]")
    else:
        print("  ✅ 没有发现待处理标记")

    print("\n" + "=" * 60)
    print("💡 建议:")
    print("  1. 给没有日期的文档加上「最后更新」标记")
    print("  2. 检查可能过时的文档，确认是否需要更新")
    print("  3. 处理 TODO 标记，更新或删除")
    print("=" * 60)

    return 0 if not stale and not no_date else 1


if __name__ == "__main__":
    sys.exit(main())
