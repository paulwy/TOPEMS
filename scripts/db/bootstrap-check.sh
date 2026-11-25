#!/usr/bin/env bash
# =============================================================================
# bootstrap-check.sh —— 全新环境从零建库的端到端验收（一次性临时库，跑完即删）
#
# 为什么需要它：`database/baseline/anchors.json` 的 anchor 资产 + 前向迁移是项目的
# 官方建库路径（CI migration-test 同口径），但那条路径默认「镜像里已有扩展 / 角色 /
# 若干 schema」。本脚本在这条路径前面补上超管 bootstrap，就能在干净 PG 实例上
# 复现整个建库过程并给出可核对的形状。
#
# 为什么不跑「全量 raw 迁移」（2026-11-25 实测，见 docs/database/ledger-triage-20261125.md §16/§17）：
#   880 个迁移按版本顺序硬跑 = 484 成功 / 356 失败，历史链序不闭合
#   （CI 注释同样写明「零库全量链不再作为判据」）。所以这里只走 anchor + forward。
#
# 流程：
#   1. 建临时库（默认 topems_bootstrap_check）
#   2. 超管跑 database/scripts/bootstrap_schemas.sql —— schema 唯一入口 + 扩展 + public 属主
#   3. 超管灌 anchor 资产：prod_schema_<anchor>.sql.gz / prod_ledger_<anchor>.sql /
#      baseline_<anchor>_data.sql.gz（schema 里的 CREATE SCHEMA 过滤掉，避免与第 2 步冲突）
#   4. 超管跑 converge_owner.sql —— 属主收敛 + topems_app 授权
#   5. topems_owner 跑 scripts/migration/apply-forward.sh（只应用 version > anchor，单事务）
#   6. 汇总形状，默认删库
#
# 用法：scripts/db/bootstrap-check.sh [--keep] [--db NAME] [--anchor VERSION]
# =========================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${BOOTSTRAP_CHECK_DB:-topems_bootstrap_check}"
KEEP=0; ANCHOR=""
while [ $# -gt 0 ]; do
    case "$1" in
        --keep) KEEP=1; shift ;;
        --db) DB="$2"; shift 2 ;;
        --anchor) ANCHOR="$2"; shift 2 ;;
        -h|--help) sed -n '1,24p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

ANCHORS="$ROOT/database/baseline/anchors.json"
[ -f "$ANCHORS" ] || { echo "缺少 $ANCHORS" >&2; exit 2; }
if [ -z "$ANCHOR" ]; then
    ANCHOR="$(python3 -c "import json;d=json.load(open('$ANCHORS'));print(max(a['anchor_version'] for a in d['anchors']))")"
fi
SCHEMA_FILE="$ROOT/database/baseline/prod_schema_${ANCHOR}.sql.gz"
LEDGER_FILE="$ROOT/database/baseline/prod_ledger_${ANCHOR}.sql"
DATA_FILE="$ROOT/database/baseline/baseline_${ANCHOR}_data.sql.gz"
for f in "$SCHEMA_FILE" "$LEDGER_FILE" "$DATA_FILE"; do
    [ -f "$f" ] || { echo "缺少 anchor 资产: $f" >&2; exit 2; }
done

SUPER_DSN="postgres:///${DB}"
# owner DSN 由 MIGRATE_URL 派生：只换库名，保留账号/密码/端口/参数
MIGRATE_URL_EFF="${MIGRATE_URL:-$(grep -m1 '^MIGRATE_URL=' "$ROOT/.env" 2>/dev/null | cut -d= -f2-)}"
if [ -z "$MIGRATE_URL_EFF" ]; then echo "缺少 MIGRATE_URL，无法以迁移角色执行" >&2; exit 2; fi
MIGRATE_BASE="${MIGRATE_URL_EFF%%\?*}"
OWNER_DSN="${MIGRATE_BASE%/*}/${DB}"

echo "[1/5] 重建临时库 ${DB}（anchor=${ANCHOR}）"
psql -d postgres -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE);" 2>/dev/null
psql -d postgres -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE ${DB};" || exit 1

echo "[2/5] bootstrap_schemas.sql（超管）：schema + 扩展 + public 属主"
psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$ROOT/database/scripts/bootstrap_schemas.sql" || {
    echo "✗ bootstrap_schemas.sql 失败" >&2; exit 1; }

echo "[3/5] 灌 anchor 资产（结构 / 账本 / 种子数据）"
gunzip -c "$SCHEMA_FILE" > /tmp/bootcheck_schema.sql
grep -v -E '^(CREATE SCHEMA |COMMENT ON EXTENSION |SET transaction_timeout)' /tmp/bootcheck_schema.sql > /tmp/bootcheck_schema.filtered.sql
psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f /tmp/bootcheck_schema.filtered.sql >/tmp/bootcheck_schema.log 2>&1 || {
    echo "✗ 结构基线导入失败" >&2; tail -5 /tmp/bootcheck_schema.log >&2; exit 1; }
psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$LEDGER_FILE" >/tmp/bootcheck_ledger.log 2>&1 || {
    echo "✗ 账本导入失败" >&2; tail -5 /tmp/bootcheck_ledger.log >&2; exit 1; }
gunzip -c "$DATA_FILE" > /tmp/bootcheck_data.sql
grep -v -E '^(SET transaction_timeout|CREATE SCHEMA )' /tmp/bootcheck_data.sql > /tmp/bootcheck_data.filtered.sql
psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f /tmp/bootcheck_data.filtered.sql >/tmp/bootcheck_data.log 2>&1 || {
    echo "✗ 种子数据导入失败" >&2; tail -5 /tmp/bootcheck_data.log >&2; exit 1; }

echo "[4/5] converge_owner.sql（超管）：属主收敛 + app 授权"
psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$ROOT/database/scripts/converge_owner.sql" >/tmp/bootcheck_converge.log 2>&1 || {
    echo "✗ converge_owner.sql 失败" >&2; tail -5 /tmp/bootcheck_converge.log >&2; exit 1; }

echo "[5/5] apply-forward.sh（topems_owner）：只应用 version > anchor 的迁移"
bash "$ROOT/scripts/migration/apply-forward.sh" --dsn "$OWNER_DSN" --drill-gate-guc-auto >/tmp/bootcheck_forward.log 2>&1
FWD=$?
tail -1 /tmp/bootcheck_forward.log | sed 's/^/    /'
if [ "$FWD" -ne 0 ]; then
    echo "✗ 前向迁移失败（详见 /tmp/bootcheck_forward.log）" >&2
    grep -nE 'ERROR|拒绝' /tmp/bootcheck_forward.log | head -5 >&2
fi

echo "[结果]"
psql "$SUPER_DSN" -tAc "select 'tables='||(select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema'))
  ||' columns='||(select count(*) from information_schema.columns where table_schema not in ('pg_catalog','information_schema'))
  ||' indexes='||(select count(*) from pg_indexes where schemaname not in ('pg_catalog','information_schema'))
  ||' policies='||(select count(*) from pg_policies)
  ||' ledger='||(select count(*) from public._sqlx_migrations)"

if [ "$KEEP" -eq 0 ]; then
    psql -d postgres -q -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE);" >/dev/null 2>&1
    echo "临时库已删除（--keep 可保留）"
else
    echo "临时库保留：${DB}"
fi
[ "$FWD" -eq 0 ] && exit 0 || exit 1
