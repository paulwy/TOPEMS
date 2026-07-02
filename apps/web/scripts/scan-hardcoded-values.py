#!/usr/bin/env python3
"""
扫描 TSX 文件中 sx prop 里的硬编码颜色值
用法: python scripts/scan-hardcoded-values.py [目标目录]
默认扫描 apps/web/src/pages 和 apps/web/src/components
"""
import re
import sys
import os
from pathlib import Path

HEX_COLOR = re.compile(r"'#[0-9a-fA-F]{3,8}'")
RGB_COLOR = re.compile(r"'rgb\s*\(")
RGBA_COLOR = re.compile(r"'rgba\s*\(")


def scan_file(filepath: str) -> list:
    """扫描单个文件中 sx prop 里的硬编码颜色值"""
    results = []
    try:
        content = Path(filepath).read_text(encoding="utf-8")
    except Exception:
        return results

    in_sx = False
    brace_depth = 0
    for i, line in enumerate(content.split("\n"), 1):
        # 检测 sx prop 的开始
        if "sx={{" in line or "sx={" in line:
            in_sx = True
            brace_depth = line.count("{") - line.count("}")
        elif in_sx:
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                in_sx = False
                continue

        if in_sx:
            for m in HEX_COLOR.finditer(line):
                results.append((i, m.group(), line.strip()))
            for m in RGB_COLOR.finditer(line):
                results.append((i, m.group()[:20], line.strip()))
            for m in RGBA_COLOR.finditer(line):
                results.append((i, m.group()[:20], line.strip()))

    return results


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    targets = target.split(",") if target else []

    if not targets:
        # 默认扫描目录
        script_dir = Path(__file__).resolve().parent
        web_src = script_dir.parent / "src"
        targets = [
            str(web_src / "pages"),
            str(web_src / "components"),
        ]

    total_files = 0
    total_hits = 0

    for t in targets:
        if not os.path.isdir(t):
            print(f"警告: 目录不存在 - {t}", file=sys.stderr)
            continue
        for tsx in sorted(Path(t).rglob("*.tsx")):
            hits = scan_file(str(tsx))
            if hits:
                total_files += 1
                for line_no, value, line_content in hits:
                    print(f"  {tsx}:{line_no}  {value}  |  {line_content[:80]}")
                    total_hits += 1

    print(f"\n总计: {total_files} 个文件, {total_hits} 处硬编码颜色值")


if __name__ == "__main__":
    main()
