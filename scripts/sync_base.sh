#!/usr/bin/env bash
# [2026-10-02] 多机协作：开工前同步 base + 编译快验
# 用法：bash scripts/sync_base.sh
# 行为：fetch → 校验工作区干净 → rebase 到 origin/main → cargo check --all-targets（离线）
# 纪律：每次开工 / 换机器拉取后必跑；push 被 stale-base 拦截后用本脚本修复。
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."   # 仓库根

echo "==> [1/4] git fetch origin --prune"
git fetch origin --prune

echo "==> [2/4] 检查工作区是否干净（脏工作区会挡 rebase）"
if [ -n "$(git status --porcelain)" ]; then
  echo "    工作区有未提交改动：先 git stash 或提交后再同步。"
  echo "    （stash 后重跑本脚本，同步完成再 git stash pop）"
  exit 1
fi

# [2026-10-02 修订] git pull --rebase 的 fork-point 推断在"本地刚提交"场景会把
#   新提交误判为"已在上游"而丢弃（实证：HEAD 被 reset 回旧 base，工作区文件消失）。
#   改为显式 git rebase --no-fork-point origin/main：只做"基于 origin/main 重放本地提交"，
#   不做基于 reflog 的 fork-point 推断，杜绝误丢提交。fetch 已在 [1/4] 完成。
echo "==> [3/4] git rebase --no-fork-point origin/main"
git rebase --no-fork-point origin/main

echo "==> [4/4] 编译快验（SQLX_OFFLINE=true，全 targets）"
export SQLX_OFFLINE=true
# 统一 swagger-ui 离线包探测（禁止联网下载）
# shellcheck source=lib/swagger-ui.sh
source "$(cd "$(dirname "$0")" && pwd)/lib/swagger-ui.sh"
topems_ensure_swagger_ui_archive || exit 1
# sccache 包装：本机 0.18+ 与 nightly-2026-07-01 兼容；部分机器（实证：sccache 0.17.0）
# 在 RUSTC_WRAPPER 下编译会失败。失败时自动去掉包装降级重跑一次，避免"门禁误导"。
if command -v sccache >/dev/null; then
    echo "    （检测到 sccache，启用 RUSTC_WRAPPER 包装；失败将自动降级重试）"
    if ! RUSTC_WRAPPER=sccache cargo check --workspace --all-targets; then
        echo "    ⚠️ sccache 包装下编译失败，降级重试（RUSTC_WRAPPER=）..."
        RUSTC_WRAPPER='' cargo check --workspace --all-targets
    fi
else
    cargo check --workspace --all-targets
fi

echo "✅ base 已同步且编译通过，可以开始开发。"
echo "   提示：工具链由 rust-toolchain.toml 锁定（nightly-2026-07-01），多机一致。"
