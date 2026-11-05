#!/usr/bin/env bash
# =============================================================================
# 前向迁移执行器（只应用 version > anchor 的迁移）
#
# 为什么不用 `sqlx migrate run`：仓库中有一批 <= 锚点但未登记进 prod 账本的
# 定向迁移（test/5433），sqlx 会把它们当 pending 重新执行。本脚本按版本号
# 严格「大于锚点」筛选，从机制上避免历史回放，并支持 --prod 拒绝定向迁移。
#
# 每个文件在单事务内执行 SQL + 写入 _sqlx_migrations（checksum=SHA-384 文件字节），
# 幂等：账本已存在的版本不会被重复执行。
#
# prod 唯一入口：`--prod` 时对全部 pending（version > anchor 且账本缺失）做双重校验：
#   1) 定向迁移命名（dbNN_test / dbNN_5433 / test_* / 5433_*，与 CI 检查同口径）→ 拒绝；
#   2) 无守卫高危语句（ALTER COLUMN TYPE / DROP COLUMN / DROP CONSTRAINT / DROP TABLE CASCADE，
#      调用 scripts/ci/check-destructive-sql.mjs 同口径判定）→ 拒绝。
# 命中任一条即硬失败并列出清单，提示必须走「基线 + 前向迁移」路径。
#
# 用法：
#   bash scripts/migration/apply-forward.sh --db topems_prod --prod \
#     --anchor 20261105235700
#   bash scripts/migration/apply-forward.sh --dsn "$DSN" --anchor 20261105235700
#   bash scripts/migration/apply-forward.sh --prod ... --allow-pending 20261106120000
#     （--allow-pending 可重复；仅用于人工复核后的临时放行，须记录理由）
#
# 退出码：0 成功（含 0 待应用）；1 存在失败/被守卫拒绝；2 参数错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/database/migrations"
DSN=""
DB=""
ANCHOR=""
PROD=0
ALLOW_PENDING=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --prod) PROD=1; shift ;;
    --allow-pending) ALLOW_PENDING+=("$2"); shift 2 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

is_allowed_pending() {
  local v="$1" x
  for x in ${ALLOW_PENDING[@]+"${ALLOW_PENDING[@]}"}; do
    [[ "$x" == "$v" ]] && return 0
  done
  return 1
}

if [[ -n "$DSN" ]]; then
  PSQL=(psql "$DSN")
elif [[ -n "$DB" ]]; then
  PSQL=(psql -h "${PGHOST:-/tmp}" -U "${PGUSER:-air}" -d "$DB")
else
  echo "需要 --dsn 或 --db" >&2; exit 2
fi

if [[ -z "$ANCHOR" ]]; then
  ANCHOR="$("${PSQL[@]}" -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"
  [[ -n "$ANCHOR" && "$ANCHOR" != "NULL" ]] || { echo "无法读取锚点（账本为空？）" >&2; exit 2; }
fi

# 定向迁移命名特征：dbNN_test / dbNN_5433 / *_5433_* / *_test_*
# 与 scripts/ci/check-directed-migrations.mjs 的 DENY_RE 保持同口径。
DENY_RE='(^|_)(db[0-9]+_(test|5433)|5433_|test_)'

PENDING=()
DENIED=()
while IFS= read -r f; do
  b="$(basename "$f")"
  [[ "$b" =~ ^[0-9]{14}_ ]] || continue
  v="${b%%_*}"
  (( 10#$v > 10#$ANCHOR )) || continue
  if "${PSQL[@]}" -tA -c "SELECT 1 FROM _sqlx_migrations WHERE version=$v AND success" | grep -q 1; then
    continue
  fi
  if [[ $PROD -eq 1 ]] && ! is_allowed_pending "$v"; then
    # 防线 1：定向迁移命名（prod 不允许）
    if [[ "$b" =~ $DENY_RE ]]; then
      DENIED+=("$b [定向迁移命名]")
      continue
    fi
    # 防线 2：无守卫高危语句（与 CI 检查同口径）
    if command -v node >/dev/null 2>&1; then
      guard_log="/tmp/topems_guard_${v}.log"
      if ! node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" >"$guard_log" 2>&1; then
        cnt="$(grep -c '^  L[0-9]' "$guard_log" 2>/dev/null || true)"
        DENIED+=("$b [无守卫高危语句 ${cnt:-0} 条]")
        continue
      fi
    else
      DENIED+=("$b [无法校验：node 缺失，拒绝在 prod 应用]")
      continue
    fi
  fi
  PENDING+=("$f")
done < <(ls "$MIG_DIR"/*.sql | LC_ALL=C sort)

if [[ ${#DENIED[@]} -gt 0 ]]; then
  echo "== 拒绝：prod 检测到 ${#DENIED[@]} 条禁止直接应用的 pending 迁移" >&2
  printf '  %s\n' "${DENIED[@]}" >&2
  cat >&2 <<'EOF'

prod 迁移唯一入口 =「基线 + 前向迁移」，不得直接重放历史/定向迁移：
  1) 先确认 prod 基线已恢复（database/baseline/prod_schema_<anchor>.sql.gz）
  2) 仅应用 version > anchor 且带存在性守卫（to_regclass / IF EXISTS / DO$$ EXISTS）的前向迁移
  3) 禁止在 prod 应用 dbNN_test / dbNN_5433 / test_* / 5433_* 定向迁移
  4) 确需人工复核后临时放行：--allow-pending <version>（须在变更记录注明理由）
EOF
  exit 1
fi

if [[ ${#PENDING[@]} -eq 0 ]]; then
  echo "== 无待应用迁移（anchor=${ANCHOR}）"
  exit 0
fi

echo "== 待应用 ${#PENDING[@]} 条（anchor=${ANCHOR}）"
FAILED=()
for f in "${PENDING[@]}"; do
  b="$(basename "$f")"
  v="${b%%_*}"
  desc="${b%.sql}"; desc="${desc#*_}"; desc="${desc//_/ }"
  hex="$(shasum -a 384 "$f" | awk '{print $1}')"
  tmp="$(mktemp /tmp/topems_forward.XXXXXX.sql)"
  {
    printf '\\i %s\n' "$f"
    printf "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES (%s, '%s', NOW(), true, decode('%s','hex'), 0);\n" "$v" "$desc" "$hex"
  } > "$tmp"
  echo "-- $b"
  if ! "${PSQL[@]}" --single-transaction -v ON_ERROR_STOP=1 -f "$tmp" > /tmp/topems_forward_last.log 2>&1; then
    echo "   FAILED" >&2
    tail -5 /tmp/topems_forward_last.log >&2
    FAILED+=("$b")
  fi
  rm -f "$tmp"
done

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "== 失败 ${#FAILED[@]} 条" >&2
  printf '  %s\n' "${FAILED[@]}" >&2
  exit 1
fi

echo "== OK：应用 ${#PENDING[@]} 条，失败 0"
exit 0
