#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────
# TOPEMS shellcheck 回归防线（P1-1 清零 195→0 后固化，防告警回潮）
#
# 模式：
#   bash scripts/ci/check-shellcheck.sh                # 全量：所有 git 跟踪 *.sh
#   bash scripts/ci/check-shellcheck.sh --changed-only # 暂存区变更的 *.sh
#
# 接入点：
#   - pre-commit:  --changed-only（秒级，无 .sh 变更即跳过）
#   - pre-push:    全量（秒级，置于 cargo 门禁之前快速失败）
#   - CI ci.yml:   全量（ubuntu runner，apt 安装 shellcheck）
#
# 退出码：0 = 全部通过；1 = 存在告警或 shellcheck 缺失
# ──────────────────────────────────────────────────────────────────────────
set -uo pipefail

if ! command -v shellcheck >/dev/null 2>&1; then
    echo "❌ [shellcheck] 未安装，回归防线失效。请先安装："
    echo "   macOS:  brew install shellcheck"
    echo "   Ubuntu: apt-get install shellcheck"
    echo "   或下载: https://github.com/koalaman/shellcheck/releases"
    exit 1
fi

MODE="${1:-all}"
FILES=()

if [ "$MODE" = "--changed-only" ]; then
    while IFS= read -r line; do
        FILES+=("$line")
    done < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.sh$' || true)
    if [ "${#FILES[@]}" -eq 0 ]; then
        echo "✅ [shellcheck] 无暂存 .sh 变更，跳过"
        exit 0
    fi
    echo "🔍 [shellcheck] 暂存 ${#FILES[@]} 个脚本变更，逐一扫描"
else
    while IFS= read -r line; do
        FILES+=("$line")
    done < <(git ls-files '*.sh' || true)
    echo "🔍 [shellcheck] 全量扫描 ${#FILES[@]} 个 git 跟踪脚本"
fi

rc=0
checked=0
for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    checked=$((checked + 1))
    out=$(shellcheck -S warning -f gcc "$f" 2>&1)
    if [ -n "$out" ]; then
        rc=1
        echo "$out"
    fi
done

if [ "$rc" -eq 0 ]; then
    echo "✅ [shellcheck] ${checked} 个脚本 0 告警 0 语法错误"
else
    echo "❌ [shellcheck] 存在告警/语法错误，请修复后重新提交（参照 P1-1 清零经验）"
fi
exit "$rc"
