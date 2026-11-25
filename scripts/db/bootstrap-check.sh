#!/usr/bin/env bash
# =============================================================================
# bootstrap-check.sh —— 空库从零建库的端到端验证（一次性临时库，跑完即删）
#
# 为什么需要它：stage1-canonical / stage2-b-class 这两批「只在空库执行」的迁移
# 从未在任何环境实跑过（本库已有形状，重放必撞已有对象）。它们的正确性只能靠
# 「新建一个空库 → bootstrap_schemas.sql → 按发版顺序跑」来证明。
#
# 流程：
#   1. 建临时库 topems_bootstrap_check（超管）
#   2. 以超管跑 database/scripts/bootstrap_schemas.sql（schema 唯一入口）
#   3. 以 topems_owner 依次跑 stage1-canonical + stage2-b-class + stage4-replay
#   4. 汇总成功/失败，默认删库（--keep 保留）
#
# 用法：scripts/db/bootstrap-check.sh [--keep] [--full]
#   默认只跑 release-plan.tsv 的 stage1/2/4（验证「升级清单」本身，适合日常）；
#   --full 跑全部迁移文件（≈880 个），用于评估「全新环境能否纯 SQL 建库」（当前结论见文档 §16）
# =========================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${BOOTSTRAP_CHECK_DB:-topems_bootstrap_check}"
KEEP=0; ONLY_STAGE=""; FULL_SET=0
while [ $# -gt 0 ]; do
    case "$1" in
        --keep) KEEP=1; shift ;;
        --plan-only) FULL_SET=0; shift ;;
        --full) FULL_SET=1; shift ;;
        --only-stage) ONLY_STAGE="$2"; shift 2 ;;
        -h|--help) sed -n '1,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

PLAN="$ROOT/database/migrations-release-plan.tsv"
[ -f "$PLAN" ] || { echo "缺少 $PLAN，先跑 scripts/db/release-plan.sh" >&2; exit 2; }

# 超管（本机 socket）与 owner 凭据
SUPER_DSN="postgres:///${DB}"
# owner DSN 由 MIGRATE_URL 派生：只把库名换成临时库，保留原有账号/密码/端口/参数
MIGRATE_URL_EFF="${MIGRATE_URL:-$(grep -m1 '^MIGRATE_URL=' "$ROOT/.env" 2>/dev/null | cut -d= -f2-)}"
if [ -z "$MIGRATE_URL_EFF" ]; then echo "缺少 MIGRATE_URL，无法以迁移角色执行" >&2; exit 2; fi
MIGRATE_BASE="${MIGRATE_URL_EFF%%\?*}"          # 去掉 query
OWNER_DSN="${MIGRATE_BASE%/*}/${DB}"

echo "[1/4] 重建临时库 ${DB}"
psql -d postgres -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE);" 2>/dev/null
psql -d postgres -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE ${DB};" || exit 1

echo "[2/4] 跑 bootstrap_schemas.sql（超管）"
if ! psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$ROOT/database/scripts/bootstrap_schemas.sql"; then
    echo "✗ bootstrap_schemas.sql 失败" >&2; exit 1
fi

# 默认按「全量迁移文件（14 位版本）+ 版本顺序」建库 —— 这才是全新环境的真实路径；
# --plan-only 则只跑 release-plan.tsv 里 stage1/2/4 的行（用于验证「升级清单」本身）。
LIST_FILE=$(mktemp)
if [ "${FULL_SET:-0}" = "1" ]; then
    ARCHIVED=$(awk -F'\t' '$1 !~ /^#/ && $1 != "version" {print $1}' "$ROOT/database/migrations-archive.tsv" 2>/dev/null | sort -u)
    for f in "$ROOT"/database/migrations/[0-9]*_*.sql; do
        v=$(basename "$f" | cut -d_ -f1)
        case $v in ''|*[!0-9]*) continue ;; esac
        printf '%s\n' "$ARCHIVED" | grep -qx "$v" && continue
        echo "$v"
    done | sort -n > "$LIST_FILE"
else
    awk -F'\t' 'NR>1 && ($3=="stage1-canonical" || $3=="stage2-b-class" || $3=="stage4-replay") {print $1}' "$PLAN" > "$LIST_FILE"
fi

echo "[3/4] 依次执行 $(grep -c . "$LIST_FILE") 个迁移（topems_owner）"
ok=0; bad=0; bad_list=""
while IFS= read -r ver; do
    [ -z "$ver" ] && continue
    f=$(ls "$ROOT/database/migrations/${ver}_"*.sql 2>/dev/null | head -1)
    [ -z "$f" ] && { echo "  缺失文件 $ver"; bad=$((bad+1)); bad_list="$bad_list $ver"; continue; }
    if psql "$OWNER_DSN" -v ON_ERROR_STOP=1 -q -f "$f" >/tmp/bootcheck.log 2>&1; then
        ok=$((ok+1))
    else
        bad=$((bad+1)); bad_list="$bad_list $ver"
        echo "  ✗ $ver $(basename "$f")"
        grep -m2 'ERROR' /tmp/bootcheck.log | sed 's/^/      /'
    fi
done < "$LIST_FILE"

echo "[4/4] 结果：成功 ${ok}，失败 ${bad}"
[ -n "$bad_list" ] && echo "  失败版本：${bad_list}"

# 空库最终形状抽样：schema 数 / 表数
if [ "$bad" -eq 0 ]; then
    psql "$SUPER_DSN" -tAc "select 'schemas='||count(*) from pg_namespace where nspname not like 'pg_%' and nspname<>'information_schema'" 
    psql "$SUPER_DSN" -tAc "select 'tables='||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not like 'pg_%' and n.nspname<>'information_schema'"
fi

if [ $KEEP -eq 0 ]; then
    psql -d postgres -q -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE);" >/dev/null 2>&1
    echo "临时库已删除（--keep 可保留）"
else
    echo "临时库保留：${DB}"
fi
exit $([ "$bad" -eq 0 ] && echo 0 || echo 1)
