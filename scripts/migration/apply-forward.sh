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
# prod 唯一入口：`--prod` 时对白名单内每条 pending 做两层校验（拆层，互不短路）：
#   1) 定向迁移命名（dbNN_test / dbNN_5433 / test_* / 5433_*，与 CI 检查同口径）→ 拒绝；
#      `--only` / `--allow-pending` 只能豁免这一层。
#   2) 破坏性语句（DELETE / UPDATE / TRUNCATE / DROP COLUMN / DROP TABLE / 高危 DDL，
#      调用 scripts/ci/check-destructive-sql.mjs --check-file --strict）→ 始终执行；
#      `--only` / `--allow-pending` 不得绕过；完整性守卫也只按「历史基线」处理，
#      进入 pending 的历史文件必须重新按新文件标准判定。
#
# 破坏性语句运行时开关（逐版本、绑定变更单）：
#   --allow-destructive=<version>  仅对该版本生效（不支持逗号/通配）；
#   必须设置 PROD_CHANGE_TICKET，且文件内每个标记的 destructive-ticket 都必须被
#   PROD_CHANGE_TICKET 显式列出（逗号列表）；未列出的票据仍被拒绝。
#   执行前在只读事务（ROLLBACK）内预演 DELETE/UPDATE 受影响行数、DROP 目标表行数，
#   超过 destructive-max-rows（DROP 必须为 0）→ 拒绝执行；
#   预演在同一事务内先执行该语句之前的 DDL（保证同文件“先加列、后回填”可见），整段仍 ROLLBACK；
#   计数用 `WITH __dg AS (<DML> RETURNING 1) SELECT count(*)`（子查询不允许直接放 UPDATE）；
#   TRUNCATE 不提供任何开关。
#
# 锚点下移拦截：
#   --anchor 不得低于账本 max(success)；prod 下必须与账本 max 完全一致，否则拒绝。
#   非 prod 需显式 ALLOW_ANCHOR_REWIND=1 且 PROD_CHANGE_TICKET 非空才放行（仅演练用）。
#   旧版本永不 in-place 重放：请在 database/migration_manifest.yaml 登记处置，
#   用 version > 账本 max 的前向补丁承接效果。
#
# 版本单调性只在入口校验（2026-11-14 方案 B）：
#   `public._sqlx_migrations` 上不装任何触发器；升序保证完全由本脚本提供：
#     - 正常模式：anchor 必须等于账本 max，扫描只收 version > anchor；
#     - 补投模式：--apply-deferred 单版本 + --ticket，允许 version <= 账本 max。
#   绕过本脚本（裸 sqlx / psql 手写账本）不会失败——这正是方案 B 的已知取舍。
#   所有校验都在任何 DDL 之前完成：校验不通过 = 零 DDL、零半应用态。
#   迁移文件不得自带 BEGIN/COMMIT（validate.sh 强制，36 个存量白名单待清理）：
#   文件内 COMMIT 会让 --single-transaction 提前结束，产生「DDL 已提交、账本未写」半应用。
#
# defer 补投（正式入口）：
#   --apply-deferred <version> --ticket <ticket>
#   只扫描并应用该单版本，不与 --only/--defer 组合；prod 同样可用；
#   仍执行定向迁移命名与破坏性语句校验（ticket 用于破坏性标记比对）。
#   适用：某版本在历史窗口被 --defer 保持 pending，之后需要单独补投。
#
# SSH 模式（prod 主机不在本地暴露 DSN）：
#   --ssh-host <user@host>   --remote-db <db>   --remote-mig-dir <已投递校验的远端目录>
#   远端 psql 走主机本地 socket（PGHOST 默认 /tmp）；迁移文件必须已投递且 sha256 一致。
#   WINDOW_SSH_LOCAL_SIM=1 用于本地演练（ssh/scp 替换为本地执行/复制，不连 prod）。
#
# search_path 上锁：
#   所有模式都把迁移进程的 search_path 固定为 public
#   （URL DSN 追加 options=-csearch_path%3Dpublic；socket/SSH 用 PGOPTIONS）。
#   只影响本脚本发起的 psql，不改 .env、不改迁移文件、不影响 checksum。
#
# 用法：
#   bash scripts/migration/apply-forward.sh --db topems_prod --prod \
#     --anchor 20261105235700 --only 20261107000008,20261107000013 \
#     --defer 20261105235800,20261106000000,...
#   bash scripts/migration/apply-forward.sh --dsn "$DSN" --anchor 20261105235700
#   bash scripts/migration/apply-forward.sh --db topems --apply-deferred 20261114100000 \
#     --ticket CHG-2026-1114
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
ALLOW_DESTRUCTIVE=""
ONLY_RAW=""
DEFER_RAW=""
DEFER_APPLY_VERSION=""
TICKET="${PROD_CHANGE_TICKET:-}"
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
    --allow-destructive=*) ALLOW_DESTRUCTIVE="${1#*=}"; shift ;;
    --only) ONLY_RAW="$2"; shift 2 ;;
    --defer) DEFER_RAW="$2"; shift 2 ;;
    --apply-deferred) DEFER_APPLY_VERSION="$2"; shift 2 ;;
    --ticket) TICKET="$2"; shift 2 ;;
    --ssh-host) SSH_HOST="$2"; shift 2 ;;
    --remote-db) REMOTE_DB="$2"; shift 2 ;;
    --remote-mig-dir) REMOTE_MIG_DIR="$2"; shift 2 ;;
    -h|--help) sed -n '2,75p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

if [[ "${WINDOW_TARGET:-}" == "prod" && $PROD -eq 0 ]]; then
  echo "拒绝：WINDOW_TARGET=prod 时 apply-forward 必须带 --prod" >&2
  exit 1
fi

# --- --apply-deferred 参数校验（方案 B：defer 补投的唯一正式入口，全部在 DDL 之前） ---
if [[ -n "$DEFER_APPLY_VERSION" ]]; then
  if [[ ! "$DEFER_APPLY_VERSION" =~ ^[0-9]{14}$ ]]; then
    echo "拒绝：--apply-deferred 只接受单个 14 位版本号（收到：${DEFER_APPLY_VERSION}）" >&2
    exit 2
  fi
  if [[ -n "$ONLY_RAW" || -n "$DEFER_RAW" ]]; then
    echo "拒绝：--apply-deferred 不能与 --only/--defer 组合（补投只应用该单版本）" >&2
    exit 2
  fi
  if [[ -n "$ANCHOR" ]]; then
    echo "拒绝：--apply-deferred 不与 --anchor 组合（锚点由账本水位推导）" >&2
    exit 2
  fi
  if [[ -z "$TICKET" ]]; then
    echo "拒绝：--apply-deferred 必须同时提供 --ticket（写入执行日志，并用于破坏性标记比对）" >&2
    exit 2
  fi
  PROD_CHANGE_TICKET="$TICKET"
  if ! compgen -G "$MIG_DIR/${DEFER_APPLY_VERSION}_*.sql" > /dev/null; then
    echo "拒绝：--apply-deferred 的版本 ${DEFER_APPLY_VERSION} 没有对应迁移文件（$MIG_DIR）" >&2
    exit 2
  fi
fi

sq() { printf '%q' "$1"; }

# ---------------------------------------------------------------------------
# 迁移入口 search_path 上锁（只影响本脚本发起的 psql 进程）
#
# 迁移里的未限定表名默认按 "$user",public 解析；连接角色名恰好等于业务 schema
# （iam/mes/...）时会落错库（生产 iam.core_dashboard_refresh_log 即由此产生）。
# 这里强制 search_path=public：不改 .env、不改迁移文件、不影响 checksum。
#   - URL 形式 DSN：追加 options=-csearch_path%3Dpublic；
#   - conninfo / socket / SSH 模式：用 PGOPTIONS 传给远端 psql。
# 调用方已显式给出 options 时不覆盖。
# ---------------------------------------------------------------------------
lock_dsn() {
  local dsn="$1"
  [[ -z "$dsn" ]] && { printf '%s' "$dsn"; return; }
  case "$dsn" in
    *"options="*|*"options%3D"*) printf '%s' "$dsn"; return ;;
  esac
  case "$dsn" in
    postgres://*|postgresql://*)
      case "$dsn" in
        *\?*) printf '%s&options=-csearch_path%%3Dpublic' "$dsn" ;;
        *)    printf '%s?options=-csearch_path%%3Dpublic' "$dsn" ;;
      esac
      ;;
    *) printf '%s' "$dsn" ;;
  esac
}
REMOTE_PGOPTIONS="${WINDOW_REMOTE_PGOPTIONS:--csearch_path=public}"
export PGOPTIONS="${PGOPTIONS:+$PGOPTIONS }-csearch_path=public"

remote_run() {
  local cmd="$1"
  if [[ "$LOCAL_SIM" == "1" ]]; then bash -c "$cmd"; else "$SSH_BIN" "$SSH_HOST" "$cmd"; fi
}
remote_psql() {
  local cmd
  cmd="PGHOST=$(sq "$REMOTE_PGHOST") PGOPTIONS=$(sq "$REMOTE_PGOPTIONS") $(sq "$REMOTE_PSQL_BIN") -X -v ON_ERROR_STOP=1 -d $(sq "$REMOTE_DB")"
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
  psql_stdin() { remote_psql -q -tA -f -; }
elif [[ -n "$DSN" ]]; then
  PSQL=(psql "$(lock_dsn "$DSN")")
  psql_exec() { "${PSQL[@]}" "$@"; }
  psql_stdin() { "${PSQL[@]}" -q -tA -v ON_ERROR_STOP=1 -f -; }
elif [[ -n "$DB" ]]; then
  PSQL=(psql -h "${PGHOST:-/tmp}" -U "${PGUSER:-air}" -d "$DB")
  psql_exec() { "${PSQL[@]}" "$@"; }
  psql_stdin() { "${PSQL[@]}" -q -tA -v ON_ERROR_STOP=1 -f -; }
else
  echo "需要 --dsn / --db，或 --ssh-host + --remote-db + --remote-mig-dir" >&2
  exit 2
fi

if [[ -z "$ANCHOR" ]]; then
  ANCHOR="$(psql_exec -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"
  [[ -n "$ANCHOR" && "$ANCHOR" != "NULL" ]] || { echo "无法读取锚点（账本为空？）" >&2; exit 2; }
fi

# --- 锚点下移/前跳拦截 -------------------------------------------------------
# 账本 max(success) 是唯一水位线；显式 --anchor 不得偏离，避免把锚点以下的
# 历史 defer 重新变成 pending（这正是 43 个孤儿产生的机制）。
LEDGER_MAX="$(psql_exec -tA -c "SELECT COALESCE(max(version),0) FROM _sqlx_migrations WHERE success" 2>/dev/null || echo 0)"
if [[ -n "$DEFER_APPLY_VERSION" ]]; then
  echo "== DEFER 补投模式：version=${DEFER_APPLY_VERSION}，ticket=${TICKET}，账本水位=${LEDGER_MAX}（允许 version <= 水位，仅此单版本）" >&2
  if psql_exec -tA -c "SELECT 1 FROM _sqlx_migrations WHERE version=${DEFER_APPLY_VERSION} AND success" | grep -q '1'; then
    echo "== 拒绝：版本 ${DEFER_APPLY_VERSION} 已在账本，补投无意义（未产生任何 DDL）" >&2
    exit 1
  fi
elif [[ "$LEDGER_MAX" =~ ^[0-9]+$ ]] && (( 10#$LEDGER_MAX > 0 )) && (( 10#$ANCHOR != 10#$LEDGER_MAX )); then
  echo "== 拒绝：锚点偏离账本水位（--anchor=${ANCHOR}，账本 max=${LEDGER_MAX}）" >&2
  echo "   锚点下移会把历史 defer 重新纳入扫描；锚点上跳会静默跳过 pending。" >&2
  echo "   旧版本不得 in-place 重放：请在 database/migration_manifest.yaml 登记处置，用 > 账本 max 的前向补丁承接。" >&2
  if [[ $PROD -eq 1 ]]; then
    echo "   prod 模式不允许任何锚点偏离（含 --allow-anchor-rewind）。" >&2
    exit 1
  fi
  if [[ "${ALLOW_ANCHOR_REWIND:-0}" != "1" || -z "${PROD_CHANGE_TICKET:-}" ]]; then
    echo "   仅演练场景可显式 ALLOW_ANCHOR_REWIND=1 且设置 PROD_CHANGE_TICKET。" >&2
    exit 1
  fi
  echo "   警告：已按 ALLOW_ANCHOR_REWIND=1 放行（ticket=${PROD_CHANGE_TICKET}），本区间必须由 --only/--defer 严格约束。" >&2
fi

# --- --allow-destructive 参数校验：单版本、精确、不支持列表/通配 -------------
if [[ -n "$ALLOW_DESTRUCTIVE" ]]; then
  if [[ ! "$ALLOW_DESTRUCTIVE" =~ ^[0-9]{14}$ ]]; then
    echo "拒绝：--allow-destructive 只接受单个 14 位版本号（不支持逗号/通配）: $ALLOW_DESTRUCTIVE" >&2
    exit 2
  fi
  if [[ -z "${PROD_CHANGE_TICKET:-}" ]]; then
    echo "拒绝：--allow-destructive=<version> 必须同时设置 PROD_CHANGE_TICKET（用于比对标记 ticket）" >&2
    exit 2
  fi
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
PENDING_DG=()
DENIED=()
OUT_OF_MANIFEST=()
DEFERRED=()
APPLIED_ONLY=()
while IFS= read -r f; do
  b="$(basename "$f")"
  [[ "$b" =~ ^[0-9]{14}_ ]] || continue
  v="${b%%_*}"
  if [[ -n "$DEFER_APPLY_VERSION" ]]; then
    # 补投模式：只收该单版本，允许其 <= 账本水位；不参与 --only/--defer 扫描
    [[ "$v" == "$DEFER_APPLY_VERSION" ]] || continue
  else
    (( 10#$v > 10#$ANCHOR )) || continue
  fi
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
  if [[ $PROD -eq 1 ]]; then
    # 防线 1：定向迁移命名；--only / --allow-pending 只豁免这一层
    if [[ "$b" =~ $DENY_RE ]] && ! { [[ ${#ONLY[@]} -gt 0 ]] || is_allowed_pending "$v"; }; then
      DENIED+=("$b [定向迁移命名]")
      continue
    fi
    # 防线 2：破坏性语句；始终执行，--only / --allow-pending 不得绕过
    if command -v node >/dev/null 2>&1; then
      guard_log="/tmp/topems_guard_${v}.log"
      if ! node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" --strict >"$guard_log" 2>&1; then
        # 仅当该版本被逐版本批准、且 ticket 与标记一致时，才进入预演
        if [[ -n "$ALLOW_DESTRUCTIVE" && "$v" == "$ALLOW_DESTRUCTIVE" ]]; then
          dg_plan="/tmp/topems_dg_plan_${v}.json"
          if node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" --strict \
              --approve-ticket="${PROD_CHANGE_TICKET:-}" --plan-file="$dg_plan" >>"$guard_log" 2>&1; then
            PENDING_DG+=("$v")
          else
            echo "-- $b 破坏性语句未获批准：" >&2
            grep -E 'DENY|destructive-ticket' "$guard_log" >&2 || true
            DENIED+=("$b [破坏性语句未获 --allow-destructive 批准]")
            continue
          fi
        else
          cnt="$(grep -c '^  L[0-9]' "$guard_log" 2>/dev/null || true)"
          DENIED+=("$b [破坏性语句 ${cnt:-0} 条；需 --allow-destructive=$v]")
          continue
        fi
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
  if [[ -n "$DEFER_APPLY_VERSION" ]]; then
    echo "== 无待应用迁移（DEFER 补投 version=${DEFER_APPLY_VERSION} 已无对应 pending）"
  else
    echo "== 无待应用迁移（anchor=${ANCHOR}）"
  fi
  [[ ${#DEFERRED[@]} -gt 0 ]] && echo "== 显式 defer ${#DEFERRED[@]} 条（保持 pending）：" && printf '  %s\n' "${DEFERRED[@]}"
  [[ ${#APPLIED_ONLY[@]} -gt 0 ]] && echo "== --only 中已应用: ${APPLIED_ONLY[*]}"
  exit 0
fi

# --- 破坏性语句执行前预演（只读事务 + ROLLBACK，不产生任何写入） -------------
# 逐版本、逐语句：DELETE/UPDATE 统计受影响行数，DROP TABLE 统计目标表现存行数；
# 任一超过标记 destructive-max-rows（DROP 必须为 0）即拒绝，且发生在任何 DDL 之前。
for v in ${PENDING_DG[@]+"${PENDING_DG[@]}"}; do
  dg_plan="/tmp/topems_dg_plan_${v}.json"
  if [[ ! -f "$dg_plan" ]]; then
    echo "== 拒绝：版本 $v 缺少破坏性预演计划 $dg_plan" >&2
    exit 1
  fi
  preflight_sql="/tmp/topems_dg_preflight_${v}.sql"
  mig_file="$(ls "$MIG_DIR"/"${v}"_*.sql 2>/dev/null | head -1)"
  if [[ -z "$mig_file" ]]; then
    echo "== 拒绝：版本 $v 找不到迁移文件，无法构造预演" >&2
    exit 1
  fi
  # 预演要点（2026-11-09）：
  #   1) DML 必须用 `WITH __dg AS (<DML> RETURNING 1) SELECT count(*)`；
  #      原先写成 `SELECT ... FROM (<UPDATE ...>)`，PostgreSQL 不允子查询里出现 UPDATE，
  #      任何带标记的 DML 都会在预演阶段语法报错（已实测）。
  #   2) 预演需在同一只读事务内先执行「该语句之前的 DDL」，
  #      否则「先 ADD COLUMN、后 UPDATE」的迁移会因列不存在而误判失败。
  #      每段用独立 BEGIN/ROLLBACK 包裹，整段仍是只读（不落任何写入）。
  node_gen_js="/tmp/topems_dg_gen_${v}.mjs"
  cat > "$node_gen_js" <<'DG_GEN_JS'
    import fs from "node:fs";
    const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const src = fs.readFileSync(process.argv[3], "utf8").split("\n");
    const q = (s) => String(s).replace(/'/g, "''");
    for (const s of plan.statements) {
      const prefix = src.slice(0, Math.max(0, s.line - 1)).join("\n");
      console.log("BEGIN;");
      if (prefix.trim()) console.log(prefix);
      if (s.kind === "DELETE" || s.kind === "UPDATE") {
        const sql = s.sql.replace(/;\s*$/, "");
        console.log(`WITH __dg AS (${sql} RETURNING 1) SELECT ${s.line} AS line, '${s.kind}' AS kind, ${Number(s.maxRows)} AS max_rows, count(*)::bigint AS n FROM __dg;`);
      } else if (s.kind === "DROP TABLE") {
        const t = q(s.table);
        console.log(`SELECT ${s.line} AS line, 'DROP TABLE' AS kind, 0 AS max_rows, CASE WHEN to_regclass('${t}') IS NULL THEN 0 ELSE (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM ${t}', false, true, '')))[1]::text::bigint END AS n;`);
      } else {
        console.log(`SELECT ${s.line} AS line, '${s.kind}' AS kind, ${Number(s.maxRows)} AS max_rows, 0::bigint AS n;`);
      }
      console.log("ROLLBACK;");
    }
DG_GEN_JS
  node "$node_gen_js" "$dg_plan" "$mig_file" > "$preflight_sql"
  rm -f "$node_gen_js"
  dg_rows="$(psql_stdin < "$preflight_sql")" || {
    echo "== 拒绝：版本 $v 破坏性预演失败（未产生任何写入）" >&2
    exit 1
  }
  while IFS='|' read -r dg_line dg_kind dg_max dg_n; do
    [[ -n "${dg_line:-}" ]] || continue
    if (( 10#${dg_n:-0} > 10#${dg_max:-0} )); then
      echo "== 拒绝：版本 $v 第 ${dg_line} 行 ${dg_kind} 预演影响 ${dg_n} 行 > 允许 ${dg_max} 行（未产生任何写入）" >&2
      exit 1
    fi
    echo "   预演 OK：版本 $v 第 ${dg_line} 行 ${dg_kind} → ${dg_n} 行（上限 ${dg_max}）"
  done <<< "$dg_rows"
done

if [[ -n "$DEFER_APPLY_VERSION" ]]; then
  echo "== 待应用 ${#PENDING[@]} 条（DEFER 补投 version=${DEFER_APPLY_VERSION}，ticket=${TICKET}，账本水位=${LEDGER_MAX}）"
else
  echo "== 待应用 ${#PENDING[@]} 条（anchor=${ANCHOR}${ONLY_RAW:+，only=$ONLY_RAW}）"
fi
[[ ${#DEFERRED[@]} -gt 0 ]] && { echo "== 显式 defer ${#DEFERRED[@]} 条（保持 pending）："; printf '  %s\n' "${DEFERRED[@]}"; }
for f in "${PENDING[@]}"; do
  b="$(basename "$f")"
  v="${b%%_*}"
  desc="${b%.sql}"; desc="${desc#*_}"; desc="${desc//_/ }"
  hex="$(shasum -a 384 "$f" | awk '{print $1}')"
  tmp="$(mktemp /tmp/topems_forward_XXXXXX)"
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
