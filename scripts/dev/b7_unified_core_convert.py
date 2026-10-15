#!/usr/bin/env python3
"""B7 扩展批次：unified-core api_error → TopemsError 批量替换（静态模式）。
静态: api_error(500|404|400, "msg") → ApiResponse::from(TopemsError::X("msg".to_string()))
泄露型（format!/变量插值）不在此替换，另行手工。

ROOT 从本脚本位置（scripts/dev/）上溯三级到仓库根，不再硬编码他机绝对路径；
可用环境变量 B7_TARGET_DIR 覆盖。
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ.get("B7_TARGET_DIR", Path(__file__).resolve().parents[2] / "svc" / "unified-core" / "src"))

MAP = {
    "500": ("Internal", "InternalError"),
    "404": ("ResourceNotFound", "ResourceNotFound"),
    "400": ("ValidationFailed", "ValidationFailed"),
}

pat = re.compile(r'api_error\((500|404|400), "([^"]*)"\)')

total = 0
for f in ROOT.rglob("*.rs"):
    text = f.read_text()
    if "api_error(" not in text:
        continue
    orig = text
    def repl(m):
        global total
        code, msg = m.group(1), m.group(2)
        variant = MAP[code][0]
        total += 1
        return f'ApiResponse::from(TopemsError::{variant}("{msg}".to_string()))'
    text = pat.sub(repl, text)
    if text != orig:
        f.write_text(text)
        print(f"  updated {f.relative_to(ROOT)}")

# 列出剩余的（泄露型等）供手工处理
leftover = []
for f in ROOT.rglob("*.rs"):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        if "api_error(" in line and "fn api_error" not in line:
            leftover.append(f"{f.relative_to(ROOT)}:{i}: {line.strip()}")

print(f"\nreplaced static: {total}")
print(f"leftover (manual): {len(leftover)}")
for l in leftover:
    print("  ", l)
