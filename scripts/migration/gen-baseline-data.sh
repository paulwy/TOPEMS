#!/usr/bin/env bash
# =============================================================================
# 生成「参考数据基线」资产（只读源库）
#
# 范围（配置性、跨环境应一致、非用户产生），共 11 张表：
#   - 租户与租户参数：public.core_tenants / public.core_tenant_settings
#   - 角色与权限点：  public.core_roles / public.core_permissions /
#                     public.core_role_permissions
#   - 菜单与菜单组：  public.core_menu_groups / public.core_menus
#   - 字典类型与项：  public.core_dict_types / public.core_dict_items
#   - 组织单位与岗位：hrm.departments / hrm.positions
#
# 明确排除：含 PII / 业务单据 / 日志 / 事件流 / 队列 / 缓存 / 账本类数据
# （users、customers、orders、audit_logs、*_ledger、*_queue、*_events 等）。
# 判据与逐表结论见 docs/quality/environment-provisioning.md。
#
# 脱敏审查：列名正则扫描（email/phone/address/name/id_card/password/secret/token 等）
# + 用户引用列（manager_id/created_by/updated_by）必须全为 NULL；任一命中即失败。
#
# 产物（默认 database/baseline/）：
#   baseline_<anchor>_data.sql.gz   纳入表的 data-only 快照（gzip -n）
#   baseline_<anchor>_data.json     元数据（表清单/每表行数/sha256/来源/时间/恢复顺序）
#
# 用法（源库只经只读通道：本地 DSN 或 SSH）：
#   bash scripts/migration/gen-baseline-data.sh --dsn "$TOPEMS_PROD_DSN" --force
#   bash scripts/migration/gen-baseline-data.sh \
#     --ssh <user>@<prod-host> --source-db topems_prod --force
#
# 退出码：0 成功；1 校验/脱敏失败；2 参数或环境错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/database/baseline"
DSN=""
SSH_TARGET=""
SOURCE_DB=""
ANCHOR=""
TABLES_OVERRIDE=""
FORCE=0

TABLES=(
  public.core_tenants
  public.core_tenant_settings
  public.core_roles
  public.core_permissions
  public.core_role_permissions
  public.core_menu_groups
  public.core_menus
  public.core_dict_types
  public.core_dict_items
  hrm.departments
  hrm.positions
)

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
info() { echo "== $*"; }
ok() { echo -e "${GREEN}✓${NC} $*"; }
die() { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --ssh) SSH_TARGET="$2"; shift 2 ;;
    --source-db) SOURCE_DB="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --tables) TABLES_OVERRIDE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,35p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

if [[ -n "$TABLES_OVERRIDE" ]]; then
  IFS=',' read -r -a TABLES <<< "$TABLES_OVERRIDE"
  [[ ${#TABLES[@]} -gt 0 ]] || { echo "--tables 不能为空" >&2; exit 2; }
fi

if [[ -n "$DSN" && -n "$SSH_TARGET" ]]; then
  echo "--dsn 与 --ssh 只能二选一" >&2; exit 2
fi
if [[ -z "$DSN" && -z "$SSH_TARGET" ]]; then
  echo "需要 --dsn 或 --ssh" >&2; exit 2
fi

PG_DUMP="${PG_DUMP:-$(command -v pg_dump || true)}"
[[ -x "$PG_DUMP" ]] || PG_DUMP=/opt/homebrew/bin/pg_dump
[[ -x "$PG_DUMP" ]] || { echo "找不到 pg_dump（可用 PG_DUMP 指定）" >&2; exit 2; }
command -v gzip >/dev/null 2>&1 || { echo "找不到 gzip" >&2; exit 2; }

sha256_of() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

# 只读查询通道：本地 DSN 或 SSH（远端 psql）
q() {
  local sql="$1" out
  if [[ -n "$DSN" ]]; then
    out="$(psql "$DSN" -X -q -v ON_ERROR_STOP=1 -tA -c "$sql")" || return 1
  else
    # shellcheck disable=SC2029  # 变量在本地展开，符合预期
    out="$(printf '%s\n' "$sql" | ssh "$SSH_TARGET" "PATH=/opt/homebrew/bin:\$PATH psql -d ${SOURCE_DB:-topems_prod} -X -q -v ON_ERROR_STOP=1 -tA")" || return 1
  fi
  printf '%s' "$out"
}

mkdir -p "$OUT"

# ── 锚点：源库账本最大版本；必须与现有结构基线锚点一致 ─────────────────────
SRC_ANCHOR="$(q "SELECT max(version) FROM _sqlx_migrations WHERE success")" \
  || die "读取源库账本锚点失败（连接/权限，fail-closed）"
[[ "$SRC_ANCHOR" =~ ^[0-9]{14}$ ]] || die "源库账本锚点非法：${SRC_ANCHOR}"
if [[ -z "$ANCHOR" ]]; then
  ANCHOR="$SRC_ANCHOR"
fi
if [[ "$ANCHOR" != "$SRC_ANCHOR" ]]; then
  die "锚点不一致：--anchor=${ANCHOR}，源库账本=${SRC_ANCHOR}；源库已前进，请先重生成结构基线（scripts/migration/gen-baseline.sh）"
fi

META_SCHEMA="$OUT/baseline_${ANCHOR}.json"
[[ -f "$META_SCHEMA" ]] || die "缺少结构基线元数据 ${META_SCHEMA}；请先运行 gen-baseline.sh 生成锚点 ${ANCHOR} 的结构基线"

DATA_FILE="$OUT/baseline_${ANCHOR}_data.sql.gz"
META_FILE="$OUT/baseline_${ANCHOR}_data.json"
if [[ $FORCE -eq 0 && -e "$DATA_FILE" ]]; then
  echo "已存在 $DATA_FILE（加 --force 覆盖）" >&2; exit 2
fi

# ── 每表行数 ───────────────────────────────────────────────────────────────
ROWCOUNTS="$(mktemp /tmp/topems_datacounts.XXXXXX)"
trap 'rm -f "$ROWCOUNTS"' EXIT
TOTAL_ROWS=0
for t in "${TABLES[@]}"; do
  c="$(q "SELECT count(*) FROM $t")" || die "读取行数失败：${t}（fail-closed）"
  c="${c//[^0-9]/}"; c="${c:-0}"
  printf '%s\t%s\n' "$t" "$c" >> "$ROWCOUNTS"
  TOTAL_ROWS=$((TOTAL_ROWS + c))
done
ok "行数采集完成：${#TABLES[@]} 张表 / ${TOTAL_ROWS} 行"

# ── 脱敏审查 1：列名命中 PII/凭据特征 ─────────────────────────────────────
TABLE_IN="$(printf "'%s'," "${TABLES[@]}")"
TABLE_IN="(${TABLE_IN%,})"
PII_HITS="$(q "SELECT table_schema||'.'||table_name||'.'||column_name FROM information_schema.columns WHERE (table_schema||'.'||table_name) IN ${TABLE_IN} AND column_name ~* '(email|phone|mobile|address|real_name|full_name|first_name|last_name|id_card|passport|ssn|bank|password|secret|token)' ORDER BY 1")" \
  || die "PII 列扫描失败（fail-closed）"
if [[ -n "$PII_HITS" ]]; then
  echo "PII/凭据列命中，拒绝生成快照：" >&2
  printf '  %s\n' "$PII_HITS" >&2
  die "请从纳入清单剔除该表，或改用脱敏导出策略"
fi

# ── 脱敏审查 2：用户引用列必须全为 NULL（否则会引入人员标识） ──────────────
# 仅检查本次实际纳入的表；--tables 已剔除的表不得触发误报。
USER_REF_SQL=""
if printf '%s\n' "${TABLES[@]}" | grep -qx 'hrm.departments'; then
  USER_REF_SQL+="SELECT 'hrm.departments', count(*) FILTER (WHERE manager_id IS NOT NULL OR created_by IS NOT NULL OR updated_by IS NOT NULL) FROM hrm.departments"
fi
if printf '%s\n' "${TABLES[@]}" | grep -qx 'hrm.positions'; then
  [[ -n "$USER_REF_SQL" ]] && USER_REF_SQL+=$'\nUNION ALL '
  USER_REF_SQL+="SELECT 'hrm.positions', count(*) FILTER (WHERE created_by IS NOT NULL OR updated_by IS NOT NULL) FROM hrm.positions"
fi
if [[ -n "$USER_REF_SQL" ]]; then
  USER_REFS="$(q "$USER_REF_SQL")" || die "用户引用列扫描失败（fail-closed）"
  BAD_REFS="$(printf '%s\n' "$USER_REFS" | awk -F'|' '$2+0 > 0 {print $1" ("$2")"}')"
  if [[ -n "$BAD_REFS" ]]; then
    echo "纳入表存在非 NULL 的用户引用列（可能含人员标识），拒绝生成：" >&2
    printf '  %s\n' "$BAD_REFS" >&2
    exit 1
  fi
  ok "脱敏审查通过：无 PII/凭据列，用户引用列全为 NULL"
else
  ok "脱敏审查通过：纳入表无 PII/凭据列（未纳入 hrm 人员表，跳过用户引用列检查）"
fi

# ── 导出 data-only（只读） ─────────────────────────────────────────────────
info "导出 data-only（anchor=${ANCHOR}, tables=${#TABLES[@]}, rows=${TOTAL_ROWS}）"
TMP_SQL="$(mktemp /tmp/topems_refdata_XXXXXX)"
trap 'rm -f "$ROWCOUNTS" "$TMP_SQL"' EXIT

TABLE_ARGS=""
for t in "${TABLES[@]}"; do
  TABLE_ARGS+=" -t $t"
done

# 过滤 PG17+ 的 \restrict/\unrestrict 随机令牌，保证同一数据生成字节稳定的资产
STRIP_RESTRICT='!/^\\restrict / && !/^\\unrestrict /'
if [[ -n "$DSN" ]]; then
  # shellcheck disable=SC2086  # TABLE_ARGS 为受控的表名列表
  "$PG_DUMP" "$DSN" --data-only --no-owner --no-privileges --no-tablespaces \
    $TABLE_ARGS | awk "$STRIP_RESTRICT" > "$TMP_SQL" || die "pg_dump 失败（data-only）"
else
  # shellcheck disable=SC2029,SC2086
  ssh "$SSH_TARGET" "PATH=/opt/homebrew/bin:\$PATH pg_dump -d ${SOURCE_DB:-topems_prod} --data-only --no-owner --no-privileges --no-tablespaces${TABLE_ARGS}" | awk "$STRIP_RESTRICT" > "$TMP_SQL" \
    || die "远端 pg_dump 失败（data-only）"
fi

gzip -9 -n -c "$TMP_SQL" > "$DATA_FILE"
DATA_SHA="$(sha256_of "$DATA_FILE")"

# ── 快照自校验：COPY 数据行数必须与源库逐表一致 ────────────────────────────
DUMP_COUNTS="$(gzip -dc "$DATA_FILE" | awk '
  /^COPY / { tbl=$2; next }
  /^\\\./   { tbl=""; next }
  tbl != "" { n[tbl]++ }
  END { for (t in n) print t"\t"n[t] }
' | LC_ALL=C sort)"

EXPECTED="$(LC_ALL=C sort "$ROWCOUNTS")"
if [[ "$EXPECTED" != "$DUMP_COUNTS" ]]; then
  echo "快照自校验失败：dump 行数与源库行数不一致" >&2
  diff <(printf '%s\n' "$EXPECTED") <(printf '%s\n' "$DUMP_COUNTS") >&2 || true
  exit 1
fi

RESTORE_ORDER="$(gzip -dc "$DATA_FILE" | awk '/^COPY / {print $2}' | paste -sd ',' -)"
ok "快照自校验通过：${#TABLES[@]} 张表行数与源库一致"

if [[ -n "$SSH_TARGET" ]]; then
  SOURCE_HOST="$SSH_TARGET"
else
  SOURCE_HOST="$(q "SELECT coalesce(inet_server_addr()::text,'local')")"
fi
SOURCE_VER="$(q "SELECT current_setting('server_version')")"
GEN_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

TABLES_JSON="$(printf '%s\n' "${TABLES[@]}" | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{printf "]"}')"
ROWCOUNTS_JSON="$(awk -F'\t' 'BEGIN{printf "{"} {printf "%s\"%s\": %s", (NR>1?",":""), $1, $2} END{printf "}"}' "$ROWCOUNTS")"
RESTORE_JSON="$(printf '%s' "$RESTORE_ORDER" | awk -F',' 'BEGIN{printf "["} {for(i=1;i<=NF;i++) printf "%s\"%s\"", (i>1?",":""), $i} END{printf "]"}')"

cat > "$META_FILE" <<EOF
{
  "anchor_version": $ANCHOR,
  "source_db": "${SOURCE_DB:-topems_prod}",
  "source_host": "$SOURCE_HOST",
  "source_server_version": "$SOURCE_VER",
  "generated_at_utc": "$GEN_AT",
  "table_count": ${#TABLES[@]},
  "total_rows": $TOTAL_ROWS,
  "tables": $TABLES_JSON,
  "row_counts": $ROWCOUNTS_JSON,
  "restore_order": $RESTORE_JSON,
  "data_file": "$(basename "$DATA_FILE")",
  "data_sha256": "$DATA_SHA",
  "pii_review": {
    "method": "column-name regex (email/phone/address/name/id_card/password/secret/token) + user-ref columns must be NULL",
    "checked_tables": ${#TABLES[@]},
    "findings": []
  }
}
EOF

echo "== 完成"
echo "  anchor : $ANCHOR"
echo "  data   : $DATA_FILE ($(du -h "$DATA_FILE" | cut -f1), ${TOTAL_ROWS} rows)"
echo "  meta   : $META_FILE"
echo "  sha256 : $DATA_SHA"
