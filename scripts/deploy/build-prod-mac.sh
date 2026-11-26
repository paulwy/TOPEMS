#!/usr/bin/env bash
# build-prod-mac.sh — 生产 Mac 上构建 / 发布 topems-server 的固定姿势
#
# 为什么需要这个脚本（2026-11-26 两次踩坑）：
#   1) 非交互 ssh / launchd 的 PATH 不含 /opt/homebrew/bin，构建会报
#      "Could not find `protoc`"（etcd-client 的 build script 需要 protoc）。
#   2) ~/.cargo/config.toml 里 [profile.release] strip = true 会连带 strip 掉
#      proc-macro 的 dylib，产出无法加载的 rlib，报
#      "can't find crate for `zeroize_derive` / `serde_derive`"
#      （rustc 1.95 + macOS 26/27 已知问题，项目 Cargo.toml 已声明 release strip="none"，
#       但全局配置在某些路径下仍会生效，故用环境变量强制覆盖）。
#
# 用法：
#   ./scripts/deploy/build-prod-mac.sh build           只编译，不换二进制
#   ./scripts/deploy/build-prod-mac.sh deploy          编译 + 备份 + 换 bin + 重启 + 校验
#   ./scripts/deploy/build-prod-mac.sh rollback        用最近一次备份回滚并重启
#   ./scripts/deploy/build-prod-mac.sh verify          只做健康/登录校验
#
# 环境变量：
#   TOPEMS_BIN      二进制落点（默认 <repo>/bin/topems-server）
#   SERVER_PORT     探活端口（默认 8099）
#   HEALTH_PATH     健康检查路径（默认 /api/server/health）
#   LOGIN_PATH      登录路径（默认 /api/core/iam/auth/login）
#   PROBE_USER      登录探活用户名（默认 admin）
#   PROBE_PASSWORD  登录探活口令（不给则跳过登录校验）
#   LAUNCH_LABEL    launchd 标签（默认 com.topems.server）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN="${TOPEMS_BIN:-$ROOT/bin/topems-server}"
SERVER_PORT="${SERVER_PORT:-8099}"
HEALTH_PATH="${HEALTH_PATH:-/api/server/health}"
LOGIN_PATH="${LOGIN_PATH:-/api/core/iam/auth/login}"
PROBE_USER="${PROBE_USER:-admin}"
PROBE_PASSWORD="${PROBE_PASSWORD:-}"
LAUNCH_LABEL="${LAUNCH_LABEL:-com.topems.server}"

log() { printf '[build-prod] %s\n' "$*"; }
die() { printf '❌ [build-prod] %s\n' "$*" >&2; exit 1; }

# 构建环境：把 brew 与 cargo 目录补进 PATH（非交互 ssh 下两者都可能缺）
prepare_env() {
  local extra="/opt/homebrew/bin:/usr/local/bin:${HOME}/.cargo/bin"
  PATH="${extra}:${PATH}"; export PATH
  if command -v protoc >/dev/null 2>&1; then
    PROTOC="$(command -v protoc)"; export PROTOC
  else
    log "警告：未找到 protoc，若构建含 etcd-client 会失败（brew install protobuf）"
  fi
  # 强制关闭 release strip：避免 proc-macro dylib 被 strip 后无法加载
  CARGO_PROFILE_RELEASE_STRIP=none; export CARGO_PROFILE_RELEASE_STRIP
  CARGO_INCREMENTAL=0; export CARGO_INCREMENTAL
}

check_tools() {
  command -v cargo >/dev/null 2>&1 || die "未找到 cargo"
  command -v curl >/dev/null 2>&1 || die "未找到 curl"
}

do_build() {
  check_tools
  prepare_env
  log "构建 topems-server（release，strip 已强制 none）"
  log "protoc=${PROTOC:-未设置} cargo=$(command -v cargo)"
  ( cd "$ROOT" && cargo build --release -p topems-server )
  [ -x "$ROOT/target/release/topems-server" ] || die "构建产物不存在"
  log "构建完成：$(stat -f '%z bytes' "$ROOT/target/release/topems-server")"
}

do_verify() {
  local health login
  health="$(curl -s -o /dev/null -m 8 -w '%{http_code}' "http://127.0.0.1:${SERVER_PORT}${HEALTH_PATH}" || true)"
  log "health ${HEALTH_PATH} → ${health}"
  [ "$health" = "200" ] || die "健康检查失败（HTTP ${health}）"
  if [ -n "$PROBE_PASSWORD" ]; then
    login="$(curl -s -o /dev/null -m 10 -w '%{http_code}' -X POST \
      "http://127.0.0.1:${SERVER_PORT}${LOGIN_PATH}" \
      -H 'Content-Type: application/json' \
      -d "{\"username\":\"${PROBE_USER}\",\"password\":\"${PROBE_PASSWORD}\"}" || true)"
    log "login ${PROBE_USER} → ${login}"
    [ "$login" = "200" ] || die "登录校验失败（HTTP ${login}）"
  else
    log "未提供 PROBE_PASSWORD，跳过登录校验"
  fi
}

do_restart() {
  local uid
  uid="$(id -u)"
  log "重启 launchd：${LAUNCH_LABEL}"
  launchctl kickstart -k "gui/${uid}/${LAUNCH_LABEL}" || die "launchctl kickstart 失败"
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null -m 3 "http://127.0.0.1:${SERVER_PORT}${HEALTH_PATH}"; then
      return 0
    fi
    sleep 1
  done
  die "重启后 30s 内端口未就绪"
}

do_deploy() {
  do_build
  [ -f "$BIN" ] || die "现有二进制不存在：${BIN}（首次部署请手动放置）"
  local stamp bak
  stamp="$(date +%Y%m%d-%H%M)"
  bak="${BIN}.bak-${stamp}"
  cp -p "$BIN" "$bak"
  log "已备份旧二进制：${bak}"
  install -m 755 "$ROOT/target/release/topems-server" "$BIN"
  log "已替换二进制：$(stat -f '%z bytes' "$BIN")"
  if ! do_restart || ! do_verify; then
    log "发布后校验失败，自动回滚"
    cp -p "$bak" "$BIN"
    do_restart || log "回滚后重启仍失败，需人工介入"
    die "发布失败，已回滚到 ${bak}"
  fi
  log "发布完成"
}

# 清理构建缓存（服务跑的是 bin/，清 target 不影响在线进程）
#
#   clean            清 dev 缓存（target/debug + target/tmp）； release 缓存保留，下次增量构建仍快
#   clean --release  连 release 缓存一起清（彻底回收磁盘，代价是下次构建从头编译 ~15min）
#   clean --backups N 只保留最近 N 个 bin 备份（默认保留 3 个，N=0 表示全清）
do_clean() {
  local also_release=0 keep_backups=3 mode=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --release) also_release=1; shift ;;
      --backups) mode="backups"; keep_backups="${2:-3}"; shift 2 ;;
      *) die "clean 未知参数：$1" ;;
    esac
  done

  local target="$ROOT/target" before after
  before="$(df -k "$ROOT" | awk 'NR==2 {print $4}')"

  if [ "$mode" = "backups" ]; then
    local dir list count i=0
    dir="${BIN%/*}"
    list="$(find "$dir" -maxdepth 1 -name "$(basename "$BIN").bak-*" -type f -print0 2>/dev/null \
      | xargs -0 stat -f '%m %N' 2>/dev/null | sort -rn | cut -d' ' -f2-)"
    count="$(printf '%s\n' "$list" | grep -c . || true)"
    for f in $list; do
      i=$((i+1))
      if [ "$i" -gt "$keep_backups" ]; then
        rm -f "$f"; log "删除旧备份：$f"
      fi
    done
    log "备份共 ${count} 个，保留最近 ${keep_backups} 个"
    return 0
  fi

  if [ -d "$target/debug" ]; then
    log "清理 $target/debug"
    rm -rf "$target/debug"
  fi
  [ -d "$target/tmp" ] && { log "清理 $target/tmp"; rm -rf "$target/tmp"; }

  if [ "$also_release" -eq 1 ] && [ -d "$target/release" ]; then
    log "清理 $target/release（下次构建将从头编译）"
    rm -rf "$target/release"
  fi

  after="$(df -k "$ROOT" | awk 'NR==2 {print $4}')"
  log "可用空间：$((before/1024)) MB → $((after/1024)) MB（释放 $(((after-before)/1024)) MB）"
  if [ "$also_release" -eq 0 ] && [ -d "$target/release" ]; then
    log "release 缓存已保留（彻底回收请用 clean --release）"
  fi
  log "在线服务未受影响（运行的是 $BIN）"
}

do_rollback() {
  local latest
  latest="$(find "${BIN%/*}" -maxdepth 1 -name "$(basename "$BIN").bak-*" -type f -print0 2>/dev/null \
    | xargs -0 stat -f '%m %N' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- || true)"
  [ -n "$latest" ] || die "没有可用备份"
  install -m 755 "$latest" "$BIN"
  log "已回滚到：${latest}"
  do_restart
  do_verify
}

case "${1:-}" in
  build) do_build ;;
  deploy) do_deploy ;;
  rollback) do_rollback ;;
  verify) do_verify ;;
  clean) do_clean "${@:2}" ;;
  *) die "用法: $0 {build|deploy|rollback|verify|clean [--release] [--backups N]}" ;;
esac
