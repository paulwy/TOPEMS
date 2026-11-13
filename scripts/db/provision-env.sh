#!/usr/bin/env bash
# =============================================================================
# 环境供给入口（基线即唯一供给入口）
#
# 流程：建库（不存在时）→ 恢复结构基线（schema + ledger）→ 恢复参考数据基线
#       （baseline_<anchor>_data.sql.gz，默认开启）→ apply-forward.sh 只应用
#       version > anchor → 终态校验（账本/表数/锚点/参考数据行数/核心表指纹）
#       →（可选 --with-admin）创建/重置初始管理员并校验。
#
# 顺序理由：先结构后数据，避免数据写入时缺列；前向迁移在数据之后执行，
# 因此 > anchor 的增量（如新增菜单/权限）叠加在快照之上，不会被快照回退。
# 初始管理员放在**前向迁移之后**，避免任何 > anchor 迁移对 iam.users 的改动覆盖它。
# 若前向迁移改动纳入表的列/约束导致数据不兼容，本脚本 fail-closed，需重生成基线。
#
# 初始管理员（--with-admin，默认关闭）：生产/复刻环境必须显式决定是否创建用户；
# 密码默认随机生成且只在 stderr 显示一次；哈希由 topems-admin-pass 调用登录校验用的
# 同一个 verify_password 做正/反向自校验后写入；绝不写 stdout / 仓库文件 / .env / 日志。
#
# 参考数据范围：11 张配置性表（租户/角色/权限点/菜单/字典/组织岗位），
# 明确排除含 PII、业务单据、日志、事件流、队列、缓存、账本类数据。
# 详见 docs/quality/environment-provisioning.md。
#
# 为什么不再全链 `sqlx migrate run`：历史链存在断点（如 20261005000004 依赖
# public.qa_lab_tasks，而该表由更晚的 20261007000009 才创建），从零重放必然失败；
# 且会把 <= 锚点的定向迁移当作 pending 重放。基线与前向迁移是唯一受支持路径。
#
# 环境语义（同一流程，仅默认库名/DSN 差异）：
#   --env dev          → 默认库 topems_dev
#   --env test         → 默认库 topems_test
#   --env staging      → 默认库 topems_staging
#   --env prod-replica → 默认库 topems_prod_replica（本地/灾备副本；迁移按 --prod 守卫）
#
# 用法：
#   bash scripts/db/provision-env.sh --env test --dsn "postgresql://user@127.0.0.1:5432/topems_test"
#   bash scripts/db/provision-env.sh --env dev --db topems_dev
#   bash scripts/db/provision-env.sh --env prod-replica --db topems_prod_replica \
#     --prod-ssh <user>@<prod-host>
#
# 选项：
#   --env NAME         dev|test|staging|prod-replica（默认 dev）
#   --dsn DSN          目标 DSN（与 --db 二选一）
#   --db NAME          目标库名（未给时取 --env 默认库名）
#   --anchor VERSION   覆盖基线锚点（必须存在 baseline_VERSION.json 且 sha256 校验通过）
#   --with-reference-data    恢复参考数据基线（默认开启）
#   --no-reference-data      跳过参考数据恢复（⚠️ 角色/权限/菜单缺失，环境可能不可登录）
#   --data-only              仅恢复参考数据（要求目标库结构已存在且 max(version)=anchor；
#                            对 11 张纳入表按依赖逆序 DELETE 后恢复，禁止 CASCADE）
#   --with-admin             供给完成后创建初始管理员（默认关闭；不与 --data-only 组合）
#   --admin-only             仅对已供给库执行管理员创建/校验/重置（不改结构/数据/迁移；
#                            用于幂等跳过与 --reset-admin-password 运维）
#   --admin-username NAME    管理员用户名（默认 admin；须先用 --with-admin）
#   --admin-email ADDR       管理员邮箱（默认 admin@topems.com）
#   --admin-password-stdin   从 stdin 读取管理员密码（不回显、不走 argv）
#   --admin-password-file PATH  额外把密码写入 0600 文件（默认不写；禁止仓库内路径）
#   --reset-admin-password   已存在同名/同邮箱用户时显式重置密码（默认跳过、不改密码）
#   --escalate-existing      已存在同名普通用户时显式允许提升为管理员（默认拒绝）
#   --runtime-role NAME      运行角色名（默认 topems_app；用于授权与自检）
#   --runtime-dsn DSN        运行角色连接串（自检用；也可用 RUNTIME_DATABASE_URL）
#   --health-url URL         供给后 /health 校验地址（也可用 HEALTH_URL；未提供时仅告警）
#   --allow-prod-admin       仅 prod-replica 显式允许创建/重置管理员（强警告；真 prod 永不可用）
#   --force-nonempty   显式允许覆盖已非空库（会 DROP + CREATE；打印 ⚠️ WARN；prod 形态不可用）
#   --skip-prod-fingerprint  跳过与 prod 的 10 张核心表指纹比对（仅 dev/test/staging 可跳过）
#   --prod-ssh USER@HOST      prod 只读比对入口（ssh 执行 psql -d topems_prod）
#   --prod-dsn DSN            prod 只读比对入口（二选一）
#   --prod-db NAME            prod 库名（默认 topems_prod）
#   -h|--help          显示帮助
#
# 退出码：0 成功；1 失败（含守卫拒绝/校验不通过/资产或探测失败）。
# fail-closed：任何探测失败、sha256 不匹配、账本/锚点/表数校验失败都非零退出；
# 绝不回退到 sqlx migrate run。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASELINE_DIR="$ROOT/database/baseline"

ENV_NAME="dev"
DSN=""
DB=""
ANCHOR_OVERRIDE=""
FORCE_NONEMPTY=0
SKIP_FP=0
WITH_DATA=1
DATA_ONLY=0
PROD_SSH=""
PROD_DSN=""
PROD_DB="topems_prod"
WITH_ADMIN=0
ADMIN_ONLY=0
ADMIN_USERNAME="admin"
ADMIN_EMAIL="admin@topems.com"
ADMIN_PASSWORD_STDIN=0
ADMIN_PASSWORD_FILE=""
ADMIN_PASSWORD_FILE_ABS=""
RESET_ADMIN_PASSWORD=0
ESCALATE_EXISTING=0
RUNTIME_ROLE="${DB_RUNTIME_ROLE:-topems_app}"
RUNTIME_DSN="${RUNTIME_DATABASE_URL:-}"
HEALTH_URL="${HEALTH_URL:-}"
ALLOW_PROD_ADMIN=0
ADMIN_TMP=""
ADMIN_HASH_FILE=""
ADMIN_PASS_FILE=""
ADMIN_WRONG_FILE=""
ADMIN_HASH=""
NEW_ID=""
ROLE_ID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[PROVISION]${NC} $*"; }
ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} $*"; }
die() { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="$2"; shift 2 ;;
    --dsn) DSN="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --anchor) ANCHOR_OVERRIDE="$2"; shift 2 ;;
    --with-reference-data) WITH_DATA=1; shift ;;
    --no-reference-data) WITH_DATA=0; shift ;;
    --data-only) DATA_ONLY=1; WITH_DATA=1; shift ;;
    --with-admin) WITH_ADMIN=1; shift ;;
    --admin-only) ADMIN_ONLY=1; WITH_ADMIN=1; shift ;;
    --admin-username) ADMIN_USERNAME="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password-stdin) ADMIN_PASSWORD_STDIN=1; shift ;;
    --admin-password-file) ADMIN_PASSWORD_FILE="$2"; shift 2 ;;
    --reset-admin-password) RESET_ADMIN_PASSWORD=1; shift ;;
    --escalate-existing) ESCALATE_EXISTING=1; shift ;;
    --runtime-role) RUNTIME_ROLE="$2"; shift 2 ;;
    --runtime-dsn) RUNTIME_DSN="$2"; shift 2 ;;
    --health-url) HEALTH_URL="$2"; shift 2 ;;
    --allow-prod-admin) ALLOW_PROD_ADMIN=1; shift ;;
    --force-nonempty) FORCE_NONEMPTY=1; shift ;;
    --skip-prod-fingerprint) SKIP_FP=1; shift ;;
    --prod-ssh) PROD_SSH="$2"; shift 2 ;;
    --prod-dsn) PROD_DSN="$2"; shift 2 ;;
    --prod-db) PROD_DB="$2"; shift 2 ;;
    -h|--help) sed -n '2,64p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  dev) DEFAULT_DB="topems_dev" ;;
  test) DEFAULT_DB="topems_test" ;;
  staging) DEFAULT_DB="topems_staging" ;;
  prod-replica) DEFAULT_DB="topems_prod_replica" ;;
  *) die "--env 仅支持 dev|test|staging|prod-replica（收到 ${ENV_NAME}）" ;;
esac

if [[ -n "$DSN" && -n "$DB" ]]; then
  die "--dsn 与 --db 只能二选一"
fi
if [[ -z "$DSN" ]]; then
  DB="${DB:-$DEFAULT_DB}"
fi
if [[ -z "$DSN" && ! "$DB" =~ ^[A-Za-z0-9_]+$ ]]; then
  die "库名仅允许字母/数字/下划线：${DB}"
fi

sha256_of() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

# ── 解析目标连接与库名 ─────────────────────────────────────────────────────
if [[ -n "$DSN" ]]; then
  BASE_DSN="${DSN%%\?*}"
  QUERY=""
  [[ "$DSN" == *\?* ]] && QUERY="?${DSN#*\?}"
  DB="${BASE_DSN##*/}"
  [[ -n "$DB" && "$DB" != "postgres" ]] || die "DSN 必须指向目标业务库（不能是 postgres 维护库）"
  REST="${DSN#*://}"
  REST="${REST#*@}"
  HOST_PART="${REST%%/*}"
  TARGET_HOST="${HOST_PART%%:*}"
  TARGET_PSQL=(psql "$DSN")
  ADMIN_DSN="${BASE_DSN%/*}/postgres${QUERY}"
  ADMIN_PSQL=(psql "$ADMIN_DSN")
else
  TARGET_HOST="${PGHOST:-/tmp}"
  TARGET_PSQL=(psql -h "$TARGET_HOST" -U "${PGUSER:-air}" -d "$DB")
  ADMIN_PSQL=(psql -h "$TARGET_HOST" -U "${PGUSER:-air}" -d postgres)
fi
DB_LC="$(printf '%s' "$DB" | tr '[:upper:]' '[:lower:]')"
HOST_LC="$(printf '%s' "$TARGET_HOST" | tr '[:upper:]' '[:lower:]')"

if [[ ! "$RUNTIME_ROLE" =~ ^[A-Za-z0-9_]+$ ]]; then
  die "--runtime-role 仅允许字母/数字/下划线：${RUNTIME_ROLE}"
fi
if [[ -n "$RUNTIME_DSN" ]]; then
  RUNTIME_DB="${RUNTIME_DSN%%\?*}"
  RUNTIME_DB="${RUNTIME_DB##*/}"
  [[ "$RUNTIME_DB" == "$DB" ]] \
    || die "运行角色 DSN 指向库 ${RUNTIME_DB}，与目标库 ${DB} 不一致；拒绝连接（避免误连其它环境）"
fi
if [[ -n "$HEALTH_URL" && ! "$HEALTH_URL" =~ ^https?:// ]]; then
  die "--health-url 必须以 http:// 或 https:// 开头：${HEALTH_URL}"
fi

# ── prod 特征 fail-closed（复用 setup-db 口径，restore 也绝不指向真 prod） ──
if [[ "$DB_LC" == "topems_prod" ]] || [[ "$HOST_LC" =~ 192\.168\.110\.115|xingzhai ]]; then
  die "目标命中 prod 特征（db=${DB} host=${TARGET_HOST}）；本脚本只允许本地/副本库，prod 禁止执行 restore/DDL"
fi
if [[ "$HOST_LC" =~ prod ]]; then
  die "目标 host 含 prod 特征（${TARGET_HOST}）；拒绝执行（fail-closed）"
fi
if [[ "$ENV_NAME" == "prod-replica" ]]; then
  [[ "$DB_LC" =~ replica ]] || die "--env prod-replica 要求库名含 replica（收到 ${DB}），避免误指 prod"
elif [[ "$DB_LC" =~ (^|_)(prod|production)(_|$) ]]; then
  die "目标库名命中 prod 特征（${DB}）；如确为本地副本请显式 --env prod-replica 且库名含 replica"
fi

# ── 初始管理员参数校验（默认关闭；prod-replica 需显式放行） ──────────────────
if (( ADMIN_ONLY == 1 )); then
  (( DATA_ONLY == 0 )) || die "--admin-only 不能与 --data-only 组合"
  (( FORCE_NONEMPTY == 0 )) || die "--admin-only 不接受 --force-nonempty（不会重建库）"
fi
if (( WITH_ADMIN == 1 )); then
  (( DATA_ONLY == 0 )) || die "--with-admin 不能与 --data-only 组合；请执行完整供给或 --admin-only"
  [[ "$ADMIN_USERNAME" =~ ^[A-Za-z0-9._-]{3,100}$ ]] \
    || die "--admin-username 仅允许字母/数字/点/下划线/连字符，长度 3-100：${ADMIN_USERNAME}"
  [[ "$ADMIN_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] \
    || die "--admin-email 格式非法：${ADMIN_EMAIL}"
  if [[ "$ENV_NAME" == "prod-replica" ]]; then
    (( ALLOW_PROD_ADMIN == 1 )) \
      || die "prod-replica 默认拒绝创建管理员；如确需演练请显式 --allow-prod-admin（会打印强警告）"
    warn "⚠️ 在 prod 副本上创建/重置管理员：该用户只存在于副本，绝不可回写 prod"
  elif (( ALLOW_PROD_ADMIN == 1 )); then
    die "--allow-prod-admin 仅适用于 --env prod-replica"
  fi
  if [[ -n "$ADMIN_PASSWORD_FILE" ]]; then
    ADMIN_PASSWORD_DIR="$(dirname "$ADMIN_PASSWORD_FILE")"
    [[ -d "$ADMIN_PASSWORD_DIR" ]] || die "--admin-password-file 父目录不存在：${ADMIN_PASSWORD_DIR}"
    ADMIN_PASSWORD_FILE_ABS="$(cd "$ADMIN_PASSWORD_DIR" && pwd)/$(basename "$ADMIN_PASSWORD_FILE")"
    [[ "$ADMIN_PASSWORD_FILE_ABS" != "$ROOT"/* ]] \
      || die "--admin-password-file 不得位于仓库内（禁止密码进入 git 工作区）：${ADMIN_PASSWORD_FILE_ABS}"
  fi
else
  (( ADMIN_PASSWORD_STDIN == 0 )) || die "--admin-password-stdin 需要同时指定 --with-admin"
  [[ -z "$ADMIN_PASSWORD_FILE" ]] || die "--admin-password-file 需要同时指定 --with-admin"
  (( RESET_ADMIN_PASSWORD == 0 )) || die "--reset-admin-password 需要同时指定 --with-admin"
  (( ALLOW_PROD_ADMIN == 0 )) || die "--allow-prod-admin 需要同时指定 --with-admin"
fi

# ── 解析基线（元数据 → 资产 → sha256） ─────────────────────────────────────
meta_get() { node -e 'const m=require(process.argv[1]);console.log(m[process.argv[2]]??"")' "$1" "$2"; }

if [[ -n "$ANCHOR_OVERRIDE" ]]; then
  [[ "$ANCHOR_OVERRIDE" =~ ^[0-9]{14}$ ]] || die "--anchor 必须为 14 位版本号：${ANCHOR_OVERRIDE}"
  META_FILE="$BASELINE_DIR/baseline_${ANCHOR_OVERRIDE}.json"
  [[ -f "$META_FILE" ]] || die "--anchor ${ANCHOR_OVERRIDE} 缺少元数据 ${META_FILE}，无法校验 sha256"
else
  META_FILE=""
  LATEST=0
  for f in "$BASELINE_DIR"/baseline_*.json; do
    [[ -e "$f" ]] || continue
    # 仅结构基线元数据（排除 baseline_<anchor>_data.json）
    [[ "$(basename "$f")" =~ ^baseline_[0-9]{14}\.json$ ]] || continue
    v="$(meta_get "$f" anchor_version)"
    [[ "$v" =~ ^[0-9]{14}$ ]] || continue
    if (( 10#$v > 10#$LATEST )); then LATEST="$v"; META_FILE="$f"; fi
  done
  [[ -n "$META_FILE" ]] || die "基线元数据缺失：database/baseline/baseline_*.json"
fi

ANCHOR="$(meta_get "$META_FILE" anchor_version)"
[[ "$ANCHOR" =~ ^[0-9]{14}$ ]] || die "基线锚点非法：${ANCHOR}"
SCHEMA_FILE="$BASELINE_DIR/$(meta_get "$META_FILE" schema_file)"
LEDGER_FILE="$BASELINE_DIR/$(meta_get "$META_FILE" ledger_file)"
SCHEMA_SHA="$(meta_get "$META_FILE" schema_sha256)"
LEDGER_SHA="$(meta_get "$META_FILE" ledger_sha256)"
META_TABLES="$(meta_get "$META_FILE" table_count)"
META_ROWS="$(meta_get "$META_FILE" ledger_rows)"

[[ -f "$SCHEMA_FILE" ]] || die "基线资产缺失：${SCHEMA_FILE}"
[[ -f "$LEDGER_FILE" ]] || die "基线资产缺失：${LEDGER_FILE}"
ACT_SCHEMA_SHA="$(sha256_of "$SCHEMA_FILE")"
ACT_LEDGER_SHA="$(sha256_of "$LEDGER_FILE")"
[[ "$ACT_SCHEMA_SHA" == "$SCHEMA_SHA" ]] || die "基线 schema sha256 不匹配：${ACT_SCHEMA_SHA} ≠ ${SCHEMA_SHA}"
[[ "$ACT_LEDGER_SHA" == "$LEDGER_SHA" ]] || die "基线 ledger sha256 不匹配：${ACT_LEDGER_SHA} ≠ ${LEDGER_SHA}"

info "env=${ENV_NAME} db=${DB} host=${TARGET_HOST} anchor=${ANCHOR}"
info "结构基线校验通过：$(basename "$SCHEMA_FILE") / $(basename "$LEDGER_FILE")（表 ${META_TABLES}，账本 ${META_ROWS}）"

# ── 参考数据基线（默认开启；缺失即失败，不静默跳过） ───────────────────────
DATA_META="$BASELINE_DIR/baseline_${ANCHOR}_data.json"
DATA_FILE=""
DATA_SHA=""
DATA_TABLES=0
DATA_TOTAL=0
DATA_ROWS=""
DATA_RESTORE_ORDER=""
DATA_REV_ORDER=""
if (( WITH_DATA == 1 )); then
  [[ -f "$DATA_META" ]] || die "参考数据基线元数据缺失：${DATA_META}（如确不需参考数据，请显式 --no-reference-data）"
  DATA_FILE="$BASELINE_DIR/$(meta_get "$DATA_META" data_file)"
  DATA_SHA="$(meta_get "$DATA_META" data_sha256)"
  DATA_TABLES="$(meta_get "$DATA_META" table_count)"
  DATA_TOTAL="$(meta_get "$DATA_META" total_rows)"
  [[ -f "$DATA_FILE" ]] || die "参考数据资产缺失：${DATA_FILE}"
  ACT_DATA_SHA="$(sha256_of "$DATA_FILE")"
  [[ "$ACT_DATA_SHA" == "$DATA_SHA" ]] || die "参考数据 sha256 不匹配：${ACT_DATA_SHA} ≠ ${DATA_SHA}"
  DATA_ROWS="$(node -e 'const m=require(process.argv[1]); for (const t of m.tables) console.log(t+"|"+m.row_counts[t])' "$DATA_META")" \
    || die "参考数据行数元数据解析失败"
  DATA_RESTORE_ORDER="$(node -e 'const m=require(process.argv[1]); console.log(m.restore_order.join(","))' "$DATA_META")" \
    || die "参考数据恢复顺序解析失败"
  DATA_REV_ORDER="$(node -e 'const m=require(process.argv[1]); console.log([...m.restore_order].reverse().join(","))' "$DATA_META")" \
    || die "参考数据 TRUNCATE 顺序解析失败"
  [[ -n "$DATA_ROWS" ]] || die "参考数据行数清单为空"
  ok "参考数据校验通过：$(basename "$DATA_FILE")（${DATA_TABLES} 张表 / ${DATA_TOTAL} 行）"
else
  warn "--no-reference-data：跳过参考数据恢复（角色/权限/菜单缺失，环境可能不可登录）"
fi

# 逐表行数：恢复后必须与元数据完全一致
verify_data_exact() {
  local t expected actual
  while IFS='|' read -r t expected; do
    [[ -z "$t" ]] && continue
    actual="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM $t" 2>/dev/null)" \
      || die "参考数据行数探测失败：${t}（fail-closed）"
    actual="${actual//[^0-9]/}"
    [[ "$actual" == "$expected" ]] || die "参考数据行数不符：${t} 实际 ${actual} ≠ 元数据 ${expected}"
  done <<< "$DATA_ROWS"
  ok "参考数据行数与元数据一致（${DATA_TABLES} 张表 / ${DATA_TOTAL} 行）"
}

# 前向迁移之后：允许「可增量追加」的表 >= 快照行数；其余必须精确一致
verify_data_after_forward() {
  # 前向迁移可合法追加角色（domain roles）与权限/菜单/字典项；这些表允许 >= 快照行数。
  local t expected actual deltas="" appendable=" public.core_roles public.core_menus public.core_permissions public.core_role_permissions public.core_dict_types public.core_dict_items public.core_menu_groups "
  while IFS='|' read -r t expected; do
    [[ -z "$t" ]] && continue
    actual="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM $t" 2>/dev/null)" \
      || die "前向后参考数据行数探测失败：${t}"
    actual="${actual//[^0-9]/}"
    if [[ "$appendable" == *" $t "* ]]; then
      (( actual >= expected )) || die "前向后参考数据行数少于快照：${t} ${actual} < ${expected}"
      (( actual == expected )) || deltas+=" ${t}:${expected}→${actual}"
    else
      [[ "$actual" == "$expected" ]] || die "前向迁移改动了不可增量表：${t} ${actual} ≠ ${expected}"
    fi
  done <<< "$DATA_ROWS"
  if [[ -n "$deltas" ]]; then
    ok "参考数据校验通过（前向增量已叠加）：${deltas# }"
  else
    ok "参考数据校验通过（前向后行数未变）"
  fi
}

# 关键参考数据完整性（登录/鉴权最小集）
verify_key_data() {
  local admin_role admin_perms perms menus dicts
  admin_role="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_roles WHERE name='admin'" 2>/dev/null)" \
    || die "admin 角色探测失败"
  admin_role="${admin_role//[^0-9]/}"
  (( admin_role >= 1 )) || die "参考数据缺少 admin 角色"
  admin_perms="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_role_permissions rp JOIN public.core_roles r ON r.id=rp.role_id WHERE r.name='admin'" 2>/dev/null)" \
    || die "admin 角色权限探测失败"
  admin_perms="${admin_perms//[^0-9]/}"
  (( admin_perms >= 1 )) || die "admin 角色无任何权限点（鉴权最小集不完整）"
  perms="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_permissions" 2>/dev/null)" || die "权限点探测失败"
  perms="${perms//[^0-9]/}"
  menus="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_menus" 2>/dev/null)" || die "菜单探测失败"
  menus="${menus//[^0-9]/}"
  dicts="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_dict_types" 2>/dev/null)" || die "字典探测失败"
  dicts="${dicts//[^0-9]/}"
  local admin_iam_read ledger_max
  ledger_max="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
    || die "账本版本探测失败"
  ledger_max="${ledger_max//[^0-9]/}"; ledger_max="${ledger_max:-0}"
  admin_iam_read="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM public.core_role_permissions rp JOIN public.core_roles r ON r.id=rp.role_id JOIN public.core_permissions p ON p.id=rp.permission_id WHERE r.name='admin' AND r.deleted_at IS NULL AND p.code='iam:read'" 2>/dev/null)" \
    || die "admin 角色基础读权限探测失败"
  admin_iam_read="${admin_iam_read//[^0-9]/}"; admin_iam_read="${admin_iam_read:-0}"
  (( perms >= 1 )) || die "权限点为空"
  (( menus >= 1 )) || die "菜单为空"
  (( dicts >= 1 )) || die "字典类型为空"
  if (( 10#$ledger_max >= 20261108090000 )); then
    (( admin_iam_read >= 1 )) || die "admin 角色缺少 iam:read（迁移 20261108090000 已应用但权限未补齐）"
  fi
  ok "关键数据完整：admin 角色权限 ${admin_perms} 条；权限点 ${perms}；菜单 ${menus}；字典类型 ${dicts}；admin 含 iam:read=${admin_iam_read}"
}

probe() { "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "$1" 2>/dev/null; }

# 终态必需表（不按总表数断言：前向迁移允许合法 DROP/重命名）
REQUIRED_TABLES=(
  public._sqlx_migrations
  public.core_tenants public.core_roles public.core_permissions public.core_role_permissions
  public.core_menus public.core_menu_groups public.core_dict_types public.core_dict_items
  public.core_tenant_settings public.core_tenant_users
  iam.users iam.audit_logs iam.auth_sessions
  hrm.departments hrm.positions
  erp.asset_categories erp.assets
  mes.production_orders
  qms.inspection_items
  lims.inspection_records
  scm.demand_forecast
  wms.batches
  finance.budgets
  analytics.analytics_dashboards
  communication.core_notification_deliveries
  portal.core_faqs
  pdm.pdm_boms
  ai.ai_models
  integration.async_tasks
  flow.approvals
  doc_service.core_doc_documents
)

verify_required_tables() {
  local t present missing=()
  for t in "${REQUIRED_TABLES[@]}"; do
    present="$(probe "SELECT COALESCE(to_regclass('${t}')::text,'')")" \
      || die "必需表存在性探测失败：${t}"
    present="$(printf '%s' "$present" | tr -d '[:space:]')"
    [[ -n "$present" ]] || missing+=("$t")
  done
  if (( ${#missing[@]} > 0 )); then
    die "终态缺少必需表（${#missing[@]} 张）：${missing[*]}；前向迁移可能误删或恢复不完整，fail-closed"
  fi
  ok "终态必需表校验通过（${#REQUIRED_TABLES[@]} 张）"
}

# 运行角色 DSN：优先 --runtime-dsn / RUNTIME_DATABASE_URL；
# 其次仅当仓库 .env 的 DATABASE_URL 指向同一目标库时才复用（避免误连其它环境）。
resolve_runtime_dsn() {
  if [[ -n "$RUNTIME_DSN" ]]; then
    return 0
  fi
  if [[ -f "$ROOT/.env" ]]; then
    local env_url env_db
    env_url="$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '\r')"
    env_db="${env_url%%\?*}"; env_db="${env_db##*/}"
    if [[ -n "$env_url" && "$env_db" == "$DB" ]]; then
      RUNTIME_DSN="$env_url"
      info "运行角色 DSN 复用仓库 .env 的 DATABASE_URL（目标库一致：${DB}）"
      return 0
    fi
  fi
  return 1
}

runtime_psql() {
  if [[ -n "$RUNTIME_DSN" ]]; then
    psql "$RUNTIME_DSN" "$@"
  else
    psql -h "$TARGET_HOST" -U "$RUNTIME_ROLE" -d "$DB" "$@"
  fi
}

apply_runtime_grants() {
  info "运行角色授权：${RUNTIME_ROLE} → ${DB}"
  "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
    -v runtime_role="$RUNTIME_ROLE" \
    -f "$ROOT/scripts/db/grant-topems-app.sql" \
    || die "运行角色授权失败（${RUNTIME_ROLE}）；请确认角色已由 setup-db 创建且当前账号具备授权权限"
  ok "运行角色授权完成：${RUNTIME_ROLE}"
}

verify_runtime_connect() {
  local out
  if ! out="$(runtime_psql -X -q -v ON_ERROR_STOP=1 -tAc "SELECT current_user||'|'||current_database()" 2>&1)"; then
    die "运行角色 ${RUNTIME_ROLE} 无法连接目标库 ${DB}：$(printf '%s' "$out" | head -1)
  请提供 --runtime-dsn，或设置 RUNTIME_PASSWORD/在目标 host 配置可用的认证方式。"
  fi
  [[ "$out" == "${RUNTIME_ROLE}|${DB}" ]] \
    || die "运行角色自检身份不符：期望 ${RUNTIME_ROLE}|${DB}，实际 ${out}"
  ok "运行角色连接通过：${RUNTIME_ROLE}@${DB}"
}

verify_admin_exists() {
  local n
  n="$(probe "SELECT count(*) FROM iam.users u JOIN public.core_user_roles ur ON ur.user_id=u.id JOIN public.core_roles r ON r.id=ur.role_id WHERE u.username='${ADMIN_USERNAME}' AND u.email='${ADMIN_EMAIL}' AND u.status='active' AND u.deleted_at IS NULL AND u.is_active AND r.name='admin' AND r.deleted_at IS NULL")" \
    || die "初始管理员存在性自检失败（连接/权限/查询错误）"
  n="${n//[^0-9]/}"; n="${n:-0}"
  (( n == 1 )) || die "初始管理员自检失败：未找到 active 且绑定 admin 角色的用户 ${ADMIN_USERNAME} <${ADMIN_EMAIL}>"
  ok "初始管理员存在性自检通过：${ADMIN_USERNAME} <${ADMIN_EMAIL}>"
}

verify_health() {
  if [[ -z "$HEALTH_URL" ]]; then
    warn "未提供 --health-url/HEALTH_URL：跳过 HTTP /health 校验（运行角色连接与 admin 存在已校验）"
    return 0
  fi
  command -v curl >/dev/null 2>&1 || die "需要 curl 才能执行 --health-url 校验"
  local code
  code="$(curl -sS -m 8 -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/tmp/topems_provision_health.err)" \
    || die "健康检查请求失败：${HEALTH_URL}（$(head -1 /tmp/topems_provision_health.err 2>/dev/null)）"
  [[ "$code" == "200" ]] || die "健康检查非 200：${HEALTH_URL} → ${code}"
  ok "健康检查通过：${HEALTH_URL} → 200"
}

run_post_provision_checks() {
  resolve_runtime_dsn || true
  apply_runtime_grants
  verify_runtime_connect
  if (( WITH_ADMIN == 1 || ADMIN_ONLY == 1 )); then
    verify_admin_exists
  else
    echo "" >&2
    echo -e "${RED}⚠️  WARN：--with-admin 未启用，当前环境没有初始管理员，任何人都无法登录。${NC}" >&2
    echo "   如需创建，请追加 --with-admin（或对已供给库执行 --admin-only）。" >&2
    echo "" >&2
  fi
  verify_health
}

# ── 建库 / 非空守卫（--admin-only 跳过全部供给阶段，仅执行末尾管理员步骤） ──
if (( ADMIN_ONLY == 0 )); then
exists="$("${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB}'" 2>/dev/null)" \
  || die "无法连接维护库/查询 pg_database（连接或权限失败，fail-closed）"

# ── 仅数据恢复（--data-only）：结构必须已存在，且未应用 > anchor 的前向迁移 ──
if (( DATA_ONLY == 1 )); then
  [[ -n "$exists" ]] || die "--data-only 要求目标库已存在：${DB}（请先跑完整供给）"
  MAX_DATA="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
    "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
    || die "--data-only 读取账本失败（fail-closed）"
  MAX_DATA="${MAX_DATA//[^0-9]/}"; MAX_DATA="${MAX_DATA:-0}"
  [[ "$MAX_DATA" == "$ANCHOR" ]] || die "--data-only 要求账本 max(version)=${ANCHOR}（当前 ${MAX_DATA}）；已应用前向迁移时请改跑完整供给 --force-nonempty"
  for t in ${DATA_RESTORE_ORDER//,/ }; do
    present="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "SELECT COALESCE(to_regclass('$t')::text,'')" 2>/dev/null)" \
      || die "--data-only 表存在性探测失败：${t}"
    [[ -n "$(printf '%s' "$present" | tr -d '[:space:]')" ]] || die "--data-only 要求结构已存在，缺少表：${t}"
  done
  DELETE_SQL=""
  for t in ${DATA_REV_ORDER//,/ }; do
    DELETE_SQL+="DELETE FROM ${t}; "
  done
  info "--data-only：按依赖逆序 DELETE 纳入表（不 CASCADE）：${DATA_REV_ORDER}"
  "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -c "$DELETE_SQL" \
    || die "--data-only 清理失败：纳入表可能被外部表引用（如 core_finance_approval_workflows → core_tenants），fail-closed；请先处理引用或改跑完整供给 --force-nonempty"
  info "恢复参考数据..."
  gunzip -c "$DATA_FILE" | "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
    || die "参考数据恢复失败（${DATA_FILE}）"
  verify_data_exact
  verify_key_data
  ok "--data-only 完成：db=${DB}，参考数据 ${DATA_TABLES} 张表 / ${DATA_TOTAL} 行"
  exit 0
fi

if [[ -z "$exists" ]]; then
  info "目标库不存在，创建：${DB}"
  "${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB}\"" \
    || die "创建数据库失败：${DB}（权限不足或实例不可写）"
  ok "已创建 ${DB}"
else
  info "目标库已存在：${DB}，执行非空探测"
  if ! TABLES="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')" 2>&1)"; then
    die "非空探测失败（连接/权限/超时，fail-closed）：$(printf '%s' "$TABLES" | head -1)"
  fi
  TABLES="${TABLES//[^0-9]/}"; TABLES="${TABLES:-0}"
  LEDGER_MAX=0
  LEDGER_ROWS=0
  if ! EXISTS_TBL="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT COALESCE(to_regclass('public._sqlx_migrations')::text,'')" 2>&1)"; then
    die "账本探测失败（fail-closed）：$(printf '%s' "$EXISTS_TBL" | head -1)"
  fi
  if [[ -n "$(printf '%s' "$EXISTS_TBL" | tr -d '[:space:]')" ]]; then
    LEDGER_ROWS="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT count(*) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
      || die "读取账本记录失败（fail-closed）"
    LEDGER_MAX="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
      || die "读取账本最大版本失败（fail-closed）"
    LEDGER_ROWS="${LEDGER_ROWS//[^0-9]/}"; LEDGER_ROWS="${LEDGER_ROWS:-0}"
    LEDGER_MAX="${LEDGER_MAX//[^0-9]/}"; LEDGER_MAX="${LEDGER_MAX:-0}"
  fi
  if (( TABLES > 0 )) || (( LEDGER_ROWS > 0 )); then
    if (( FORCE_NONEMPTY == 0 )); then
      RECOVER_ARGS=(--env "$ENV_NAME")
      if [[ -n "$DSN" ]]; then
        RECOVER_ARGS+=(--dsn "$DSN")
      else
        RECOVER_ARGS+=(--db "$DB")
      fi
      RECOVER_ARGS+=(--admin-only)
      [[ "$ADMIN_USERNAME" == "admin" ]] || RECOVER_ARGS+=(--admin-username "$ADMIN_USERNAME")
      [[ "$ADMIN_EMAIL" == "admin@topems.com" ]] || RECOVER_ARGS+=(--admin-email "$ADMIN_EMAIL")
      (( RESET_ADMIN_PASSWORD == 0 )) || RECOVER_ARGS+=(--reset-admin-password)
      (( ESCALATE_EXISTING == 0 )) || RECOVER_ARGS+=(--escalate-existing)
      # 不回显含口令的运行角色 DSN；需要时由 RUNTIME_DATABASE_URL 环境变量提供
      RUNTIME_DSN_NOTE=""
      if [[ -n "$RUNTIME_DSN" ]]; then
        if [[ "$RUNTIME_DSN" =~ ://[^:@/]+:[^@/]+@ ]]; then
          RUNTIME_DSN_NOTE="  运行角色 DSN 含口令，命令中已省略；请先 export RUNTIME_DATABASE_URL='<你的运行 DSN>'"
        else
          RECOVER_ARGS+=(--runtime-dsn "$RUNTIME_DSN")
        fi
      fi
      [[ -n "$HEALTH_URL" ]] && RECOVER_ARGS+=(--health-url "$HEALTH_URL")
      RECOVER_CMD="$(printf '%q ' bash "$0" "${RECOVER_ARGS[@]}")"

      FORWARD_RECOVER_ARGS=(--anchor "$ANCHOR")
      if [[ -n "$DSN" ]]; then
        FORWARD_RECOVER_ARGS+=(--dsn "$DSN")
      else
        FORWARD_RECOVER_ARGS+=(--db "$DB")
      fi
      [[ "$ENV_NAME" == "prod-replica" ]] && FORWARD_RECOVER_ARGS+=(--prod)
      FORWARD_RECOVER_CMD="$(printf '%q ' bash "$ROOT/scripts/migration/apply-forward.sh" "${FORWARD_RECOVER_ARGS[@]}")"

      REBUILD_ARGS=(--env "$ENV_NAME")
      if [[ -n "$DSN" ]]; then
        REBUILD_ARGS+=(--dsn "$DSN")
      else
        REBUILD_ARGS+=(--db "$DB")
      fi
      REBUILD_ARGS+=(--force-nonempty)
      (( WITH_ADMIN == 0 )) || REBUILD_ARGS+=(--with-admin)
      [[ "$ADMIN_USERNAME" == "admin" ]] || REBUILD_ARGS+=(--admin-username "$ADMIN_USERNAME")
      [[ "$ADMIN_EMAIL" == "admin@topems.com" ]] || REBUILD_ARGS+=(--admin-email "$ADMIN_EMAIL")
      (( RESET_ADMIN_PASSWORD == 0 )) || REBUILD_ARGS+=(--reset-admin-password)
      (( ESCALATE_EXISTING == 0 )) || REBUILD_ARGS+=(--escalate-existing)
      [[ -z "$RUNTIME_DSN_NOTE" ]] && [[ -n "$RUNTIME_DSN" ]] && REBUILD_ARGS+=(--runtime-dsn "$RUNTIME_DSN")
      [[ -n "$HEALTH_URL" ]] && REBUILD_ARGS+=(--health-url "$HEALTH_URL")
      REBUILD_CMD="$(printf '%q ' bash "$0" "${REBUILD_ARGS[@]}")"

      # 磁盘上最新的前向迁移版本（用于判断前向是否已全部应用）
      LATEST_MIG_VERSION=""
      for f in "$ROOT"/database/migrations/[0-9]*_*.sql; do
        [[ -e "$f" ]] || continue
        v="$(basename "$f")"; v="${v%%_*}"
        [[ "$v" =~ ^[0-9]{14}$ ]] || continue
        if [[ -z "$LATEST_MIG_VERSION" || "$v" -gt "$LATEST_MIG_VERSION" ]]; then
          LATEST_MIG_VERSION="$v"
        fi
      done
      [[ -n "$LATEST_MIG_VERSION" ]] || LATEST_MIG_VERSION="$ANCHOR"

      echo -e "${RED}✗ 拒绝：目标库非空（restore 属覆盖写）${NC}" >&2
      echo "  库名        : ${DB} (${TARGET_HOST})" >&2
      echo "  已存在表数  : ${TABLES}" >&2
      echo "  账本        : 成功记录 ${LEDGER_ROWS} 条，最大版本 ${LEDGER_MAX}" >&2
      if (( 10#$LEDGER_MAX >= 10#$LATEST_MIG_VERSION )); then
        echo "" >&2
        echo "  该库已完整供给（含全部前向迁移）：继续创建/校验管理员，请直接执行：" >&2
        echo "    ${RECOVER_CMD}" >&2
        [[ -z "$RUNTIME_DSN_NOTE" ]] || echo "$RUNTIME_DSN_NOTE" >&2
        echo "  不要用 --force-nonempty：它会先 DROP 再重建，并不能解决已有库的续跑问题。" >&2
      else
        echo "" >&2
        echo "  该库前向迁移尚未完成（max(version)=${LEDGER_MAX} < 磁盘最新 ${LATEST_MIG_VERSION}），不能只跑 --admin-only。" >&2
        echo "  如仅是前向未应用完，请执行：" >&2
        echo "    ${FORWARD_RECOVER_CMD}" >&2
        echo "  如前向已失败或结构不完整，请显式清空重建：" >&2
        echo "    ${REBUILD_CMD}" >&2
        [[ -z "$RUNTIME_DSN_NOTE" ]] || echo "$RUNTIME_DSN_NOTE" >&2
      fi
      exit 1
    fi
    warn "--force-nonempty：覆盖非空库 ${DB}（表 ${TABLES} 账本 ${LEDGER_ROWS} 条 max ${LEDGER_MAX}）"
    "${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS \"${DB}\" WITH (FORCE)" \
      -c "CREATE DATABASE \"${DB}\"" \
      || die "重建数据库失败：${DB}"
    ok "已重建 ${DB}"
  else
    ok "目标库为空（表=0，无账本），继续恢复"
  fi
fi

# ── 恢复基线快照 ───────────────────────────────────────────────────────────
info "恢复基线 schema（约 ${META_TABLES} 张表）..."
gunzip -c "$SCHEMA_FILE" | "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
  || die "schema 恢复失败（${SCHEMA_FILE}）"
info "恢复基线账本（${META_ROWS} 条）..."
"${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -f "$LEDGER_FILE" \
  || die "账本恢复失败（${LEDGER_FILE}）"
ok "基线快照恢复完成"

# ── 恢复参考数据（结构之后、前向之前） ─────────────────────────────────────
if (( WITH_DATA == 1 )); then
  info "恢复参考数据（${DATA_TABLES} 张表 / ${DATA_TOTAL} 行）..."
  gunzip -c "$DATA_FILE" | "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
    || die "参考数据恢复失败（${DATA_FILE}）"
  verify_data_exact
else
  warn "跳过参考数据恢复（--no-reference-data）"
fi

# ── 恢复后锚点校验 ─────────────────────────────────────────────────────────
TABLES_AFTER="$(probe "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")" \
  || die "恢复后表数探测失败"
ROWS_AFTER="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE success")" || die "恢复后账本探测失败"
MAX_AFTER="$(probe "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success")" || die "恢复后最大版本探测失败"
ANCHOR_ROW="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE version=${ANCHOR} AND success")" || die "锚点记录探测失败"

[[ "$TABLES_AFTER" == "$META_TABLES" ]] || die "恢复后表数不符：${TABLES_AFTER} ≠ 元数据 ${META_TABLES}"
[[ "$ROWS_AFTER" == "$META_ROWS" ]] || die "恢复后账本条数不符：${ROWS_AFTER} ≠ 元数据 ${META_ROWS}"
[[ "$MAX_AFTER" == "$ANCHOR" ]] || die "恢复后账本最大版本不符：${MAX_AFTER} ≠ 锚点 ${ANCHOR}"
[[ "$ANCHOR_ROW" == "1" ]] || die "账本缺少锚点记录 version=${ANCHOR}（success=true）"
ok "锚点校验通过：表 ${TABLES_AFTER} / 账本 ${ROWS_AFTER} / max(version) ${MAX_AFTER}"

# ── 前向迁移（只应用 > anchor） ─────────────────────────────────────────────
info "前向迁移：apply-forward.sh --anchor ${ANCHOR}"
FORWARD_ARGS=(--anchor "$ANCHOR")
if [[ -n "$DSN" ]]; then
  FORWARD_ARGS+=(--dsn "$DSN")
else
  FORWARD_ARGS+=(--db "$DB")
fi
if [[ "$ENV_NAME" == "prod-replica" ]]; then
  FORWARD_ARGS+=(--prod)
fi
PGHOST="${TARGET_HOST}" PGUSER="${PGUSER:-air}" bash "$ROOT/scripts/migration/apply-forward.sh" "${FORWARD_ARGS[@]}" \
  || die "前向迁移失败（禁止回退 sqlx migrate run）"

ROWS_POST="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE success")" || die "前向后账本探测失败"
MAX_POST="$(probe "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success")" || die "前向后最大版本探测失败"
APPLIED=$(( ROWS_POST - ROWS_AFTER ))
TABLES_POST="$(probe "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")" \
  || die "前向后表数探测失败"

TABLES_DELTA=$(( TABLES_POST - TABLES_AFTER ))
verify_required_tables
(( MAX_POST >= ANCHOR )) || die "前向后 max(version) 落后于锚点：${MAX_POST} < ${ANCHOR}"
if (( APPLIED == 0 )); then
  [[ "$MAX_POST" == "$ANCHOR" ]] || die "无前向迁移但 max(version)=${MAX_POST} ≠ 锚点 ${ANCHOR}"
fi
# 前向迁移允许合法 DROP/重命名，因此只校验必需表与账本，不再用总表数 ≥ 基线
ok "前向完成：新增 ${APPLIED} 条；账本 ${ROWS_POST} 条；表 ${TABLES_AFTER} → ${TABLES_POST}（净变更 ${TABLES_DELTA}）；max(version) ${MAX_POST}"

# ── 参考数据终态校验（前向增量叠加后） ─────────────────────────────────────
if (( WITH_DATA == 1 )); then
  verify_data_after_forward
  verify_key_data
fi

# ── 与 prod 的 10 张核心表结构指纹比对（只读） ─────────────────────────────
CORE_TABLES=(
  "public.core_users" "public.core_roles" "public.core_permissions" "public.core_tenants" "public.core_menus"
  "iam.core_users" "erp.customers" "mes.production_orders" "qms.qa_ehs_hazards" "lims.qa_lab_records"
)

fingerprint_sql() {
  local values="" pair s t
  for pair in "${CORE_TABLES[@]}"; do
    s="${pair%%.*}"; t="${pair#*.}"
    [[ -n "$values" ]] && values+=","
    values+="('${s}','${t}')"
  done
  cat <<SQL
SELECT x.s||'.'||x.t||'|'||
  (SELECT count(*) FROM information_schema.tables WHERE table_schema=x.s AND table_name=x.t)||'|'||
  coalesce((SELECT md5(string_agg(column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''), '|' ORDER BY ordinal_position))
            FROM information_schema.columns WHERE table_schema=x.s AND table_name=x.t),'')||'|'||
  coalesce((SELECT md5(string_agg(constraint_type||':'||constraint_name, '|' ORDER BY constraint_name))
            FROM information_schema.table_constraints WHERE table_schema=x.s AND table_name=x.t),'')
FROM (VALUES ${values}) AS x(s,t) ORDER BY 1
SQL
}

fp_local="$(fingerprint_sql)"
if [[ "$ENV_NAME" == "prod-replica" && "$SKIP_FP" == "1" ]]; then
  die "prod-replica 不允许 --skip-prod-fingerprint（必须与 prod 比对）"
fi
if (( SKIP_FP == 1 )); then
  warn "--skip-prod-fingerprint：跳过 10 张核心表指纹比对（不建议用于 prod-replica）"
  FP_STATUS="skipped"
elif [[ -n "$PROD_DSN" ]]; then
  info "核心表指纹比对：prod（--prod-dsn）"
  fp_prod="$(psql "$PROD_DSN" -X -q -v ON_ERROR_STOP=1 -tAc "$fp_local")" \
    || die "prod 指纹读取失败（--prod-dsn，只读）"
elif [[ -n "$PROD_SSH" ]]; then
  info "核心表指纹比对：prod（--prod-ssh ${PROD_SSH}）"
  fp_prod="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$PROD_SSH" \
    "PATH=/opt/homebrew/bin:\$PATH psql -d \"${PROD_DB}\" -X -q -v ON_ERROR_STOP=1 -tA" <<<"$fp_local")" \
    || die "prod 指纹读取失败（--prod-ssh，只读）"
else
  if [[ "$ENV_NAME" == "prod-replica" ]]; then
    die "prod-replica 必须提供 --prod-ssh 或 --prod-dsn 做 10 张核心表指纹比对"
  fi
  warn "未提供 --prod-ssh/--prod-dsn，跳过 10 张核心表 prod 指纹比对"
  FP_STATUS="skipped"
fi

if [[ "${FP_STATUS:-}" != "skipped" ]]; then
  fp_target="$(probe "$fp_local")" || die "目标库指纹读取失败"
  mismatch=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if ! grep -qxF "$line" <<<"$fp_prod"; then
      echo -e "${RED}✗ 指纹不一致：${line}${NC}" >&2
      mismatch=1
    fi
  done <<<"$fp_target"
  (( mismatch == 0 )) || die "10 张核心表结构指纹与 prod 不一致"
  ok "10 张核心表结构指纹与 prod 一致"
fi
fi  # ADMIN_ONLY == 0

# ── 初始管理员（--with-admin；前向迁移与终态校验之后执行） ────────────────────
admin_tool() {
  if [[ -n "${TOPEMS_ADMIN_PASS_BIN:-}" ]]; then
    "$TOPEMS_ADMIN_PASS_BIN" "$@"
  else
    command -v cargo >/dev/null 2>&1 \
      || die "未找到 cargo；无法构建 topems-admin-pass（可用 TOPEMS_ADMIN_PASS_BIN 指定已构建二进制）"
    # shellcheck source=../lib/swagger-ui.sh
    source "$ROOT/scripts/lib/swagger-ui.sh"
    topems_ensure_swagger_ui_archive || die "swagger-ui 离线包缺失，构建 topems-admin-pass 中止"
    SQLX_OFFLINE=true cargo run --quiet --manifest-path "$ROOT/Cargo.toml" \
      -p topems-unified-core --bin topems-admin-pass -- "$@"
  fi
}

# shellcheck disable=SC2329  # 通过 trap 间接调用
admin_temp_cleanup() {
  if [[ -n "$ADMIN_TMP" && -d "$ADMIN_TMP" ]]; then
    if [[ -f "$ADMIN_HASH_FILE" ]]; then : > "$ADMIN_HASH_FILE"; fi
    if [[ -f "$ADMIN_PASS_FILE" ]]; then : > "$ADMIN_PASS_FILE"; fi
    if [[ -f "$ADMIN_WRONG_FILE" ]]; then : > "$ADMIN_WRONG_FILE"; fi
    rm -rf "$ADMIN_TMP"
  fi
}

admin_temp_init() {
  ADMIN_TMP="$(mktemp -d "${TMPDIR:-/tmp}/topems-admin.XXXXXX")" || die "创建管理员临时目录失败"
  chmod 700 "$ADMIN_TMP"
  ADMIN_HASH_FILE="$ADMIN_TMP/password_hash"
  ADMIN_PASS_FILE="$ADMIN_TMP/password"
  ADMIN_WRONG_FILE="$ADMIN_TMP/wrong_password"
  trap 'admin_temp_cleanup' EXIT
}

admin_prepare_material() {
  admin_temp_init
  if (( ADMIN_PASSWORD_STDIN == 1 )); then
    if [[ -t 0 ]]; then
      warn "从 stdin 读取管理员密码（输入后回车；不会回显）"
    fi
    admin_tool hash --out "$ADMIN_HASH_FILE" --password-out "$ADMIN_PASS_FILE" < /dev/stdin \
      || die "管理员密码不符合产品校验规则（最少 8 位，且同时包含大写字母、小写字母和数字）或哈希自校验失败"
  else
    admin_tool hash --generate --out "$ADMIN_HASH_FILE" --password-out "$ADMIN_PASS_FILE" \
      || die "随机密码生成或哈希自校验失败"
  fi
  ADMIN_HASH="$(cat "$ADMIN_HASH_FILE")" || die "读取临时哈希失败"
  case "$ADMIN_HASH" in
    \$2*) : ;;
    *) die "生成的哈希不是 bcrypt 格式" ;;
  esac
  if (( ADMIN_PASSWORD_STDIN == 0 )); then
    ADMIN_PLAIN="$(cat "$ADMIN_PASS_FILE")" || die "读取临时密码失败"
    printf '\n%s\n' "初始管理员密码（仅本次显示）：${ADMIN_PLAIN}" >&2
    printf '%s\n' "⚠️  请立即保存；本脚本不会再次显示，也不会写入仓库/日志。" >&2
    unset ADMIN_PLAIN
  else
    printf '%s\n' "初始管理员密码来自 stdin（未回显）；如需落盘请使用 --admin-password-file。" >&2
  fi
  if [[ -n "$ADMIN_PASSWORD_FILE_ABS" ]]; then
    install -m 600 "$ADMIN_PASS_FILE" "$ADMIN_PASSWORD_FILE_ABS" || die "写入管理员密码文件失败"
    ok "管理员密码已写入 0600 文件：${ADMIN_PASSWORD_FILE_ABS}"
  fi
}

admin_binding_ensure() {
  local uid="$1"
  "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -c \
    "INSERT INTO public.core_user_roles (user_id, role_id) VALUES ('${uid}', '${ROLE_ID}') ON CONFLICT DO NOTHING" \
    || die "写入 core_user_roles 失败"
}

admin_verify_row() {
  local uid="$1" require_super="$2" row status superuser live
  row="$(probe "SELECT status||'|'||is_superuser::text||'|'||(deleted_at IS NULL)::text FROM iam.users WHERE id='${uid}'")" \
    || die "读取管理员用户行失败"
  [[ -n "$row" ]] || die "管理员用户行不存在：${uid}"
  IFS='|' read -r status superuser live <<< "$row"
  [[ "$live" == "true" ]] || die "管理员用户已被软删除：${uid}"
  [[ "$status" == "active" ]] || die "管理员用户状态非 active（${status}）"
  if [[ "$superuser" != "true" ]]; then
    (( require_super == 0 )) || die "新建管理员 is_superuser 非 true"
    warn "既有用户 is_superuser=false：角色权限以 core_user_roles 为准，可能不足以管理环境"
  fi
  ok "用户行校验通过：status=active / deleted_at IS NULL"
}

admin_verify_binding() {
  local uid="$1" n
  n="$(probe "SELECT count(*) FROM public.core_user_roles ur JOIN public.core_roles r ON r.id=ur.role_id WHERE ur.user_id='${uid}' AND r.name='admin' AND r.deleted_at IS NULL")" \
    || die "管理员角色绑定探测失败"
  [[ "$n" == "1" ]] || die "管理员角色绑定异常（期望 1，实际 ${n}）"
  ok "角色绑定校验通过：core_user_roles → core_roles(name=admin)"
}

admin_verify_password() {
  local uid="$1" db_hash_file="$ADMIN_TMP/db_hash" lines
  "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
    "SELECT password_hash FROM iam.users WHERE id='${uid}' AND deleted_at IS NULL" > "$db_hash_file" \
    || die "读取 iam.users.password_hash 失败"
  lines="$(wc -l < "$db_hash_file" | tr -d '[:space:]')"
  [[ "$lines" == "1" ]] || die "password_hash 行数异常：${lines}"
  admin_tool verify --hash-file "$db_hash_file" < "$ADMIN_PASS_FILE" \
    || die "正例失败：登录校验函数不接受库内哈希"
  { cat "$ADMIN_PASS_FILE"; printf 'x'; } > "$ADMIN_WRONG_FILE" || die "构造错误密码失败"
  local wrong_rc=0
  admin_tool verify --hash-file "$db_hash_file" < "$ADMIN_WRONG_FILE" || wrong_rc=$?
  (( wrong_rc == 1 )) || die "反例校验异常（期望退出 1，实际 ${wrong_rc}）"
  rm -f "$db_hash_file"
  ok "密码哈希正/反向校验通过（verify_password 同一实现）"
}

provision_admin() {
  local role_count match_ids uid deleted existing_username
  info "初始管理员：username=${ADMIN_USERNAME} email=${ADMIN_EMAIL}"

  role_count="$(probe "SELECT count(*) FROM public.core_roles WHERE name='admin' AND deleted_at IS NULL")" \
    || die "admin 角色探测失败（参考数据未恢复？）"
  [[ "$role_count" == "1" ]] || die "参考数据中 admin 角色应唯一存在（实际 ${role_count}）；请先恢复参考数据"
  ROLE_ID="$(probe "SELECT id FROM public.core_roles WHERE name='admin' AND deleted_at IS NULL")" \
    || die "读取 admin 角色 id 失败"

  match_ids="$(probe "SELECT COALESCE(string_agg(DISTINCT id::text, ','), '') FROM iam.users WHERE username='${ADMIN_USERNAME}' OR email='${ADMIN_EMAIL}'")" \
    || die "管理员存在性探测失败"
  if [[ -n "$match_ids" ]]; then
    [[ "$match_ids" != *,* ]] \
      || die "username/email 命中多个用户（${match_ids}），无法安全判定，请人工处理"
    uid="$match_ids"
    deleted="$(probe "SELECT CASE WHEN deleted_at IS NULL THEN '0' ELSE '1' END FROM iam.users WHERE id='${uid}'")" \
      || die "读取用户删除状态失败"
    [[ "$deleted" == "0" ]] \
      || die "同名/同邮箱用户已软删除并占用唯一约束；请人工恢复或更换 --admin-username/--admin-email"

    # 安全护栏：仅按 email 命中（用户名不同）时不得把既有普通用户提升为管理员
    existing_username="$(probe "SELECT username FROM iam.users WHERE id='${uid}'")" \
      || die "读取既有用户名失败"
    [[ "$existing_username" == "$ADMIN_USERNAME" ]] \
      || die "邮箱 ${ADMIN_EMAIL} 已被用户 ${existing_username} 占用；拒绝将其提升为管理员，请更换 --admin-email"

    local admin_bound
    admin_bound="$(probe "SELECT count(*) FROM public.core_user_roles ur JOIN public.core_roles r ON r.id=ur.role_id WHERE ur.user_id='${uid}' AND r.name='admin' AND r.deleted_at IS NULL")" \
      || die "既有用户 admin 角色绑定探测失败"
    admin_bound="${admin_bound//[^0-9]/}"; admin_bound="${admin_bound:-0}"
    if (( admin_bound == 0 )); then
      if (( ESCALATE_EXISTING == 0 )); then
        die "用户 ${ADMIN_USERNAME} <${ADMIN_EMAIL}> 已存在但不是管理员；默认拒绝提升。
  确认要把该既有用户提升为管理员，请显式追加 --escalate-existing（不会修改其密码）。"
      fi
      warn "⚠️  --escalate-existing：将把既有用户 ${ADMIN_USERNAME} <${ADMIN_EMAIL}> 提升为管理员（保留原密码）"
    fi

    if (( RESET_ADMIN_PASSWORD == 0 )); then
      info "用户已存在，跳过创建与密码修改（如需重置请显式 --reset-admin-password）"
      admin_binding_ensure "$uid"
      admin_verify_row "$uid" 0
      admin_verify_binding "$uid"
      ok "已存在，跳过（未修改密码）"
      return 0
    fi

    info "已显式 --reset-admin-password：重置既有用户密码"
    admin_prepare_material
    "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -c \
      "UPDATE iam.users SET password_hash='${ADMIN_HASH}', password_changed_at=now(), updated_at=now(), failed_login_attempts=0, locked_until=NULL WHERE id='${uid}'" \
      || die "重置管理员密码失败"
    admin_binding_ensure "$uid"
    admin_verify_row "$uid" 0
    admin_verify_binding "$uid"
    admin_verify_password "$uid"
    ok "管理员密码已重置并校验通过"
    return 0
  fi

  info "创建初始管理员..."
  admin_prepare_material
  NEW_ID="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tA <<SQL
INSERT INTO iam.users (username, email, password_hash, full_name, full_name_en, status, is_superuser, is_active, roles)
VALUES ('${ADMIN_USERNAME}', '${ADMIN_EMAIL}', '${ADMIN_HASH}', 'System Administrator', 'System Administrator', 'active', true, true, ARRAY['admin'])
RETURNING id;
SQL
)" || die "创建管理员用户失败"
  NEW_ID="$(printf '%s' "$NEW_ID" | tr -d '[:space:]')"
  [[ "$NEW_ID" =~ ^[0-9a-fA-F-]{36}$ ]] || die "创建后返回的用户 id 异常"

  admin_binding_ensure "$NEW_ID"
  admin_verify_row "$NEW_ID" 1
  admin_verify_binding "$NEW_ID"
  admin_verify_password "$NEW_ID"
  ok "初始管理员创建并校验通过：${ADMIN_USERNAME} <${ADMIN_EMAIL}>"
}

if (( ADMIN_ONLY == 1 )); then
  ADMIN_EXISTS="$("${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM pg_database WHERE datname='${DB}'" 2>/dev/null)" \
    || die "--admin-only 无法查询 pg_database（fail-closed）"
  [[ -n "$ADMIN_EXISTS" ]] || die "--admin-only 要求目标库已存在：${DB}（请先执行完整供给）"
  MAX_ADMIN="$(probe "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success")" \
    || die "--admin-only 读取账本失败（库未供给或缺少 _sqlx_migrations）"
  MAX_ADMIN="${MAX_ADMIN//[^0-9]/}"; MAX_ADMIN="${MAX_ADMIN:-0}"
  (( 10#$MAX_ADMIN >= 10#$ANCHOR )) \
    || die "--admin-only 要求库已供给到锚点（max(version)=${MAX_ADMIN} < ${ANCHOR}）"
  verify_key_data
  provision_admin
  run_post_provision_checks

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}管理员步骤完成（admin-only）：${ENV_NAME} / ${DB}${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo "  模式        : admin-only（未改动结构/参考数据/迁移）"
  echo "  初始管理员  : ${ADMIN_USERNAME} <${ADMIN_EMAIL}>"
  exit 0
fi

if (( WITH_ADMIN == 1 )); then
  provision_admin
fi
run_post_provision_checks

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}环境供给完成：${ENV_NAME} / ${DB}${NC}"
echo -e "${GREEN}========================================${NC}"
echo "  基线锚点    : ${ANCHOR}"
echo "  表数        : ${TABLES_POST}（基线 ${TABLES_AFTER} + 前向净变更 ${TABLES_DELTA}）"
echo "  账本        : ${ROWS_POST} 条（基线 ${ROWS_AFTER} + 前向 ${APPLIED}）"
echo "  max(version): ${MAX_POST}"
echo "  运行角色    : ${RUNTIME_ROLE}（已授权并连接自检）"
if (( WITH_DATA == 1 )); then
  echo "  参考数据    : ${DATA_TABLES} 张表 / ${DATA_TOTAL} 行（基线快照 + 前向增量）"
else
  echo "  参考数据    : 已跳过（--no-reference-data）"
fi
if (( WITH_ADMIN == 1 )); then
  echo "  初始管理员  : ${ADMIN_USERNAME} <${ADMIN_EMAIL}>（密码仅上方显示一次）"
else
  echo "  初始管理员  : 未创建（--with-admin 未启用）"
fi
exit 0
