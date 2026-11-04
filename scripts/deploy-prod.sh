#!/bin/bash
# =============================================
# TOPEMS 一键部署脚本（air → xingzhai）
# =============================================
# 用法:
#   ./scripts/deploy-prod.sh              # 部署后端（编译+上传+重启+健康检查）
#   ./scripts/deploy-prod.sh --frontend   # 同时部署前端（编译 dist + rsync）
#   ./scripts/deploy-prod.sh --rollback   # 回滚到上一个备份
#   ./scripts/deploy-prod.sh --status     # 只看状态
#   ./scripts/deploy-prod.sh --skip-build # 跳过本地编译（用现有二进制）
#   ./scripts/deploy-prod.sh --reset-db   # 重置数据库（清空测试数据+初始化部门）
#   ./scripts/deploy-prod.sh --force      # 跳过所有确认提示
# =============================================

set -e

# ── 配置 ──
PROD_HOST="xingzhai@192.168.110.115"
PROD_BIN_DIR="/Users/xingzhai/topems/bin"
PROD_REPO_DIR="/Users/xingzhai/TOPEMS"
LOCAL_BIN="./target/release/topems-server"
LOCAL_REPO="/Users/air/TOPEMS"
LAUNCHD_LABEL="com.topems.server"
HEALTH_URL="http://localhost:8099/api/server/health"
HEALTH_TIMEOUT=60  # 秒
PSQL_PATH="/opt/homebrew/bin/psql"
DB_NAME="topems_prod"
DB_USER="topems_prod"

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
FORCE=false

for arg in "$@"; do
  case $arg in
    --frontend)   DO_FRONTEND=true ;;
    --rollback)   DO_ROLLBACK=true ;;
    --skip-build) DO_BUILD=false ;;
    --status)     DO_STATUS=true ;;
    --reset-db)   DO_RESET_DB=true ;;
    --force)      FORCE=true ;;
    -h|--help)
      grep '^#' "$0" | head -20
      exit 0 ;;
    *) error "未知参数: $arg" ;;
  esac
done

# ── 状态模式 ──
if [ "$DO_STATUS" = true ]; then
  info "=== 生产机状态 ==="
  ssh $PROD_HOST "
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
  ssh $PROD_HOST "
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
  ssh $PROD_HOST "curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL" | grep -q 200 \
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

# SSH 连通性
info "测试 SSH 连通性..."
ssh -o ConnectTimeout=5 $PROD_HOST "hostname" > /dev/null || error "SSH 连接失败"
info "SSH OK"

# ── 数据库重置（可选）──
if [ "$DO_RESET_DB" = true ]; then
  info "=== 重置数据库 ==="
  warn "将清空 hrm.departments 测试数据并插入初始部门树"
  if [ "$FORCE" = false ]; then
    read -p "确认重置？(y/N) " ans
    [ "$ans" = "y" ] || exit 0
  fi

  # 生成重置 SQL（内嵌）
  cat > /tmp/topems-init-reset.sql << 'SQL_EOF'
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

-- 3. 员工数据（清空所有测试员工档案）
-- 注意：iam.users 里的 admin 账号保留不动，这里清的是 hrm.employees 员工档案
TRUNCATE hrm.employees CASCADE;

-- =============================================
-- 插入标准部门树（英文，23 个）
-- =============================================

-- 顶级部门（12 个）
INSERT INTO hrm.departments (id, name, code, description, status, tenant_id, name_en, organization_id) VALUES
('11111111-1111-1111-1111-111111111001', '总裁办公室', 'DEPT-EXEC-001', '公司高层管理团队', 'active', '00000000-0000-0000-0000-000000000001', 'Executive Office', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111002', '人力资源部', 'DEPT-HR-001', '人力资源与员工运营', 'active', '00000000-0000-0000-0000-000000000001', 'Human Resources', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111003', '财务部', 'DEPT-FIN-001', '财务与会计核算', 'active', '00000000-0000-0000-0000-000000000001', 'Finance', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111004', '信息技术部', 'DEPT-IT-001', 'IT基础设施与技术支持', 'active', '00000000-0000-0000-0000-000000000001', 'Information Technology', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111005', '法务合规部', 'DEPT-LEG-001', '法务事务与合规管理', 'active', '00000000-0000-0000-0000-000000000001', 'Legal & Compliance', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111006', '销售市场部', 'DEPT-SALES-001', '销售与市场营销运营', 'active', '00000000-0000-0000-0000-000000000001', 'Sales & Marketing', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111007', '客户服务部', 'DEPT-CS-001', '客户支持与服务', 'active', '00000000-0000-0000-0000-000000000001', 'Customer Service', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111008', '生产部', 'DEPT-PROD-001', '制造与生产管理', 'active', '00000000-0000-0000-0000-000000000001', 'Production', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111009', '质量管理部', 'DEPT-QMS-001', '质量保证与控制', 'active', '00000000-0000-0000-0000-000000000001', 'Quality Management', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111010', '供应链部', 'DEPT-SCM-001', '供应链管理', 'active', '00000000-0000-0000-0000-000000000001', 'Supply Chain', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111011', '研发部', 'DEPT-RD-001', '研发与产品创新', 'active', '00000000-0000-0000-0000-000000000001', 'Research & Development', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111012', '设备维护部', 'DEPT-MAINT-001', '设备维护与维修', 'active', '00000000-0000-0000-0000-000000000001', 'Maintenance', '00000000-0000-0000-0000-000000000001');

-- 二级子部门（11 个）
INSERT INTO hrm.departments (id, name, code, parent_id, description, status, tenant_id, name_en, organization_id) VALUES
('11111111-1111-1111-1111-111111111101', '软件工程组', 'DEPT-RD-SW-001', '11111111-1111-1111-1111-111111111011', '软件开发团队', 'active', '00000000-0000-0000-0000-000000000001', 'Software Engineering', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111102', '硬件工程组', 'DEPT-RD-HW-001', '11111111-1111-1111-1111-111111111011', '硬件设计与工程', 'active', '00000000-0000-0000-0000-000000000001', 'Hardware Engineering', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111103', '产品设计组', 'DEPT-RD-PD-001', '11111111-1111-1111-1111-111111111011', '产品设计与用户体验', 'active', '00000000-0000-0000-0000-000000000001', 'Product Design', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111104', '采购组', 'DEPT-SCM-PROC-001', '11111111-1111-1111-1111-111111111010', '采购与物资供应', 'active', '00000000-0000-0000-0000-000000000001', 'Procurement', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111105', '仓储组', 'DEPT-SCM-WH-001', '11111111-1111-1111-1111-111111111010', '仓库与库存管理', 'active', '00000000-0000-0000-0000-000000000001', 'Warehouse', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111106', '物流组', 'DEPT-SCM-LOG-001', '11111111-1111-1111-1111-111111111010', '运输与物流配送', 'active', '00000000-0000-0000-0000-000000000001', 'Logistics', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111107', '装配线', 'DEPT-PROD-ASM-001', '11111111-1111-1111-1111-111111111008', '装配生产线', 'active', '00000000-0000-0000-0000-000000000001', 'Assembly Line', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111108', '机加工组', 'DEPT-PROD-MACH-001', '11111111-1111-1111-1111-111111111008', 'CNC与机械加工', 'active', '00000000-0000-0000-0000-000000000001', 'Machining', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111109', '包装组', 'DEPT-PROD-PKG-001', '11111111-1111-1111-1111-111111111008', '包装与总装', 'active', '00000000-0000-0000-0000-000000000001', 'Packaging', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111110', '招聘组', 'DEPT-HR-REC-001', '11111111-1111-1111-1111-111111111002', '人才招聘与获取', 'active', '00000000-0000-0000-0000-000000000001', 'Recruiting', '00000000-0000-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111111', '培训发展组', 'DEPT-HR-TRN-001', '11111111-1111-1111-1111-111111111002', '员工培训与发展', 'active', '00000000-0000-0000-0000-000000000001', 'Training & Development', '00000000-0000-0000-0000-000000000001');

-- 验证
SELECT 'departments' AS tbl, count(*) FROM hrm.departments WHERE deleted_at IS NULL
UNION ALL SELECT 'init_status', count(*) FROM hrm.initialization_status;
SQL_EOF

  scp /tmp/topems-init-reset.sql $PROD_HOST:/tmp/topems-init-reset.sql
  ssh $PROD_HOST "$PSQL_PATH -U $DB_USER -d $DB_NAME -f /tmp/topems-init-reset.sql"
  info "数据库重置完成"
fi

# ── 环境变量检查 ──
info "=== 检查生产机环境变量配置 ==="
ssh $PROD_HOST "
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

# ── 1. 本地编译 ──
if [ "$DO_BUILD" = true ]; then
  info "=== 步骤 1/5: 本地编译 release ==="
  cargo build --release -p topems-server 2>&1 | tail -5
  [ -f "$LOCAL_BIN" ] || error "编译失败，二进制不存在"
  info "编译完成: $(ls -lh $LOCAL_BIN | awk '{print $5}')"
else
  info "=== 步骤 1/5: 跳过编译 ==="
  [ -f "$LOCAL_BIN" ] || error "二进制不存在且跳过了编译"
fi

# ── 2. 生产机备份 ──
info "=== 步骤 2/5: 生产机备份旧二进制 ==="
COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ssh $PROD_HOST "
  cd $PROD_BIN_DIR
  cp topems-server topems-server-${COMMIT}-${TIMESTAMP}.bak
  ls -lh topems-server-${COMMIT}-${TIMESTAMP}.bak | awk '{print \"备份: \" \$9 \" (\" \$5 \")\"}'
"

# ── 3. 上传新二进制 ──
info "=== 步骤 3/5: 上传新二进制 ==="
scp $LOCAL_BIN $PROD_HOST:$PROD_BIN_DIR/topems-server.new
ssh $PROD_HOST "chmod +x $PROD_BIN_DIR/topems-server.new"
info "上传完成"

# ── 4. 替换 + 重启 ──
info "=== 步骤 4/5: 替换 + launchd 重启 ==="
ssh $PROD_HOST "
  cd $PROD_BIN_DIR
  mv topems-server.new topems-server
  chmod +x topems-server
  launchctl kickstart -k gui/\$(id -u)/$LAUNCHD_LABEL
  echo '已发送重启信号'
"

# ── 5. 健康检查 ──
info "=== 步骤 5/5: 健康检查 ==="
for i in $(seq 1 $HEALTH_TIMEOUT); do
  RESULT=$(ssh $PROD_HOST "curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL 2>/dev/null" || echo "000")
  if [ "$RESULT" = "200" ]; then
    info "健康检查通过（${i}s）"
    ssh $PROD_HOST "curl -s $HEALTH_URL" | head -c 200
    echo ""
    break
  fi
  sleep 1
  if [ $i -eq $HEALTH_TIMEOUT ]; then
    error "健康检查超时（${HEALTH_TIMEOUT}s），回滚中..."
    ssh $PROD_HOST "cd $PROD_BIN_DIR && cp topems-server-${COMMIT}-${TIMESTAMP}.bak topems-server && launchctl kickstart -k gui/\$(id -u)/$LAUNCHD_LABEL"
    error "已自动回滚"
  fi
done

# ── 前端部署（可选）──
if [ "$DO_FRONTEND" = true ]; then
  info "=== 部署前端 ==="
  cd apps/web && pnpm build 2>&1 | tail -5
  DIST_DIR="./dist"
  PROD_DIST_NAME="topems-${COMMIT}-$(date +%Y%m%d)"
  ssh $PROD_HOST "mkdir -p $PROD_REPO_DIR/dist/$PROD_DIST_NAME"
  rsync -avz --delete $DIST_DIR/ $PROD_HOST:$PROD_REPO_DIR/dist/$PROD_DIST_NAME/web/
  # 更新 nginx root 软链接
  ssh $PROD_HOST "
    cd $PROD_REPO_DIR/dist
    ln -sfn $PROD_DIST_NAME/web current
    # 更新 nginx 配置里的 root 路径
    sed -i '' \"s|root .*dist/.*web;|root $PROD_REPO_DIR/dist/current;|\" /opt/homebrew/etc/nginx/servers/topems.conf
    /opt/homebrew/bin/nginx -t && /opt/homebrew/bin/nginx -s reload
    echo '前端部署完成: '$PROD_DIST_NAME
  "
fi

# ── 完成 ──
info ""
info "=========================================="
info "  部署完成!"
info "  版本: $COMMIT"
info "  时间: $TIMESTAMP"
info "  访问: http://192.168.110.115/"
info "=========================================="
