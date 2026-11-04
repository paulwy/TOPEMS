#!/usr/bin/env bash
# P5c: 迁移账本核对（只读）。仅执行 SELECT / information_schema，不写库、不生成 INSERT。
#
# 用途：核对本地 database/migrations 与目标库 _sqlx_migrations 的版本差集，并按文件名的
# 环境定向（5433 / test / prod）给出处置建议，避免把「环境定向迁移」误登记到 prod 账本。
#
# 用法：
#   DATABASE_URL='postgres://topems_prod:***@localhost:5432/topems_prod' \
#     bash scripts/db/verify_prod_ledger.sh
#
# 只读保证：本脚本不含 INSERT/UPDATE/DELETE/DDL；psql 仅执行 -tAc 的 SELECT。
#
# 为什么不提供手工 INSERT：
#   1) sqlx 的 checksum 是 SHA-384(迁移文件字节)，只有在 sqlx 真正执行该文件并成功时，
#      其写入账本的值才可被后续 `sqlx migrate run` 校验通过；手工写入无法与执行语义绑定。
#   2) 本次 17 个未登记版本经文件名与内容复核，绝大多数是「5433/test 定向」迁移
#      （db06~db18 等），它们在 prod 上要么被 to_regclass/列存在性守卫跳过，
#      要么（如 db08）是无守卫的直改，一旦在 prod 执行会改变生产列类型。
#   3) 因此正确做法不是补账本，而是先把环境定向迁移从 prod 可执行集合中隔离；
#      在此之前禁止在 prod 执行 `sqlx migrate run`，也不得手工 INSERT 账本。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG_DIR="$REPO_ROOT/database/migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERR] 需显式提供 DATABASE_URL（只读账号即可），不接受隐式 .env 连接" >&2
  exit 2
fi

echo "== 目标库 =="
psql "$DATABASE_URL" -tAc "select current_database()||' | '||current_user||' | '||current_setting('server_version');"

echo
echo "== 账本 vs 本地文件 =="
LOCAL_TMP="$(mktemp)"
trap 'rm -f "$LOCAL_TMP"' EXIT

ls "$MIG_DIR"/*.sql 2>/dev/null \
  | sed -E 's#.*/##' \
  | grep -E '^(\d{14}|[0-9]{3})[_-]' \
  | sed -E 's#^([0-9]+)_.*#\1#' \
  | sort -u > "$LOCAL_TMP"

DB_TMP="$(mktemp)"
trap 'rm -f "$LOCAL_TMP" "$DB_TMP"' EXIT
psql "$DATABASE_URL" -tAc "select version from public._sqlx_migrations order by version;" | sort -u > "$DB_TMP"

MISSING="$(comm -23 "$LOCAL_TMP" "$DB_TMP" | grep -v -E '^00[0-9]$|^01[0-3]$' || true)"
EXTRA="$(comm -13 "$LOCAL_TMP" "$DB_TMP" || true)"

echo "本地版本数: $(wc -l < "$LOCAL_TMP" | tr -d ' ')  账本版本数: $(wc -l < "$DB_TMP" | tr -d ' ')"
echo "本地有 / 账本无 (排除 000-013 归一化历史): $(printf '%s\n' "$MISSING" | sed '/^$/d' | wc -l | tr -d ' ')"
echo "账本有 / 本地无: $(printf '%s\n' "$EXTRA" | sed '/^$/d' | wc -l | tr -d ' ')"

echo
echo "== 未登记版本的环境定向判定（不回写账本）=="
while read -r v; do
  [[ -z "$v" ]] && continue
  f="$(ls "$MIG_DIR"/${v}_*.sql 2>/dev/null | head -1)"
  name="$(basename "$f" 2>/dev/null || echo '<missing>')"
  case "$name" in
    *5433*) scope='5433 定向 → prod 禁止执行'; suggestion='不登记；由 5433 账本自证' ;;
    *test*|*_prod_*) scope='test/prod 定向 → 需逐条判定'; suggestion='prod 侧需逐条核对守卫与目标表' ;;
    *) scope='库无关/待判'; suggestion='需人工核对' ;;
  esac
  sha="$(shasum -a 384 "$f" 2>/dev/null | awk '{print $1}')"
  printf '%s | %s | %s | %s | sha384=%s\n' "$v" "$name" "$scope" "$suggestion" "${sha:0:16}...(仅供参考,不写库)"
done <<< "$MISSING"

echo
echo "== 建议 =="
echo "1) 不要在 prod 执行无差别的 sqlx migrate run；先隔离 5433/test 定向迁移。"
echo "2) 对确需在 prod 生效的迁移（如 20261103173000 db04-prod），只登记由 sqlx 自身执行成功的结果。"
echo "3) 本脚本不产出任何 INSERT；手工 checksum 一律视为不可确证，结论标记为「待确认」。"
