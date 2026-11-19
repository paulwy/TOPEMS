#!/bin/bash
# ==============================================================================
# 本地质量门禁统一入口（CI 暂停期间的替代方案）
#
# 背景：GitHub Actions 因额度/计费不可用（2026-11-18 实测最近 100 次运行 0 成功、
#       job steps=[] 未启动）。本脚本把原本由 CI + lefthook 承担的门禁收敛成本地可执行入口。
#
# 用法：
#   bash scripts/dev/run-local-gates.sh --fast      # 静态门禁，秒级~几分钟，不编译、不连库（默认）
#   bash scripts/dev/run-local-gates.sh --rust      # 静态 + cargo fmt/check/clippy/test（需充足磁盘）
#   bash scripts/dev/run-local-gates.sh --db        # 静态 + 依赖数据库的门禁（需 PG/Redis 可达）
#   bash scripts/dev/run-local-gates.sh --all       # 全部（= fast + rust + db）
#   bash scripts/dev/run-local-gates.sh --dry-run   # 只打印将执行的命令，不实际运行
#
# 参数：
#   --strict   任何 SKIP 也算失败（默认 SKIP 只警告）
#   --force    跳过磁盘余量检查（Rust 阶段默认要求 >= 20 GiB 可用）
#
# 说明：
#   - 不写生产库、不碰 bin/、不调用 launchctl；Rust 阶段固定 SQLX_OFFLINE=true。
#   - 每个门禁的 PASS/FAIL/SKIP 都会汇总到最后，任一 FAIL 退出码为 1。
# ==============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

MODE="fast"
STRICT=0
FORCE=0
DRY=0

for arg in "$@"; do
  case "$arg" in
    --fast|--rust|--db|--all) MODE="${arg#--}" ;;
    --dry-run) DRY=1 ;;
    --strict) STRICT=1 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '6,20p' "$0"; exit 0 ;;
    *) echo "未知参数: ${arg}（见 --help）"; exit 2 ;;
  esac
done

RESULT_NAMES=()
RESULT_STATES=()
FAILED=0
SKIPPED=0

C_OK=$'\033[32m'; C_BAD=$'\033[31m'; C_WARN=$'\033[33m'; C_DIM=$'\033[2m'; C_END=$'\033[0m'

run_gate() {
  local name="$1"; shift
  local cmd="$*"
  # 从命令中取出被执行的脚本路径（形如 bash/node/python3 <path> [args]），缺失则记 SKIP
  local interp="${cmd%% *}"
  local rest="${cmd#* }"
  local script="${rest%% *}"
  if [ "${interp}" = "bash" ] || [ "${interp}" = "node" ] || [ "${interp}" = "python3" ]; then
    if [ ! -e "$script" ]; then
      skip_gate "$name" "脚本缺失：$script"
      return 0
    fi
  fi
  printf '%s▶ %-42s%s %s\n' "$C_DIM" "$name" "$C_END" "$C_DIM$cmd$C_END"
  if [ "$DRY" = "1" ]; then
    RESULT_NAMES+=("$name"); RESULT_STATES+=("DRY"); return 0
  fi
  local out rc
  out="$(eval "$cmd" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then
    RESULT_NAMES+=("$name"); RESULT_STATES+=("PASS")
    return 0
  fi
  RESULT_NAMES+=("$name"); RESULT_STATES+=("FAIL")
  FAILED=$((FAILED+1))
  printf '%s✗ %s 失败（exit %s）%s\n' "$C_BAD" "$name" "$rc" "$C_END"
  printf '%s\n' "$out" | tail -25 | sed 's/^/    /'
  return 1
}

skip_gate() {
  local name="$1"; local reason="$2"
  RESULT_NAMES+=("$name"); RESULT_STATES+=("SKIP")
  SKIPPED=$((SKIPPED+1))
  printf '%s- %-42s SKIP：%s%s\n' "$C_WARN" "$name" "$reason" "$C_END"
}

need_file() { return 0; }

# 仓库根目录校验：脚本必须位于 <repo>/scripts/dev/ 下
if [ ! -d scripts/ci ] || [ ! -d svc ]; then
  echo "✗ 未在仓库根目录运行（当前 $ROOT 下找不到 scripts/ci 或 svc）。"
  echo "  请用仓库内路径执行： bash scripts/dev/run-local-gates.sh --fast"
  exit 2
fi

# ── 前置检查 ──────────────────────────────────────────────────────────────────
preflight() {
  echo "== 环境 =="
  local miss=0
  for t in node python3 git; do
    if command -v "$t" >/dev/null 2>&1; then
      printf '  %-8s %s\n' "$t" "$(command -v "$t")"
    else
      printf '  %-8s %s缺失%s\n' "$t" "$C_BAD" "$C_END"; miss=1
    fi
  done
  for t in cargo pnpm shellcheck gitleaks psql; do
    command -v "$t" >/dev/null 2>&1 && printf '  %-8s %s\n' "$t" "$(command -v "$t")" \
      || printf '  %-8s %s未安装（相关门禁将 SKIP）%s\n' "$t" "$C_WARN" "$C_END"
  done
  echo "  分支      $(git branch --show-current 2>/dev/null || echo '(detached)')"
  echo "  未提交    $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') 项"
  echo
  [ "$miss" -eq 1 ] && { echo "${C_BAD}缺少基础工具（node/python3/git），终止${C_END}"; exit 2; }
  return 0
}

# ── 阶段一：静态门禁（不编译、不连库）────────────────────────────────────────
stage_fast() {
  echo "== 阶段 1/3：静态门禁（不编译、不连库）=="

  # 安全
  if command -v gitleaks >/dev/null 2>&1 && need_file scripts/ci/check-gitleaks-full.sh; then
    run_gate "gitleaks 全历史扫密钥" "bash scripts/ci/check-gitleaks-full.sh"
  else
    skip_gate "gitleaks 全历史扫密钥" "gitleaks 未安装（brew install gitleaks）"
  fi
  need_file scripts/ci/check-sensitive-info.sh && run_gate "敏感信息扫描" "bash scripts/ci/check-sensitive-info.sh"
  need_file scripts/ci/check-hardcoded-passwords.mjs && run_gate "硬编码口令扫描" "node scripts/ci/check-hardcoded-passwords.mjs --changed-only"
  need_file scripts/ci/check-large-files.sh && run_gate "大文件检查(>1MB)" "bash scripts/ci/check-large-files.sh"

  # 脚本与配置
  if command -v shellcheck >/dev/null 2>&1; then
    run_gate "ShellCheck 全量" "bash scripts/ci/check-shellcheck.sh"
  else
    skip_gate "ShellCheck 全量" "shellcheck 未安装（brew install shellcheck）"
  fi
  need_file scripts/dev/check-config-consistency.py && run_gate "配置三方一致性" "python3 scripts/dev/check-config-consistency.py"
  need_file scripts/ci/check-config-sources.cjs && run_gate "端口单一真相源" "node scripts/ci/check-config-sources.cjs --check"

  # 迁移静态链
  need_file scripts/check-migration-names.mjs && run_gate "迁移命名" "node scripts/check-migration-names.mjs --strict"
  need_file scripts/check-migrations.mjs && run_gate "迁移重复/历史改写" "node scripts/check-migrations.mjs"
  need_file scripts/migration/validate.sh && run_gate "迁移静态校验" "bash scripts/migration/validate.sh"
  need_file scripts/migration/gen-manifest.sh && run_gate "manifest 台账漂移" "bash scripts/migration/gen-manifest.sh --check"
  need_file scripts/ci/check-migration-insert-shape.sh && run_gate "迁移 INSERT 列序" "bash scripts/ci/check-migration-insert-shape.sh"
  need_file scripts/ci/check-destructive-sql.mjs && run_gate "破坏性 SQL 守卫" "node scripts/ci/check-destructive-sql.mjs"
  need_file scripts/ci/check-baseline-integrity.mjs && run_gate "基线完整性" "node scripts/ci/check-baseline-integrity.mjs --changed-only"
  need_file scripts/ci/check-prod-migration-entry.mjs && run_gate "prod 迁移入口" "node scripts/ci/check-prod-migration-entry.mjs"

  # Schema / RLS 静态
  need_file scripts/ci/check-schema-boundary.cjs && run_gate "Schema 边界(cjs)" "node scripts/ci/check-schema-boundary.cjs"
  need_file scripts/check_schema_boundary.py && run_gate "Schema 边界(py)" "python3 scripts/check_schema_boundary.py"
  need_file scripts/ci/check-schema-prefix.mjs && run_gate "schema 前缀" "node scripts/ci/check-schema-prefix.mjs --changed-only"
  need_file scripts/ci/check-search-path.mjs && run_gate "search_path 自设" "node scripts/ci/check-search-path.mjs --changed-only"
  need_file scripts/ci/check-pool-acquire.mjs && run_gate "绕过池调用" "node scripts/ci/check-pool-acquire.mjs --changed-only"
  need_file scripts/ci/check-request-txn.mjs && run_gate "请求事务" "node scripts/ci/check-request-txn.mjs --changed-only"
  need_file scripts/ci/check-tenant-context.cjs && run_gate "租户上下文" "node scripts/ci/check-tenant-context.cjs --changed-only"
  need_file scripts/ci/check-no-runtime-permission-insert.mjs && run_gate "权限码落库路径" "node scripts/ci/check-no-runtime-permission-insert.mjs"

  # Rust 静态（不编译）
  need_file scripts/ci/check-axum-layer-order.cjs && run_gate "Axum Layer 顺序" "node scripts/ci/check-axum-layer-order.cjs"
  need_file scripts/ci/check-error-handling.cjs && run_gate "统一错误出口" "node scripts/ci/check-error-handling.cjs"
  need_file scripts/ci/check-bridge-coverage.cjs && run_gate "错误桥接覆盖" "node scripts/ci/check-bridge-coverage.cjs --changed-only"
  need_file scripts/ci/check-txn-write-non2xx.py && run_gate "事务内写后非2xx" "python3 scripts/ci/check-txn-write-non2xx.py --changed-only"
  need_file scripts/ci/check-pool-direct-system-scope.py && run_gate "池直连+系统身份" "python3 scripts/ci/check-pool-direct-system-scope.py --changed-only"
  need_file scripts/ci/check-api.cjs && run_gate "API 三合一审计" "node scripts/ci/check-api.cjs --mode=all"
  need_file scripts/ci/check-api-boundary.cjs && run_gate "API 边界" "node scripts/ci/check-api-boundary.cjs"
  need_file scripts/ci/check-openapi-coverage.cjs && run_gate "OpenAPI 覆盖" "node scripts/ci/check-openapi-coverage.cjs"
  # 聚合产物自 2026-11-19 起不再入库（见 docs/quality/openapi-aggregated-artifact-policy-2026-11-19.md），
  # 本地/夜间链路在产物缺失时跳过该棘轮；CI 侧仍按原口径传产物
  need_file scripts/ci/check-openapi-aggregated.cjs && run_gate "OpenAPI 聚合棘轮" "node scripts/ci/check-openapi-aggregated.cjs --allow-missing"
  need_file scripts/ci/check-decode-contract.mjs && run_gate "解码契约" "node scripts/ci/check-decode-contract.mjs scripts/ci/data/prod_cols.psv"

  # 前端
  need_file scripts/ci/frontend-lint.sh && run_gate "前端 lint" "bash scripts/ci/frontend-lint.sh"
  need_file scripts/ci/check-i18n.cjs && run_gate "i18n 质量" "node scripts/ci/check-i18n.cjs --mode=quality --strict"
  need_file scripts/ci/check-hardcoded-precise.sh && run_gate "硬编码中文精确扫描" "bash scripts/ci/check-hardcoded-precise.sh"
  need_file scripts/ci/check-a11y.cjs && run_gate "a11y 基线" "node scripts/ci/check-a11y.cjs --changed-only --strict --baseline scripts/ci/a11y-baseline.json"
  need_file scripts/ci/check-design-tokens.cjs && run_gate "设计 Token" "node scripts/ci/check-design-tokens.cjs --staged --strict --baseline scripts/ci/design-tokens-baseline.json"

  echo
}

# ── 阶段二：Rust 编译类门禁 ──────────────────────────────────────────────────
stage_rust() {
  echo "== 阶段 2/3：Rust 编译类（fmt / check / clippy / test --lib）=="
  if ! command -v cargo >/dev/null 2>&1; then
    skip_gate "Rust 全部" "cargo 未安装"
    echo; return 0
  fi

  local avail_gb
  avail_gb=$(df -g /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
  [ -z "$avail_gb" ] && avail_gb=$(df -g / 2>/dev/null | awk 'NR==2{print $4}')
  if [ "${avail_gb:-0}" -lt 20 ] && [ "$FORCE" != "1" ]; then
    skip_gate "Rust 全部" "磁盘可用仅 ${avail_gb} GiB（<20 GiB，满编 target 需 76 GiB）；确认要跑请加 --force"
    echo; return 0
  fi

  export SQLX_OFFLINE=true
  run_gate "cargo fmt"        "cargo fmt --all --check"
  run_gate "cargo check(变更)" "bash scripts/ci/check-stale-base.sh && bash scripts/ci/run-cargo-changed.sh check"
  run_gate "cargo clippy(变更)" "bash scripts/ci/run-cargo-changed.sh clippy"
  run_gate "cargo test --lib(变更)" "bash scripts/ci/run-cargo-changed.sh test"
  echo
}

# ── 阶段三：依赖数据库/运行态 ─────────────────────────────────────────────────
stage_db() {
  echo "== 阶段 3/3：依赖数据库的门禁 =="
  if ! command -v psql >/dev/null 2>&1; then
    skip_gate "数据库门禁" "psql 未安装"
    echo; return 0
  fi

  if [ -f .env ] && [ -z "${DATABASE_URL:-}" ]; then
    DATABASE_URL=$(sed -nE 's/^MIGRATE_URL=(.*)/\1/p' .env | head -1)
    [ -n "$DATABASE_URL" ] && export DATABASE_URL && echo "  DATABASE_URL 来自 .env（只读用途）"
  fi

  run_gate "RLS 权限校验"     "node scripts/ci/check-rls-permissions.cjs"
  run_gate "账本/DDL 漂移"    "bash scripts/ci/check-ledger-ddl-drift.sh"
  echo "  提示：domain-probe / web / mobile 契约实跑需运行中的服务，按需手动执行："
  echo "        bash scripts/dev/domain-probe.sh"
  echo "        bash scripts/mobile_smoke_precommit.sh"
  echo "        bash scripts/dev/web_smoke_precommit.sh   # 自建测试库+隔离 BFF；已有测试 BFF 可设 WEB_BFF_URL 直跑"
  echo
}

# ── 汇总 ─────────────────────────────────────────────────────────────────────
summary() {
  echo "== 汇总 =="
  local i total="${#RESULT_NAMES[@]}"
  for i in "${!RESULT_NAMES[@]}"; do
    local st="${RESULT_STATES[$i]}"
    local color="$C_OK"
    [ "$st" = "FAIL" ] && color="$C_BAD"
    [ "$st" = "SKIP" ] && color="$C_WARN"
    printf '  %s%-5s%s %s\n' "$color" "$st" "$C_END" "${RESULT_NAMES[$i]}"
  done
  echo
  echo "  共 ${total} 项：FAIL ${FAILED} / SKIP ${SKIPPED}"
  if [ "$STRICT" = "1" ] && [ "$SKIPPED" -gt 0 ]; then
    echo "  ${C_BAD}--strict 模式：SKIP 视为失败${C_END}"; exit 1
  fi
  [ "$FAILED" -gt 0 ] && { echo "  ${C_BAD}结论：未通过${C_END}"; exit 1; }
  echo "  ${C_OK}结论：通过${C_END}"
  exit 0
}

preflight
case "$MODE" in
  fast) stage_fast ;;
  rust) stage_fast; stage_rust ;;
  db)   stage_fast; stage_db ;;
  all)  stage_fast; stage_rust; stage_db ;;
esac
summary
