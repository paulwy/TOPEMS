#!/usr/bin/env bash
# Gate R · Clippy 预提交硬门禁
# 当 staged 文件中包含 .rs 时，运行 cargo clippy --workspace --all-targets -- -D warnings
# 与 CI 的 clippy-check job 对齐，防止在本地提交中引入 clippy 警告
set -euo pipefail

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.rs$' || true)
[ -z "$STAGED" ] && exit 0

# 捕获 clippy 输出以提供更友好的失败提示
if ! OUTPUT=$(cargo clippy --workspace --all-targets -- -D warnings 2>&1); then
  echo "❌ clippy 检查失败（warning 被视为 error）："
  echo "$OUTPUT"
  echo ""
  echo "   请修复上述 clippy 警告后重新提交。如需临时跳过，使用 --no-verify。"
  exit 1
fi

exit 0
