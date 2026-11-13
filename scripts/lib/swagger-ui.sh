# shellcheck shell=bash
# =============================================
# TOPEMS lib/swagger-ui.sh（2026-11-14）
# =============================================
# utoipa-swagger-ui 的 build.rs 默认联网下载 Swagger UI 包，网络不稳时会在
# cargo build/check 中卡住十分钟后失败（本仓库已三次因此阻断 pre-push）。
# 本脚本统一解析本地离线包并导出 SWAGGER_UI_DOWNLOAD_URL=file://...。
# 未命中时默认只告警并回退在线下载（不阻塞有网机器）；仅当显式设置
# TOPEMS_SWAGGER_UI_REQUIRED=1 时才 fail-fast，供离线/受控环境使用。
#
# 解析顺序：
#   1. 已显式设置 SWAGGER_UI_DOWNLOAD_URL（尊重调用方）
#   2. TOPEMS_SWAGGER_UI_ARCHIVE 指定的 zip 路径
#   3. <repo>/vendor/swagger-ui-v*.zip
#   4. ${TOPEMS_RELEASE_DIR:-$HOME/topems-release}/vendor/swagger-ui-v*.zip
#
# 用法：source 后在 cargo 命令前调用 topems_ensure_swagger_ui_archive || exit 1

topems_swagger_ui_repo_root() {
    local here
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    printf '%s\n' "$here"
}

topems_ensure_swagger_ui_archive() {
    if [ -n "${SWAGGER_UI_DOWNLOAD_URL:-}" ]; then
        return 0
    fi

    local repo_root release_dir candidate dir
    local -a candidates=()
    repo_root="$(topems_swagger_ui_repo_root)"
    release_dir="${TOPEMS_RELEASE_DIR:-$HOME/topems-release}"

    if [ -n "${TOPEMS_SWAGGER_UI_ARCHIVE:-}" ]; then
        candidates+=("$TOPEMS_SWAGGER_UI_ARCHIVE")
    fi
    for dir in "$repo_root/vendor" "$release_dir/vendor"; do
        [ -d "$dir" ] || continue
        for candidate in "$dir"/swagger-ui-v*.zip; do
            [ -f "$candidate" ] && candidates+=("$candidate")
        done
    done

    if [ "${#candidates[@]}" -gt 0 ]; then
        for candidate in "${candidates[@]}"; do
            if [ -f "$candidate" ]; then
                SWAGGER_UI_DOWNLOAD_URL="file://$candidate"
                export SWAGGER_UI_DOWNLOAD_URL
                echo "[swagger-ui] 使用本地离线包: $candidate" >&2
                return 0
            fi
        done
    fi

    if [ "${TOPEMS_SWAGGER_UI_REQUIRED:-0}" = "1" ]; then
        cat >&2 <<EOF
[swagger-ui] 未找到本地 swagger-ui 离线包，且 TOPEMS_SWAGGER_UI_REQUIRED=1，构建中止。
  已查找:
    - TOPEMS_SWAGGER_UI_ARCHIVE（当前: ${TOPEMS_SWAGGER_UI_ARCHIVE:-未设置}）
    - $repo_root/vendor/swagger-ui-v*.zip
    - $release_dir/vendor/swagger-ui-v*.zip
  解决方式（任选其一）:
    1. 将 swagger-ui-v5.32.6.zip 放到 $repo_root/vendor/（不要提交进仓库）
    2. 设置 TOPEMS_SWAGGER_UI_ARCHIVE=/绝对路径/swagger-ui-v5.32.6.zip
    3. 或直接设置 SWAGGER_UI_DOWNLOAD_URL=file:///绝对路径/swagger-ui-v5.32.6.zip
EOF
        return 1
    fi

    cat >&2 <<EOF
[swagger-ui] 警告：未找到本地 swagger-ui 离线包，将回退为 utoipa-swagger-ui 在线下载（可能较慢或失败）。
  已查找:
    - TOPEMS_SWAGGER_UI_ARCHIVE（当前: ${TOPEMS_SWAGGER_UI_ARCHIVE:-未设置}）
    - $repo_root/vendor/swagger-ui-v*.zip
    - $release_dir/vendor/swagger-ui-v*.zip
  如需离线/确定性构建（推荐）:
    1. 将 swagger-ui-v5.32.6.zip 放到 $repo_root/vendor/（不要提交进仓库）
    2. 设置 TOPEMS_SWAGGER_UI_ARCHIVE=/绝对路径/swagger-ui-v5.32.6.zip
    3. 或在离线环境设置 TOPEMS_SWAGGER_UI_REQUIRED=1 让缺失直接失败
EOF
    return 0
}
