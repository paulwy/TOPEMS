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
#   预演按版本推进（2026-11-20）：版本 N 的预演只在其前面所有 pending 版本都已应用之后
#   执行，因此预演看到的是「N 之前的迁移全部生效」的真实基线（例如 20261118160000
#   改名后的 flow._deprecated_* 表），而不是 anchor 的旧状态。
#   每个版本在事务（必然 ROLLBACK）内预演 DELETE/UPDATE 受影响行数、DROP 目标表行数，
#   超过 destructive-max-rows（DROP 必须为 0）→ 拒绝执行；
#   临时对象（pg_temp.* 或本文件 CREATE TEMP TABLE 建出的表）不参与行数统计，
#   其余静态判定/标记/票据校验一律不变；
#   预演在同一事务内先执行该语句之前的 DDL（保证同文件“先加列、后回填”可见），整段仍 ROLLBACK；
#   计数用 `WITH __dg AS (<DML> RETURNING 1) SELECT count(*)`（子查询不允许直接放 UPDATE）；
#   TRUNCATE 不提供任何开关。
#
# 中途失败语义（2026-11-20）：
#   预演与逐版本应用交错执行。任一版本预演被拒（行数超限 / 不可回滚语句 / 前置断言失败）
#   即停在该版本：该版本不应用，已应用的前序版本保持已落账（不欺骗、不回滚）。
#   脚本输出「已应用清单 + 未应用清单 + 逆序回滚入口」，退出码 1。
#   不采用「先整体预演一遍再应用」：预演依赖前序版本已落地的真实基线，整体预演只能看到
#   anchor 状态，会把 20261119200000 依赖 flow._deprecated_* 的失败原样复现。
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
# 演练专用闸门 GUC（不用于 prod / SSH）：
#   --drill-gate-guc-auto
#   迁移文件里显式要求 `current_setting('app.xxx', true)` 比较某个值时，按文件语义
#   注入 `SET app.xxx = '<value>';` 后再 `\i` 该文件。仅用于隔离库演练，prod 拒绝。
#   同时注入系统通道 `SET app.rls_system = 'on';`：prod 迁移由特权会话执行（绕过 RLS），
#   演练按要求走非特权连接，必须用既有系统通道等价还原「迁移能看见平台行」的语义；
#   否则 FORCE RLS 会把 public.core_roles 等平台模板行过滤掉，导致种子/授权类迁移
#   在演练里假失败（实测 20261118125000 断言 admin 绑定 0 条）。
#
# 破坏性预演在 prod 与 drill 两种模式都执行：
#   prod 侧走 --allow-destructive + ticket 批准后生成计划；drill 侧（隔离库）对文件
#   自带 destructive-ticket 的语句自动批准并生成同一份计划，随后同样执行行数预演。
#   为什么 drill 也要跑：若只在 prod 跑，行数闸门（尤其是 FORCE RLS 下的可见行）
#   在开窗前从未被演练过，演练通过不能证明窗口会通过。无标记的破坏性语句无法生成
#   计划（没有 destructive-max-rows），prod 直接拒绝，drill 只提示并继续。
#   预演不是只读事务：它必须真实执行 DML 再由 ROLLBACK 撤销，因此不能强制
#   default_transaction_read_only=on。改为在生成预演 SQL 时拒绝无法回滚/会脱离
#   事务的语句（COMMIT/ROLLBACK、nextval、CREATE INDEX CONCURRENTLY、VACUUM、
#   ALTER SYSTEM、CREATE/DROP DATABASE 等），由 node 生成器 fail-closed 中止。
#   临时表的 ON COMMIT {DROP|PRESERVE ROWS|DELETE ROWS} 子句不结束事务，检测前先剔除。
#
# 用法：
#   bash scripts/migration/apply-forward.sh --db topems_prod --prod \
#     --anchor 20261105235700 --only 20261107000008,20261107000013 \
#     --defer 20261105235800,20261106000000,...
#   bash scripts/migration/apply-forward.sh --dsn "$DSN" --anchor 20261105235700
#   bash scripts/migration/apply-forward.sh --dsn "$DSN" --drill-gate-guc-auto
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
GATE_GUC_AUTO=0

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
    --drill-gate-guc-auto) GATE_GUC_AUTO=1; shift ;;
    -h|--help) sed -n '2,82p' "$0"; exit 0 ;;
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
    echo "拒绝：--apply-deferred 的版本 ${DEFER_APPLY_VERSION} 没有对应迁移文件（${MIG_DIR}）" >&2
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
  # D-9：--db 模式不再回落到 /tmp socket 与内置用户，必须显式给出连接参数。
  : "${PGHOST:?--db 模式必须显式设置 PGHOST（不再回落到 /tmp）；或改用 --dsn}"
  : "${PGUSER:?--db 模式必须显式设置 PGUSER（不再回落到内置用户）；或改用 --dsn}"
  PSQL=(psql -h "$PGHOST" -U "$PGUSER" -d "$DB")
  psql_exec() { "${PSQL[@]}" "$@"; }
  psql_stdin() { "${PSQL[@]}" -q -tA -v ON_ERROR_STOP=1 -f -; }
else
  echo "需要 --dsn / --db，或 --ssh-host + --remote-db + --remote-mig-dir" >&2
  exit 2
fi

if [[ $GATE_GUC_AUTO -eq 1 ]]; then
  if [[ $PROD -eq 1 ]]; then
    echo "拒绝：--drill-gate-guc-auto 仅用于隔离库演练，prod 模式禁止自动注入闸门 GUC" >&2
    exit 2
  fi
  if [[ $SSH_MODE -eq 1 ]]; then
    echo "拒绝：--drill-gate-guc-auto 不支持 SSH 模式（无法在远端按文件注入 SET）" >&2
    exit 2
  fi
fi

gate_guc_prelude() {
  local f="$1"
  python3 - "$f" <<'PY'
import re, sys
sql = open(sys.argv[1], encoding="utf-8").read()
# 只识别显式闸门：coalesce(current_setting('app.x', true), '') <> 'value'
pairs = re.findall(
    r"current_setting\(\s*'([A-Za-z_][A-Za-z0-9_.]*)'\s*,\s*true\s*\)"
    r"\s*,\s*''\s*\)\s*<>\s*'([^']*)'",
    sql,
)
seen = set()
for guc, value in pairs:
    if (guc, value) in seen:
        continue
    seen.add((guc, value))
    print("SET %s = '%s';" % (guc, value.replace("'", "''")))
PY
}

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
DENIED_DETAIL=()
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
            # 细节延后到 DENIED 摘要之后输出，避免日志先出现细节、后出现结论。
            DENIED_DETAIL+=("-- $b 破坏性语句未获批准：")
            while IFS= read -r gline; do DENIED_DETAIL+=("  $gline"); done \
              < <(grep -E 'DENY|destructive-ticket' "$guard_log" 2>/dev/null || true)
            tickets="$(sed -n 's/^--[[:space:]]*destructive-ticket:[[:space:]]*//p' "$f" | paste -sd, -)"
            DENIED+=("$b [破坏性语句未获 --allow-destructive 批准；ticket=${tickets:-<未声明>}]")
            continue
          fi
        else
          cnt="$(sed -n 's/.*含 \([0-9][0-9]*\) 条.*/\1/p' "$guard_log" 2>/dev/null | head -1 || true)"
          if [[ -z "$cnt" || "$cnt" == "0" ]]; then crit="破坏性语句未获批准"; else crit="破坏性语句 ${cnt} 条"; fi
          tickets="$(sed -n 's/^--[[:space:]]*destructive-ticket:[[:space:]]*//p' "$f" | paste -sd, -)"
          DENIED+=("$b [${crit}；需 --allow-destructive=${v}；ticket=${tickets:-<未声明>}]")
          continue
        fi
      fi
    else
      DENIED+=("$b [无法校验：node 缺失，拒绝在 prod 应用]")
      continue
    fi
  elif [[ $GATE_GUC_AUTO -eq 1 ]]; then
    # 演练模式也必须做破坏性预演：否则 drill 只执行 DDL、从不校验行数闸门，
    # 「预演能看见被 RLS 过滤的行 / 能拦住非空表」在开窗前无法被演练证明。
    # 隔离库允许自动批准文件自身声明的 ticket；无标记的破坏性语句无法生成计划
    # （没有 destructive-max-rows），prod 侧会直接拒绝，这里只提示并保持演练可重放。
    if command -v node >/dev/null 2>&1; then
      guard_log="/tmp/topems_guard_${v}.log"
      if ! node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" --strict >"$guard_log" 2>&1; then
        tickets="$(sed -n 's/^--[[:space:]]*destructive-ticket:[[:space:]]*//p' "$f" | paste -sd, -)"
        dg_plan="/tmp/topems_dg_plan_${v}.json"
        if [[ -n "$tickets" ]] && node "$ROOT/scripts/ci/check-destructive-sql.mjs" --check-file "$f" --strict \
            --approve-ticket="$tickets" --plan-file="$dg_plan" >>"$guard_log" 2>&1; then
          PENDING_DG+=("$v")
          echo "   演练预演：$b 已纳入破坏性行数预演（ticket=${tickets}）"
        else
          echo "   演练提示：$b 含无豁免标记的破坏性语句，跳过预演（prod 会拒绝；演练继续）" >&2
        fi
      fi
    fi
  fi
  PENDING+=("$f")
done < <(ls "$MIG_DIR"/*.sql | LC_ALL=C sort)

# fail-closed：根因优先。DENIED（破坏性语句/定向命名/无法校验）是 --only 版本
# “未被扫描到”的常见原因，必须先给一行摘要，再给原有细节，避免日志先冒出
# “疑似扫描截断”把根因盖住。摘要逐条包含：判据、迁移文件、标记票据。
if [[ ${#DENIED[@]} -gt 0 ]]; then
  denied_brief="$(printf '%s; ' "${DENIED[@]}")"
  echo "DENIED: prod 拒绝应用 ${#DENIED[@]} 条 pending 迁移：${denied_brief%; }" >&2
  echo "== 拒绝：prod 检测到 ${#DENIED[@]} 条禁止直接应用的 pending 迁移" >&2
  printf '  %s\n' "${DENIED[@]}" >&2
  [[ ${#DENIED_DETAIL[@]} -gt 0 ]] && printf '%s\n' "${DENIED_DETAIL[@]}" >&2
  cat >&2 <<'EOF'

prod 迁移唯一入口 =「基线 + 前向迁移」，不得直接重放历史/定向迁移：
  1) 先确认 prod 基线已恢复（database/baseline/prod_schema_<anchor>.sql.gz）
  2) 仅应用 version > anchor 且带存在性守卫（to_regclass / IF EXISTS / DO$$ EXISTS）的前向迁移
  3) 禁止在 prod 应用 dbNN_test / dbNN_5433 / test_* / 5433_* 定向迁移
  4) 确需人工复核后临时放行：--allow-pending <version>（须在变更记录注明理由）
EOF
  exit 1
fi

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

# --- 破坏性语句预演（事务 + 必然 ROLLBACK，不提交任何写入） -------------------
# 逐版本、逐语句：DELETE/UPDATE 统计受影响行数，DROP TABLE 统计目标表现存行数；
# 任一超过标记 destructive-max-rows（DROP 必须为 0）即拒绝。
# 调用时机由应用循环控制：必须在该版本之前所有 pending 已应用之后，否则前置断言
# 只能看到 anchor 旧状态（2026-11-20 20261119200000 依赖 flow._deprecated_* 事故）。
# 临时对象（pg_temp.* / 本文件 CREATE TEMP TABLE）不计行数，静态判定仍按原规则。
# 注意：预演不是只读的（必须执行 DML 才能拿到真实行数），因此只保证「必然 ROLLBACK」，
# 并拒绝无法回滚/会逃出事务的语句；不要改成 default_transaction_read_only=on。
run_preflight() {
  local v="$1" mig_file="$2"
  local dg_plan preflight_sql node_gen_js preflight_body prelude dg_rows pline
  local dg_line dg_kind dg_max dg_n
  dg_plan="/tmp/topems_dg_plan_${v}.json"
  if [[ ! -f "$dg_plan" ]]; then
    echo "== 拒绝：版本 $v 缺少破坏性预演计划 $dg_plan" >&2
    return 1
  fi
  preflight_sql="/tmp/topems_dg_preflight_${v}.sql"
  # 预演要点（2026-11-09）：
  #   1) DML 必须用 `WITH __dg AS (<DML> RETURNING 1) SELECT count(*)`；
  #      原先写成 `SELECT ... FROM (<UPDATE ...>)`，PostgreSQL 不允子查询里出现 UPDATE，
  #      任何带标记的 DML 都会在预演阶段语法报错（已实测）。
  #   2) 预演需在同一只读事务内先执行「该语句之前的 DDL」，
  #      否则「先 ADD COLUMN、后 UPDATE」的迁移会因列不存在而误判失败。
  #      每段用独立 BEGIN/ROLLBACK 包裹，整段必然 ROLLBACK（不落任何写入）。
  node_gen_js="/tmp/topems_dg_gen_${v}.mjs"
  cat > "$node_gen_js" <<'DG_GEN_JS'
    import fs from "node:fs";
    const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const src = fs.readFileSync(process.argv[3], "utf8").split("\n");
    const q = (s) => String(s).replace(/'/g, "''");
    // 预演会真实执行「破坏性语句之前的 DDL + 本条 DML」，再整体 ROLLBACK。
    // 语法上无法回滚、或会脱离当前事务的语句必须在这里拒绝，否则一次预演就会
    // 留下生产副作用（sequence 前进、事务提前结束、并发 DDL 等）。
    // 去注释/字符串后匹配，避免文档性文字误报；不做完整 SQL 解析（fail-closed 优先）。
    const strip = (s) => String(s)
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n]*/g, " ")
      .replace(/'(?:[^']|'')*'/g, "''")
      // ON COMMIT {DROP | PRESERVE ROWS | DELETE ROWS} 是临时表子句，不结束事务；
      // 三种写法必须整体剔除，否则下面的 \bCOMMIT\b 会把临时表 DDL 误判成事务级 COMMIT
      // （2026-11-19 drill 在 20261119200000 第 486 行 ON COMMIT DROP 处误报）。
      // \s+ 容忍大小写、多空格与换行。
      .replace(/\bON\s+COMMIT\s+(?:DROP|PRESERVE\s+ROWS|DELETE\s+ROWS)\b/gi, " ");
    const UNSAFE = [
      [/\bCOMMIT\b/i, "COMMIT 会提前结束预演事务，后续语句将在事务外真实执行"],
      [/\bROLLBACK\b/i, "ROLLBACK 会提前结束预演事务，后续语句将在事务外真实执行"],
      [/\bVACUUM\b/i, "VACUUM 不能在事务内执行且不可回滚"],
      [/\bnextval\s*\(/i, "nextval 推进 sequence，ROLLBACK 不会回退"],
      [/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i, "CREATE INDEX CONCURRENTLY 不能在事务内执行"],
      [/\bDROP\s+INDEX\s+CONCURRENTLY\b/i, "DROP INDEX CONCURRENTLY 不能在事务内执行"],
      [/\bREINDEX\b[^;]*\bCONCURRENTLY\b/i, "REINDEX CONCURRENTLY 不能在事务内执行"],
      [/\b(?:CREATE|DROP)\s+DATABASE\b/i, "CREATE/DROP DATABASE 不能在事务内执行"],
      [/\bALTER\s+SYSTEM\b/i, "ALTER SYSTEM 不能在事务内执行且不可回滚"],
    ];
    const assertSafe = (text, line) => {
      const t = strip(text);
      for (const [re, why] of UNSAFE) {
        if (re.test(t)) {
          console.error(`UNSAFE: 预演将在第 ${line} 行语句前执行到「${why}」`);
          process.exit(3);
        }
      }
    };
    for (const s of plan.statements) {
      const prefix = src.slice(0, Math.max(0, s.line - 1)).join("\n");
      assertSafe(prefix, s.line);
      assertSafe(s.sql, s.line);
      console.log("BEGIN;");
      if (prefix.trim()) console.log(prefix);
      if (s.kind === "DELETE" || s.kind === "UPDATE") {
        if (s.temp) {
          // 临时对象：会话内自建自用，不计入业务行数（静态判定/票据仍按原规则）
          console.log(`SELECT ${s.line} AS line, '${s.kind}' AS kind, ${Number(s.maxRows)} AS max_rows, 0::bigint AS n;`);
        } else {
          const sql = s.sql.replace(/;\s*$/, "");
          console.log(`WITH __dg AS (${sql} RETURNING 1) SELECT ${s.line} AS line, '${s.kind}' AS kind, ${Number(s.maxRows)} AS max_rows, count(*)::bigint AS n FROM __dg;`);
        }
      } else if (s.kind === "DROP TABLE") {
        if (s.temp) {
          // 同上：pg_temp/本文件 CREATE TEMP TABLE 建出的对象不参与行数预演
          console.log(`SELECT ${s.line} AS line, 'DROP TABLE' AS kind, 0 AS max_rows, 0::bigint AS n;`);
        } else {
          const t = q(s.table);
          console.log(`SELECT ${s.line} AS line, 'DROP TABLE' AS kind, 0 AS max_rows, CASE WHEN to_regclass('${t}') IS NULL THEN 0 ELSE (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM ${t}', false, true, '')))[1]::text::bigint END AS n;`);
        }
      } else {
        console.log(`SELECT ${s.line} AS line, '${s.kind}' AS kind, ${Number(s.maxRows)} AS max_rows, 0::bigint AS n;`);
      }
      console.log("ROLLBACK;");
    }
DG_GEN_JS
  preflight_body="/tmp/topems_dg_preflight_${v}.body.sql"
  if ! node "$node_gen_js" "$dg_plan" "$mig_file" > "$preflight_body"; then
    rm -f "$node_gen_js" "$preflight_body"
    echo "== 拒绝：版本 $v 预演包含不可回滚语句，已中止（该版本未应用）" >&2
    return 1
  fi
  # 与 apply 段同一来源、同一函数：
  #   1) 系统通道：缺 app.rls_system=on 时 FORCE RLS 会把 tenant_isolation 表的
  #      count(*) 过滤成 0，行数闸门恒真（假 PASS）；
  #   2) 闸门 GUC：调用方不传 PGOPTIONS 时也能从迁移文件自身抽出 app.*_gate，
  #      否则预演里的闸门断言会先于行数统计失败（假失败）。
  prelude="$(gate_guc_prelude "$mig_file")"
  {
    printf "SET app.rls_system = 'on';\n"
    [[ -n "$prelude" ]] && printf '%s\n' "$prelude"
    cat "$preflight_body"
  } > "$preflight_sql"
  rm -f "$node_gen_js" "$preflight_body"
  # 回归守卫：预演 SQL 必须以系统通道开头，且包含文件声明的每一条闸门 GUC。
  # 防止后续重构把注入静默删掉（本脚本没有单测，这里做运行时 fail-closed）。
  if [[ "$(head -1 "$preflight_sql")" != "SET app.rls_system = 'on';" ]]; then
    echo "== 拒绝：版本 $v 预演 SQL 缺少系统通道注入（回归）" >&2
    return 1
  fi
  if [[ -n "$prelude" ]]; then
    while IFS= read -r pline; do
      grep -Fqx "$pline" "$preflight_sql" || {
        echo "== 拒绝：版本 $v 预演 SQL 缺少闸门 GUC「${pline}」（回归）" >&2
        return 1
      }
    done <<< "$prelude"
  fi
  dg_rows="$(psql_stdin < "$preflight_sql")" || {
    echo "== 拒绝：版本 $v 破坏性预演失败（前置断言不满足或预演无法回滚；该版本未应用）" >&2
    return 1
  }
  while IFS='|' read -r dg_line dg_kind dg_max dg_n; do
    [[ -n "${dg_line:-}" ]] || continue
    if (( 10#${dg_n:-0} > 10#${dg_max:-0} )); then
      echo "== 拒绝：版本 $v 第 ${dg_line} 行 ${dg_kind} 预演影响 ${dg_n} 行 > 允许 ${dg_max} 行（该版本未应用）" >&2
      return 1
    fi
    echo "   预演 OK：版本 $v 第 ${dg_line} 行 ${dg_kind} → ${dg_n} 行（上限 ${dg_max}）"
  done <<< "$dg_rows"
}

# 中途失败状态（2026-11-20）：预演与应用按版本交错推进，任一预演被拒即停在该版本。
# 已应用版本保持已落账，未应用版本逐条列明，并给出逆序回滚入口。
APPLIED_VERSIONS=()
REMAINING_VERSIONS=()
for f in "${PENDING[@]}"; do REMAINING_VERSIONS+=("$(basename "$f" | cut -d_ -f1)"); done

abort_partial_state() {
  local failed_v="$1" i rb rel
  echo "== 中止：版本 $failed_v 破坏性预演被拒绝；该版本未应用，后续版本未执行" >&2
  if [[ ${#APPLIED_VERSIONS[@]} -gt 0 ]]; then
    echo "   已应用（${#APPLIED_VERSIONS[@]}）：${APPLIED_VERSIONS[*]}" >&2
    echo "   回滚入口（逆序逐条执行；回滚前先核对账本与窗口前备份）：" >&2
    for ((i=${#APPLIED_VERSIONS[@]}-1; i>=0; i--)); do
      rb="$( (ls "$ROOT/database/rollback/${APPLIED_VERSIONS[$i]}"_*.rollback.sql 2>/dev/null || true) | head -1 )"
      if [[ -n "$rb" ]]; then
        rel="${rb#"$ROOT"/}"
        echo "     psql \"\$DSN\" -v ON_ERROR_STOP=1 -f $rel" >&2
      else
        echo "     ${APPLIED_VERSIONS[$i]}：未找到回滚文件，需人工恢复（见 migration manifest）" >&2
      fi
    done
  else
    echo "   已应用（0）：无（本次未提交任何写入）" >&2
  fi
  echo "   未应用（${#REMAINING_VERSIONS[@]}）：${REMAINING_VERSIONS[*]}" >&2
  echo "   重跑方式：修复后从同一 anchor 重跑本脚本，已应用版本会由账本自然跳过。" >&2
}

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
  echo "-- $b"
  # 预演必须排在此前所有 pending 已应用之后：预演里的前置断言看到的是真实基线，
  # 而不是 anchor 旧状态（2026-11-20 20261119200000 依赖 flow._deprecated_* 事故）。
  if contains "$v" ${PENDING_DG[@]+"${PENDING_DG[@]}"}; then
    if ! run_preflight "$v" "$f"; then
      abort_partial_state "$v"
      exit 1
    fi
  fi
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
    if ! psql_exec --single-transaction -v ON_ERROR_STOP=1 -f - < "$tmp" > /tmp/topems_forward_last.log 2>&1; then
      echo "   FAILED" >&2
      tail -5 /tmp/topems_forward_last.log >&2
      rm -f "$tmp"
      echo "== 中止：${b} 失败，后续迁移未执行" >&2
      exit 1
    fi
  else
    {
      if [[ $GATE_GUC_AUTO -eq 1 ]]; then
        printf "SET app.rls_system = 'on';\n"
        gate_guc_prelude "$f"
      fi
      printf '\\i %s\n' "$f"
      printf "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES (%s, '%s', NOW(), true, decode('%s','hex'), 0);\n" "$v" "$desc" "$hex"
    } > "$tmp"
    if ! psql_exec --single-transaction -v ON_ERROR_STOP=1 -f "$tmp" > /tmp/topems_forward_last.log 2>&1; then
      echo "   FAILED" >&2
      tail -5 /tmp/topems_forward_last.log >&2
      rm -f "$tmp"
      echo "== 中止：${b} 失败，后续迁移未执行" >&2
      exit 1
    fi
  fi
  rm -f "$tmp"
  APPLIED_VERSIONS+=("$v")
  REMAINING_VERSIONS=("${REMAINING_VERSIONS[@]:1}")
done

echo "== OK：应用 ${#PENDING[@]} 条，无失败"
exit 0
