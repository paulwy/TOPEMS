#!/usr/bin/env bash
# 薄 shim：历史入口 scripts/start-local.sh（原 0 字节空文件导致 `pnpm dev` 静默空跑）。
# 实际实现位于 scripts/dev/start-local.sh，所有参数透传。
# 注意：scripts/dev/start-local.sh 的 case 缺少 all) 分支（默认无参调用会报"未知命令: all"），
#       待修复后本 shim 即完全可用；当前可显式传子命令使用。
set -euo pipefail
exec "$(dirname "$0")/dev/start-local.sh" "$@"
