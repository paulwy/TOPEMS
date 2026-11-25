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
# 用法：scripts/db/bootstrap-check.sh [--keep] [--full] [--db NAME] [--baseline FILE]
#   默认只跑 release-plan.tsv 的 stage1/2/4（验证「升级清单」本身，适合日常）；
#   --full 跑全部迁移文件（≈880 个），用于评估「全新环境能否纯 SQL 建库」（当前结论见文档 §16）
# =========================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${BOOTSTRAP_CHECK_DB:-topems_bootstrap_check}"
KEEP=0; ONLY_STAGE=""; FULL_SET=0; BASELINE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --keep) KEEP=1; shift ;;
        --plan-only) FULL_SET=0; shift ;;
        --full) FULL_SET=1; shift ;;
        --only-stage) ONLY_STAGE="$2"; shift 2 ;;
        --db) DB="$2"; shift 2 ;;
        --baseline) BASELINE="$2"; shift 2 ;;
        -h|--help) sed -n '1,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

if [ -n "$ONLY_STAGE" ]; then
    echo "提示：--only-stage 已废弃，当前按 release-plan 默认阶段或 --full 执行" >&2
fi

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

# --baseline：在 bootstrap 之后灌一份库结构基线（pg_dump --schema-only --no-owner），
# 然后 converge_owner.sql 把属主/授权收敛到 owner/app。这是「全新环境可复制建库」的
# 唯一实测可行路径（见 docs/database/ledger-triage-20261125.md §16）。
if [ -n "$BASELINE" ]; then
    echo "[2b/4] 灌基线 $(basename "$BASELINE") + converge_owner（超管）"
    case "$BASELINE" in
        *.gz) gunzip -c "$BASELINE" > /tmp/bootcheck_baseline.sql
              psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f /tmp/bootcheck_baseline.sql >/tmp/bootcheck_baseline.log 2>&1 ;;
        *)    psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$BASELINE" >/tmp/bootcheck_baseline.log 2>&1 ;;
    esac || {
        echo "✗ 基线导入失败" >&2; tail -5 /tmp/bootcheck_baseline.log >&2; exit 1; }
    psql "$SUPER_DSN" -v ON_ERROR_STOP=1 -q -f "$ROOT/database/scripts/converge_owner.sql" >/tmp/bootcheck_converge.log 2>&1 || {
        echo "✗ converge_owner.sql 失败" >&2; tail -5 /tmp/bootcheck_converge.log >&2; exit 1; }
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
    # 带 --baseline 时跳过 stage1-canonical：canonical 是「空库自建整表」用的，
    # 基线里已经是现网表形状，二者列集合不一致（基线共 1334 张表 vs canonical 的列清单），
    # 硬跑只会在已有表上撞「索引列不存在」。
    awk -F'\t' -v base="$([ -n "$BASELINE" ] && echo 1 || echo 0)" '
        NR>1 && ($3=="stage2-b-class" || $3=="stage4-replay") {print $1}
        NR>1 && base=="0" && $3=="stage1-canonical" {print $1}' "$PLAN" > "$LIST_FILE"
fi

# 迁移里有用于建 RLS 策略的 EXECUTE format 会把 app.tenant_id 的**值**在 DDL 时求值，
# 未设该 GUC 就直接报 unrecognized configuration parameter。用 nil UUID（全租户/全局
# 语义，与 20261023000005 里的约定一致）预置，保证裸 psql 也能跑。
export PGOPTIONS="${PGOPTIONS:-} -c app.tenant_id=00000000-0000-0000-0000-000000000000"
PGOPTIONS="$(echo "$PGOPTIONS" | sed 's/^ //')"
export PGOPTIONS

echo "[3/4] 依次执行 $(grep -c . "$LIST_FILE") 个迁移（topems_owner）"
ok=0; bad=0; skip=0; bad_list=""
while IFS= read -r ver; do
    [ -z "$ver" ] && continue
    f=$(ls "$ROOT/database/migrations/${ver}_"*.sql 2>/dev/null | head -1)
    [ -z "$f" ] && { echo "  缺失文件 $ver"; bad=$((bad+1)); bad_list="$bad_list $ver"; continue; }
    # -1：每个迁移单事务。部分迁移用 set_config(..., true)（事务级）在同一文件内传递
    # 中间结果（如 system_settings_company_scope 的 pre_rows），逐语句自动提交会丢值。
    if psql "$OWNER_DSN" -v ON_ERROR_STOP=1 -1 -q -f "$f" >/tmp/bootcheck.log 2>&1; then
        ok=$((ok+1))
    else
        # 已达标断言：与 apply-pending.sh 同一套口径——本迁移要补的东西已经在基线里，
        # 属于「在存量库上跳过」的正常分支，不是失败。
        if grep -qE '只补缺失列|已有本次要补的列|只用于整表缺失场景' /tmp/bootcheck.log; then
            skip=$((skip+1))
            echo "  ↷ $ver 已达标（基线已含目标对象）"
        else
            bad=$((bad+1)); bad_list="$bad_list $ver"
            echo "  ✗ $ver $(basename "$f")"
            grep -m2 'ERROR' /tmp/bootcheck.log | sed 's/^/      /'
        fi
    fi
done < "$LIST_FILE"

echo "[4/4] 结果：成功 ${ok}，已达标跳过 ${skip}，失败 ${bad}"
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
if [ "$bad" -eq 0 ]; then
    exit 0
fi
exit 1
