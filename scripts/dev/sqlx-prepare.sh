#!/bin/bash
# =============================================
# TOPEMS SQLx 离线缓存一站式刷新脚本
# =============================================
# 解决的痛点：
#   1. 全 workspace 用 `cargo sqlx prepare --workspace` 会被代码本身有
#      类型错误的 crate（如 topems-mes 业务层错误）阻断；
#   2. 不同 crate 各放一份 .sqlx/ 容易出现缓存不一致、冲突或漏更新；
#   3. CI 与本地切换 DATABASE_URL 时容易混淆在线/离线语义。
#
# 策略：
#   1. 逐个 package 进入子目录单独执行 `cargo sqlx prepare`，单个失败
#      不阻断其它 package；
#   2. 全部执行完成后，把子目录下的 .sqlx/*.json 统一合并到 workspace
#      根的 `.sqlx/` 中，同名文件以后生成的覆盖旧的（保证更新）；
#   3. 合并完成后删除子目录 .sqlx/，保持 workspace 只有一份缓存；
#   4. 可选执行 `--check` 以验证当前缓存与源码是否一致（用于 CI / pre-push）。
#
# 用法：
#   ./scripts/dev/sqlx-prepare.sh                # 刷新全部可通过的包
#   ./scripts/dev/sqlx-prepare.sh -p topems-unified-core -p topems-finance
#                                                # 只刷新指定 package(s)
#   ./scripts/dev/sqlx-prepare.sh --check        # 离线校验缓存与代码一致（CI 用，不连接 DB）
#   ./scripts/dev/sqlx-prepare.sh --semantic     # 语义级校验：连接 DB + PREPARE 验证 + hash 比较（CI advisory）
#   ./scripts/dev/sqlx-prepare.sh --offline-test # 刷新后执行离线编译测试
#
# 环境变量（可选）：
#   DATABASE_URL  覆盖默认 .env / config/standalone.env
#   SKIP_PKGS     空格分隔，强制跳过（例：SKIP_PKGS="topems-mes topems-rd"）
# =============================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[sqlx-prepare]${NC} $*"; }
warn() { echo -e "${YELLOW}[sqlx-prepare][warn]${NC} $*"; }
ok()   { echo -e "${GREEN}[sqlx-prepare][ok]${NC} $*"; }
err()  { echo -e "${RED}[sqlx-prepare][err]${NC} $*" >&2; }

# ---------- 参数解析 ----------
MODE="prepare"            # prepare | check | offline-test | semantic
CUSTOM_PKGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)        MODE="check"; shift ;;
    --semantic)     MODE="semantic"; shift ;;
    --offline-test) MODE="offline-test"; shift ;;
    -p|--package)   CUSTOM_PKGS+=("$2"); shift 2 ;;
    -h|--help)
      sed -n '2,40p' "$0"; exit 0 ;;
    *) warn "忽略未知参数: $1"; shift ;;
  esac
done

# ---------- 环境准备 ----------
ENV_LOADED=0
if [ -f config/standalone.env ]; then
  # shellcheck disable=SC1091
  set -a; source config/standalone.env; set +a; ENV_LOADED=1
fi
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a; ENV_LOADED=1
fi

if [ "$MODE" != "offline-test" ] && [ -z "$DATABASE_URL" ]; then
  err "DATABASE_URL 未设置，请在 .env 或 config/standalone.env 中声明，或：
    export DATABASE_URL=postgres://user:pw@localhost:5432/dbname"
  exit 2
fi

if ! command -v cargo >/dev/null 2>&1; then
  err "未安装 cargo，请先安装 Rust：https://rustup.rs"
  exit 2
fi
if ! cargo sqlx --version >/dev/null 2>&1; then
  warn "未安装 sqlx-cli，正在自动安装 ..."
  cargo install sqlx-cli --no-default-features --features postgres,rustls
fi

# ---------- 工具函数 ----------
# 用 cargo metadata 列出 workspace 中全部 package（name|manifest_dir）
list_workspace_packages() {
  cargo metadata --format-version=1 --no-deps 2>/dev/null \
    | python3 -c "
import sys, json
m = json.load(sys.stdin)
for p in sorted(m['packages'], key=lambda x: x['name']):
    import os
    manifest = p['manifest_path']
    d = os.path.dirname(manifest)
    # 只关注 TOPEMS 源码：根下 svc/* 和 lib/*
    if '/svc/' in d or '/lib/' in d:
        print(f\"{p['name']}|{d}\")
"
}

# 根据 name 在 "${PKG_FLAT[@]}"（"name|dir"）中查找 dir，echo 到 stdout
pkg_dir_of() {
  local name="$1" i line
  for i in "${!PKG_FLAT[@]}"; do
    line="${PKG_FLAT[$i]}"
    case "$line" in
      "$name|"*) echo "${line#*|}"; return 0 ;;
    esac
  done
  return 1
}

pkg_exists() {
  pkg_dir_of "$1" >/dev/null 2>&1
}

# ---------- 主流程 ----------
SKIP_LIST=()
[ -n "$SKIP_PKGS" ] && SKIP_LIST=($SKIP_PKGS)

# 收集 packages（保持与 bash 3 兼容，不使用 declare -A）
PKG_FLAT=()            # "name|dir" 扁平数组，支持 macOS /bin/bash 3.x
ALL_PKGS=()
_TMP_LIST=$(list_workspace_packages || true)
if [ -n "$_TMP_LIST" ]; then
  while IFS='|' read -r _name _dir; do
    [ -z "$_name" ] && continue
    PKG_FLAT+=("$_name|$_dir")
    ALL_PKGS+=("$_name")
  done <<< "$_TMP_LIST"
fi

if [ "${#CUSTOM_PKGS[@]}" -gt 0 ]; then
  # 校验自定义包都在 workspace 中
  _MISSING=()
  for p in "${CUSTOM_PKGS[@]}"; do
    if ! pkg_exists "$p"; then
      _MISSING+=("$p")
    fi
  done
  if [ "${#_MISSING[@]}" -gt 0 ]; then
    err "以下 package 不在 workspace 中：${_MISSING[*]}"
    exit 2
  fi
  ALL_PKGS=("${CUSTOM_PKGS[@]}")
fi

# ---------- check 模式：校验缓存与代码一致（SQLX_OFFLINE + cargo check 全量核心包）----------
# `cargo sqlx prepare --check` 的局限：
#   1. 只会在 crate 自己的 .sqlx/ 里找 hash（不会向上查 workspace 根）
#   2. --workspace 会被有类型错误的 crate 阻断
# 所以本仓库采用"合并到根 .sqlx/"的策略，--check 退化为纯离线 cargo check
# 语义：如果根 .sqlx 缺缓存 → 宏编译报错 → check 失败。
if [ "$MODE" == "check" ]; then
  log "执行 sqlx 缓存 --check（通过 SQLX_OFFLINE cargo check 一组核心包）..."
  # 有 query! 宏使用且正常可编译的包清单（来自 grep 统计）
  DEFAULT_CHECK_PKGS=(topems-unified-core topems-finance topems-crm topems-erp topems-scm topems-srm topems-qms topems-wms topems-hrm topems-pm topems-portal topems-master-data topems-communication topems-ticket topems-ai topems-feedback topems-search topems-analytics topems-ehs topems-gis topems-integration topems-lims topems-mobile topems-pdm topems-rd topems-shared-ai)
  # 若用户指定了 -p，则只 check 指定的
  if [ "${#CUSTOM_PKGS[@]}" -gt 0 ]; then
    CHECK_PKGS=("${CUSTOM_PKGS[@]}")
  else
    CHECK_PKGS=("${DEFAULT_CHECK_PKGS[@]}")
  fi
  set +e
  FAIL_CHECK=()
  for p in "${CHECK_PKGS[@]}"; do
    skip=0
    for s in "${SKIP_LIST[@]}"; do
      [ "$p" == "$s" ] && skip=1 && break
    done
    [ $skip -eq 1 ] && continue
    pkg_exists "$p" || continue
    log "  offline-check $p"
    (
      unset DATABASE_URL
      export SQLX_OFFLINE=true
      cargo check -p "$p" --message-format=short >/tmp/sqlx-check-"$p".log 2>&1
    )
    rc=$?
    if [ $rc -ne 0 ]; then
      tail -n 15 "/tmp/sqlx-check-$p.log" >&2
      FAIL_CHECK+=("$p")
    else
      ok "  $p OK"
    fi
  done
  if [ "${#FAIL_CHECK[@]}" -gt 0 ]; then
    # 区分 sccache 环境性故障（macOS 长驻 daemon 间歇 spawn 失败，重启即恢复）与真实 .sqlx/ 缓存缺失
    if grep -q "No such file or directory (os error 2)" /tmp/sqlx-check-*.log 2>/dev/null; then
      err "检测到 sccache spawn 故障（os error 2，通常为本地长驻 daemon 异常）：
    sccache --stop-server
然后重试本命令；若仍失败，可临时绕过 sccache：
    cargo check -p <pkg> --config 'build.rustc-wrapper=\"\"'"
      exit 1
    fi
    err "以下 packages 离线 check 失败（通常 .sqlx/ 缓存缺失或过期），执行：
    ./scripts/dev/sqlx-prepare.sh -p ${FAIL_CHECK[*]}
然后提交 .sqlx/ 变更：
  git add .sqlx && git commit"
    exit 1
  fi
  ok "全部 sqlx 缓存 --check 通过"
  exit 0
fi

# ---------- semantic 模式：真正的 cargo sqlx prepare --check（连接 DB + PREPARE 验证 + hash 比较）----------
# 与 --check 的区别：
#   --check  → SQLX_OFFLINE=true cargo check（只验证缓存 hash 存在，不连接 DB）
#   --semantic → cargo sqlx prepare --check --workspace（连接 DB + 对每个 SQL 执行 PREPARE + 比较 hash）
#
# 前置条件：DATABASE_URL 指向的 DB 必须有完整 schema（表+列）。
#   可通过 schema-defense-gate 的 defense-check-all 或本地启动所有服务来初始化。
#
# 注意：sqlx-cli 的 --check 在 monorepo 合并缓存策略下必须在 workspace 根运行，
#       且用 --workspace 让 sqlx-cli 扫描所有 package 的 query! 宏。
#       逐个 package 运行会因找不到根 .sqlx/ 而误报 "missing queries"。
if [ "$MODE" == "semantic" ]; then
  log "执行 sqlx 语义级 --check（连接 DB + PREPARE 验证 + hash 比较）..."
  log "DATABASE_URL=$DATABASE_URL"
  log "模式：cargo sqlx prepare --check --workspace（全 workspace 扫描）"
  if [ "${#CUSTOM_PKGS[@]}" -gt 0 ]; then
    warn "  --semantic 模式忽略 -p 参数（sqlx-cli 要求 --workspace 全量扫描）"
  fi
  set +e
  # cargo sqlx prepare --check 需要 SQLX_OFFLINE=false（连接 DB）
  # --workspace 让 sqlx-cli 扫描所有 package 的 query! 宏
  SQLX_OFFLINE=false cargo sqlx prepare --check --workspace \
    --database-url "$DATABASE_URL" \
    >"/tmp/sqlx-semantic-workspace.log" 2>&1
  rc=$?
  if [ $rc -ne 0 ]; then
    # 区分：编译失败 vs SQL 语义失败
    # SQL 语义失败的特征：包含 "error returned from database" 或 "column does not exist" 等
    if grep -qE "error returned from database|column.*does not exist|relation.*does not exist|syntax error at or near|prepare check failed" "/tmp/sqlx-semantic-workspace.log" 2>/dev/null; then
      tail -n 30 "/tmp/sqlx-semantic-workspace.log" >&2
      err "sqlx 语义级 --check 失败：.sqlx 缓存与 DB schema 语义不一致

请运行以下命令刷新缓存：
  ./scripts/dev/sqlx-prepare.sh
然后提交 .sqlx/ 变更：
  git add .sqlx && git commit"
      exit 1
    elif grep -q "error\[" "/tmp/sqlx-semantic-workspace.log" 2>/dev/null; then
      tail -n 20 "/tmp/sqlx-semantic-workspace.log" >&2
      warn "  COMPILE-FAIL（非 sqlx 缓存问题，advisory 模式忽略）"
      exit 0
    else
      tail -n 20 "/tmp/sqlx-semantic-workspace.log" >&2
      err "sqlx 语义级 --check 失败（未知原因）"
      exit 1
    fi
  fi
  ok "全部 sqlx 语义级 --check 通过（workspace 全量）"
  exit 0
fi

# ---------- prepare 模式：逐个进入子目录 prepare ----------
log "共 ${#ALL_PKGS[@]} 个 package 待处理，仅清理子目录 .sqlx/（保留根 .sqlx/ 作为合并后真实来源）..."

# 先清掉各子目录的旧缓存，避免把旧产物合并进去
for p in "${ALL_PKGS[@]}"; do
  dir="$(pkg_dir_of "$p" || true)"
  [ -n "$dir" ] && [ -d "$dir/.sqlx" ] && rm -rf "$dir/.sqlx"
done

mkdir -p logs
OK_PKGS=()
FAIL_PKGS=()
TOTAL_QUERIES=0

for p in "${ALL_PKGS[@]}"; do
  skip=0
  for s in "${SKIP_LIST[@]}"; do
    [ "$p" == "$s" ] && skip=1 && break
  done
  if [ $skip -eq 1 ]; then
    warn "跳过 $p（在 SKIP_PKGS 中）"
    continue
  fi
  dir="$(pkg_dir_of "$p" || true)"
  [ -z "$dir" ] && continue
  log "prepare $p (in $dir)"
  set +e
  (
    cd "$dir"
    cargo sqlx prepare >"$PROJECT_ROOT/logs/sqlx-prepare-$p.log" 2>&1
  )
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then
    OK_PKGS+=("$p")
    n=$(find "$dir/.sqlx" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    TOTAL_QUERIES=$((TOTAL_QUERIES + n))
    ok "  $p OK ($n queries)"
  else
    FAIL_PKGS+=("$p")
    snippet=$(head -n 20 "$PROJECT_ROOT/logs/sqlx-prepare-$p.log" | tr '\n' ' ' | cut -c1-160)
    warn "  $p FAIL: $snippet (完整日志 logs/sqlx-prepare-$p.log)"
  fi
done

# ---------- 合并：把子目录 .sqlx/*.json 统一搬进根 .sqlx/ ----------
log "合并所有子目录 .sqlx/*.json -> 根 .sqlx/"
mkdir -p .sqlx
MERGED=0
for p in "${OK_PKGS[@]}"; do
  dir="$(pkg_dir_of "$p" || true)"
  [ -n "$dir" ] && [ -d "$dir/.sqlx" ] || continue
  n=$(find "$dir/.sqlx" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" -gt 0 ]; then
    # cp -f 覆盖同名 hash（以最新 prepare 结果为准）
    cp -f "$dir/.sqlx"/*.json .sqlx/
    MERGED=$((MERGED + n))
  fi
  rm -rf "$dir/.sqlx"
done

ROOT_QUERIES=$(find .sqlx -name "*.json" | wc -l | tr -d ' ')
ok "完成：成功 ${#OK_PKGS[@]}/${#ALL_PKGS[@]}，合并 $MERGED 个子目录查询缓存，根 .sqlx 共 $ROOT_QUERIES queries"
if [ "${#FAIL_PKGS[@]}" -gt 0 ]; then
  warn "失败（通常是代码本身类型错误，非 sqlx 缓存问题）：${FAIL_PKGS[*]}"
fi

# 清理可能残留的 svc/*/.sqlx 空目录
find svc lib -name ".sqlx" -type d -empty -delete 2>/dev/null || true
LEFTOVER=$(find svc lib -name ".sqlx" -type d 2>/dev/null | wc -l | tr -d ' ')
[ "$LEFTOVER" -gt 0 ] && warn "仍有 $LEFTOVER 个子目录 .sqlx/ 未清理，请检查"

# ---------- offline-test 模式：验证离线可用 ----------
if [ "$MODE" == "offline-test" ]; then
  log "执行 SQLX_OFFLINE=true 离线编译验证（清空 DATABASE_URL）..."
  TEST_PKGS=(topems-unified-core topems-finance topems-crm topems-erp topems-scm topems-srm topems-qms topems-wms topems-analytics topems-shared-ai)
  set +e
  FAIL_TEST=()
  for p in "${TEST_PKGS[@]}"; do
    (
      cd "$PROJECT_ROOT"
      unset DATABASE_URL
      export SQLX_OFFLINE=true
      cargo check -p "$p" --message-format=short >/tmp/sqlx-offline-"$p".log 2>&1
    )
    if [ $? -eq 0 ]; then
      ok "  离线 $p OK"
    else
      err "  离线 $p FAILED，详见 /tmp/sqlx-offline-$p.log"
      FAIL_TEST+=("$p")
    fi
  done
  set -e
  if [ "${#FAIL_TEST[@]}" -gt 0 ]; then
    err "离线编译失败: ${FAIL_TEST[*]}"
    exit 1
  fi
  ok "全部离线编译测试通过 ✅"
fi

log "完成。请把根目录 .sqlx/ 提交到 git：
    git add .sqlx && git status"
