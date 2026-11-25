#!/bin/bash
# ============================================================
# scripts/migration/pre-normalize-org-null.sh
#
# 窗口前置：把“废弃重复列 organization_id 的 NULL 行”归一为租户键，
# 让 20261121230000 / 20261121235900 / 20261121235930 的守卫能过。
#
# 为什么需要：
#   这三条迁移的守卫写作 `organization_id IS DISTINCT FROM 目标列`，把 NULL
#   判成“不等于”；而 NULL 的真实语义是“未设置”，删列无损失。已提交迁移
#   受 migration-validate 门禁保护不可改，故只能在数据侧先归一。
#   生产 2026-11-25 窗口演练在 20261121230000 被这条守卫拦下（hrm.employees
#   有 1 行 organization_id IS NULL）。
#
# 语义边界：
#   - 只把 NULL 写成目标列的值，不动非 NULL 行；
#   - 非 NULL 且与目标列不等的行仍然保留，交给迁移守卫中止（那是真冲突）；
#   - 列不存在（已删列或表不存在）时跳过，可反复执行。
#
# 用法：
#   bash scripts/migration/pre-normalize-org-null.sh --host /tmp --user xingzhai --db topems_prod --dry-run
#   bash scripts/migration/pre-normalize-org-null.sh --host /tmp --user xingzhai --db topems_prod
#   生产库执行需 CONFIRM=1。
# ============================================================
set -uo pipefail

# 连接参数由调用方显式注入（环境变量 PGHOST/PGUSER，或 --host/--user）；
# 不内置 socket 路径/本地用户名回落（D-9），缺失即 fail-fast，避免静默连到非预期库。
HOST="${PGHOST-}"
USER_="${PGUSER-}"
DB="topems_prod"
DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --user) USER_="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$HOST" || -z "$USER_" ]]; then
  echo "拒绝：未提供连接参数，请显式设置 PGHOST/PGUSER 或传入 --host/--user" >&2
  exit 2
fi

if [[ "$DB" == "topems_prod" && "$DRY" != "1" && "${CONFIRM:-0}" != "1" ]]; then
  echo "拒绝：对 topems_prod 正式写入需 CONFIRM=1（先 --dry-run 看行数）" >&2
  exit 2
fi

q() { psql -h "$HOST" -U "$USER_" -d "$DB" -X -tA -c "$1"; }

# schema.table:target_column
PAIRS=(
  "hrm.departments:tenant_id"
  "hrm.employees:tenant_id"
  "hrm.positions:tenant_id"
  "hrm.attendance_records:tenant_id"
  "hrm.initialization_status:tenant_id"
  "wms.audit_logs:org_id"
  "wms.inbound_orders:tenant_id"
)

echo "== W5-C organization_id NULL 归一到租户键：${DB}（dry_run=${DRY}）=="

TOTAL=0
for pair in "${PAIRS[@]}"; do
  tbl="${pair%%:*}"
  target="${pair##*:}"
  schema="${tbl%%.*}"
  table="${tbl##*.}"

  has_table="$(q "select count(*) from information_schema.tables where table_schema='${schema}' and table_name='${table}'")"
  has_cols="$(q "select count(*) from information_schema.columns where table_schema='${schema}' and table_name='${table}' and column_name in ('organization_id','${target}')")"

  if [[ "${has_table:-0}" == "0" ]]; then
    echo "SKIP  ${tbl} 不存在"
    continue
  fi
  if [[ "${has_cols:-0}" != "2" ]]; then
    echo "SKIP  ${tbl} 缺 organization_id 或 ${target}（可能已删列）"
    continue
  fi

  nulls="$(q "select count(*) from ${schema}.${table} where organization_id is null")"
  conflicts="$(q "select count(*) from ${schema}.${table} where organization_id is not null and organization_id <> ${target}")"
  echo "INFO  ${tbl}：NULL=${nulls}  非 NULL 冲突=${conflicts}"

  if [[ "${nulls:-0}" == "0" ]]; then
    continue
  fi

  if [[ "$DRY" == "1" ]]; then
    echo "DRY   ${tbl} 将更新 ${nulls} 行 organization_id = ${target}"
  else
    q "update ${schema}.${table} set organization_id = ${target} where organization_id is null" >/dev/null
    echo "FIX   ${tbl} 已归一 ${nulls} 行"
  fi
  TOTAL=$((TOTAL + nulls))
done

echo
if [[ "$DRY" == "1" ]]; then
  echo "== 预览：待归一 ${TOTAL} 行（去掉 --dry-run 执行；生产库需 CONFIRM=1）=="
else
  echo "== 已归一 ${TOTAL} 行 =="
fi
