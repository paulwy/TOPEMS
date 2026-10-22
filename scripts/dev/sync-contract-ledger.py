#!/usr/bin/env python3
"""契约台账自动同步：跑 contract-gate.py → 解析三数 → 更新 contract-stub-mapping.md 头部状态行。
用法: python3 scripts/dev/sync-contract-ledger.py   （幂等，可重复跑）"""
import re, subprocess, sys, datetime, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
GATE = REPO / "scripts" / "dev" / "contract-gate.py"
LEDGER = REPO / "docs" / "architecture" / "service-topology" / "contract-stub-mapping.md"

out = subprocess.run([sys.executable, str(GATE)], capture_output=True, text=True).stdout
m = re.search(r"前端端点 (\d+) 条 / 后端路由 (\d+) 条 / 缺口 (\d+) 条", out)
if not m:
    print("ERR: contract-gate 输出未匹配（预期三数行）"); sys.exit(1)
front, back, gap = m.group(1), m.group(2), m.group(3)

t = LEDGER.read_text()
date = datetime.date.today().isoformat()
# 头部状态行锚点（若结构变化需同步改此处）
new = f"**契约基线（自动同步 {date}）**：前端 {front} / 后端 {back} / 缺口 {gap}"
pat = re.compile(r"\*\*契约基线（自动同步 \d{4}-\d{2}-\d{2}）\*\*：前端 \d+ / 后端 \d+ / 缺口 \d+")
if pat.search(t):
    t = pat.sub(new, t)
else:
    anchor = "# "  # 首个一级标题后插入
    lines = t.split("\n")
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            lines.insert(i + 1, "\n" + new + "\n")
            break
    t = "\n".join(lines)
LEDGER.write_text(t)
print(f"台账已同步：前端 {front} / 后端 {back} / 缺口 {gap}")
