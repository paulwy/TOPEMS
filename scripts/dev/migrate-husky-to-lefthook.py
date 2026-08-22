#!/usr/bin/env python3
"""
将 husky/pre-commit 中 lefthook 未覆盖的 4 项检查迁移为 lefthook Gate。

迁移清单（基于 compare-hooks.py 对比结果）：
  husky #1  检查大文件 (>1MB)        → Gate N · large-files
  husky #2  检查敏感信息              → Gate O · sensitive-info
  husky #4  API 路径检查              → Gate P · api-duplicates
  husky #8b admin 模块硬编码中文      → Gate Q · i18n-hardcode-admin

特性：
  - 默认 dry-run（只预览不写入），需 --apply 才真正修改
  - 幂等：已存在的 Gate 不会重复添加
  - 自动备份原文件到 lefthook.yml.bak（--apply 时）
  - 保留原文件格式与注释（文本插入，非 YAML 重写）

用法：
  python3 scripts/dev/migrate-husky-to-lefthook.py            # 预览
  python3 scripts/dev/migrate-husky-to-lefthook.py --diff     # 预览 + 差异
  python3 scripts/dev/migrate-husky-to-lefthook.py --apply    # 写入
"""

from __future__ import annotations

import argparse
import difflib
import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LEFTHOOK_FILE = REPO_ROOT / "lefthook.yml"


# ---------------------------------------------------------------------------
# 4 个新 Gate 的 YAML 片段
# 缩进规则：key 4 空格，name/files/run 6 空格，run 块内容 8 空格
# ---------------------------------------------------------------------------
GATE_N_LARGE_FILES = """\
    # [Gate N] Large files check (>1MB) — migrated from husky #1
    large-files:
      name: Gate N · Large Files Check (>1MB)
      tags: files size
      run: |
        STAGED=$(git diff --cached --name-only --diff-filter=ACM)
        MAX_SIZE=1048576
        FOUND=""
        for f in $STAGED; do
          case "$f" in
            pnpm-lock.yaml|*-lock.yaml|database/postgres_data/*) continue ;;
          esac
          [ -f "$f" ] || continue
          SIZE=$(wc -c < "$f")
          if [ "$SIZE" -gt "$MAX_SIZE" ]; then
            FOUND="$FOUND  - $f ($((SIZE/1024))KB)\\n"
          fi
        done
        if [ -n "$FOUND" ]; then
          echo "❌ Large files detected:"
          printf "$FOUND"
          echo "   Please remove or use Git LFS."
          exit 1
        fi
"""

GATE_O_SENSITIVE_INFO = """\
    # [Gate O] Sensitive information scan — migrated from husky #2
    sensitive-info:
      name: Gate O · Sensitive Information Scan
      tags: security secrets
      run: |
        STAGED=$(git diff --cached --name-only --diff-filter=ACM)
        PATTERNS=(
          "password\\s*=\\s*['\\"][^'\"]+['\"]"
          "secret\\s*=\\s*['\\"][^'\"]+['\"]"
          "api[_-]?key\\s*=\\s*['\\"][^'\"]+['\"]"
          "private[_-]?key\\s*=\\s*['\\"][^'\"]+['\"]"
          "token\\s*=\\s*['\\"][^'\"]+['\"]"
          "AWS_ACCESS_KEY_ID\\s*=\\s*['\\\"][A-Z0-9]{16,}['\\\"]"
          "AWS_SECRET_ACCESS_KEY\\s*=\\s*['\\\"][A-Za-z0-9/+=]{40,}['\\\"]"
          "-----BEGIN PRIVATE KEY-----"
          "-----BEGIN RSA PRIVATE KEY-----"
        )
        FOUND=""
        for f in $STAGED; do
          [ -f "$f" ] || continue
          case "$f" in
            *.key|*.pem|*.p12|*.pfx)
              FOUND="$FOUND  - $f (key/cert file)\\n"
              continue
              ;;
          esac
          for p in "${PATTERNS[@]}"; do
            if grep -qiE "$p" "$f" 2>/dev/null; then
              FOUND="$FOUND  - $f (matched: $p)\\n"
              break
            fi
          done
        done
        if [ -n "$FOUND" ]; then
          echo "⚠️  Potential sensitive information detected:"
          printf "$FOUND"
          echo "   If false positive, use --no-verify to skip."
          exit 1
        fi
"""

GATE_P_API_DUPLICATES = """\
    # [Gate P] API path duplicates check — migrated from husky #4
    api-duplicates:
      name: Gate P · API Path Duplicates Check
      tags: api rust
      files: ^svc/.*\\.rs$
      run: |
        if [ -f "scripts/check_api_duplicates_ci.py" ]; then
          python3 scripts/check_api_duplicates_ci.py --ci
        fi
"""

GATE_Q_I18N_HARDCODE_ADMIN = """\
    # [Gate Q] Hardcoded CJK in admin module (strict) — migrated from husky #8b
    i18n-hardcode-admin:
      name: Gate Q · Hardcoded CJK in Admin Module (strict)
      tags: frontend i18n hardcoded
      files: (^apps/web/src/i18n/|^apps/web/src/pages/.*\\.tsx$|^scripts/i18n/|\\.(ts|tsx)$)
      run: |
        if [ -f "scripts/ci/check-i18n.cjs" ]; then
          node scripts/ci/check-i18n.cjs --strict
        fi
"""

# 迁移清单：(gate_id, gate_key, gate_name, yaml_block)
MIGRATIONS = [
    ("N", "large-files", "Gate N", GATE_N_LARGE_FILES),
    ("O", "sensitive-info", "Gate O", GATE_O_SENSITIVE_INFO),
    ("P", "api-duplicates", "Gate P", GATE_P_API_DUPLICATES),
    ("Q", "i18n-hardcode-admin", "Gate Q", GATE_Q_I18N_HARDCODE_ADMIN),
]


def gate_exists(content: str, gate_key: str, gate_name: str) -> bool:
    """检查 Gate 是否已存在于 lefthook.yml 中（幂等）。

    通过 key 名或 Gate 名称双重判断。
    """
    # 检查 key 名（如 `large-files:` 在行首 4 空格缩进）
    if re.search(rf"^    {re.escape(gate_key)}:\s*$", content, re.MULTILINE):
        return True
    # 检查 Gate 名称（如 `name: Gate N ·`）
    if re.search(rf"name:\s*{re.escape(gate_name)}\s*·", content):
        return True
    return False


def find_insertion_point(content: str) -> int | None:
    """找到 pre-push: 段的起始位置，在其前插入新 Gate。

    若不存在 pre-push:，则追加到文件末尾。
    """
    match = re.search(r"^pre-push:\s*$", content, re.MULTILINE)
    if match:
        return match.start()
    return None


def build_new_content(
    original: str, migrations_to_add: list[tuple[str, str, str, str]]
) -> str:
    """在 pre-push: 前插入未存在的 Gate。"""
    if not migrations_to_add:
        return original

    insertion_point = find_insertion_point(original)

    # 构建插入块：每个 Gate 之间用空行分隔
    block = "\n\n".join(m[3].rstrip() for m in migrations_to_add)
    # 在插入块前后各加一个空行，与现有格式对齐
    block = "\n" + block + "\n\n"

    if insertion_point is not None:
        # 在 pre-push: 前插入
        return original[:insertion_point] + block + original[insertion_point:]
    else:
        # 无 pre-push:，追加到末尾（确保前有空行）
        if not original.endswith("\n"):
            original += "\n"
        return original + block


def main() -> int:
    parser = argparse.ArgumentParser(
        description="将 husky 的 4 项检查迁移为 lefthook Gate"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="真正写入 lefthook.yml（默认仅 dry-run 预览）",
    )
    parser.add_argument(
        "--diff",
        action="store_true",
        help="显示迁移前后的差异（unified diff）",
    )
    parser.add_argument(
        "--lefthook-file",
        type=Path,
        default=LEFTHOOK_FILE,
        help="lefthook.yml 路径",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="不创建 .bak 备份文件（默认创建）",
    )
    args = parser.parse_args()

    if not args.lefthook_file.exists():
        print(f"❌ 文件不存在: {args.lefthook_file}", file=sys.stderr)
        return 1

    original = args.lefthook_file.read_text(encoding="utf-8")

    # 筛选未存在的 Gate
    migrations_to_add: list[tuple[str, str, str, str]] = []
    skipped: list[tuple[str, str, str]] = []  # (gate_id, gate_key, reason)
    for gate_id, gate_key, gate_name, yaml_block in MIGRATIONS:
        if gate_exists(original, gate_key, gate_name):
            skipped.append((gate_id, gate_key, "已存在，跳过"))
        else:
            migrations_to_add.append((gate_id, gate_key, gate_name, yaml_block))

    # 构建新内容
    new_content = build_new_content(original, migrations_to_add)

    # 输出预览
    print()
    print("=" * 70)
    print(" husky → lefthook 迁移预览")
    print("=" * 70)
    print(f"  目标文件: {args.lefthook_file}")
    print(f"  模式:     {'APPLY（写入）' if args.apply else 'DRY-RUN（仅预览）'}")
    print()

    if skipped:
        print(f"  ⏭️  已跳过（幂等）：{len(skipped)} 项")
        for gate_id, gate_key, reason in skipped:
            print(f"      Gate {gate_id} ({gate_key}): {reason}")
        print()

    if migrations_to_add:
        print(f"  ✅ 将新增：{len(migrations_to_add)} 项")
        for gate_id, gate_key, gate_name, _ in migrations_to_add:
            print(f"      Gate {gate_id} ({gate_key})")
        print()
    else:
        print("  ℹ️  无需迁移，所有 Gate 已存在。")
        print()
        return 0

    # 显示 diff
    if args.diff or not args.apply:
        diff_lines = list(
            difflib.unified_diff(
                original.splitlines(keepends=True),
                new_content.splitlines(keepends=True),
                fromfile=str(args.lefthook_file) + " (原)",
                tofile=str(args.lefthook_file) + " (新)",
                n=3,
            )
        )
        if diff_lines:
            print("  差异预览（unified diff）:")
            print("-" * 70)
            sys.stdout.writelines(diff_lines)
            print("-" * 70)
            print()

    # 写入
    if args.apply:
        # 备份
        if not args.no_backup:
            backup_path = args.lefthook_file.with_suffix(".yml.bak")
            shutil.copy2(args.lefthook_file, backup_path)
            print(f"  📦 已备份原文件到: {backup_path}")

        args.lefthook_file.write_text(new_content, encoding="utf-8")
        print(f"  ✅ 已写入: {args.lefthook_file}")
        print()
        print("  下一步验证:")
        print("    1. lefthook run pre-commit --all   # 全量跑一次")
        print("    2. python3 scripts/dev/compare-hooks.py  # 重新对比")
        print("    3. 确认无误后删除 .husky/pre-commit")
        print("    4. git add lefthook.yml && git commit")
    else:
        print("  ℹ️  当前为 dry-run，未写入文件。")
        print("  使用 --apply 真正写入：")
        print(f"    python3 {Path(__file__).relative_to(REPO_ROOT)} --apply")
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
