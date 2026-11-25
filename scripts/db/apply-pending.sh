#!/usr/bin/env bash
# =============================================================================
# apply-pending.sh —— 按版本顺序应用 pending 迁移（owner DSN，逐文件事务，成功才记账）
#
# 为什么需要它：`sqlx migrate run` 在本机账本上会因「previously applied but has been
# modified」（历史 checksum 漂移）整体中止，无法只推进 pending。本脚本：
#   * 不依赖 sqlx-cli 的 checksum 校验，只按「文件版本 vs 账本版本」判定 pending；
#   * 用 MIGRATE_URL（topems_owner，对象属主角色）执行，符合 docs/database/role-ownership.md；
#   * 每个文件单独事务（文件自带 `BEGIN;` 的按其自身事务执行），失败只回滚该文件并即停；
#   * 只有执行成功才写 public._sqlx_migrations，失败绝不补记。
#
# 用法：
#   scripts/db/apply-pending.sh plan                 # 只列 pending（默认）
#   scripts/db/apply-pending.sh dry-run              # 逐文件在事务里执行后 ROLLBACK（不自带 BEGIN 的文件）
#   scripts/db/apply-pending.sh apply                # 真实执行，失败即停
#   选项：--from <version>  从该版本起（含）
#         --limit <n>      最多处理 n 个文件
#         --only <version> 只处理这一个版本
#         --source <dir>   迁移目录（默认 database/migrations）
# =========================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$ROOT/database/migrations"
MODE="plan"
FROM_VER=""
LIMIT=""
ONLY_VER=""

while [ $# -gt 0 ]; do
    case "$1" in
        plan|dry-run|apply) MODE="$1"; shift ;;
        --from) FROM_VER="$2"; shift 2 ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --only) ONLY_VER="$2"; shift 2 ;;
        --source) SOURCE_DIR="$2"; shift 2 ;;
        -h|--help) sed -n '1,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

DSN="${MIGRATE_URL:-}"
if [ -z "$DSN" ] && [ -f "$ROOT/.env" ]; then
    DSN=$(grep -m1 '^MIGRATE_URL=' "$ROOT/.env" | cut -d= -f2-)
fi
if [ -z "$DSN" ]; then
    echo "缺少 MIGRATE_URL（应为 topems_owner 的 DSN）" >&2
    exit 2
fi

if ! psql "$DSN" -tAc 'select 1' >/dev/null 2>&1; then
    echo "MIGRATE_URL 连接失败（需要 topems_owner，勿用应用角色）" >&2
    exit 2
fi

installed_versions() {
    psql "$DSN" -tAc 'select version from public._sqlx_migrations where success order by version'
}

pending_files() {
    local installed="$1" f ver
    ls "$SOURCE_DIR"/[0-9]*_*.sql 2>/dev/null | while IFS= read -r f; do
        ver=$(basename "$f" | sed -E 's/^([0-9]+)_[0-9]+_.*$/\1/')
        # 版本号是文件名第一段的 14 位数字
        ver=$(basename "$f" | cut -d_ -f1)
        case $ver in
            ''|*[!0-9]*) continue ;;
        esac
        # 只认 sqlx 的 14 位时间戳版本（000_/001_ 这类 bootstrap 文件不进账本）
        [ ${#ver} -eq 14 ] || continue
        if printf '%s\n' "$installed" | grep -qx "$ver"; then
            continue
        fi
        echo "$ver $f"
    done | sort -n
}

record_success() {
    local ver="$1" file="$2" desc sum
    desc=$(basename "$file" .sql | cut -d_ -f2- | tr '_' ' ')
    sum=$(shasum -a 384 "$file" | cut -d' ' -f1)
    psql "$DSN" -v ON_ERROR_STOP=1 -q -c \
        "INSERT INTO public._sqlx_migrations(version, description, success, checksum, execution_time)
         VALUES ($ver, \$\$$desc\$\$, true, decode('$sum','hex'), 0)
         ON CONFLICT (version) DO NOTHING;" >/dev/null
}

has_own_txn() { grep -qE '^BEGIN;' "$1"; }

# ---- run ---------------------------------------------------------------------
INSTALLED="$(installed_versions)"
LIST="$(pending_files "$INSTALLED")"

if [ -n "$FROM_VER" ]; then
    LIST=$(printf '%s\n' "$LIST" | awk -v f="$FROM_VER" '$1+0 >= f+0')
fi
if [ -n "$ONLY_VER" ]; then
    LIST=$(printf '%s\n' "$LIST" | awk -v o="$ONLY_VER" '$1+0 == o+0')
fi
if [ -n "$LIMIT" ]; then
    LIST=$(printf '%s\n' "$LIST" | head -n "$LIMIT")
fi

COUNT=$(printf '%s\n' "$LIST" | grep -c . 2>/dev/null) || COUNT=0
echo "[$MODE] pending 文件: ${COUNT}（目录 ${SOURCE_DIR}）"

case "$MODE" in
    plan)
        printf '%s\n' "$LIST" | head -n 200
        ;;
    dry-run|apply)
        ok=0; skip=0
        while read -r ver file; do
            [ -z "${ver:-}" ] && continue
            if [ "$MODE" = "dry-run" ] && has_own_txn "$file"; then
                echo "  - skip(自事务) $ver $(basename "$file")"
                skip=$((skip+1)); continue
            fi
            if [ "$MODE" = "dry-run" ]; then
                # 事务内执行后回滚，不落库、不记账
                if { printf 'BEGIN;\n'; cat "$file"; printf '\nROLLBACK;\n'; } \
                        | psql "$DSN" -v ON_ERROR_STOP=1 -q -f - >/tmp/dbmig_dryrun.log 2>&1; then
                    echo "  ✓ $ver $(basename "$file")"
                    ok=$((ok+1))
                else
                    echo "  ✗ $ver $(basename "$file")"
                    tail -12 /tmp/dbmig_dryrun.log | sed 's/^/      /'
                    echo "[dry-run] 在 $ver 失败，停止"
                    exit 1
                fi
            else
                if [ "$(has_own_txn "$file" && echo y)" = "y" ]; then
                    if psql "$DSN" -v ON_ERROR_STOP=1 -q -f "$file" >/tmp/dbmig_apply.log 2>&1; then
                        record_success "$ver" "$file"
                        echo "  ✓ $ver $(basename "$file")"
                        ok=$((ok+1))
                    else
                        echo "  ✗ $ver $(basename "$file")"; tail -12 /tmp/dbmig_apply.log | sed 's/^/      /'
                        echo "[apply] 在 $ver 失败，未记账，停止"; exit 1
                    fi
                else
                    if { printf 'BEGIN;\n'; cat "$file"; printf '\nCOMMIT;\n'; } \
                            | psql "$DSN" -v ON_ERROR_STOP=1 -q -f - >/tmp/dbmig_apply.log 2>&1; then
                        record_success "$ver" "$file"
                        echo "  ✓ $ver $(basename "$file")"
                        ok=$((ok+1))
                    else
                        echo "  ✗ $ver $(basename "$file")"; tail -12 /tmp/dbmig_apply.log | sed 's/^/      /'
                        echo "[apply] 在 $ver 失败，事务已回滚，未记账，停止"; exit 1
                    fi
                fi
            fi
        done <<EOF
$LIST
EOF
        echo "[$MODE] 完成：成功 ${ok}，跳过 ${skip}"
        ;;
esac
