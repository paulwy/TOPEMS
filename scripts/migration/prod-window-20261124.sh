#!/usr/bin/env bash
# =============================================================================
# 生产 schema 追赶窗口执行器（2026-11-24）
#   计划：docs/ops/prod-schema-window-plan-2026-11-24.md
#   目标：把 topems_prod 从账本 20261119000002 追到 20261124160000（81 条），
#        与二进制 642ca90db（fe23cda1…）对齐；不含 20261124170000（B261）。
#
# 用法：
#   bash scripts/migration/prod-window-20261124.sh plan           # 只打印，不碰库
#   WINDOW_DB=topems_prod_dryrun bash ... dryrun                  # 演练库整体预演
#   CONFIRM=1 WINDOW_DB=topems_prod bash ... phase1|phase2|phase3 # 三段按序
#   bash ... verify                                               # 账本与对象数
#
# 分段（严格按版本号升序，不可乱序）：
#   phase1 → phase2 → phase3，每段跑完先 verify 再进下一段。
# 铁律：逐版本 --only 单版本 + --defer 其余 80 条；任一条失败即停。
#       prod 模式必须显式 CONFIRM=1。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ANCHOR="${WINDOW_ANCHOR:-}"   # 留空=由账本水位推导（prod 模式要求锚点等于账本 max）
DB="${WINDOW_DB:-topems_prod}"
PGHOST="${WINDOW_PGHOST:-/tmp}"
export PGHOST
PGUSER_="${WINDOW_PGUSER:-xingzhai}"
export PGUSER="$PGUSER_"
MODE="${1:-plan}"

ALL="20261119010000,20261119100000,20261119110000,20261119120000,20261119130000,20261119131000,20261119140000,20261119141000,20261119150000,20261119151000,20261119160000,20261119161000,20261119170000,20261119180000,20261119190000,20261119190100,20261119200000,20261119210000,20261119220000,20261119230000,20261119233000,20261120090000,20261120100000,20261120110000,20261120120000,20261120130000,20261120140000,20261120150000,20261120160000,20261120170000,20261120180000,20261120190000,20261120200000,20261120210000,20261120220000,20261120230000,20261120235900,20261120235930,20261120235945,20261120235950,20261121090000,20261121100000,20261121110000,20261121111000,20261121120000,20261121130000,20261121131000,20261121140000,20261121150000,20261121160000,20261121170000,20261121180000,20261121190000,20261121200000,20261121201000,20261121210000,20261121220000,20261121230000,20261121235900,20261121235930,20261121235940,20261122090000,20261122100000,20261122150000,20261122160000,20261123090000,20261123100000,20261123110000,20261123120000,20261123130000,20261123140000,20261123141000,20261123142000,20261123150000,20261124100000,20261124110000,20261124120000,20261124130000,20261124140000,20261124150000,20261124160000"
SEG1="20261119010000,20261119100000,20261119110000,20261119120000,20261119130000,20261119131000,20261119140000,20261119141000,20261119150000,20261119151000,20261119160000,20261119161000,20261119170000,20261119180000,20261119190000,20261119190100,20261119200000,20261119210000,20261119220000,20261119230000,20261119233000,20261120090000,20261120100000,20261120110000,20261120120000,20261120130000,20261120140000,20261120150000,20261120160000,20261120170000,20261120180000,20261120190000,20261120200000,20261120210000,20261120220000,20261120230000,20261120235900,20261120235930,20261120235945,20261120235950"
SEG2="20261121090000,20261121100000,20261121110000,20261121111000,20261121120000,20261121130000,20261121131000,20261121140000,20261121150000,20261121160000,20261121170000,20261121180000,20261121190000,20261121200000,20261121201000,20261121210000,20261121220000,20261121230000,20261121235900,20261121235930,20261121235940,20261122090000,20261122100000,20261122150000,20261122160000,20261123090000,20261123100000,20261123110000,20261123120000,20261123130000,20261123140000,20261123141000,20261123142000,20261123150000,20261124100000,20261124110000,20261124120000,20261124130000"
SEG3="20261124140000,20261124150000,20261124160000"
DESTRUCTIVE="20261119100000 20261119110000 20261119160000 20261119180000 20261119200000 20261119233000 20261120220000 20261120235930 20261120235950 20261121111000 20261121131000 20261121201000 20261121230000 20261121235900 20261121235930 20261124130000"

case "$MODE" in
  plan|dryrun|phase1|phase2|phase3|verify) ;;
  *) echo "未知模式: $MODE（plan|dryrun|phase1|phase2|phase3|verify）" >&2; exit 2 ;;
esac

if [[ -z "${PROD_CHANGE_TICKET:-}" ]]; then
  export PROD_CHANGE_TICKET="B255-FIN-REPORT-20261124,DEAD-TABLE-20261119,IAM-PERM-20261119,LEGACY-COPY-20261119,TENANT-UNBLOCK-20261119,W2-D2-ANALYTICS-20261121,W2-D2-HRM-20261120,W2-D2-MOBILE-20261121,W2-D2-PM-20261121,W2-D2-UC-20261120,W2-D2-WMS-20261120,W5C-ORG-HRM-20261121,W5C-ORG-HRM-INIT-20261121,W5C-ORG-WMS-20261121,ZERO-PATH-20261119"
  echo "[ticket] 未显式设置 PROD_CHANGE_TICKET，使用执行包内置票据（15 张）"
fi

ALL_PENDING="$(
  for f in database/migrations/*.sql; do
    b="${f##*/}"
    v="${b%%_*}"
    [[ "$v" =~ ^[0-9]{14}$ ]] || continue
    printf '%s\n' "$v"
  done | sort | paste -sd, -
)"

defer_for() {
  local cur="$1" out="" v
  for v in ${ALL_PENDING//,/ }; do
    [[ "$v" == "$cur" ]] && continue
    out="${out}${v},"
  done
  printf '%s' "${out%,}"
}

run_one() {
  local v="$1" gate="" allow="" defer
  defer="$(defer_for "$v")"
  case "$v" in
    20261119100000) gate="batch-1" ;;
    20261119110000) gate="batch-2" ;;
  esac
  case " $DESTRUCTIVE " in
    *" $v "*) allow=1 ;;
  esac
  echo ">>> [${DB}] ${v}${gate:+  (gate=$gate)}"
  set -- --prod --db "$DB" --only "$v" --defer "$defer"
  if [[ -n "$ANCHOR" ]]; then
    set -- "$@" --anchor "$ANCHOR"
  fi
  if [[ -n "$allow" ]]; then
    set -- "$@" "--allow-destructive=$v"
  fi
  if [[ -n "$gate" ]]; then
    env PGOPTIONS="-c app.drop_dead_tables_gate=$gate" \
      bash scripts/migration/apply-forward.sh "$@"
  else
    bash scripts/migration/apply-forward.sh "$@"
  fi
}

run_list() {
  local v rc=0
  for v in ${1//,/ }; do
    run_one "$v" || { rc=1; echo "STOP: ${v} 失败，后续不再执行" >&2; break; }
    echo "--- 账本水位: $(psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -tAc 'select max(version) from _sqlx_migrations')"
  done
  return $rc
}

case "$MODE" in
  plan)
    echo "目标库: ${DB}（prod 入口）  锚点: ${ANCHOR}"
    echo "phase1: 40 条（20261119010000…20261120235950，含 9 条破坏性）"
    echo "phase2: 38 条（20261121090000…20261124130000，含 7 条破坏性）"
    echo "phase3:  3 条（20261124140000…20261124160000，无破坏性）"
    echo "合计: 81 条（不含 20261124170000）"
    ;;
  verify)
    psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -c "select max(version) as ledger_max from _sqlx_migrations"
    psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -c "select count(*) as failed from _sqlx_migrations where not success"
    psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -c "select count(*) as tables from pg_class where relkind='r'"
    psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -c "select count(*) as constraints from pg_constraint"
    psql -h "$PGHOST" -U "$PGUSER_" -d "$DB" -X -c "select count(*) as indexes from pg_indexes"
    ;;
  dryrun)
    if [[ "$DB" == "topems_prod" ]]; then
      echo "拒绝：dryrun 必须用演练库（WINDOW_DB=topems_prod_dryrun）" >&2; exit 2
    fi
    base_iam="$(psql -d "$DB" -X -tAc "select count(*) from pg_namespace where nspname='iam'" 2>/dev/null || echo 0)"
    base_rows="$(psql -d "$DB" -X -tAc "select count(*) from _sqlx_migrations" 2>/dev/null || echo 0)"
    if [[ "${base_iam:-0}" == "0" || "${base_rows:-0}" == "0" ]]; then
      echo "拒绝：$DB 不是有效的基线库（缺 iam schema 或账本为空）。dryrun 必须由生产 dump 恢复，例如：" >&2
      echo "  createdb topems_prod_dryrun && pg_restore -d topems_prod_dryrun --no-owner <dump>" >&2
      exit 2
    fi
    echo "[dryrun] 目标 ${DB}，与正式窗口同一命令路径"
    run_list "$ALL"
    ;;
  phase1|phase2|phase3)
    if [[ "$DB" == "topems_prod" && "${CONFIRM:-0}" != "1" ]]; then
      echo "拒绝：正式库执行需 CONFIRM=1（先 plan → dryrun → 开窗）" >&2; exit 2
    fi
    case "$MODE" in
      phase1) run_list "$SEG1" ;;
      phase2) run_list "$SEG2" ;;
      phase3) run_list "$SEG3" ;;
    esac
    ;;
esac
