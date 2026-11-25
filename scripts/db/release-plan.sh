#!/usr/bin/env bash
# =============================================================================
# release-plan.sh —— 生成「发版应用顺序清单」（database/migrations-release-plan.tsv）
#
# 为什么要它：本库的 pending 里有大量「不该在本库跑、但目标环境必须跑」的迁移
# （canonical 骨架、gate 门控的破坏性清理、按生产同源状态写的定向收口）。
# 本库的 apply-pending 会跳过/拒绝它们，但发版时必须有明确先后。
#
# 口径：
#   stage 1  bootstrap      schema_canonical 批：只在全新库初始化时执行（先跑 database/scripts/bootstrap_schemas.sql）
#   stage 2  b-class-fill   B 类补列/补约束脚本：目标环境缺列才执行；目标已达标时会主动 RAISE，属预期
#   stage 3  prod-directed  按生产同源状态编写的 RLS 收紧 / 数据归一 / 删表收口，前置断言须先核对
#   stage 4  replay         与本库形状一致的常规迁移，按版本号顺序直接执行
#   stage 5  gated-cleanup  破坏性清理，必须先显式 SET 迁移要求的 gate 变量
#
# 输入：database/migrations/*.sql（去掉已记账与 database/migrations-archive.tsv 归档）+ database/migrations-triage.tsv
# 用法：scripts/db/release-plan.sh [--check]（--check 只比对，不写文件）
# =========================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGDIR="$ROOT/database/migrations"
ARCHIVE="$ROOT/database/migrations-archive.tsv"
TRIAGE="$ROOT/database/migrations-triage.tsv"
OUT="$ROOT/database/migrations-release-plan.tsv"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

DSN="${MIGRATE_URL:-${DATABASE_URL:-}}"
if [ -z "$DSN" ] && [ -f "$ROOT/.env" ]; then
    DSN=$(grep -m1 '^MIGRATE_URL=' "$ROOT/.env" | cut -d= -f2-)
fi
INSTALLED=$(psql "$DSN" -tAc 'select version from public._sqlx_migrations where success' 2>/dev/null)
ARCHIVED=$(awk -F'\t' '$1 !~ /^#/ && $1 != "version" {print $1}' "$ARCHIVE" 2>/dev/null | sort -u)

TMP=$(mktemp)
printf 'version\tdescription\tstage\tgate\tnote\n' > "$TMP"

for f in "$MIGDIR"/[0-9]*_*.sql; do
    [ -f "$f" ] || continue
    ver=$(basename "$f" | cut -d_ -f1)
    [ ${#ver} -eq 14 ] || continue
    printf '%s\n' "$INSTALLED" | grep -qx "$ver" && continue
    printf '%s\n' "$ARCHIVED" | grep -qx "$ver" && continue

    desc=$(basename "$f" .sql | cut -d_ -f2- | tr '_' ' ')
    stage="stage4-replay"
    gate=""
    note="按版本顺序直接执行"

    if printf '%s' "$(basename "$f")" | grep -q 'schema_canonical'; then
        stage="stage1-canonical"; gate=""
        note="空库骨架固化：先跑 database/scripts/bootstrap_schemas.sql；已有库勿重放"
    elif grep -q 'gate closed' "$f"; then
        stage="stage5-gated"
        gate=$(grep -oE "app\\.[a-z_]+_gate=[a-z0-9_-]+" "$f" | head -1)
        [ -z "$gate" ] && gate=$(grep -oE "app\\.[a-z_]+_gate" "$f" | head -1)
        [ -z "$gate" ] && gate="(见文件内 gate 变量)"
        note="破坏性清理：先 SET ${gate} 再执行，执行前确认无依赖对象"
    elif grep -qE '本迁移只补缺失列|已有本次要补的列|只用于整表缺失场景|已存在，本迁移只补' "$f"; then
        stage="stage2-b-class"
        note="B 类补列/补约束：目标环境缺列才执行；目标已达标时会主动 RAISE 并中止，属预期而非失败"
    elif awk -F'\t' -v v="$ver" '$1==v && $3=="prod-directed"{found=1} END{exit !found}' "$TRIAGE" 2>/dev/null; then
        stage="stage3-prod-directed"
        note="按生产同源状态编写的收口脚本：执行前先核对前置断言里的行数/策略数/可空性"
    fi

    printf '%s\t%s\t%s\t%s\t%s\n' "$ver" "$desc" "$stage" "$gate" "$note" >> "$TMP"
done

sort -t$'\t' -k3,3 -k1,1 "$TMP" -o "$TMP" 2>/dev/null
if [ $CHECK -eq 1 ]; then
    if diff -q "$TMP" "$OUT" >/dev/null 2>&1; then echo "release-plan 一致"; rm -f "$TMP"; exit 0; fi
    echo "release-plan 与当前迁移不一致，请重新生成（scripts/db/release-plan.sh）" >&2
    rm -f "$TMP"; exit 1
fi
mv "$TMP" "$OUT"
awk -F'\t' 'NR>1 {print $3}' "$OUT" | sort | uniq -c
echo "已写入 ${OUT}（$(($(wc -l < "$OUT") - 1)) 条）"
