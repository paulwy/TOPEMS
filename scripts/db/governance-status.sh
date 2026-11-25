#!/usr/bin/env bash
# =============================================================================
# 数据库治理一屏总览
#
# 把散落在四个脚本里的门禁合成一条命令，用来回答「现在到底健康不健康、
# 还剩多少迁移债」：
#
#   1) 属主漂移        scripts/db/owner-sweep.sh            （0 漂移为绿）
#   2) schema 差量     scripts/db/schema-health.sh --strict  （逐 schema + 逐表落后）
#   3) 迁移账本        磁盘文件 - 账本 - 归档                （算未应用数与分层）
#   4) 归档门禁        scripts/ci/check-migration-archive.mjs
#   5) 租户完整性      scripts/ci/check-tenant-integrity.mjs
#
# 只读：不 apply、不改库、不改文件；任何一项失败只影响退出码。
#
# 用法：
#   scripts/db/governance-status.sh            # 全量（含 schema-health，较慢）
#   scripts/db/governance-status.sh --fast     # 跳过 schema-health（约 3 秒）
#   scripts/db/governance-status.sh --db NAME  # 指定库（默认 topems）
#
# 退出码：0 全绿；1 有红项（属主漂移 / 归档门禁 / 租户完整性 / 账本查询失败）。
# schema-health 的「逐表落后」按定案仍是提示性，不参与退出码。
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${DATABASE_NAME:-topems}"
FAST=0
FAIL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fast) FAST=1; shift ;;
    --db) DB="$2"; shift 2 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

hr() { printf '%s\n' "----------------------------------------------------------------"; }
ok() { printf '  [OK]   %s\n' "$1"; }
bad() { printf '  [FAIL] %s\n' "$1"; FAIL=1; }
info() { printf '  %s\n' "$1"; }

echo "数据库治理总览  db=$DB  $(date '+%Y-%m-%d %H:%M:%S')"
hr

# --- 1) 属主漂移 ------------------------------------------------------------
echo "1) 属主漂移"
if OUT="$(bash "$ROOT/scripts/db/owner-sweep.sh" 2>&1)"; then
  LINE="$(printf '%s\n' "$OUT" | grep -E 'owner drift' | tail -1)"
  if printf '%s' "$LINE" | grep -q 'relations=0 functions=0'; then
    ok "属主收敛：${LINE#*: }"
  else
    bad "属主漂移：${LINE#*: }（跑 database/scripts/converge_owner.sql 收敛）"
  fi
else
  bad "owner-sweep 执行失败（库连不上或脚本报错）"
fi

# --- 2) schema 差量 ---------------------------------------------------------
echo "2) schema 差量（基线 fixtures/full_schema_contract.sql）"
if [[ $FAST -eq 1 ]]; then
  info "（--fast 跳过）"
else
  if OUT="$(bash "$ROOT/scripts/db/schema-health.sh" --strict 2>&1)"; then
    VERDICT="$(printf '%s\n' "$OUT" | grep -E '结论' | tail -1)"
    BEHIND="$(printf '%s\n' "$OUT" | grep -E '逐表列数不落后基线|逐表.*落后' | tail -1 | sed 's/^ *//')"
    ok "${VERDICT:-schema-health 通过}"
    [[ -n "$BEHIND" ]] && info "逐表：${BEHIND}"
  else
    bad "schema-health --strict 判负（见 scripts/db/schema-health.sh 输出）"
  fi
fi

# --- 3) 迁移账本 ------------------------------------------------------------
echo "3) 迁移账本"
TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT

find "$ROOT/database/migrations" -maxdepth 1 -name '*.sql' -type f \
  | sed -nE 's#.*/([0-9]{14})_.*#\1#p' | sort -u > "$TMPD/disk.txt"

export LC_ALL=C
if psql -d "$DB" -Atc 'select version from public._sqlx_migrations' \
     | sort -u > "$TMPD/ledger.txt" 2>/dev/null && [[ -s "$TMPD/ledger.txt" ]]; then
  # 台账类文件：跳过首行表头与注释行，只取第一列版本号（去引号）
  for f in migrations-archive.tsv migrations-triage.tsv migrations-release-plan.tsv; do
    awk -F'\t' 'NR>1 && $1 !~ /^#/ && $1 != "" {gsub(/"/,"",$1); print $1}' \
      "$ROOT/database/$f" | sort -u > "$TMPD/${f%.tsv}.txt"
  done

  UNAPPLIED=$(comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt" | wc -l | tr -d ' ')
  A_IN=$(comm -12 "$TMPD/disk.txt" <(comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt") | \
         comm -12 - "$TMPD/migrations-archive.txt" | wc -l | tr -d ' ')
  T_IN=$(comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt" | comm -12 - "$TMPD/migrations-triage.txt" | wc -l | tr -d ' ')
  R_IN=$(comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt" | comm -12 - "$TMPD/migrations-release-plan.txt" | wc -l | tr -d ' ')
  UNTOUCHED=$(comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt" | \
              comm -23 - <(cat "$TMPD/migrations-archive.txt" "$TMPD/migrations-triage.txt" \
                            "$TMPD/migrations-release-plan.txt" | sort -u) | wc -l | tr -d ' ')

  DCNT=$(wc -l < "$TMPD/disk.txt" | tr -d ' '); LCNT=$(wc -l < "$TMPD/ledger.txt" | tr -d ' '); info "磁盘迁移 ${DCNT} 条 ／ 账本 ${LCNT} 条"
  info "账本外：${UNAPPLIED} 条 = 归档 ${A_IN} + 已定性 ${T_IN} + 已在发版清单 ${R_IN} + 未处置 ${UNTOUCHED}（各集有交集）"
  awk -F'\t' 'NR>1 && $3 != "" {c[$3]++} END {for (k in c) printf "      %-20s %d\n", k, c[k]}' \
    "$ROOT/database/migrations-release-plan.tsv" | sort
  if [[ "$UNTOUCHED" -gt 0 ]]; then
    info "未处置的账本外迁移（需补 disposition）："
    comm -23 "$TMPD/disk.txt" "$TMPD/ledger.txt" | \
      comm -23 - <(cat "$TMPD/migrations-archive.txt" "$TMPD/migrations-triage.txt" \
                    "$TMPD/migrations-release-plan.txt" | sort -u) | sed 's/^/      /'
  fi
else
  bad "读不到 public._sqlx_migrations（检查 -d $DB 是否可连）"
fi

# --- 4) 归档门禁 ------------------------------------------------------------
echo "4) 归档门禁"
if OUT="$(node "$ROOT/scripts/ci/check-migration-archive.mjs" --db 2>&1)"; then
  ok "$(printf '%s\n' "$OUT" | tail -1 | sed 's/^✔  *//')"
else
  bad "归档门禁判负（$(printf '%s\n' "$OUT" | tail -1)）"
fi

# --- 5) 租户完整性 ----------------------------------------------------------
echo "5) 租户完整性"
if OUT="$(node "$ROOT/scripts/ci/check-tenant-integrity.mjs" --db 2>&1)"; then
  ok "$(printf '%s\n' "$OUT" | tail -1 | sed 's/^✔  *//')"
else
  bad "租户完整性判负（$(printf '%s\n' "$OUT" | tail -1)）"
fi

hr
if [[ $FAIL -eq 0 ]]; then
  SKIPNOTE=""
  [[ $FAST -eq 1 ]] && SKIPNOTE=", schema-health 已跳过"
  echo "总体：绿（属主 / 账本 / 归档 / 租户完整性均通过${SKIPNOTE}）"
else
  echo "总体：红（上面标 FAIL 的项需要处理）"
fi
exit $FAIL
