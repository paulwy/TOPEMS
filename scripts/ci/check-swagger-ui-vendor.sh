#!/usr/bin/env bash
# =============================================
# scripts/ci/check-swagger-ui-vendor.sh（2026-11-18）
# =============================================
# 门禁：swagger-ui 离线包必须入库、存在、且 sha256 与 scripts/lib/swagger-ui.sh
# 中的 TOPEMS_SWAGGER_UI_SHA256_DEFAULT 一致。
#
# 存在意义（无 GitHub / 离线环境）：
#   utoipa-swagger-ui 的 build.rs 默认从 GitHub 下载 swagger-ui zip，断网即编译失败
#   （最坏卡十分钟超时）。本仓库已把 v5.32.6 归档入库到 vendor/，本门禁防止它被误删、
#   被半包覆盖、或版本与 sha256 常量脱节（后两者都会让构建静默回退到联网下载）。
#
# 纯本地校验，不联网，秒级。CI 与 pre-push 均可调用。
# 用法：bash scripts/ci/check-swagger-ui-vendor.sh [--quiet]

set -uo pipefail

quiet=0
[ "${1:-}" = "--quiet" ] && quiet=1

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"

# shellcheck source=../lib/swagger-ui.sh
. "$repo_root/scripts/lib/swagger-ui.sh"

archive="$repo_root/vendor/swagger-ui-v5.32.6.zip"
expected="$TOPEMS_SWAGGER_UI_SHA256_DEFAULT"

fail() {
    printf '[swagger-ui-vendor][FAIL] %s\n' "$1" >&2
    [ "$quiet" -eq 1 ] || cat >&2 <<EOF

修复方式（任选其一）:
  1. git checkout -- vendor/swagger-ui-v5.32.6.zip        # 从仓库恢复
  2. 从内网制品源/其他机器拷贝同版本 zip 放到 vendor/
  3. 仅在确认主动升级 Swagger UI 版本时，同步更新
     scripts/lib/swagger-ui.sh 的 TOPEMS_SWAGGER_UI_SHA256_DEFAULT
EOF
    exit 1
}

[ -f "$archive" ] || fail "离线包缺失: vendor/swagger-ui-v5.32.6.zip"

actual="$(_topems_swagger_ui_sha256 "$archive")" || fail "无法计算 sha256（缺 shasum/sha256sum）"
[ -n "$actual" ] || fail "sha256 计算为空: $archive"

if [ "$actual" != "$expected" ]; then
    fail "sha256 不匹配（疑似半包/篡改/版本脱节）
  期望: $expected
  实际: $actual"
fi

# 结构校验：必须是官方归档布局（顶层 swagger-ui-<ver>/，含 dist/index.html）
# 注：先取完整清单再匹配，避免 grep -q 提前退出触发 pipefail 误判
entries="unknown"
if command -v unzip >/dev/null 2>&1; then
    listing="$(unzip -l "$archive" 2>/dev/null)" || fail "无法读取 zip 目录: $archive"
    printf '%s\n' "$listing" | grep "swagger-ui-5.32.6/dist/index.html" >/dev/null \
        || fail "zip 结构异常（缺少 swagger-ui-5.32.6/dist/index.html）: $archive"
    entries="$(printf '%s\n' "$listing" | tail -1 | awk '{print $2}')"
fi

[ "$quiet" -eq 1 ] || printf '[swagger-ui-vendor][OK] vendor/swagger-ui-v5.32.6.zip（sha256 校验通过，条目 %s）\n' "$entries"
exit 0
