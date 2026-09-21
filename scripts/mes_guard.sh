#!/usr/bin/env bash
# =============================================================================
# mes_guard.sh — mes 编译一体化守卫（本地开发 + CI 共用）
#
# 背景：mes 曾多次因以下原因编译失败，本脚本以机制形式根治：
#   1. public schema 同名对象（表/视图）遮蔽 mes 查询表 → sqlx 在线解析类型漂移
#   2. svc/mes/.sqlx 离线缓存残留（类型与真库不符）→ 167 类错误
#   3. 并发会话基于错误假设（Option/Value 旧写法）改写代码 → 编译回归
#   4. 结构变更后无自动化验证 → 漂移悄然累积
#
# 能力：
#   1. 遮蔽检查：public schema 中与 mes 查询表同名、且不在白名单的对象 → 报警/清理
#   2. 在线编译：rm .sqlx → SQLX_OFFLINE=false + DATABASE_URL → cargo check --lib → 断言 0 error
#   3. 快照同步：--sync-snapshot 将 5432 的 mes schema + public 共享表导出为
#      fixtures/mes_compile_schema.sql（CI 干净库编译用），结构变更后必须重新同步
#   4. 缓存同步：--prepare 在线解析全部宏并生成 .sqlx 缓存（合并到根 .sqlx），
#      数据库结构变更后必须执行，保持离线编译（SQLX_OFFLINE=true）与真库一致
#
# 用法：
#   scripts/mes_guard.sh                      # 遮蔽检查 + 在线编译断言（默认只读，不动库）
#   scripts/mes_guard.sh --clean              # 额外清理非白名单遮蔽对象（幂等）
#   scripts/mes_guard.sh --sync-snapshot      # 重新生成 fixtures/mes_compile_schema.sql
#   scripts/mes_guard.sh --prepare            # 生成/更新 sqlx 缓存并合并根 .sqlx（迁移后必跑）
#   scripts/mes_guard.sh --db-url "postgresql://..."   # 指定编译库（CI 传入 service 地址）
#   scripts/mes_guard.sh --skip-compile       # 只做遮蔽检查（快排）
#
# 环境变量：
#   DATABASE_URL       未传 --db-url 时使用（默认 5432 本地编译参考库）
#   MES_SNAPSHOT       快照输出路径（默认 fixtures/mes_compile_schema.sql）
#
# 退出码：0=全部通过；1=遮蔽报警/编译失败/快照失败
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MES_DIR="$ROOT/svc/mes"
SNAPSHOT="${MES_SNAPSHOT:-$ROOT/fixtures/mes_compile_schema.sql}"
LOG="/tmp/mes_guard_$$.log"

CLEAN=0
SYNC_SNAPSHOT=0
SKIP_COMPILE=0
PREPARE=0
DB_URL="${DATABASE_URL:-postgresql://topems_app:topems_app_secret@localhost:5432/topems?options=-csearch_path=mes,public}"

# public schema 中允许存在的 mes 查询表（共享表，非遮蔽）
PUBLIC_ALLOWLIST=(
  "inspection_records"   # erp_public_business_tables 建，mes 质检查询使用
  "audit_logs"           # unified-core 审计日志共享表（显式 public. 限定引用）
)

say()  { printf '[mes_guard] %s\n' "$*"; }
die()  { say "FAIL: $*"; exit 1; }

# ---------------------------------------------------------------------------
# 解析参数
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)         CLEAN=1 ;;
    --sync-snapshot) SYNC_SNAPSHOT=1 ;;
    --skip-compile)  SKIP_COMPILE=1 ;;
    --prepare)       PREPARE=1 ;;
    --db-url)        DB_URL="$2"; shift ;;
    *) die "未知参数: $1（支持 --clean / --sync-snapshot / --skip-compile / --prepare / --db-url）" ;;
  esac
  shift
done

if [[ "$SYNC_SNAPSHOT" == "1" ]]; then
  say "=== 同步结构快照 → $SNAPSHOT ==="
  mkdir -p "$ROOT/fixtures"

  # 拆分 DB URL 以复用主机/端口/用户/库（保留 options 不适用 pg_dump）
  DB_HOST="$(printf '%s' "$DB_URL" | sed -E 's|postgresql://[^@]*@([^:/]+).*|\1|')"
  DB_PORT="$(printf '%s' "$DB_URL" | sed -E 's|postgresql://[^@]*@[^:/]+:([0-9]+).*|\1|')"
  DB_USER="$(printf '%s' "$DB_URL" | sed -E 's|postgresql://([^:]+):[^@]*@.*|\1|')"
  DB_NAME="$(printf '%s' "$DB_URL" | sed -E 's|postgresql://[^@]*@[^/]+/([^?]+).*|\1|')"
  [[ -z "$DB_HOST" ]] && DB_HOST="localhost"
  [[ -z "$DB_PORT" ]] && DB_PORT="5432"
  export PGPASSWORD="$(printf '%s' "$DB_URL" | sed -E 's|postgresql://[^:]+:([^@]*)@.*|\1|')"

  {
    echo "-- ============================================================================"
    echo "-- mes 编译结构快照（mes_guard.sh --sync-snapshot 自动生成，勿手改）"
    echo "-- 来源: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}  生成时间: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "-- 用途: CI mes-online-check 干净库编译（导入本文件后在线解析）"
    echo "-- 规则: 任何 mes schema / public 共享表结构变更后，必须重新执行本脚本同步"
    echo "-- ============================================================================"
    echo
    echo "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
    echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    echo "CREATE SCHEMA IF NOT EXISTS mes;"
    echo "DO \$\$ BEGIN EXECUTE format('ALTER DATABASE %I SET app.tenant_id = %L', current_database(), '00000000-0000-0000-0000-000000000000'); EXCEPTION WHEN OTHERS THEN NULL; END \$\$;"
    echo
  } > "$SNAPSHOT"

  # mes schema 全量结构
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema-only --schema=mes 2>>"${LOG}" | \
    grep -vE '^--$|^-- (Name|Schema|Owner|PostgreSQL database dump)|^\\|^CREATE SCHEMA|^CREATE TRIGGER' | \
    grep -vE '^CREATE EXTENSION|^ALTER .* OWNER|^ALTER DEFAULT PRIVILEGES|^GRANT|^REVOKE' >> "$SNAPSHOT" || true

  # public 共享表（白名单）
  for t in "${PUBLIC_ALLOWLIST[@]}"; do
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --schema-only -t "public.$t" 2>>"${LOG}" | \
      grep -vE '^--$|^-- (Name|Schema|Owner|PostgreSQL database dump)|^\\|^CREATE SCHEMA|^CREATE TRIGGER' | \
      grep -vE '^CREATE EXTENSION|^ALTER .* OWNER|^ALTER DEFAULT PRIVILEGES|^GRANT|^REVOKE' >> "$SNAPSHOT" || true
  done

  say "快照生成完成: $(wc -l < "$SNAPSHOT") 行"
  exit 0
fi

# ---------------------------------------------------------------------------
# 0. sqlx 缓存同步（--prepare）：在线解析生成新缓存并合并根 .sqlx
#    使用场景：数据库结构变更（迁移）后，同步离线编译缓存（方案C调和）
# ---------------------------------------------------------------------------
if [[ "$PREPARE" == "1" ]]; then
  say "=== 生成 sqlx 缓存（在线解析 → svc/mes/.sqlx → 合并根 .sqlx） ==="
  [[ -d "$MES_DIR/.sqlx" ]] && rm -f "$MES_DIR/.sqlx"/query-*.json
  cd "$MES_DIR" || die "目录不存在: $MES_DIR"
  export SQLX_OFFLINE=false
  export DATABASE_URL="$DB_URL"

  if ! cargo sqlx prepare > "${LOG}" 2>&1; then
    say "prepare 失败（详见 ${LOG}）"
    tail -20 "${LOG}" | sed 's/^/    /'
    exit 1
  fi

  COUNT="$(ls "$MES_DIR"/.sqlx/query-*.json 2>/dev/null | wc -l | tr -d ' ')"
  [[ "$COUNT" =~ ^[0-9]+$ ]] || COUNT=0
  say "生成 $COUNT 个缓存"
  mkdir -p "$ROOT/.sqlx"
  cp "$MES_DIR"/.sqlx/query-*.json "$ROOT/.sqlx/" 2>/dev/null || die "合并到根 .sqlx 失败"
  TOTAL="$(ls "$ROOT/.sqlx"/query-*.json 2>/dev/null | wc -l | tr -d ' ')"
  say "已合并到根 .sqlx（当前共 $TOTAL 个缓存）"
  say "请 review 后提交：git add .sqlx && git commit -m 'chore(sqlx): 缓存与真库对齐'"
  say "=== sqlx prepare PASS ==="
  exit 0
fi

# ---------------------------------------------------------------------------
# 1. 遮蔽检查（只读，除非 --clean）
# ---------------------------------------------------------------------------
say "=== 遮蔽检查（public vs mes 表名） ==="
PSQL_URL="${DB_URL%%\?*}"
PSQL_OPTS="$(printf '%s' "$DB_URL" | sed -n 's|.*?\(options=.*\)|\1|p')"
PSQL_CMD=(psql "$PSQL_URL" -t -A)

# mes 实际存在的表名（作为被保护清单）
MES_TABLES="$("${PSQL_CMD[@]}" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='mes';" 2>>"${LOG}" | grep -v '^$')"
[[ -z "$MES_TABLES" ]] && die "无法读取 mes schema 表清单（检查 DATABASE_URL）"

# 白名单 join 到 IN 列表
ALLOW_LIST="$(printf "'%s'," "${PUBLIC_ALLOWLIST[@]}" | sed 's/,$//')"

SHADOW="$("${PSQL_CMD[@]}" -c "
SELECT n.nspname || '.' || c.relname || ' (' || c.relkind::text || ')'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ($(printf "'%s'," $MES_TABLES | sed 's/,$//'))
  AND c.relname NOT IN ($ALLOW_LIST)
ORDER BY c.relname;" 2>>"${LOG}" | grep -v '^$')"

if [[ -n "$SHADOW" ]]; then
  say "发现 public schema 遮蔽对象（与 mes 表同名）:"
  printf '%s\n' "$SHADOW" | sed 's/^/    /'
  if [[ "$CLEAN" == "1" ]]; then
    say "执行清理（DROP）..."
    for obj in $SHADOW; do
      rel="$(printf '%s' "$obj" | awk '{print $1}')"   # 形如 public.teams
      kind="$(printf '%s' "$obj" | awk '{print $2}' | tr -d '()')"  # r / v
      if [[ "$kind" == "v" ]]; then
        "${PSQL_CMD[@]}" -c "DROP VIEW IF EXISTS $rel;" >>"${LOG}" 2>&1 && say "  已 DROP VIEW $rel"
      else
        "${PSQL_CMD[@]}" -c "DROP TABLE IF EXISTS $rel;" >>"${LOG}" 2>&1 && say "  已 DROP TABLE $rel"
      fi
    done
  else
    say "未清理（只读模式）。确认无业务依赖后可用 --clean 清理，或将其加入 PUBLIC_ALLOWLIST 白名单。"
    exit 1
  fi
else
  say "遮蔽检查通过：public 无 mes 同名遮蔽对象"
fi

if [[ "$SKIP_COMPILE" == "1" ]]; then
  say "跳过编译（--skip-compile），守卫通过"
  exit 0
fi

# ---------------------------------------------------------------------------
# 2. 在线编译断言
# ---------------------------------------------------------------------------
say "=== 在线编译（rm .sqlx → SQLX_OFFLINE=false → cargo check --lib） ==="
[[ -d "$MES_DIR/.sqlx" ]] && rm -f "$MES_DIR/.sqlx"/query-*.json
cd "$MES_DIR" || die "目录不存在: $MES_DIR"
export SQLX_OFFLINE=false
export DATABASE_URL="$DB_URL"

if ! cargo check --lib > "${LOG}" 2>&1; then
  ERR_COUNT="$(grep -c '^error\[E' "${LOG}" || true)"
  say "编译失败：$ERR_COUNT 个错误（详见 ${LOG}）"
  grep '^error\[E' "${LOG}" | sort | uniq -c | sort -rn | head -8 | sed 's/^/    /'
  exit 1
fi

ERR_COUNT="$(grep -c '^error\[E' "${LOG}" || true)"
if [[ "$ERR_COUNT" != "0" ]]; then
  say "检测到 $ERR_COUNT 个 error[E 但 cargo check 退出码为 0（异常，请人工检查 ${LOG}）"
  exit 1
fi

say "在线编译通过：0 error"
say "=== mes_guard PASS ==="
exit 0
