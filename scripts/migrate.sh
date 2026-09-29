#!/usr/bin/env bash
# =============================================================================
# TOPEMS 统一数据库迁移脚本 (migrate.sh)
# =============================================================================
#
# 用途:
#   使用 sqlx-cli 统一管理 TOPEMS 项目所有数据库迁移。
#   覆盖顶层 database/migrations/ 与各 svc/*/migrations/ 目录，
#   按版本号顺序执行，保证本地、CI、生产环境迁移行为一致。
#
# 主要特性:
#   1. 优先使用 sqlx-cli (sqlx migrate run) 执行迁移，与 CI workflow 对齐
#   2. 当 sqlx-cli 不可用时，回退到 psql + 手动 _sqlx_migrations 记录
#   3. 自动扫描全部迁移目录，按目录分别执行迁移
#   4. 支持 run / status / list / revert / validate 子命令
#   5. 兼容 bash 3.2 (macOS) 与 bash 4+ (Linux)
#   6. 支持 dry-run 模式，仅打印将执行的迁移
#
# 与现有脚本的关系:
#   - 替代 scripts/topems.sh db_migrate (psql 模式) 的功能
#   - 替代 scripts/deploy/deploy.sh run_migrations 的功能
#   - 与 scripts/migration/validate.sh 互补 (本脚本调用 validate.sh 做校验)
#   - 与 .github/workflows/migration-test.yml 中 sqlx-cli 用法对齐
#
# -----------------------------------------------------------------------------
# 用法示例:
#
#   # 1. 设置数据库连接 (必需)
#   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/topems"
#
#   # 2. 执行所有未应用的迁移
#   bash scripts/migrate.sh run
#
#   # 3. 仅查看迁移状态 (不执行)
#   bash scripts/migrate.sh status
#
#   # 4. 列出所有迁移文件
#   bash scripts/migrate.sh list
#
#   # 5. 干跑 - 仅打印将执行的迁移
#   bash scripts/migrate.sh run --dry-run
#
#   # 6. 仅执行指定服务的迁移
#   bash scripts/migrate.sh run --service finance
#   bash scripts/migrate.sh run --service database
#
#   # 7. 回滚最近一次迁移 (按目录逐个回滚)
#   bash scripts/migrate.sh revert
#   bash scripts/migrate.sh revert --service erp
#
#   # 8. 迁移前先做校验
#   bash scripts/migrate.sh validate
#
#   # 9. 安装 sqlx-cli (如未安装)
#   bash scripts/migrate.sh install
#
# 可选环境变量:
#   DATABASE_URL            PostgreSQL 连接串 (必需，除 list/validate/install 外)
#   TOPEMS_MIGRATE_DRY_RUN 1 时等价于 --dry-run
#   TOPEMS_MIGRATE_SKIP_CORE  1 时跳过 database/migrations (顶层)
#   TOPEMS_MIGRATE_ONLY       仅执行指定服务 (等价于 --service)
#   SQLX_OFFLINE             1 时强制离线模式 (跳过 sqlx-cli 连接检查)
# =============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# 路径与常量
# ----------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_MIGRATIONS_DIR="database/migrations"
SVC_ROOT="$REPO_ROOT/svc"
VALIDATE_SCRIPT="$REPO_ROOT/scripts/migration/validate.sh"

# 默认配置
DRY_RUN="${TOPEMS_MIGRATE_DRY_RUN:-false}"
SKIP_CORE="${TOPEMS_MIGRATE_SKIP_CORE:-false}"
ONLY_SERVICE="${TOPEMS_MIGRATE_ONLY:-}"
DATABASE_URL="${DATABASE_URL:-}"

# 迁移目录类型
#   core  - 顶层平台迁移 (database/migrations)
#   svc   - 服务级迁移 (svc/<name>/migrations)
MIGRATION_DIR_TYPE_CORE="core"
MIGRATION_DIR_TYPE_SVC="svc"

# ----------------------------------------------------------------------------
# 终端颜色 (兼容非 TTY)
# ----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  BOLD=''
  NC=''
fi

# ----------------------------------------------------------------------------
# 日志函数
# ----------------------------------------------------------------------------
log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}   $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERR]${NC}  $*" >&2; }
log_step()   { echo -e "${CYAN}${BOLD}▶${NC} $*"; }
log_detail() { echo -e "  ${CYAN}└${NC} $*"; }

# 计数器
ERRORS=0
WARNINGS=0
PROCESSED_DIRS=0
APPLIED_MIGRATIONS=0

# ----------------------------------------------------------------------------
# 帮助信息
# ----------------------------------------------------------------------------
usage() {
  cat <<'EOF'
TOPEMS 统一数据库迁移脚本

用法:
  bash scripts/migrate.sh <command> [options]

命令 (Commands):
  run        执行所有未应用的迁移
  status     查看各迁移目录的状态
  list       列出所有迁移文件 (不连接数据库)
  revert     回滚最近一次迁移 (按目录)
  validate   校验迁移文件名、版本顺序、checksum
  install    安装 sqlx-cli 工具

选项 (Options):
  --service <name>   仅执行指定服务的迁移 (如 erp, finance, database)
  --dry-run          仅打印将执行的迁移，不实际执行
  --help, -h         显示帮助信息

环境变量:
  DATABASE_URL                PostgreSQL 连接串 (必需)
  TOPEMS_MIGRATE_DRY_RUN      等价于 --dry-run
  TOPEMS_MIGRATE_SKIP_CORE    1 时跳过顶层 database/migrations
  TOPEMS_MIGRATE_ONLY         仅执行指定服务 (等价于 --service)
  SQLX_OFFLINE                1 时跳过 sqlx-cli 连接检查

示例:
  export DATABASE_URL="postgres://postgres:postgres@localhost:5432/topems"
  bash scripts/migrate.sh run
  bash scripts/migrate.sh run --service finance --dry-run
  bash scripts/migrate.sh status
  bash scripts/migrate.sh revert --service erp
  bash scripts/migrate.sh validate
EOF
}

# ----------------------------------------------------------------------------
# 参数解析
# ----------------------------------------------------------------------------
parse_args() {
  # 处理直接传 --help / -h 的情况
  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  local args=("$@")
  local cmd="${args[0]:-}"
  shift || true

  COMMAND="$cmd"
  SERVICE_FILTER="$ONLY_SERVICE"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --service)
        SERVICE_FILTER="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        log_error "未知参数: $1"
        usage
        exit 2
        ;;
    esac
  done

  if [[ -z "$COMMAND" ]]; then
    usage
    exit 1
  fi

  case "$COMMAND" in
    run|status|list|revert|validate|install) ;;
    *)
      log_error "未知命令: $COMMAND"
      usage
      exit 2
      ;;
  esac
}

# ----------------------------------------------------------------------------
# 收集迁移目录
#
# 输出格式: 每行一个目录记录, 字段以 tab 分隔
#   <type>\t<name>\t<abs_path>\t<rel_path>
# 其中:
#   type     = core | svc
#   name     = database | <service_name>
#   abs_path = 绝对路径
#   rel_path = 相对仓库根目录的路径
# ----------------------------------------------------------------------------
collect_migration_dirs() {
  # 1. 顶层 database/migrations
  if [[ "$SKIP_CORE" != "true" ]]; then
    local core_dir="$REPO_ROOT/$DATABASE_MIGRATIONS_DIR"
    if [[ -d "$core_dir" ]]; then
      printf '%s\t%s\t%s\t%s\n' \
        "$MIGRATION_DIR_TYPE_CORE" \
        "database" \
        "$core_dir" \
        "$DATABASE_MIGRATIONS_DIR"
    fi
  fi

  # 2. svc/<name>/migrations
  if [[ -d "$SVC_ROOT" ]]; then
    local svc_dir
    while IFS= read -r -d '' svc_dir; do
      local name
      name="$(basename "$(dirname "$svc_dir")")"
      local rel="svc/$name/migrations"
      printf '%s\t%s\t%s\t%s\n' \
        "$MIGRATION_DIR_TYPE_SVC" \
        "$name" \
        "$svc_dir" \
        "$rel"
    done < <(find "$SVC_ROOT" -mindepth 2 -maxdepth 2 -type d -name migrations -print0 2>/dev/null | sort -z)
  fi
}

# ----------------------------------------------------------------------------
# 按服务过滤器筛选
# ----------------------------------------------------------------------------
filter_dirs_by_service() {
  local filter="$1"
  [[ -z "$filter" ]] && { cat; return; }

  while IFS=$'\t' read -r type name abs rel; do
    if [[ "$name" == "$filter" ]]; then
      printf '%s\t%s\t%s\t%s\n' "$type" "$name" "$abs" "$rel"
    fi
  done
}

# ----------------------------------------------------------------------------
# 提取迁移版本号
#   - 时间戳格式: YYYYMMDDhhmmss (14 位数字)
#   - 顺序格式:   NNN (3 位数字) - 兼容旧迁移
# ----------------------------------------------------------------------------
extract_version() {
  local name="$1"
  if [[ "$name" =~ ^([0-9]{14})[_-].*\.sql$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$name" =~ ^([0-9]{3})[-_].*\.sql$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  echo ""
}

# ----------------------------------------------------------------------------
# 检查 sqlx-cli 是否可用
# ----------------------------------------------------------------------------
has_sqlx_cli() {
  if command -v sqlx >/dev/null 2>&1; then
    return 0
  fi
  if command -v cargo-sqlx >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

# 调用 sqlx-cli 的统一入口 (兼容 sqlx 与 cargo-sqlx)
sqlx_cli() {
  if command -v sqlx >/dev/null 2>&1; then
    sqlx "$@"
    return $?
  fi
  if command -v cargo-sqlx >/dev/null 2>&1; then
    cargo sqlx "$@"
    return $?
  fi
  log_error "sqlx-cli 未安装，请运行: bash scripts/migrate.sh install"
  return 127
}

# ----------------------------------------------------------------------------
# 检查 psql 是否可用 (fallback 模式)
# ----------------------------------------------------------------------------
has_psql() {
  command -v psql >/dev/null 2>&1
}

# ----------------------------------------------------------------------------
# 检查必需的环境变量
# ----------------------------------------------------------------------------
require_database_url() {
  if [[ -z "$DATABASE_URL" ]]; then
    log_error "DATABASE_URL 未设置"
    log_error "示例: export DATABASE_URL=\"postgres://postgres:postgres@localhost:5432/topems\""
    exit 1
  fi
}

# ----------------------------------------------------------------------------
# 列出目录中的迁移文件 (按版本排序)
# ----------------------------------------------------------------------------
list_migrations_in_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 0

  while IFS= read -r -d '' file; do
    local name
    name="$(basename "$file")"
    local version
    version="$(extract_version "$name")"
    printf '%s\t%s\t%s\n' "$version" "$name" "$file"
  done < <(find "$dir" -maxdepth 1 -type f -name '*.sql' \
    ! -name '*.backup' ! -name '*.sql.backup' ! -name '*.down.sql' \
    -print0 2>/dev/null | sort -z)
}

# ----------------------------------------------------------------------------
# 校验 _sqlx_migrations 表是否可访问 (fallback 模式)
# ----------------------------------------------------------------------------
ensure_sqlx_migrations_table() {
  if ! psql "$DATABASE_URL" -c "SELECT 1 FROM _sqlx_migrations LIMIT 1" >/dev/null 2>&1; then
    log_info "创建 _sqlx_migrations 表..."
    local create_sql
    create_sql=$(cat <<'SQL'
-- 与 sqlx-cli 0.7+ 真实结构对齐（version BIGINT / checksum BYTEA / execution_time_ms），
-- 避免 fallback 记账与 sqlx 混用冲突（此前 varchar/string checksum 与 sqlx 不兼容）
CREATE TABLE IF NOT EXISTS _sqlx_migrations (
    version BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    installed_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    checksum BYTEA NOT NULL,
    execution_time_ms BIGINT NOT NULL DEFAULT 0
);
SQL
)
    if ! psql "$DATABASE_URL" -c "$create_sql" >/dev/null 2>&1; then
      log_error "无法创建 _sqlx_migrations 表"
      return 1
    fi
    log_ok "_sqlx_migrations 表已就绪"
  fi
}

# ----------------------------------------------------------------------------
# 检查 fallback 模式下迁移是否已应用
# ----------------------------------------------------------------------------
is_migration_applied() {
  local version="$1"
  local count
  count="$(psql "$DATABASE_URL" -t -A -c \
    "SELECT COUNT(*) FROM _sqlx_migrations WHERE version = '$version' AND success = true" \
    2>/dev/null | tr -d ' ')"
  [[ "${count:-0}" -gt 0 ]]
}

# ----------------------------------------------------------------------------
# 在 fallback 模式下记录迁移
# ----------------------------------------------------------------------------
record_migration() {
  local version="$1" description="$2"
  psql "$DATABASE_URL" -c \
    "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time_ms) \
     VALUES ('$version', '$description', NOW(), true, decode('manual-via-migrate-sh', 'escape'), 0) \
     ON CONFLICT (version) DO NOTHING" >/dev/null 2>&1
}

# ----------------------------------------------------------------------------
# 半迁移状态检测（防误补跑历史积压迁移到运行库）
# ----------------------------------------------------------------------------
# 背景：主库 topems 的 _sqlx_migrations 仅 25 条记录（止于 20260725000002），
# 但 database/migrations 已有 300+ 文件且结构经运行时演进至 09-26——这是
# 既有"半迁移状态"（接受现状，勿补跑）。若直接 sqlx migrate run，
# 会把全部未记录版本补跑到运行库（含数据操作迁移，风险极高）。
# 本检测：任一滞后（有未应用迁移）给出信息性警告；积压 ≥ 阈值时拒绝执行，
# 需显式 MIGRATE_ALLOW_STALE=1 确认才继续。
check_stale_migration_state() {
  local dir="$1"
  [[ "$DRY_RUN" == "true" ]] && return 0

  local applied
  applied="$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM _sqlx_migrations;" 2>/dev/null || true)"
  # 空库（表不存在）或 0 记录 → 全新环境，正常全量，不拦截
  [[ -z "$applied" || "$applied" == "0" ]] && return 0

  local files
  files="$(list_migrations_in_dir "$dir" | wc -l | tr -d ' ')"
  local max_record max_file
  max_record="$(psql "$DATABASE_URL" -t -A -c "SELECT max(version) FROM _sqlx_migrations;" 2>/dev/null || true)"
  max_file="$(list_migrations_in_dir "$dir" | awk -F'\t' '{print $1}' | sort -n | tail -1)"

  if [[ -n "$applied" && "$applied" -lt "$files" ]]; then
    local backlog=$((files - applied))
    if [[ "$backlog" -ge "${MIGRATE_STALE_THRESHOLD:-10}" ]]; then
      log_warn "检测到半迁移/积压状态: 已记录 $applied / 文件 ${files}（积压 ${backlog} 个，最高记录 ${max_record} < 文件最高 ${max_file}）"
      log_warn "sqlx migrate run 将把 $backlog 个历史版本补跑到该库（若为运行库，可能非预期）"
      if [[ "${MIGRATE_ALLOW_STALE:-}" != "1" ]]; then
        log_error "已拒绝执行。若确认需要补跑，请设置 MIGRATE_ALLOW_STALE=1 后重试"
        return 1
      fi
      log_warn "MIGRATE_ALLOW_STALE=1 已设置，继续执行补跑"
    else
      log_info "有 $backlog 个新迁移未应用（正常演进），继续"
    fi
  fi
  return 0
}

# ----------------------------------------------------------------------------
# 使用 sqlx-cli 执行迁移
# ----------------------------------------------------------------------------
run_migrations_with_sqlx() {
  local dir="$1" name="$2"

  log_step "应用迁移: $name ($dir)"

  check_stale_migration_state "$dir" || return 1

  if [[ "$DRY_RUN" == "true" ]]; then
    log_detail "[dry-run] sqlx migrate run --source \"$dir\""
    while IFS=$'\t' read -r version mname file; do
      log_detail "[dry-run]   - $mname (version=$version)"
    done < <(list_migrations_in_dir "$dir")
    return 0
  fi

  if sqlx_cli migrate run --source "$dir" --database-url "$DATABASE_URL"; then
    log_ok "迁移目录 $name 完成"
    return 0
  else
    local rc=$?
    log_error "迁移目录 $name 失败 (退出码 $rc)"
    return $rc
  fi
}

# ----------------------------------------------------------------------------
# 使用 psql fallback 执行迁移
# ----------------------------------------------------------------------------
run_migrations_with_psql() {
  local dir="$1" name="$2"

  log_step "应用迁移 (psql 模式): $name ($dir)"

  ensure_sqlx_migrations_table || return 1

  local dir_applied=0
  local dir_skipped=0
  local dir_failed=0

  while IFS=$'\t' read -r version mname file; do
    [[ -z "$version" ]] && {
      log_warn "跳过无版本号文件: $mname"
      continue
    }

    if is_migration_applied "$version"; then
      log_detail "跳过 (已应用): $mname"
      dir_skipped=$((dir_skipped + 1))
      continue
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
      log_detail "[dry-run] 将执行: $mname (version=$version)"
      dir_applied=$((dir_applied + 1))
      continue
    fi

    log_detail "执行: $mname (version=$version)"
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null 2>&1; then
      record_migration "$version" "$mname"
      dir_applied=$((dir_applied + 1))
    else
      log_error "迁移失败: $mname"
      dir_failed=$((dir_failed + 1))
      return 1
    fi
  done < <(list_migrations_in_dir "$dir")

  if [[ "$dir_failed" -eq 0 ]]; then
    if [[ "$dir_applied" -eq 0 && "$DRY_RUN" != "true" ]]; then
      log_ok "迁移目录 $name 已是最新 (跳过 $dir_skipped 个)"
    else
      log_ok "迁移目录 $name 完成 (应用 $dir_applied, 跳过 $dir_skipped)"
    fi
    APPLIED_MIGRATIONS=$((APPLIED_MIGRATIONS + dir_applied))
    return 0
  else
    return 1
  fi
}

# ----------------------------------------------------------------------------
# 使用 sqlx-cli 查看状态
# ----------------------------------------------------------------------------
status_with_sqlx() {
  local dir="$1" name="$2"
  log_step "状态: $name"
  sqlx_cli migrate info --source "$dir" --database-url "$DATABASE_URL" 2>&1 || {
    log_warn "无法获取 $name 状态 (sqlx-cli)"
  }
}

# ----------------------------------------------------------------------------
# 使用 psql 查看状态 (fallback)
# ----------------------------------------------------------------------------
status_with_psql() {
  local dir="$1" name="$2"
  log_step "状态: $name"

  if ! psql "$DATABASE_URL" -c "SELECT 1 FROM _sqlx_migrations LIMIT 1" >/dev/null 2>&1; then
    log_detail "  _sqlx_migrations 表不存在 - 全部待应用"
  fi

  while IFS=$'\t' read -r version mname file; do
    [[ -z "$version" ]] && continue
    local state
    if is_migration_applied "$version"; then
      state="${GREEN}已应用${NC}"
    else
      state="${YELLOW}待应用${NC}"
    fi
    echo -e "  $(printf '%-14s' "$version") ${state}  $mname"
  done < <(list_migrations_in_dir "$dir")
}

# ----------------------------------------------------------------------------
# 使用 sqlx-cli 回滚最近一次迁移
# ----------------------------------------------------------------------------
revert_with_sqlx() {
  local dir="$1" name="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_detail "[dry-run] sqlx migrate revert --source \"$dir\""
    return 0
  fi

  log_step "回滚: $name"
  if sqlx_cli migrate revert --source "$dir" --database-url "$DATABASE_URL"; then
    log_ok "回滚成功: $name"
    return 0
  else
    local rc=$?
    log_error "回滚失败: $name (退出码 $rc)"
    return $rc
  fi
}

# ----------------------------------------------------------------------------
# 命令: run
# ----------------------------------------------------------------------------
cmd_run() {
  require_database_url

  if has_sqlx_cli; then
    log_info "使用 sqlx-cli 执行迁移"
  elif has_psql; then
    log_warn "sqlx-cli 不可用，回退到 psql 模式 (建议安装 sqlx-cli)"
    log_warn "安装: bash scripts/migrate.sh install"
  else
    log_error "sqlx-cli 与 psql 均不可用，无法执行迁移"
    exit 1
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[dry-run] 仅打印将执行的迁移，不实际执行"
  fi

  local dirs_file
  dirs_file="$(mktemp)"
  trap 'rm -f -- "${dirs_file:-}"' EXIT

  collect_migration_dirs | filter_dirs_by_service "$SERVICE_FILTER" > "$dirs_file"

  local total
  total="$(wc -l < "$dirs_file" | tr -d ' ')"
  if [[ "$total" -eq 0 ]]; then
    log_warn "未找到匹配的迁移目录"
    if [[ -n "$SERVICE_FILTER" ]]; then
      log_error "指定的服务 '$SERVICE_FILTER' 不存在或无 migrations 目录"
    fi
    exit 1
  fi

  log_info "共发现 $total 个迁移目录"

  while IFS=$'\t' read -r type name abs rel; do
    PROCESSED_DIRS=$((PROCESSED_DIRS + 1))
    if has_sqlx_cli; then
      run_migrations_with_sqlx "$abs" "$name" || ERRORS=$((ERRORS + 1))
    else
      run_migrations_with_psql "$abs" "$name" || ERRORS=$((ERRORS + 1))
    fi
  done < "$dirs_file"

  echo ""
  log_info "迁移汇总"
  echo "  扫描目录数:      $PROCESSED_DIRS"
  echo "  应用迁移数:      $APPLIED_MIGRATIONS"
  echo "  错误数:           $ERRORS"

  if [[ $ERRORS -gt 0 ]]; then
    log_error "存在失败迁移"
    exit 1
  fi
  log_ok "全部迁移执行完毕"
}

# ----------------------------------------------------------------------------
# 命令: status
# ----------------------------------------------------------------------------
cmd_status() {
  require_database_url

  if has_sqlx_cli; then
    log_info "使用 sqlx-cli 查询状态"
  elif has_psql; then
    log_warn "sqlx-cli 不可用，使用 psql 查询 (信息有限)"
  else
    log_error "sqlx-cli 与 psql 均不可用"
    exit 1
  fi

  collect_migration_dirs | filter_dirs_by_service "$SERVICE_FILTER" | while IFS=$'\t' read -r type name abs rel; do
    if has_sqlx_cli; then
      status_with_sqlx "$abs" "$name"
    else
      status_with_psql "$abs" "$name"
    fi
  done
}

# ----------------------------------------------------------------------------
# 命令: list
# ----------------------------------------------------------------------------
cmd_list() {
  log_info "迁移文件清单 (不连接数据库)"

  local total_files=0
  local total_dirs=0

  # 使用临时文件避免管道子 shell 丢失计数器
  local dirs_file
  dirs_file="$(mktemp)"
  trap 'rm -f -- "${dirs_file:-}"' EXIT

  collect_migration_dirs | filter_dirs_by_service "$SERVICE_FILTER" > "$dirs_file"

  while IFS=$'\t' read -r type name abs rel; do
    total_dirs=$((total_dirs + 1))
    echo ""
    log_step "[$type] $name  ($rel)"

    local dir_count=0
    while IFS=$'\t' read -r version mname file; do
      dir_count=$((dir_count + 1))
      total_files=$((total_files + 1))
      if [[ -z "$version" ]]; then
        version="(无版本)"
      fi
      printf '  %-14s  %s\n' "$version" "$mname"
    done < <(list_migrations_in_dir "$abs")

    if [[ $dir_count -eq 0 ]]; then
      log_detail "(空目录)"
    else
      log_detail "共 $dir_count 个文件"
    fi
  done < "$dirs_file"

  rm -f "$dirs_file"
  trap - EXIT

  echo ""
  log_info "总计: $total_dirs 个目录, $total_files 个迁移文件"
}

# ----------------------------------------------------------------------------
# 命令: revert
# ----------------------------------------------------------------------------
cmd_revert() {
  require_database_url

  if ! has_sqlx_cli; then
    log_error "回滚操作需要 sqlx-cli (psql 模式不支持自动回滚)"
    log_error "安装: bash scripts/migrate.sh install"
    exit 1
  fi

  log_warn "注意: revert 将回滚每个目录最近一次迁移"
  [[ "$DRY_RUN" == "true" ]] && log_warn "[dry-run] 仅打印将执行的操作"

  local dirs_file
  dirs_file="$(mktemp)"
  trap 'rm -f -- "${dirs_file:-}"' EXIT

  collect_migration_dirs | filter_dirs_by_service "$SERVICE_FILTER" > "$dirs_file"

  while IFS=$'\t' read -r type name abs rel; do
    revert_with_sqlx "$abs" "$name" || ERRORS=$((ERRORS + 1))
  done < "$dirs_file"

  rm -f "$dirs_file"
  trap - EXIT

  if [[ $ERRORS -gt 0 ]]; then
    log_error "存在回滚失败"
    exit 1
  fi
  log_ok "回滚完成"
}

# ----------------------------------------------------------------------------
# 命令: validate
# ----------------------------------------------------------------------------
cmd_validate() {
  log_info "校验迁移文件"

  if [[ ! -x "$VALIDATE_SCRIPT" ]]; then
    log_warn "校验脚本不存在或不可执行: $VALIDATE_SCRIPT"
    log_warn "跳过校验"
    return 0
  fi

  if bash "$VALIDATE_SCRIPT"; then
    log_ok "迁移校验通过"
  else
    local rc=$?
    log_error "迁移校验失败 (退出码 $rc)"
    return $rc
  fi
}

# ----------------------------------------------------------------------------
# 命令: install
# ----------------------------------------------------------------------------
cmd_install() {
  log_info "安装 sqlx-cli"

  if has_sqlx_cli; then
    log_ok "sqlx-cli 已安装"
    sqlx --version 2>/dev/null || cargo sqlx --version 2>/dev/null || true
    return 0
  fi

  if ! command -v cargo >/dev/null 2>&1; then
    log_error "cargo 不可用，请先安装 Rust 工具链"
    exit 1
  fi

  log_info "通过 cargo 安装 sqlx-cli (postgres + rustls)..."
  if cargo install sqlx-cli --no-default-features --features postgres,rustls; then
    log_ok "sqlx-cli 安装成功"
  else
    log_error "sqlx-cli 安装失败"
    exit 1
  fi
}

# ----------------------------------------------------------------------------
# 主入口
# ----------------------------------------------------------------------------
main() {
  parse_args "$@"

  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║     TOPEMS Unified Migration Manager (sqlx-cli)             ║${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  命令:    ${BOLD}$COMMAND${NC}"
  echo -e "  仓库根:  $REPO_ROOT"
  [[ -n "$SERVICE_FILTER" ]] && echo -e "  服务过滤: $SERVICE_FILTER"
  [[ "$DRY_RUN" == "true" ]] && echo -e "  ${YELLOW}[dry-run 已启用]${NC}"
  if [[ "$COMMAND" != "list" && "$COMMAND" != "validate" && "$COMMAND" != "install" ]]; then
    if [[ -z "$DATABASE_URL" ]]; then
      echo -e "  ${RED}DATABASE_URL 未设置${NC}"
    else
      # 不打印密码
      local safe_url
      safe_url="$(echo "$DATABASE_URL" | sed -E 's#://([^:]+):([^@]+)@#://\1:***@#')"
      echo -e "  数据库:  $safe_url"
    fi
  fi
  echo ""

  case "$COMMAND" in
    run)       cmd_run ;;
    status)    cmd_status ;;
    list)      cmd_list ;;
    revert)    cmd_revert ;;
    validate)  cmd_validate ;;
    install)   cmd_install ;;
    *)
      usage
      exit 2
      ;;
  esac
}

main "$@"
