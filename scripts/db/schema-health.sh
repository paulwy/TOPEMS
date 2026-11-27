#!/usr/bin/env bash
# =============================================================================
# schema-health.sh —— 用「schema 基线 + 属主巡检」判断本机库是否落后，而不是数 pending
#
# 背景：本机账本已与 schema 脱钩（见 docs/database/ledger-triage-20261125.md）。
# 「落后不落后」不能看 sqlx pending 数量，而应看三个维度：
#   1) 属主漂移（owner-sweep）；
#   2) 与基线快照 fixtures/full_schema_contract.sql 的结构差量（按 schema 的
#      tables / views / columns / functions / policies 计数，正数=现库领先，负数=现库落后）；
#   3) 真实待办迁移 = pending - 归档表（database/migrations-archive.tsv）。
#
# 用法：
#   scripts/db/schema-health.sh                # 报告
#   scripts/db/schema-health.sh --strict       # 属主漂移 / 现库落后基线 / 真实待办迁移任一命中即 exit 1
#   scripts/db/schema-health.sh --no-baseline  # 跳过基线差量
#
# 依赖：psql；基线比对需要能建临时库的本机超级用户（当前 OS 用户，走 unix socket 免密）。
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STRICT=0
BASELINE=1
TARGET_TABLE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --strict) STRICT=1; shift ;;
        --no-baseline) BASELINE=0; shift ;;
        --table) TARGET_TABLE="$2"; shift 2 ;;
        -h|--help) sed -n '1,24p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

DSN="${MIGRATE_URL:-}"
[ -z "$DSN" ] && [ -f "$ROOT/.env" ] && DSN=$(grep -m1 '^MIGRATE_URL=' "$ROOT/.env" | cut -d= -f2-)
[ -z "$DSN" ] && { echo "缺少 MIGRATE_URL" >&2; exit 2; }

FIXTURE="$ROOT/fixtures/full_schema_contract.sql"
ARCHIVE="$ROOT/database/migrations-archive.tsv"
WAIVERS="$ROOT/database/schema-diff-waivers.tsv"
MIGDIR="$ROOT/database/migrations"
TMPDB="topems_schema_baseline_tmp"
DRIFT=0
BEHIND=0

# shellcheck disable=SC2016  # SQL 里的 $$ 是 PG 的 dollar-quote，不是 shell 变量
COUNT_SQL='
WITH rel AS (
  SELECT n.nspname AS schema, c.relkind, count(*) AS n
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname !~ $$^pg_$$ AND n.nspname NOT IN ($$information_schema$$,$$archive$$)
   GROUP BY 1,2),
col AS (
  SELECT n.nspname AS schema, count(*) AS n
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE a.attnum > 0 AND NOT a.attisdropped
     AND n.nspname !~ $$^pg_$$ AND n.nspname NOT IN ($$information_schema$$,$$archive$$)
   GROUP BY 1),
fn AS (
  SELECT n.nspname AS schema, count(*) AS n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname !~ $$^pg_$$ AND n.nspname NOT IN ($$information_schema$$,$$archive$$)
   GROUP BY 1),
pol AS (
  SELECT schemaname AS schema, count(*) AS n FROM pg_policies GROUP BY 1)
SELECT r.schema||$$|tables=$$||COALESCE(SUM(r.n) FILTER (WHERE r.relkind IN ($$r$$,$$p$$)),0)
    ||$$|views=$$||COALESCE(SUM(r.n) FILTER (WHERE r.relkind IN ($$v$$,$$m$$)),0)
    ||$$|columns=$$||COALESCE(max(col.n),0)
    ||$$|functions=$$||COALESCE(max(fn.n),0)
    ||$$|policies=$$||COALESCE(max(pol.n),0)
FROM rel r LEFT JOIN col ON col.schema=r.schema LEFT JOIN fn ON fn.schema=r.schema LEFT JOIN pol ON pol.schema=r.schema
GROUP BY r.schema ORDER BY 1;'

snapshot() { psql "$1" -tAq -c "$COUNT_SQL" 2>/dev/null | grep . | sort; }

# 两个快照求差：输出 "schema|behind_flag| tables+X columns-Y ..."
delta() {
    awk -F'|' '
        FNR==NR { for (i=2;i<=NF;i++){ split($i,a,"="); b[$1 SUBSEP a[1]]=a[2]+0 } next }
        { for (i=2;i<=NF;i++){ split($i,a,"="); l[$1 SUBSEP a[1]]=a[2]+0 } seen[$1]=1 }
        END {
            for (sc in b) seen[sc]=1
            n=split("tables views columns functions policies", keys, " ")
            for (sc in seen) {
                line=""; behind=0
                for (i=1;i<=n;i++) {
                    k=keys[i]; d=l[sc SUBSEP k]-b[sc SUBSEP k]
                    if (d!=0) { line=line sprintf(" %s%+d", k, d); if (d<0) behind=1 }
                }
                if (line!="") printf("%s|%d|%s\n", sc, behind, line)
            }
        }' "$1" "$2"
}

echo "================ schema-health ================"
echo "库: $(echo "$DSN" | sed -E 's#(://)[^@]*@#\1***@#')"
echo

# ---------------------------------------------------------------- 1) 属主漂移
echo "[1/3] 属主漂移"
SWEEP_OUT=$("$ROOT/scripts/db/owner-sweep.sh" 2>&1)
SWEEP_RC=$?
echo "$SWEEP_OUT" | grep -E "owner drift|OK|✗|ERROR" | sed 's/^/  /' | head -6
if [ $SWEEP_RC -ne 0 ]; then
    echo "  ✗ owner-sweep 失败"; DRIFT=1
elif ! echo "$SWEEP_OUT" | grep -q "relations=0 functions=0"; then
    echo "  ✗ 存在属主漂移"; DRIFT=1
else
    echo "  ✓ 0 漂移"
fi
echo

# ------------------------------------------------------------- 2) 基线结构差量
echo "[2/3] 与基线 fixtures/full_schema_contract.sql 的结构差量（排除 archive 回收站 schema）"
if [ $BASELINE -eq 1 ] && [ -f "$FIXTURE" ] && command -v createdb >/dev/null 2>&1 && psql postgres -tAc "select 1" >/dev/null 2>&1; then
    dropdb --if-exists "$TMPDB" >/dev/null 2>&1
    if createdb "$TMPDB" 2>/dev/null && psql "$TMPDB" -v ON_ERROR_STOP=1 -q -f "$FIXTURE" >/tmp/schema_health_load.log 2>&1; then
        if [ -n "$TARGET_TABLE" ]; then
            echo "  表级列名差量：${TARGET_TABLE}（< = 基线有现库无 / > = 现库有基线无）"
            CQL=$(printf "select attname from pg_attribute a join pg_class c on c.oid=a.attrelid where c.relname = '%s' and c.relnamespace = '%s'::regnamespace and a.attnum > 0 and not a.attisdropped order by attname" "${TARGET_TABLE#*.}" "${TARGET_TABLE%%.*}")
            diff <(psql "$TMPDB" -tAq -c "$CQL" 2>/dev/null) <(psql "$DSN" -tAq -c "$CQL" 2>/dev/null) \
                | grep -E "^[<>]" | sed 's/^/    /' | head -40
            dropdb --if-exists "$TMPDB" >/dev/null 2>&1
            exit 0
        fi
        snapshot "$DSN" > /tmp/schema_health_live.txt
        snapshot "$TMPDB" > /tmp/schema_health_base.txt
        DELTA=$(delta /tmp/schema_health_base.txt /tmp/schema_health_live.txt)
        if [ -z "$DELTA" ]; then
            echo "  ✓ 与基线一致（按 schema 的 tables/views/columns/functions/policies 计数）"
        else
            NSCH=$(printf '%s\n' "$DELTA" | grep -c .)
            # 已判读接受的差量（database/schema-diff-waivers.tsv）不算"落后"，只标注说明
            WAIVED=$(awk -F'\t' '!/^#/ && $1!="schema" {printf "%s ", $1}' "$WAIVERS" 2>/dev/null)
            WAIVED_TBL=$(awk -F'\t' '!/^#/ && $1!="schema" { if ($2=="*") printf "%s. ", $1; else printf "%s.%s ", $1, $2 }' "$WAIVERS" 2>/dev/null)
            NBACK=$(printf '%s\n' "$DELTA" | awk -F'|' -v wl="$WAIVED" '
                BEGIN { n=split(wl,a," "); for (i=1;i<=n;i++) if (a[i]!="") w[a[i]]=1 }
                $2==1 && !($1 in w) { c++ } END { print c+0 }')
            echo "  - ${NSCH} 个 schema 与基线有差异（正数=现库领先，负数=现库落后）"
            printf '%s\n' "$DELTA" | sort -t'|' -k2,2nr | awk -F'|' -v wl="$WAIVED" '
                BEGIN { n=split(wl,a," "); for (i=1;i<=n;i++) if (a[i]!="") w[a[i]]=1 }
                { if ($2==1 && ($1 in w)) mark="✓ 已判读接受"; else mark=($2==1 ? "⚠ 落后" : " 领先");
                  printf("    %-18s %s%s\n", $1, mark, $3) }' | head -30
            # 2026-11-25: 表级落后校验不再依赖 schema 级落后——一个"整体领先"的 schema 里
            # 仍可能有个别表列数少于基线（例如 public 领先 columns+2003，但 public.core_tickets 只有 2 列）。
            if [ "$NBACK" -gt 0 ]; then
                echo "  ⚠ 有 $NBACK 个 schema 的列/表少于基线（可能漏迁移，也可能只是基线快照更早）"
            fi
            echo "  [2b] 表级落后校验（基线有现库无 / 列数偏少）"
                # shellcheck disable=SC2016
                COL_SQL='select n.nspname||$$.$$||c.relname, count(*) from pg_attribute a
                           join pg_class c on c.oid=a.attrelid
                           join pg_namespace n on n.oid=c.relnamespace
                          where a.attnum>0 and not a.attisdropped and c.relkind in ($$r$$,$$p$$)
                            and n.nspname !~ $$^pg_$$ and n.nspname NOT IN ($$information_schema$$,$$archive$$)
                          group by 1 order by 1'
                psql "$DSN" -tAq -c "$COL_SQL" 2>/dev/null | grep . | sort > /tmp/schema_health_live_tbl.txt
                psql "$TMPDB" -tAq -c "$COL_SQL" 2>/dev/null | grep . | sort > /tmp/schema_health_base_tbl.txt
                FINDINGS=$(awk -F'|' -v wl="$WAIVED_TBL" '
                    BEGIN { n=split(wl,a," "); for (i=1;i<=n;i++) if (a[i]!="") w[a[i]]=1 }
                    NR==FNR { b[$1]=$2+0; next }
                    { l[$1]=$2+0 }
                    END { for (t in b) {
                            if ((t in w) || (substr(t,1,index(t,".")) in w)) continue;
                            if (!(t in l)) printf("%d|  表缺失  %s（基线 %d 列）\n", b[t], t, b[t]);
                            else if (l[t] < b[t]) printf("%d|  列偏少  %-40s 现库 %d / 基线 %d\n", b[t]-l[t], t, l[t], b[t]) } }' \
                    /tmp/schema_health_base_tbl.txt /tmp/schema_health_live_tbl.txt \
                    | sort -t'|' -k1,1nr | head -60 | cut -d'|' -f2)
                if [ -n "$FINDINGS" ]; then
                    echo "$FINDINGS" | sed 's/^/    /'
                    echo "    （逐表落后：先确认代码是否真引用这些列；确认不用的记入 database/schema-diff-waivers.tsv）"
                else
                    echo "    ✓ 逐表列数不落后基线"
                fi
        fi
    else
        echo "  - 跳过：基线装载失败（见 /tmp/schema_health_load.log）"
    fi
    dropdb --if-exists "$TMPDB" >/dev/null 2>&1
elif [ $BASELINE -eq 0 ]; then
    echo "  - 跳过（--no-baseline）"
else
    echo "  - 跳过（缺少 fixture 或本机超级用户 socket 连接）"
fi
echo

# ------------------------------------------------------------- 3) 真实待办迁移
echo "[3/3] 真实待办迁移（pending - 归档表）"
INSTALLED=$(psql "$DSN" -tAc "select version from public._sqlx_migrations where success" 2>/dev/null)
ARCHIVED_VERS=$(awk -F'\t' '$1 !~ /^#/ && $1 != "version" {print $1}' "$ARCHIVE" 2>/dev/null | sort -u)
# shellcheck disable=SC2012
PENDING=$(ls "$MIGDIR"/[0-9]*_*.sql 2>/dev/null | while read -r f; do
    v=$(basename "$f" | cut -d_ -f1)
    [ ${#v} -eq 14 ] || continue
    printf '%s\n' "$INSTALLED" | grep -qx "$v" || echo "$v"
done | sort -u)
TOTAL_PENDING=$(printf '%s\n' "$PENDING" | grep -c . 2>/dev/null) || TOTAL_PENDING=0
ARCH_PENDING=$(printf '%s\n' "$PENDING" | grep -xF -f <(echo "$ARCHIVED_VERS") 2>/dev/null | grep -c . 2>/dev/null) || ARCH_PENDING=0
REAL_LIST=$(printf '%s\n' "$PENDING" | grep -vxF -f <(echo "$ARCHIVED_VERS") 2>/dev/null)
# 判读表（database/migrations-triage.tsv）：gate 门控的破坏性清理 / 只在空库执行的 canonical 骨架 /
# 按生产同源状态编写的定向收口 —— 这些在本库「不该执行」，但仍保留在仓库里供对应环境执行。
# 与归档表不同：归档=永不重放，判读表=本库不适用但 prod 仍需跑。
TRIAGE="$ROOT/database/migrations-triage.tsv"
NOAPPLY_VERS=$(awk -F'\t' '$1 !~ /^#/ && $1 != "version" {print $1}' "$TRIAGE" 2>/dev/null | sort -u)
NOAPPLY_LIST=$(printf '%s\n' "$REAL_LIST" | grep -xF -f <(echo "$NOAPPLY_VERS") 2>/dev/null)
NOAPPLY_PENDING=$(printf '%s\n' "$NOAPPLY_LIST" | grep -c . 2>/dev/null) || NOAPPLY_PENDING=0
REAL_LIST=$(printf '%s\n' "$REAL_LIST" | grep -vxF -f <(echo "$NOAPPLY_VERS") 2>/dev/null)
REAL_PENDING=$(printf '%s\n' "$REAL_LIST" | grep -c . 2>/dev/null) || REAL_PENDING=0
echo "  已记账 $(printf '%s\n' "$INSTALLED" | grep -c .) 条；pending ${TOTAL_PENDING} 条"
echo "    其中归档解释 ${ARCH_PENDING} 条（不是缺陷，见 docs/database/ledger-triage-20261125.md）"
echo "    其中本库不适用 ${NOAPPLY_PENDING} 条（gate/canonical/生产定向收口，见 database/migrations-triage.tsv）"
echo "    真实待办 ${REAL_PENDING} 条（含 B 类补列脚本：目标状态已在库时 dry-run 会以 ↷ 跳过，不计缺陷）"
if [ "$REAL_PENDING" -gt 0 ]; then
    echo "  ⚠ 有真实待办（前 10 条）："
    printf '%s\n' "$REAL_LIST" | head -10 | sed 's/^/    /'
    echo "    处置：scripts/db/apply-pending.sh dry-run --only <version> 先验证，再 apply"
else
    echo "  ✓ 无真实待办"
fi
echo

OWNER_BAD=$([ $DRIFT -eq 1 ] && echo 有 || echo 无)
BASE_BAD=$([ $BEHIND -eq 1 ] && echo 有 || echo 无)
if [ $DRIFT -eq 1 ] || [ $BEHIND -eq 1 ]; then
    echo "结论：需要关注（属主漂移=${OWNER_BAD}，有 schema 落后基线=${BASE_BAD}）；真实待办=${REAL_PENDING} 仅作提示（账本已与 schema 脱钩，见归档表）"
    [ $STRICT -eq 1 ] && exit 1
else
    echo "结论：健康（属主 0 漂移、未落后基线）；真实待办=${REAL_PENDING} 仅作提示"
fi
exit 0
