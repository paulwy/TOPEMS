#!/usr/bin/env bash
# =============================================================================
# check-gitleaks-full.sh — pre-push 敏感信息守卫（全历史）
# =============================================================================
# 背景（2026-11-18）：本地此前只有 pre-commit 的 `gitleaks protect --staged`，
# 只扫暂存增量；CI secret-scan 用 checkout fetch-depth: 0 扫全历史。两者口径
# 不一致 → 历史提交/未暂存文件中的密钥本地永远看不到（假绿）。
#
# fail-closed：gitleaks 未安装、不在 git 仓库、扫描器异常 一律非 0 退出；
# 不提供 SKIP 开关（除非显式设置 LEFTHOOK_SKIP，由 lefthook 统一处理）。
#
# 用法：bash scripts/ci/check-gitleaks-full.sh
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
    echo "FAIL: 当前目录不在 git 仓库内，无法做全历史扫描" >&2
    exit 1
fi
cd "$ROOT"

if ! command -v gitleaks >/dev/null 2>&1; then
    echo "FAIL: 未安装 gitleaks（macOS: brew install gitleaks）。本守卫 fail-closed，不自动跳过。" >&2
    exit 1
fi

# 存量命中已冻结（占位符/测试默认口令/开发自签证书；明细见文档），
# baseline 为脱敏报告，不含任何明文密钥；新增命中仍阻断。
BASELINE="$ROOT/scripts/ci/gitleaks-baseline.json"
if [[ ! -f "$BASELINE" ]]; then
    echo "FAIL: 缺少 baseline（${BASELINE}），无法区分存量与新增；按 fail-closed 退出。" >&2
    exit 1
fi

START=$(date +%s)
echo "[secret] gitleaks 全历史扫描（CI 口径 fetch-depth: 0；baseline 冻结存量，输出已脱敏）"

set +e
if gitleaks git --help >/dev/null 2>&1; then
    gitleaks git --redact --no-banner --exit-code 1 --baseline-path "$BASELINE" .
    RC=$?
else
    # 兼容 gitleaks < 8.19（无 git 子命令）
    gitleaks detect --source . --redact --no-banner --exit-code 1 --baseline-path "$BASELINE"
    RC=$?
fi
set -e

ELAPSED=$(( $(date +%s) - START ))
if [[ $RC -ne 0 ]]; then
    echo "[secret] FAIL: gitleaks 命中或执行异常（exit=${RC}，耗时 ${ELAPSED}s）" >&2
    exit $RC
fi
echo "[secret] PASS: gitleaks 全历史无命中（耗时 ${ELAPSED}s）"
