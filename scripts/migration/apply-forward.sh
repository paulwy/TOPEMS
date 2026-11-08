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
# 窗口白名单（fail-closed）：
#   --only  <csv>  本轮允许应用的白名单版本（严格集合；不在集合内一律不应用）
#   --defer <csv>  已评审但本窗口明确不应用的 pending 版本（必须显式声明）
#   任何 pending 既不在 --only 也不在 --defer → 在产生任何 DDL 之前硬失败（exit 1）。
#   未给 --only 时保持旧行为（全部 pending），供历史路径使用。
#
# prod 唯一入口：`--prod` 时对白名单内每条 pending 做双重校验：
#   1) 定向迁移命名（dbNN_test / dbNN_5433 / test_* / 5433_*，与 CI 检查同口径）→ 拒绝；
#   2) 无守卫高危语句（ALTER COLUMN TYPE / DROP COLUMN / DROP CONSTRAINT / DROP TABLE CASCADE，
#      调用 scripts/ci/check-destructive-sql.mjs 同口径判定）→ 拒绝。
#   命中任一条即硬失败并列出清单，提示必须走「基线 + 前向迁移」路径。
#   环境变量 WINDOW_TARGET=prod 时若未带 --prod，直接拒绝（exit 1）。
#
# SSH 模式（prod 主机不在本地暴露 DSN）：
#   --ssh-host <user@host>   --remote-db <db>   --remote-mig-dir <已投递校验的远端目录>
#   远端 psql 走主机本地 socket（PGHOST 默认 /tmp）；迁移文件必须已投递且 sha256 一致。
#   WINDOW_SSH_LOCAL_SIM=1 用于本地演练（ssh/scp 替换为本地执行/复制，不连 prod）。
#
# 用法：
#   bash scripts/migration/apply-forward.sh --db topems_prod --prod \
#     --anchor 20261105235700 --only 20261107000008,20261107000013 \
#     --defer 20261105235800,20261106000000,...
#   bash scripts/migration/apply-forward.sh --dsn "$DSN" --anchor 20261105235700
#   WINDOW_SSH_LOCAL_SIM=1 bash scripts/migration/apply-forward.sh \
#     --ssh-host sim --remote-db topems_window_drill \
#     --remote-mig-dir /tmp/window/migrations --anchor "$ANCHOR" \
#     --only 20261107000008,20261107000013 --defer "$DEFER"
#
# 退出码：0 成功（含 0 待应用）；1 存在失败/被守卫拒绝/白名单外 pending；2 参数错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/database/migrations"
DSN=""
DB=""
ANCHOR=""
PROD=0
ALLOW_PENDING=()
ONLY_RAW=""
DEFER_RAW=""
SSH_HOST="${WINDOW_SSH_HOST:-}"
REMOTE_DB="${WINDOW_REMOTE_DB:-}"
REMOTE_MIG_DIR="${WINDOW_REMOTE_MIG_DIR:-}"
REMOTE_PGHOST="${WINDOW_REMOTE_PGHOST:-/tmp}"
LOCAL_SIM="${WINDOW_SSH_LOCAL_SIM:-0}"
SSH_BIN="${WINDOW_SSH_BIN:-ssh}"
REMOTE_PSQL_BIN="${WINDOW_REMOTE_PSQL_BIN:-/opt/homebrew/bin/psql}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --prod) PROD=1; shift ;;
    --allow-pending) ALLOW_PENDING+=("$2"); shift 2 ;;
    --only) ONLY_RAW="$2"; shift 2 ;;
    --defer) DEFER_RAW="$2"; shift 2 ;;
    --ssh-host) SSH_HOST="$2"; shift 2 ;;
    --remote-db) REMOTE_DB="$2"; shift 2 ;;
    --remote-mig-dir) REMOTE_MIG_DIR="$2"; shift 2 ;;
    -h|--help) sed -n '2,46p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

if [[ "${WINDOW_TARGET:-}" == "prod" && $PROD -eq 0 ]]; then
  echo "拒绝：WINDOW_TARGET=prod 时 apply-forward 必须带 --prod" >&2
  exit 1
fi

sq() { printf '%q' "$1"; }
remote_run() {
  local cmd="$1"
  if [[ "$LOCAL_SIM" == "1" ]]; then bash -c "$cmd"; else "$SSH_BIN" "$SSH_HOST" "$cmd"; fi
}
remote_psql() {
  local cmd
  cmd="PGHOST=$(sq "$REMOTE_PGHOST") $(sq "$REMOTE_PSQL_BIN") -X -v ON_ERROR_STOP=1 -d $(sq "$REMOTE_DB")"
  local a
  for a in "$@"; do cmd+=" $(sq "$a")"; done
  remote_run "$cmd"
}

SSH_MODE=0
if [[ -n "$SSH_HOST" ]]; then
  SSH_MODE=1
  [[ -n "$REMOTE_DB" ]] || { echo "SSH 模式需要 --remote-db" >&2; exit 2; }
  [[ -n "$REMOTE_MIG_DIR" ]] || { echo "SSH 模式需要 --remote-mig-dir（已投递并校验的迁移目录）" >&2; exit 2; }
  psql_exec() { remote_psql "$@"; }
elif [[ -n "$DSN" ]]; then
  PSQL=(psql "$DSN")
  psql_exec() { "${PSQL[@]}" "$@"; }
elif [[ -n "$DB" ]]; then
  PSQL=(psql -h "${PGHOST:-/tmp}" -U "${PGUSER:-air}" -d "$DB")
  psql_exec() { "${PSQL[@]}" "$@"; }
else
  echo "需要 --dsn / --db，或 --ssh-host + --remote-db + --remote-mig-dir" >&2
  exit 2
fi

if [[ -z "$ANCHOR" ]]; then
  ANCHOR="$(psql_exec -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"
  [[ -n "$ANCHOR" && "$ANCHOR" != "NULL" ]] || { echo "无法读取锚点（账本为空？）" >&2; exit 2; }
fi

ONLY=()
if [[ -n "$ONLY_RAW" ]]; then
  IFS=',' read -r -a ONLY <<< "$ONLY_RAW"
fi
DEFER=()
if [[ -n "$DEFER_RAW" ]]; then
  IFS=',' read -r -a DEFER <<< "$DEFER_RAW"
fi
for v in ${ONLY[@]+"${ONLY[@]}"} ${DEFER[@]+"${DEFER[@]}"}; do
  [[ "$v" =~ ^[0-9]{14}$ ]] || { echo "白名单/defer 版本号非法: $v" >&2; exit 2; }
done

contains() {
  local needle="$1"; shift
  local x
  for x in "$@"; do [[ "$x" == "$needle" ]] && return 0; done
  return 1
}

is_allowed_pending() {
  local v="$1" x
  for x in ${ALLOW_PENDING[@]+"${ALLOW_PENDING[@]}"}; do
    [[ "$x" == "$v" ]] && return 0
  done
  return 1
}

# 白名单内每个版本必须存在对应迁移文件（防止版本号写错后“静默 0 条”）
for v in ${ONLY[@]+"${ONLY[@]}"}; do
  if ! ls "$MIG_DIR"/"$v"_*.sql >/dev/null 2>&1; then
    echo "拒绝：--only 中的版本 $v 在 $MIG_DIR 无对应迁移文件" >&2
    exit 2
  fi
done

# 定向迁移命名特征：dbNN_test / dbNN_5433 / *_5433_* / *_test_*
# 与 scripts/ci/check-directed-migrations.mjs 的 DENY_RE 保持同口径。
DENY_RE='(^|_)(db[0-9]+_(test|5433)|5433_|test_)'

PENDING=()
DENIED=()
OUT_OF_MANIFEST=()
DEFERRED=()
APPLIED_ONLY=()
while IFS= read -r f; do
  b="$(basename "$f")"
  [[ "$b" =~ ^[0-9]{14}_ ]] || continue
  v="${b%%_*}"
  (( 10#$v > 10#$ANCHOR )) || continue
  # </dev/null：SSH 模式下 psql 会继承并吞掉 while 的 stdin（进程替换），
  # 导致扫描在第 1 条后就结束、后续 pending 被静默跳过（fail-open）。
  if psql_exec -tA -c "SELECT 1 FROM _sqlx_migrations WHERE version=$v AND success" </dev/null | grep -q 1; then
    if contains "$v" ${ONLY[@]+"${ONLY[@]}"}; then APPLIED_ONLY+=("$v"); fi
    continue
  fi
  if [[ ${#ONLY[@]} -gt 0 ]] && ! contains "$v" ${ONLY[@]+"${ONLY[@]}"}; then
    if contains "$v" ${DEFER[@]+"${DEFER[@]}"}; then
      DEFERRED+=("$b")
      continue
    fi
    OUT_OF_MANIFEST+=("$b")
    continue
  fi
  if [[ $PROD -eq 1 ]] && { [[ ${#ONLY[@]} -gt 0 ]] || ! is_allowed_pending "$v"; }; then
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

# fail-closed：--only 的每个版本都必须被扫描到（已应用或进入待应用队列）。
# 防止扫描环节被中断/截断后，把“一条都没看到”误判成“无待应用迁移”。
if [[ ${#ONLY[@]} -gt 0 ]]; then
  PENDING_VERSIONS=()
  for f in ${PENDING[@]+"${PENDING[@]}"}; do PENDING_VERSIONS+=("$(basename "$f" | cut -d_ -f1)"); done
  for v in "${ONLY[@]}"; do
    if ! contains "$v" ${APPLIED_ONLY[@]+"${APPLIED_ONLY[@]}"} && ! contains "$v" ${PENDING_VERSIONS[@]+"${PENDING_VERSIONS[@]}"}; then
      echo "== 拒绝：白名单版本 $v 未被扫描到（既不在待应用队列，也不在账本）；疑似扫描截断，未产生任何 DDL" >&2
      exit 1
    fi
  done
fi

# 白名单外 pending：必须先于任何 DDL 硬失败
if [[ ${#OUT_OF_MANIFEST[@]} -gt 0 ]]; then
  echo "== 拒绝：检测到 ${#OUT_OF_MANIFEST[@]} 条清单外 pending 迁移（未产生任何 DDL）" >&2
  printf '  %s\n' "${OUT_OF_MANIFEST[@]}" >&2
  echo "  本轮 --only: ${ONLY_RAW:-<未设置>}" >&2
  echo "  已评审 defer: ${DEFER_RAW:-<未设置>}" >&2
  echo "清单外迁移必须先评审并显式加入 --only 或 --defer；不允许提示后继续。" >&2
  exit 1
fi

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
  [[ ${#DEFERRED[@]} -gt 0 ]] && echo "== 显式 defer ${#DEFERRED[@]} 条（保持 pending）：" && printf '  %s\n' "${DEFERRED[@]}"
  [[ ${#APPLIED_ONLY[@]} -gt 0 ]] && echo "== --only 中已应用: ${APPLIED_ONLY[*]}"
  exit 0
fi

echo "== 待应用 ${#PENDING[@]} 条（anchor=${ANCHOR}${ONLY_RAW:+，only=$ONLY_RAW}）"
[[ ${#DEFERRED[@]} -gt 0 ]] && { echo "== 显式 defer ${#DEFERRED[@]} 条（保持 pending）："; printf '  %s\n' "${DEFERRED[@]}"; }
for f in "${PENDING[@]}"; do
  b="$(basename "$f")"
  v="${b%%_*}"
  desc="${b%.sql}"; desc="${desc#*_}"; desc="${desc//_/ }"
  hex="$(shasum -a 384 "$f" | awk '{print $1}')"
  tmp="$(mktemp /tmp/topems_forward.XXXXXX.sql)"
  if [[ $SSH_MODE -eq 1 ]]; then
    remote_path="$REMOTE_MIG_DIR/$b"
    local_sha="$(shasum -a 256 "$f" | awk '{print $1}')"
    remote_sha="$(remote_run "shasum -a 256 $(sq "$remote_path")" | awk '{print $1}')"
    if [[ "$local_sha" != "$remote_sha" ]]; then
      echo "   FAILED：远端迁移文件 sha256 不一致 ${b}（local=$local_sha remote=${remote_sha:-<missing>}）" >&2
      rm -f "$tmp"
      # 2026-11-09 事故复盘：本脚本原先用 FAILED 数组累计、循环结束后才退出，
      # 导致 20261108135000 失败后仍继续执行 20261108140000 并 COMMIT，
      # 生产出现「账本半应用 + 旧唯一键已删」的中间态。迁移必须 fail-fast。
      exit 1
    fi
    {
      printf '\\i %s\n' "$remote_path"
      printf "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES (%s, '%s', NOW(), true, decode('%s','hex'), 0);\n" "$v" "$desc" "$hex"
    } > "$tmp"
    echo "-- $b"
    if ! psql_exec --single-transaction -v ON_ERROR_STOP=1 -f - < "$tmp" > /tmp/topems_forward_last.log 2>&1; then
      echo "   FAILED" >&2
      tail -5 /tmp/topems_forward_last.log >&2
      rm -f "$tmp"
      echo "== 中止：${b} 失败，后续迁移未执行" >&2
      exit 1
    fi
  else
    {
      printf '\\i %s\n' "$f"
      printf "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES (%s, '%s', NOW(), true, decode('%s','hex'), 0);\n" "$v" "$desc" "$hex"
    } > "$tmp"
    echo "-- $b"
    if ! psql_exec --single-transaction -v ON_ERROR_STOP=1 -f "$tmp" > /tmp/topems_forward_last.log 2>&1; then
      echo "   FAILED" >&2
      tail -5 /tmp/topems_forward_last.log >&2
      rm -f "$tmp"
      echo "== 中止：${b} 失败，后续迁移未执行" >&2
      exit 1
    fi
  fi
  rm -f "$tmp"
done

echo "== OK：应用 ${#PENDING[@]} 条，无失败"
exit 0
