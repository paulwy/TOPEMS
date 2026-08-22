#!/usr/bin/env python3
"""
对比 .husky/pre-commit 与 lefthook.yml 的检查项差异。

用途：P0 重构前验证 husky → lefthook 迁移方案，识别：
  - 仅 husky 有（需迁移）
  - 仅 lefthook 有（husky 未覆盖）
  - 两者都有（重复定义，需去重）

用法：
  python3 scripts/dev/compare-hooks.py
  python3 scripts/dev/compare-hooks.py --json   # 机器可读输出
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HUSKY_FILE = REPO_ROOT / ".husky" / "pre-commit"
LEFTHOOK_FILE = REPO_ROOT / "lefthook.yml"


@dataclass
class CheckItem:
    """一个检查项的标准化表示。"""

    source: str  # "husky" | "lefthook"
    id: str  # husky: "1"-"10"; lefthook: "A"-"M"
    name: str  # 检查项名称
    stage: str  # "pre-commit" | "pre-push"
    scripts: list[str] = field(default_factory=list)  # 调用的脚本/命令
    trigger: str = ""  # 触发条件（文件 glob 或 shell 条件）


# ---------------------------------------------------------------------------
# 解析 .husky/pre-commit
# ---------------------------------------------------------------------------
HUSKY_SECTION_RE = re.compile(
    r"^# =+\s*\n^# (\d+)\.\s*(.+?)\s*\n^# =+", re.MULTILINE
)
HUSKY_SCRIPT_RE = re.compile(
    r"(?:node|python3|npx|pnpm|cargo)\s+([^\s;&|]+(?:\s+[^\s;&|]+)*?)(?=\s*[;&|]|\s*$)",
    re.MULTILINE,
)


def parse_husky(path: Path) -> list[CheckItem]:
    """解析 husky/pre-commit，按 # N. 标题分段提取检查项。"""
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    items: list[CheckItem] = []

    # 找所有段落的起始位置
    matches = list(HUSKY_SECTION_RE.finditer(text))
    for i, m in enumerate(matches):
        num = m.group(1)
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end]

        # 提取执行的脚本/命令
        scripts: list[str] = []
        for sm in HUSKY_SCRIPT_RE.finditer(block):
            cmd = sm.group(0).strip()
            # 跳过 echo 中的伪命令（如 "Please remove these files"）
            if not cmd.startswith(("echo", "printf")):
                scripts.append(cmd)

        # 提取触发条件（HAS_XXX_FILES 变量名）
        trigger = ""
        trig_m = re.search(r"HAS_(\w+)_FILES=", block)
        if trig_m:
            trigger = f"HAS_{trig_m.group(1)}_FILES"

        # 纯 shell 检查（无外部脚本）标记
        if not scripts:
            scripts = ["<shell-only>"]

        items.append(
            CheckItem(
                source="husky",
                id=num,
                name=title,
                stage="pre-commit",
                scripts=scripts,
                trigger=trigger,
            )
        )

    return items


# ---------------------------------------------------------------------------
# 解析 lefthook.yml
# ---------------------------------------------------------------------------
LEFTHOOK_STAGE_RE = re.compile(r"^(pre-commit|pre-push):\s*$", re.MULTILINE)
LEFTHOOK_GATE_RE = re.compile(r"name:\s*Gate\s+([A-Z])\s*·\s*(.+?)$", re.MULTILINE)
LEFTHOOK_FILES_RE = re.compile(r"files:\s*(.+?)$", re.MULTILINE)


def parse_lefthook(path: Path) -> list[CheckItem]:
    """解析 lefthook.yml，按 stage + Gate 名称提取。"""
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    items: list[CheckItem] = []

    # 按 stage 分段
    stage_matches = list(LEFTHOOK_STAGE_RE.finditer(text))
    for i, sm in enumerate(stage_matches):
        stage = sm.group(1)
        start = sm.end()
        end = (
            stage_matches[i + 1].start()
            if i + 1 < len(stage_matches)
            else len(text)
        )
        stage_block = text[start:end]

        # 在 stage 块内找所有 Gate
        gate_matches = list(LEFTHOOK_GATE_RE.finditer(stage_block))
        for j, gm in enumerate(gate_matches):
            gate_id = gm.group(1)
            gate_name = gm.group(2).strip()
            g_start = gm.start()
            g_end = (
                gate_matches[j + 1].start()
                if j + 1 < len(gate_matches)
                else len(stage_block)
            )
            gate_block = stage_block[g_start:g_end]

            # 提取 run: 后的命令
            scripts: list[str] = []
            run_m = re.search(r"run:\s*\|?\s*\n?((?:.+\n?)*?)(?=\n\s{4}\w+|\Z)", gate_block, re.DOTALL)
            if run_m:
                run_body = run_m.group(1)
                for cm in HUSKY_SCRIPT_RE.finditer(run_body):
                    cmd = cm.group(0).strip()
                    if not cmd.startswith(("echo", "printf", "if", "fi")):
                        scripts.append(cmd)

            # 提取 files 触发条件
            trigger = ""
            files_m = LEFTHOOK_FILES_RE.search(gate_block)
            if files_m:
                trigger = files_m.group(1).strip().strip('"').strip("'")

            if not scripts:
                scripts = ["<yaml-run>"]

            items.append(
                CheckItem(
                    source="lefthook",
                    id=gate_id,
                    name=gate_name,
                    stage=stage,
                    scripts=scripts,
                    trigger=trigger,
                )
            )

    return items


# ---------------------------------------------------------------------------
# 建立映射：通过脚本文件名匹配
# ---------------------------------------------------------------------------
def extract_script_key(cmd: str) -> str:
    """从命令中提取脚本文件名作为匹配键。

    例：
      "node scripts/ci/check-i18n.cjs --strict" → "check-i18n.cjs"
      "npx lint-staged"                          → "lint-staged"
      "cargo test --workspace"                   → "cargo test"
      "python3 scripts/check_api_duplicates_ci.py --ci" → "check_api_duplicates_ci.py"
    """
    # 提取脚本路径
    m = re.search(r"scripts/[^\s;&|]+\.(?:cjs|mjs|js|py|sh)", cmd)
    if m:
        return Path(m.group(0)).name

    # lint-staged
    if "lint-staged" in cmd:
        return "lint-staged"

    # cargo 子命令
    m = re.match(r"(cargo\s+\w+)", cmd)
    if m:
        return m.group(1)

    # pnpm typecheck
    if "typecheck" in cmd:
        return "pnpm typecheck"

    return cmd.strip()


def build_mapping(
    husky_items: list[CheckItem], lefthook_items: list[CheckItem]
) -> dict[str, list[CheckItem]]:
    """通过脚本文件名建立 husky↔lefthook 映射。

    返回三组：
      "husky_only"  : 仅 husky 有
      "lefthook_only": 仅 lefthook 有
      "both"        : 两者都有（配对）
    """
    # 建立 lefthook 脚本键 → item 的映射
    lefthook_keys: dict[str, list[CheckItem]] = {}
    for item in lefthook_items:
        for script in item.scripts:
            key = extract_script_key(script)
            lefthook_keys.setdefault(key, []).append(item)

    husky_matched: set[int] = set()
    lefthook_matched: set[int] = set()
    pairs: list[tuple[CheckItem, list[CheckItem]]] = []

    # 遍历 husky 检查项，尝试匹配 lefthook
    for h_idx, h_item in enumerate(husky_items):
        matched_lefthook: list[CheckItem] = []
        for script in h_item.scripts:
            key = extract_script_key(script)
            if key in lefthook_keys:
                for lt_item in lefthook_keys[key]:
                    if id(lt_item) not in {id(x) for x in matched_lefthook}:
                        matched_lefthook.append(lt_item)
                        lefthook_matched.add(id(lt_item))

        if matched_lefthook:
            husky_matched.add(h_idx)
            pairs.append((h_item, matched_lefthook))

    husky_only = [item for i, item in enumerate(husky_items) if i not in husky_matched]
    lefthook_only = [
        item for item in lefthook_items if id(item) not in lefthook_matched
    ]

    return {
        "husky_only": husky_only,
        "lefthook_only": lefthook_only,
        "both": pairs,
    }


# ---------------------------------------------------------------------------
# 输出报告
# ---------------------------------------------------------------------------
def truncate(s: str, width: int = 40) -> str:
    """截断字符串到指定宽度。"""
    s = s.replace("\n", " ").strip()
    return s[:width] + "…" if len(s) > width else s


def format_scripts(scripts: list[str]) -> str:
    return "; ".join(truncate(s, 60) for s in scripts)


def print_text_report(
    husky_items: list[CheckItem],
    lefthook_items: list[CheckItem],
    mapping: dict,
) -> None:
    print()
    print("=" * 78)
    print(" TOPEMS Hook 检查项对比报告")
    print(" husky/pre-commit  vs  lefthook.yml")
    print("=" * 78)

    # ── 仅 husky 有 ──
    print()
    print(f"【仅 husky 有（需迁移到 lefthook）】共 {len(mapping['husky_only'])} 项")
    print("-" * 78)
    if mapping["husky_only"]:
        for item in mapping["husky_only"]:
            print(f"  husky #{item.id:<3} {truncate(item.name, 36):<38}")
            print(f"          脚本: {format_scripts(item.scripts)}")
            if item.trigger:
                print(f"          触发: {item.trigger}")
            print()
    else:
        print("  (无)")
        print()

    # ── 仅 lefthook 有 ──
    print(f"【仅 lefthook 有（husky 未覆盖）】共 {len(mapping['lefthook_only'])} 项")
    print("-" * 78)
    if mapping["lefthook_only"]:
        for item in mapping["lefthook_only"]:
            print(
                f"  Gate {item.id:<3} [{item.stage}] {truncate(item.name, 34):<36}"
            )
            print(f"          脚本: {format_scripts(item.scripts)}")
            if item.trigger:
                print(f"          触发: {truncate(item.trigger, 60)}")
            print()
    else:
        print("  (无)")
        print()

    # ── 两者都有 ──
    print(f"【两者都有（重复定义，需去重）】共 {len(mapping['both'])} 对")
    print("-" * 78)
    if mapping["both"]:
        for h_item, lt_items in mapping["both"]:
            lt_ids = "+".join(lt.id for lt in lt_items)
            lt_names = " / ".join(truncate(lt.name, 30) for lt in lt_items)
            print(f"  husky #{h_item.id:<3} {truncate(h_item.name, 30):<32}")
            print(f"      ↔  Gate {lt_ids:<5} {lt_names}")
            print(f"      脚本: {format_scripts(h_item.scripts)}")
            print()
    else:
        print("  (无)")
        print()

    # ── 汇总 ──
    print("=" * 78)
    print(" 汇总")
    print("=" * 78)
    print(f"  husky 检查项:   {len(husky_items)} 项")
    print(f"  lefthook Gate:  {len(lefthook_items)} 项")
    print(f"  需迁移:         {len(mapping['husky_only'])} 项")
    print(f"  已新增:         {len(mapping['lefthook_only'])} 项")
    print(f"  重复定义:       {len(mapping['both'])} 对（可去重）")
    print()

    # ── 迁移建议 ──
    if mapping["husky_only"]:
        print(" 迁移建议（新增 lefthook Gate）:")
        print("-" * 78)
        next_gate_ord = ord("N")
        for item in mapping["husky_only"]:
            gate_id = chr(next_gate_ord)
            next_gate_ord += 1
            script_hint = (
                item.scripts[0] if item.scripts[0] != "<shell-only>" else "需用 pre-commit 框架或 shell 实现"
            )
            print(f"  Gate {gate_id} · {item.name}")
            print(f"    run: {script_hint}")
            print()


def build_json_report(
    husky_items: list[CheckItem],
    lefthook_items: list[CheckItem],
    mapping: dict,
) -> dict:
    return {
        "summary": {
            "husky_count": len(husky_items),
            "lefthook_count": len(lefthook_items),
            "husky_only": len(mapping["husky_only"]),
            "lefthook_only": len(mapping["lefthook_only"]),
            "both": len(mapping["both"]),
        },
        "husky_only": [asdict(x) for x in mapping["husky_only"]],
        "lefthook_only": [asdict(x) for x in mapping["lefthook_only"]],
        "both": [
            {
                "husky": asdict(h),
                "lefthook": [asdict(lt) for lt in lt_items],
            }
            for h, lt_items in mapping["both"]
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="对比 husky/pre-commit 与 lefthook.yml 的检查项差异"
    )
    parser.add_argument(
        "--json", action="store_true", help="输出 JSON 格式（机器可读）"
    )
    parser.add_argument(
        "--husky-file", type=Path, default=HUSKY_FILE, help="husky pre-commit 路径"
    )
    parser.add_argument(
        "--lefthook-file",
        type=Path,
        default=LEFTHOOK_FILE,
        help="lefthook.yml 路径",
    )
    args = parser.parse_args()

    husky_items = parse_husky(args.husky_file)
    lefthook_items = parse_lefthook(args.lefthook_file)

    if not husky_items and not lefthook_items:
        print("⚠️  未解析到任何检查项，请检查文件路径", file=sys.stderr)
        return 1

    mapping = build_mapping(husky_items, lefthook_items)

    if args.json:
        report = build_json_report(husky_items, lefthook_items, mapping)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_text_report(husky_items, lefthook_items, mapping)

    return 0


if __name__ == "__main__":
    sys.exit(main())
