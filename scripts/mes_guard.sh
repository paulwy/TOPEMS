#!/usr/bin/env bash
# shellcheck disable=SC2034
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
# 以生产为真源重刷快照（唯一推荐路径，只读；生产机即本机，可省略 --snapshot-ssh）：
#   bash scripts/mes_guard.sh --sync-snapshot \
#     --snapshot-db topems_prod --snapshot-pg-bin /opt/homebrew/bin
#   # 远端兜底：追加 --snapshot-ssh <user>@<prod-host>
#   → pg_dump 以 default_transaction_read_only=on 执行，不写任何对象；
#     头部写入基线日期 / 生成命令 / 客户端与服务端版本 / 账本水位，可一键复现。
#
# 环境变量：
#   DATABASE_URL       未传 --db-url 时使用（默认 5432 本地编译参考库）
#   MES_SNAPSHOT       快照输出路径（默认 fixtures/mes_compile_schema.sql）
#   MES_SNAPSHOT_DATE  基线日期（默认取生成当日 UTC，格式 YYYY-MM-DD）
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
DB_URL="${DATABASE_URL:-postgresql:///topems?options=-csearch_path=mes,public}"
SNAPSHOT_SSH="${MES_SNAPSHOT_SSH:-}"
SNAPSHOT_DB="${MES_SNAPSHOT_DB:-topems_prod}"
SNAPSHOT_PG_BIN="${MES_SNAPSHOT_PG_BIN:-}"
SNAPSHOT_DATE="${MES_SNAPSHOT_DATE:-$(date -u +%Y-%m-%d)}"
GENERATOR_CMD=""

# public schema 中允许存在的 mes 查询表（共享表，非遮蔽）
PUBLIC_ALLOWLIST=(
  "inspection_records"   # erp_public_business_tables 建，mes 质检查询使用
  "audit_logs"           # unified-core 审计日志共享表（显式 public. 限定引用）
  "schema_defense_ledger" # 设计性多 schema 防御台账（每域 1 行，mes 版 search_path 优先，public 版为汇总非遮蔽）
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
    --db-url)        [[ -z "${2:-}" ]] && die "--db-url 需要参数 <postgresql://...>"
                     DB_URL="$2"; shift ;;
    --snapshot-ssh)  [[ -z "${2:-}" ]] && die "--snapshot-ssh 需要参数 <user@host>"
                     SNAPSHOT_SSH="$2"; shift ;;
    --snapshot-db)   [[ -z "${2:-}" ]] && die "--snapshot-db 需要参数 <dbname>"
                     SNAPSHOT_DB="$2"; shift ;;
    --snapshot-pg-bin) [[ -z "${2:-}" ]] && die "--snapshot-pg-bin 需要参数 <包含 pg_dump/psql 的目录>"
                     SNAPSHOT_PG_BIN="$2"; shift ;;
    *) die "未知参数: $1（支持 --clean / --sync-snapshot / --skip-compile / --prepare / --db-url / --snapshot-ssh / --snapshot-db / --snapshot-pg-bin）" ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# 生产库护栏：--clean 会 DROP 遮蔽对象，目标库为生产库时默认拒绝
# （命名风格对齐 scripts/dev/start-local.sh 的 ALLOW_PROD_LOCAL）
# ---------------------------------------------------------------------------
TARGET_DB_NAME="${DB_URL%%\?*}"
TARGET_DB_NAME="${TARGET_DB_NAME##*/}"
if [[ "$TARGET_DB_NAME" == "topems_prod" && "${ALLOW_PROD_MES_GUARD:-0}" != "1" && "$SYNC_SNAPSHOT" != "1" ]]; then
  die "拒绝在库 ${TARGET_DB_NAME} 上执行 mes_guard（--clean 会 DROP TABLE/VIEW）。如确需执行，显式设置 ALLOW_PROD_MES_GUARD=1"
fi

if [[ "$SYNC_SNAPSHOT" == "1" ]]; then
  say "=== 同步结构快照 → $SNAPSHOT ==="
  mkdir -p "$ROOT/fixtures"

  # ---- 目标库定位：远端（生产）或本地 DSN --------------------------------
  if [[ -n "$SNAPSHOT_SSH" ]]; then
    SNAPSHOT_PG_BIN="${SNAPSHOT_PG_BIN:-/opt/homebrew/bin}"
    SOURCE_DESC="ssh://${SNAPSHOT_SSH}/${SNAPSHOT_DB}"
    es() { printf '%q' "$1"; }
    remote_exec() { ssh "$SNAPSHOT_SSH" "$1"; }
    snapshot_psql() { remote_exec "PGOPTIONS='-c default_transaction_read_only=on' $(es "$SNAPSHOT_PG_BIN/psql") -X -tA -d $(es "$SNAPSHOT_DB") -c $(es "$1")"; }
    snapshot_pg_dump() { remote_exec "PGOPTIONS='-c default_transaction_read_only=on' $(es "$SNAPSHOT_PG_BIN/pg_dump") -d $(es "$SNAPSHOT_DB") $1"; }
    PGDUMP_VERSION="$(remote_exec "$(es "$SNAPSHOT_PG_BIN/pg_dump") --version")"
    GENERATOR_CMD="bash scripts/mes_guard.sh --sync-snapshot --snapshot-ssh ${SNAPSHOT_SSH} --snapshot-db ${SNAPSHOT_DB} --snapshot-pg-bin ${SNAPSHOT_PG_BIN}"
  else
    # 逐段解析 DSN（不依赖库名里有无 @ / 是否带 options，避免旧 sed 拼接错乱）
    eval "$(python3 - "$DB_URL" <<'PY'
import sys, shlex, urllib.parse as u
p = u.urlparse(sys.argv[1])
qs = u.parse_qs(p.query)
for k, v in (
    ('DB_USER', p.username or ''),
    ('DB_PASS', p.password or ''),
    ('DB_HOST', qs.get('host', [p.hostname or 'localhost'])[0]),
    ('DB_PORT', str(p.port or '5432')),
    ('DB_NAME', (p.path or '/').lstrip('/')),
):
    print(f'{k}={shlex.quote(v)}')
PY
)"
    export PGPASSWORD="$DB_PASS"
    SNAPSHOT_DB="$DB_NAME"
    SOURCE_USER="${DB_USER:-unknown}"
    SOURCE_DESC="db=${DB_NAME} host=${DB_HOST}:${DB_PORT} user=${SOURCE_USER}（口令已脱敏）"
    snapshot_psql() { psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -X -tA -c "$1"; }
    snapshot_pg_dump() { pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" $1; }
    PGDUMP_VERSION="$(pg_dump --version)"
    GENERATOR_CMD="bash scripts/mes_guard.sh --sync-snapshot --db-url <PG_DSN，口令已脱敏>  # host=${DB_HOST}:${DB_PORT} db=${DB_NAME} user=${SOURCE_USER}"
  fi

  # ---- 防跑错库（fail-closed）：账本位置 + dev 特征 ----------------------
  LEDGER_PUBLIC="$(snapshot_psql "SELECT to_regclass('public._sqlx_migrations') IS NOT NULL;" | tr -d '[:space:]')"
  LEDGER_MES="$(snapshot_psql "SELECT to_regclass('mes._sqlx_migrations') IS NOT NULL;" | tr -d '[:space:]')"
  SERVER_VERSION="$(snapshot_psql "SHOW server_version;" | tr -d '[:space:]')"
  LEDGER_MAX="$(snapshot_psql "SELECT COALESCE(max(version)::text,'') FROM public._sqlx_migrations;" | tr -d '[:space:]')"
  LEDGER_ROWS="$(snapshot_psql "SELECT count(*) FROM public._sqlx_migrations;" | tr -d '[:space:]')"

  [[ "$LEDGER_PUBLIC" == "t" ]] || die "拒绝生成：目标库 ${SNAPSHOT_DB} 的账本不在 public._sqlx_migrations（可能连错库/连到 dev）"
  [[ "$LEDGER_MES" == "f" ]] || die "拒绝生成：目标库 ${SNAPSHOT_DB} 存在 mes._sqlx_migrations（dev 本地账本特征，prod 账本只在 public）"
  if [[ "$SNAPSHOT_DB" != *_prod && "${ALLOW_NONPROD_MES_SNAPSHOT:-0}" != "1" ]]; then
    die "拒绝生成：库名 ${SNAPSHOT_DB} 不具备 *_prod 特征（疑似 dev/test）。如确需为非生产库生成，显式设置 ALLOW_NONPROD_MES_SNAPSHOT=1"
  fi
  if [[ -z "$LEDGER_MAX" || -z "$LEDGER_ROWS" || "$LEDGER_ROWS" == "0" ]]; then
    die "拒绝生成：无法读取 ${SNAPSHOT_DB} 的账本水位（max/rows 为空）"
  fi

  # ---- 生成内容区（先落临时文件，便于计算 sha256 后写入头部） ------------
  BODY="$(mktemp /tmp/mes_snapshot_body.XXXXXX.sql)"
  trap 'rm -f "$BODY"' EXIT
  {
    echo "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
    echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    echo "CREATE SCHEMA IF NOT EXISTS mes;"
    echo "DO \$\$ BEGIN EXECUTE format('ALTER DATABASE %I SET app.tenant_id = %L', current_database(), '00000000-0000-0000-0000-000000000000'); EXCEPTION WHEN OTHERS THEN NULL; END \$\$;"
    echo
  } > "$BODY"

  # mes schema 全量结构（排除 mes 本地账本，prod 不依赖它）
  snapshot_pg_dump "--schema-only --schema=mes --exclude-table=mes._sqlx_migrations" 2>>"${LOG}" | \
    grep -vE '^--$|^-- (Name|Schema|Owner|PostgreSQL database dump)|^\\|^CREATE SCHEMA|^CREATE TRIGGER' | \
    grep -vE '^CREATE EXTENSION|^ALTER .* OWNER|^ALTER DEFAULT PRIVILEGES|^GRANT|^REVOKE' >> "$BODY" || true

  # public 共享表（白名单）
  for t in "${PUBLIC_ALLOWLIST[@]}"; do
    snapshot_pg_dump "--schema-only -t public.$t" 2>>"${LOG}" | \
      grep -vE '^--$|^-- (Name|Schema|Owner|PostgreSQL database dump)|^\\|^CREATE SCHEMA|^CREATE TRIGGER' | \
      grep -vE '^CREATE EXTENSION|^ALTER .* OWNER|^ALTER DEFAULT PRIVILEGES|^GRANT|^REVOKE' >> "$BODY" || true
  done

  BODY_SHA="$(shasum -a 256 "$BODY" | awk '{print $1}')"

  {
    echo "-- ============================================================================"
    echo "-- mes 编译结构快照（scripts/mes_guard.sh --sync-snapshot 自动生成，勿手改）"
    echo "-- 基线日期: ${SNAPSHOT_DATE}"
    echo "-- 唯一真源: ${SOURCE_DESC}（只读导出，未写入任何对象）"
    echo "-- 数据库: ${SNAPSHOT_DB}  服务端: PostgreSQL ${SERVER_VERSION}"
    echo "-- pg_dump: ${PGDUMP_VERSION}"
    echo "-- 账本水位: max(version)=${LEDGER_MAX}  行数=${LEDGER_ROWS}（public._sqlx_migrations）"
    echo "-- 生成命令: ${GENERATOR_CMD}"
    echo "-- 生成时间: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "-- 内容区 sha256（不含本头部）: ${BODY_SHA}"
    echo "-- 用途: CI mes-online-check 干净库编译（导入本文件后在线解析）"
    echo "-- 规则: 任何 mes schema / public 共享表结构变更后，必须重新执行本脚本同步"
    echo "-- ============================================================================"
    echo
    cat "$BODY"
  } > "$SNAPSHOT"
  rm -f "$BODY"; trap - EXIT

  say "快照生成完成: $(wc -l < "$SNAPSHOT") 行；内容区 sha256=${BODY_SHA}"
  say "整文件 sha256=$(shasum -a 256 "$SNAPSHOT" | awk '{print $1}')"
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

# 统一 swagger-ui 离线包探测（禁止联网下载）
# shellcheck source=lib/swagger-ui.sh
source "$ROOT/scripts/lib/swagger-ui.sh"
topems_ensure_swagger_ui_archive || exit 1

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
