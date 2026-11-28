#!/bin/bash
# =============================================
# TOPEMS 一键部署脚本
# =============================================
# 定位：现役版本升级走 docs/deploy/release-pipeline.md（air 出包 → xingzhai 本机
#       免构建替换，生产机不构建）；本脚本为兼容/兜底入口。
# 角色口径：生产机即本机 xingzhai。默认 PROD_HOST 留空 = 本机直连；仅显式
#       部署到其他远端时经环境变量 PROD_HOST=user@host 提供。退役地址
#       192.168.110.115 / 192.168.3.129 不再内置为本机目标。
# 用法:
#   ./scripts/deploy-prod.sh              # 部署后端（编译+上传+重启+健康检查）
#   ./scripts/deploy-prod.sh --frontend   # 同时部署前端（编译 dist + rsync）
#   ./scripts/deploy-prod.sh --rollback   # 回滚到上一个备份
#   ./scripts/deploy-prod.sh --status     # 只看状态
#   ./scripts/deploy-prod.sh --skip-build  # 跳过本地编译（用现有二进制；缺失时自动回退最近 release 包）
#   ./scripts/deploy-prod.sh --bin <路径>   # 直接指定现成二进制（隐含跳过编译）
#   ./scripts/deploy-prod.sh --reset-db   # 重置数据库（清空测试数据+插入部门+岗位+角色+字典）
#   ./scripts/deploy-prod.sh --seed-departments  # 只插入标准部门（不清库）
#   ./scripts/deploy-prod.sh --seed-positions    # 只插入标准岗位（不清库）
#   ./scripts/deploy-prod.sh --seed-roles        # 只插入默认角色（不清库）
#   ./scripts/deploy-prod.sh --seed-dict         # 只插入系统字典（不清库）
#   ./scripts/deploy-prod.sh --seed-settings   # 只插入系统参数（密码策略/会话超时/上传限制，不清库）
#   ./scripts/deploy-prod.sh --force             # 跳过所有确认提示
# =============================================

set -e

# ── 配置 ──
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 生产机即本机 xingzhai：PROD_HOST 留空（默认）时命令本地执行；
# 仅当显式部署到其他远端时才经环境变量 PROD_HOST=user@host 提供。
# 退役地址 192.168.110.115 / 192.168.3.129 不再内置为本机目标。
PROD_HOST="${PROD_HOST:-}"
PROD_BIN_DIR="/Users/xingzhai/topems/bin"
PROD_REPO_DIR="/Users/xingzhai/TOPEMS"
LOCAL_REPO="$ROOT"
# 绝对路径：不依赖执行时 CWD（2026-11-05 修复：相对路径 ./target/release 导致 --skip-build 误判缺失）
LOCAL_BIN="$LOCAL_REPO/target/release/topems-server"
BIN_OVERRIDE=""                                  # --bin 显式指定
RELEASE_DIR="$HOME/topems-release"               # 历史 release 包存档（--skip-build 自动回退来源）
LAUNCHD_LABEL="com.topems.server"
HEALTH_URL="http://127.0.0.1:8099/api/server/health"   # 进程默认只监听回环（BIND_ADDR 缺省 127.0.0.1）
HEALTH_TIMEOUT=60  # 秒
PSQL_PATH="/opt/homebrew/bin/psql"
DB_NAME="topems_prod"
DB_USER="topems_prod"
# 本机直连 prod 库（unix socket）；远端模式下经 ssh 以 DB_USER 连接
PROD_LOCAL_USER="${PROD_LOCAL_USER:-xingzhai}"
PROD_LOCAL_PGHOST="${PROD_LOCAL_PGHOST:-/tmp}"

# ── 本机 / 远端双模式封装 ──
# PROD_HOST 为空：生产机就是本机，命令本地执行；非空：ssh/scp/rsync 到指定远端（兜底）。
run_prod() {
  local cmd="$1"
  if [ -n "$PROD_HOST" ]; then ssh $PROD_HOST "$cmd"; else bash -c "$cmd"; fi
}
push_prod() {  # $1 本地文件  $2 目标路径（本机路径或远端绝对路径）
  local src="$1" dst="$2"
  if [ -n "$PROD_HOST" ]; then scp "$src" "$PROD_HOST:$dst"; else cp "$src" "$dst"; fi
}
sync_prod() {  # $1 本地目录（带 /）  $2 目标目录
  local src="$1" dst="$2"
  if [ -n "$PROD_HOST" ]; then rsync -avz --delete "$src/" "$PROD_HOST:$dst/"; else rsync -a --delete "$src/" "$dst/"; fi
}
pipe_prod() {  # 把本地脚本经 stdin 送到目标执行，其余参数透传
  local script="$1"; shift
  if [ -n "$PROD_HOST" ]; then ssh $PROD_HOST 'bash -s -- "$@"' _ "$@" < "$script"; else bash "$script" "$@"; fi
}

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 参数解析 ──
DO_BUILD=true
DO_FRONTEND=false
DO_ROLLBACK=false
DO_STATUS=false
DO_RESET_DB=false
SEED_DEPTS=false
SEED_POSITIONS=false
SEED_ROLES=false
SEED_DICT=false
FORCE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --frontend)        DO_FRONTEND=true ;;
    --rollback)        DO_ROLLBACK=true ;;
    --skip-build)      DO_BUILD=false ;;
    --status)          DO_STATUS=true ;;
    --reset-db)        DO_RESET_DB=true ;;
    --seed-departments) SEED_DEPTS=true ;;
    --seed-positions)   SEED_POSITIONS=true ;;
    --seed-roles)       SEED_ROLES=true ;;
    --seed-dict)        SEED_DICT=true ;;
    --seed-settings)     SEED_SETTINGS=true ;;
    --force)           FORCE=true ;;
    --bin)
      [ -n "${2:-}" ] || error "--bin 需要参数：--bin <二进制路径>"
      BIN_OVERRIDE="$2"; DO_BUILD=false; shift ;;
    --bin=*)
      BIN_OVERRIDE="${1#--bin=}"; DO_BUILD=false ;;
    -h|--help)
      grep '^#' "$0" | head -21
      exit 0 ;;
    *) error "未知参数: $1" ;;
  esac
  shift
done

# ── 状态模式 ──
if [ "$DO_STATUS" = true ]; then
  info "=== 生产机状态 ==="
  run_prod "
    echo '--- 后端进程 ---'
    launchctl list | grep $LAUNCHD_LABEL || echo '未运行'
    echo '--- 端口监听 ---'
    lsof -i :8099 2>/dev/null | head -3
    echo '--- nginx ---'
    launchctl list | grep com.topems.nginx || echo '未运行'
    lsof -i :80 2>/dev/null | head -3
    echo '--- 健康检查 ---'
    curl -s $HEALTH_URL | head -50
    echo '--- 最近备份 ---'
    ls -lt $PROD_BIN_DIR/topems-server-*.bak 2>/dev/null | head -3
  "
  exit 0
fi

# ── 回滚模式 ──
if [ "$DO_ROLLBACK" = true ]; then
  info "=== 回滚到上一个备份 ==="
  run_prod "
    cd $PROD_BIN_DIR
    LATEST_BAK=\$(ls -t topems-server-*.bak 2>/dev/null | head -1)
    if [ -z \"\$LATEST_BAK\" ]; then
      echo 'ERROR: 没有找到备份文件'
      exit 1
    fi
    echo '回滚到: '\$LATEST_BAK
    cp topems-server topems-server.before-rollback-\$(date +%Y%m%d-%H%M%S)
    cp \$LATEST_BAK topems-server
    chmod +x topems-server
    launchctl kickstart -k gui/\$(id -u)/$LAUNCHD_LABEL
    echo '已重启，等待健康检查...'
  "
  sleep 10
  run_prod "curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL" | grep -q 200 \
    && info "回滚成功" || error "回滚后健康检查失败"
  exit 0
fi

# ── 前置检查 ──
info "=== 前置检查 ==="

# 确认在本地仓库根目录
if [ ! -f "$LOCAL_REPO/Cargo.toml" ]; then
  error "请在 TOPEMS 仓库根目录执行此脚本"
fi
cd "$LOCAL_REPO"

# 确认 git 干净
if [ -n "$(git status --porcelain)" ]; then
  warn "工作区有未提交变更："
  git status --short
  if [ "$FORCE" = false ]; then
    read -p "继续部署？(y/N) " ans
    [ "$ans" = "y" ] || exit 0
  else
    warn "--force 模式，跳过确认"
  fi
fi

# 确认与远端同步
git fetch origin main --quiet
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main)
if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  error "本地 HEAD 与 origin/main 不一致，请先 pull/push"
fi
info "git 状态 OK (HEAD=$(git rev-parse --short HEAD))"

# 连通性预检
if [ -n "$PROD_HOST" ]; then
  info "测试远端 SSH 连通性..."
  ssh -o ConnectTimeout=5 $PROD_HOST "hostname" > /dev/null || error "SSH 连接失败"
  info "SSH OK"
else
  info "本机模式：生产机即本机，跳过 SSH 连通性检查"
fi

# ── 1. 二进制解析 / 编译（必须先于任何破坏性步骤：避免"先清库、后报无二进制"）──
# 2026-11-05 教训：旧版把本步骤放在 --reset-db 之后，二进制缺失时数据库已被清空才报错。
resolve_bin_or_die() {
  [ -f "$LOCAL_BIN" ] && return 0
  # 回退：最近一份 release 存档包
  local latest inner tmpdir
  latest=$(ls -t "$RELEASE_DIR"/topems-server-*.tar.gz 2>/dev/null | head -1)
  if [ -n "$latest" ]; then
    tmpdir="$LOCAL_REPO/target/tmp/release-fallback"
    rm -rf "$tmpdir"; mkdir -p "$tmpdir" "$(dirname "$LOCAL_BIN")"
    tar -xzf "$latest" -C "$tmpdir" 2>/dev/null
    inner=$(find "$tmpdir" -type f -name topems-server | head -1)
    if [ -n "$inner" ]; then
      cp "$inner" "$LOCAL_BIN" && chmod +x "$LOCAL_BIN"
      warn "未找到 ${LOCAL_BIN}，已自动回退使用历史 release 包：$(basename "$latest")"
      warn "注意：该二进制可能不是当前 HEAD 的构建，上线前请确认版本"
      rm -rf "$tmpdir"
      return 0
    fi
    rm -rf "$tmpdir"
  fi
  error "未找到二进制 ${LOCAL_BIN}，且无可回退的历史 release 包。请三选一：① 去掉 --skip-build 正常编译；② --bin <现成二进制绝对路径>；③ 先手动放置到 $LOCAL_BIN"
}

info "=== 步骤 1/5: 二进制解析与编译 ==="
if [ -n "$BIN_OVERRIDE" ]; then
  [ -f "$BIN_OVERRIDE" ] || error "--bin 指定的文件不存在：$BIN_OVERRIDE"
  LOCAL_BIN="$BIN_OVERRIDE"
elif [ "$DO_BUILD" = true ]; then
  # 网络受限环境兜底：统一探测本地 swagger-ui 离线包（禁止联网下载）
  # shellcheck source=lib/swagger-ui.sh
  source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/swagger-ui.sh"
  topems_ensure_swagger_ui_archive || error "swagger-ui 离线包缺失，编译中止（见上方指引）"
  info "本地编译 release（cargo build --release -p topems-server）..."
  cargo build --release -p topems-server 2>&1 | tail -5
  [ -f "$LOCAL_BIN" ] || error "编译失败，二进制不存在：$LOCAL_BIN"
else
  info "跳过编译，解析现有二进制..."
  resolve_bin_or_die
fi
[ -s "$LOCAL_BIN" ] || error "二进制为空文件：$LOCAL_BIN"
file "$LOCAL_BIN" | grep -q "Mach-O" || warn "目标二进制不是 macOS Mach-O 格式，请确认：$(file "$LOCAL_BIN")"
info "待部署二进制: $(ls -lh "$LOCAL_BIN" | awk '{print $5}')  $LOCAL_BIN"

# ── 迁移账本预检（只提示不阻断；迁移不会随服务启动自动补跑，prod 唯一入口 apply-forward.sh）──
LOCAL_MIG_COUNT=$(ls "$LOCAL_REPO"/database/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ -n "$PROD_HOST" ]; then
  PSQL_PROD_PREFIX="$PSQL_PATH -U $DB_USER -d $DB_NAME"
else
  PSQL_PROD_PREFIX="$PSQL_PATH -h $PROD_LOCAL_PGHOST -U $PROD_LOCAL_USER -d $DB_NAME"
fi
PROD_MIG_COUNT=$(run_prod "$PSQL_PROD_PREFIX -Atc 'SELECT count(*) FROM _sqlx_migrations'" 2>/dev/null | head -1 | tr -d ' ')
PROD_MIG_COUNT=${PROD_MIG_COUNT:-?}
info "迁移账本: 本地 $LOCAL_MIG_COUNT 个迁移文件 / 生产 $PROD_MIG_COUNT 条"
info "prod 迁移唯一入口: scripts/migration/apply-forward.sh --prod（基线 + 前向迁移）；禁止在 prod 执行 sqlx migrate run"
if [ "$PROD_MIG_COUNT" != "?" ]; then
  if [ "$PROD_MIG_COUNT" -lt "$LOCAL_MIG_COUNT" ] 2>/dev/null; then
    warn "生产账本少于本地 $((LOCAL_MIG_COUNT - PROD_MIG_COUNT)) 个迁移（多为 test/5433 定向迁移，仅需按需应用）。注意：二进制不内嵌迁移，重启不会自动补跑；需应用时走 scripts/migration/apply-forward.sh --prod，禁止 sqlx migrate run"
  fi
else
  warn "无法读取生产迁移账本（psql 连接失败），跳过数量对比"
fi

# ── 数据库重置（可选）──
if [ "$DO_RESET_DB" = true ]; then
  info "=== 重置数据库 ==="
  warn "将清空 hrm 测试数据并插入标准部门+岗位"
  if [ "$FORCE" = false ]; then
    read -p "确认重置？(y/N) " ans
    [ "$ans" = "y" ] || exit 0
  fi

  # 生成重置 SQL（只清数据，不 seed）
  cat > /tmp/topems-reset-only.sql << 'SQL_EOF'
-- =============================================
-- 重置系统初始化状态（回到全新部署状态）
-- =============================================

-- 1. 初始化状态表
TRUNCATE hrm.initialization_status CASCADE;
TRUNCATE hrm.initialization_logs CASCADE;

-- 2. 业务数据（按外键依赖顺序倒序删除）
TRUNCATE hrm.positions CASCADE;
TRUNCATE hrm.departments CASCADE;
TRUNCATE hrm.companies CASCADE;

-- 3. 员工档案（iam.users 的 admin 账号保留不动）
TRUNCATE hrm.employees CASCADE;

-- 验证
SELECT 'after reset: departments' AS tbl, count(*) FROM hrm.departments WHERE deleted_at IS NULL
UNION ALL SELECT 'after reset: positions', count(*) FROM hrm.positions WHERE deleted_at IS NULL;
SQL_EOF

  push_prod /tmp/topems-reset-only.sql /tmp/topems-reset-only.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/topems-reset-only.sql"
  info "数据库重置完成"

  # 重置后自动 seed 部门+岗位+角色+字典
  info "插入标准部门+岗位+角色+字典 seed..."
  push_prod $LOCAL_REPO/database/seeds/standard_departments.sql /tmp/seed_departments.sql
  push_prod $LOCAL_REPO/database/seeds/standard_positions.sql /tmp/seed_positions.sql
  push_prod $LOCAL_REPO/database/seeds/default_roles.sql /tmp/seed_roles.sql
  push_prod $LOCAL_REPO/database/seeds/default_dict_data.sql /tmp/seed_dict.sql
  push_prod $LOCAL_REPO/database/seeds/system_settings.sql /tmp/seed_settings.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_departments.sql"
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_positions.sql"
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_roles.sql"
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_dict.sql"
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_settings.sql"
  info "标准部门+岗位+角色+字典+系统参数 seed 完成"
fi

# ── 只插入标准部门（不清库）──
if [ "$SEED_DEPTS" = true ]; then
  info "=== 插入标准部门 seed ==="
  push_prod $LOCAL_REPO/database/seeds/standard_departments.sql /tmp/seed_departments.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_departments.sql"
  info "标准部门 seed 完成"
fi

# ── 只插入标准岗位（不清库）──
if [ "$SEED_POSITIONS" = true ]; then
  info "=== 插入标准岗位 seed ==="
  push_prod $LOCAL_REPO/database/seeds/standard_positions.sql /tmp/seed_positions.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_positions.sql"
  info "标准岗位 seed 完成"
fi

# ── 只插入默认角色（不清库）──
if [ "$SEED_ROLES" = true ]; then
  info "=== 插入默认角色 seed ==="
  push_prod $LOCAL_REPO/database/seeds/default_roles.sql /tmp/seed_roles.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_roles.sql"
  info "默认角色 seed 完成"
fi

# ── 只插入系统字典（不清库）──
if [ "$SEED_DICT" = true ]; then
  info "=== 插入系统字典 seed ==="
  push_prod $LOCAL_REPO/database/seeds/default_dict_data.sql /tmp/seed_dict.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_dict.sql"
  info "系统字典 seed 完成"
fi

# ── 只插入系统参数（密码策略/会话超时/上传限制，不清库）──
if [ "$SEED_SETTINGS" = true ]; then
  info "=== 插入系统参数 seed ==="
  push_prod $LOCAL_REPO/database/seeds/system_settings.sql /tmp/seed_settings.sql
  run_prod "$PSQL_PROD_PREFIX -f /tmp/seed_settings.sql"
  info "系统参数 seed 完成"
fi

# ── 环境变量检查 ──
info "=== 检查生产机环境变量配置 ==="
run_prod "
  PLIST=~/Library/LaunchAgents/com.topems.server.plist
  echo 'ENCRYPTION_MASTER_KEY:' \$(grep -A1 'ENCRYPTION_MASTER_KEY' \$PLIST | grep -c '<string>' || echo '未配置')
  echo 'JWT_SECRET:' \$(grep -A1 'JWT_SECRET' \$PLIST | grep -c '<string>' || echo '未配置')
  echo 'JWT_REFRESH_SECRET:' \$(grep -A1 'JWT_REFRESH_SECRET' \$PLIST | grep -c '<string>' || echo '未配置')
" | while read line; do
  key=$(echo "$line" | cut -d: -f1)
  val=$(echo "$line" | cut -d: -f2 | tr -d ' ')
  if [ "$val" = "0" ] || [ "$val" = "未配置" ]; then
    warn "  $key 未配置！登录会失败"
  else
    info "  $key: OK"
  fi
done

# ── 2. 生产机备份 ──
info "=== 步骤 2/5: 生产机备份旧二进制 ==="
COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
run_prod "
  cd $PROD_BIN_DIR
  cp topems-server topems-server-${COMMIT}-${TIMESTAMP}.bak
  ls -lh topems-server-${COMMIT}-${TIMESTAMP}.bak | awk '{print \"备份: \" \$9 \" (\" \$5 \")\"}'
"

# ── 3. 上传新二进制 ──
info "=== 步骤 3/5: 上传新二进制 ==="
push_prod "$LOCAL_BIN" "$PROD_BIN_DIR/topems-server.new"
run_prod "chmod +x $PROD_BIN_DIR/topems-server.new"
info "上传完成"

# ── 4. 替换 + 重启 ──
info "=== 步骤 4/5: 替换 + launchd 重启 ==="
run_prod "
  cd $PROD_BIN_DIR
  mv topems-server.new topems-server
  chmod +x topems-server
  launchctl kickstart -k gui/\$(id -u)/$LAUNCHD_LABEL
  echo '已发送重启信号'
"

# ── 5. 健康检查 ──
info "=== 步骤 5/5: 健康检查 ==="
for i in $(seq 1 $HEALTH_TIMEOUT); do
  RESULT=$(run_prod "curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL 2>/dev/null" || echo "000")
  if [ "$RESULT" = "200" ]; then
    info "健康检查通过（${i}s）"
    run_prod "curl -s $HEALTH_URL" | head -c 200
    echo ""
    break
  fi
  sleep 1
  if [ $i -eq $HEALTH_TIMEOUT ]; then
    error "健康检查超时（${HEALTH_TIMEOUT}s），回滚中..."
    run_prod "cd $PROD_BIN_DIR && cp topems-server-${COMMIT}-${TIMESTAMP}.bak topems-server && launchctl kickstart -k gui/\$(id -u)/$LAUNCHD_LABEL"
    error "已自动回滚"
  fi
done

# ── 前端部署（可选）──
if [ "$DO_FRONTEND" = true ]; then
  info "=== 部署前端 ==="
  cd apps/web && pnpm build 2>&1 | tail -5
  DIST_DIR="./dist"
  PROD_DIST_NAME="topems-${COMMIT}-$(date +%Y%m%d)"
  run_prod "mkdir -p $PROD_REPO_DIR/dist/$PROD_DIST_NAME"
  sync_prod "$DIST_DIR" "$PROD_REPO_DIR/dist/$PROD_DIST_NAME/web"
  # 更新 nginx root 软链接
  run_prod "
    cd $PROD_REPO_DIR/dist
    ln -sfn $PROD_DIST_NAME/web current
    # 更新 nginx 配置里的 root 路径（HTTP 与 HTTPS 同步到同一版本目录）
    for conf in /opt/homebrew/etc/nginx/servers/topems.conf /opt/homebrew/etc/nginx/servers/topems-ssl.conf; do
      sed -i '' \"s|root .*dist/.*web;|root $PROD_REPO_DIR/dist/current;|\" \"\$conf\"
    done
  "
  # 门禁：nginx -t 必须语法通过且零 [warn]（stdout+stderr 都捕获），通过后才 reload
  pipe_prod "$LOCAL_REPO/scripts/verify-nginx-config.sh" --require
  run_prod '/opt/homebrew/bin/nginx -s reload'
  info "前端部署完成: $PROD_DIST_NAME"
fi

# ── 完成 ──
info ""
info "=========================================="
info "  部署完成!"
info "  版本: $COMMIT"
info "  时间: $TIMESTAMP"
info "  访问: http://127.0.0.1:8099/（本机回环；nginx 对外入口见 macos-production-ops.md）"
info "=========================================="
