#!/bin/bash
# TOPEMS 本地部署脚本（非 Docker）
# 位置: scripts/deploy-local.sh
# 使用: ./scripts/deploy-local.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${YELLOW}ℹ INFO${NC} - $1"; }
print_ok() { echo -e "${GREEN}✅ OK${NC} - $1"; }
print_fail() { echo -e "${RED}❌ FAILED${NC} - $1"; }

echo "=========================================="
echo "  TOPEMS 本地部署脚本（非 Docker）"
echo "=========================================="
echo ""

# 检查是否以非 Docker 模式运行
if [ "$USE_DOCKER" = "true" ]; then
    print_fail "请使用 deploy.sh 进行 Docker 部署"
    exit 1
fi

# 1. 检查环境
print_info "1. 检查环境要求..."

# 检查 Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    print_ok "Rust 已安装: $RUST_VERSION"
else
    print_fail "Rust 未安装，请运行: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_ok "Node.js 已安装: $NODE_VERSION"
else
    print_fail "Node.js 未安装"
    exit 1
fi

# 检查 PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    print_ok "PostgreSQL 已安装: $PSQL_VERSION"
else
    print_fail "PostgreSQL 未安装"
    exit 1
fi

# 检查 Redis
if command -v redis-server &> /dev/null; then
    print_ok "Redis 已安装"
else
    print_fail "Redis 未安装"
    exit 1
fi

echo ""

# 2. 配置环境变量
print_info "2. 配置环境变量..."

if [ ! -f ".env" ]; then
    print_info "创建 .env 文件..."
    cp .env.example .env
    print_ok "请编辑 .env 文件配置数据库连接"
else
    print_ok ".env 文件已存在"
fi

# 加载环境变量
source .env 2>/dev/null || true

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-topems}
DB_USER=${DB_USER:-topems}
DB_PASSWORD=${DB_PASSWORD:-topems_secret}

print_info "数据库配置: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

echo ""

# 3. 创建数据库
print_info "3. 创建数据库..."

# 检测 PostgreSQL 用户模式（macOS 使用当前用户，Linux 使用 postgres）
POSTGRES_USER="postgres"
if [ "$(uname)" = "Darwin" ]; then
    POSTGRES_USER=$(whoami)
    print_info "macOS 环境，使用当前用户 $POSTGRES_USER"
fi

# 创建数据库用户
if [ "$POSTGRES_USER" = "$(whoami)" ]; then
    psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
else
    sudo -u $POSTGRES_USER psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
fi

# 创建数据库
if [ "$POSTGRES_USER" = "$(whoami)" ]; then
    psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
else
    sudo -u $POSTGRES_USER psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
fi

print_ok "数据库创建完成"

echo ""

# 4. 执行数据库初始化
print_info "4. 执行数据库初始化脚本..."

psql -U $DB_USER -d $DB_NAME -f database/init/03_init_permissions.sql

if [ $? -eq 0 ]; then
    print_ok "数据库初始化完成"
else
    print_fail "数据库初始化失败"
    exit 1
fi

echo ""

# 5. 编译后端服务
print_info "5. 编译后端服务..."

# 编译所有服务（使用 workspace）
print_info "编译所有后端服务..."
cargo build --release --workspace

print_ok "后端编译完成"

echo ""

# 6. 安装前端依赖
print_info "6. 安装前端依赖..."

cd apps/web
yarn install
cd ../..

print_ok "前端依赖安装完成"

echo ""

# 7. 启动服务
print_info "7. 启动服务..."

# 启动 PostgreSQL（如果未运行）
if ! pgrep -x "postgres" > /dev/null; then
    print_info "启动 PostgreSQL..."
    sudo systemctl start postgresql 2>/dev/null || sudo pg_ctl start -D /usr/local/var/postgres 2>/dev/null || true
fi

# 启动 Redis（如果未运行）
if ! pgrep -x "redis-server" > /dev/null; then
    print_info "启动 Redis..."
    sudo systemctl start redis 2>/dev/null || redis-server --daemonize yes 2>/dev/null || true
fi

# 后台启动 unified-core
print_info "启动 unified-core (端口 8000)..."
./target/release/unified-core-service &
CORE_PID=$!

# 后台启动 PM 服务
print_info "启动 PM 服务 (端口 8001)..."
./target/release/topems-pm &
PM_PID=$!

# 后台启动 HRM 服务
print_info "启动 HRM 服务 (端口 8011)..."
./target/release/topems-hrm &
HRM_PID=$!

# 后台启动 MES 服务
print_info "启动 MES 服务 (端口 8030)..."
MES_PORT=8030 ./target/release/topems-mes &
MES_PID=$!

# 后台启动 PDM 服务
print_info "启动 PDM 服务 (端口 8031)..."
PDM_PORT=8031 ./target/release/topems-pdm &
PDM_PID=$!

# 后台启动 QMS 服务
print_info "启动 QMS 服务 (端口 8050)..."
QMS_PORT=8050 ./target/release/topems-qms &
QMS_PID=$!

# 后台启动 LIMS 服务
print_info "启动 LIMS 服务 (端口 8051)..."
LIMS_PORT=8051 ./target/release/topems-lims &
LIMS_PID=$!

# 后台启动 EHS 服务
print_info "启动 EHS 服务 (端口 8052)..."
EHS_PORT=8052 ./target/release/topems-ehs &
EHS_PID=$!

# 后台启动 BI 服务
print_info "启动 BI 服务 (端口 8060)..."
BI_PORT=8060 ./target/release/topems-bi &
BI_PID=$!

# 后台启动 Report 服务
print_info "启动 Report 服务 (端口 8061)..."
REPORT_PORT=8061 ./target/release/topems-report &
REPORT_PID=$!

# 前端开发服务器（使用未被占用的端口）
print_info "启动前端开发服务器 (端口 3001)..."
cd apps/web
yarn dev --port 3001 &
cd ../..
WEB_PID=$!

echo ""

# 8. 等待服务启动
print_info "8. 等待服务启动..."
sleep 15

# 9. 健康检查
print_info "9. 健康检查..."

# 检查 unified-core
if curl -s http://localhost:8000/health > /dev/null; then
    print_ok "unified-core 健康"
else
    print_fail "unified-core 未响应"
fi

# 检查 PM 服务
if curl -s http://localhost:8001/health > /dev/null; then
    print_ok "PM 服务健康"
else
    print_fail "PM 服务未响应"
fi

# 检查 HRM 服务
if curl -s http://localhost:8011/health > /dev/null; then
    print_ok "HRM 服务健康"
else
    print_fail "HRM 服务未响应"
fi

# 检查 MES 服务
if curl -s http://localhost:8030/health > /dev/null; then
    print_ok "MES 服务健康"
else
    print_fail "MES 服务未响应"
fi

# 检查 PDM 服务
if curl -s http://localhost:8031/health > /dev/null; then
    print_ok "PDM 服务健康"
else
    print_fail "PDM 服务未响应"
fi

# 检查 QMS 服务
if curl -s http://localhost:8050/health > /dev/null; then
    print_ok "QMS 服务健康"
else
    print_fail "QMS 服务未响应"
fi

# 检查 LIMS 服务
if curl -s http://localhost:8051/health > /dev/null; then
    print_ok "LIMS 服务健康"
else
    print_fail "LIMS 服务未响应"
fi

# 检查 EHS 服务
if curl -s http://localhost:8052/health > /dev/null; then
    print_ok "EHS 服务健康"
else
    print_fail "EHS 服务未响应"
fi

# 检查 BI 服务
if curl -s http://localhost:8060/health > /dev/null; then
    print_ok "BI 服务健康"
else
    print_fail "BI 服务未响应"
fi

# 检查 Report 服务
if curl -s http://localhost:8061/health > /dev/null; then
    print_ok "Report 服务健康"
else
    print_fail "Report 服务未响应"
fi

# 检查前端
if curl -s http://localhost:3001 > /dev/null; then
    print_ok "前端服务健康"
else
    print_fail "前端服务未响应"
fi

echo ""

# 10. 验证权限数据
print_info "10. 验证权限数据..."

PERM_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM core_permissions;" 2>/dev/null | xargs)
if [ "$PERM_COUNT" -ge 60 ]; then
    print_ok "权限数据完整: $PERM_COUNT 个权限"
else
    print_fail "权限数据异常: $PERM_COUNT 个权限"
fi

ROLE_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM core_roles;" 2>/dev/null | xargs)
print_ok "角色数据: $ROLE_COUNT 个角色"

echo ""

# 11. 测试登录
print_info "11. 测试管理员登录..."

LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo $LOGIN_RESULT | grep -q '"success":true'; then
    print_ok "管理员登录成功"
else
    print_fail "管理员登录失败"
fi

echo ""
echo "=========================================="
echo "  TOPEMS 本地部署完成"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端: http://localhost:3001"
echo "  API:  http://localhost:8000"
echo "  MES:  http://localhost:8030"
echo "  PDM:  http://localhost:8031"
echo "  QMS:  http://localhost:8050"
echo "  LIMS: http://localhost:8051"
echo "  EHS:  http://localhost:8052"
echo "  BI:   http://localhost:8060"
echo "  Report: http://localhost:8061"
echo ""
echo "默认管理员账户："
echo "  用户名: admin"
echo "  密码:   admin123"
echo ""
echo "进程 ID（停止服务时使用）："
echo "  unified-core: $CORE_PID"
echo "  PM: $PM_PID"
echo "  HRM: $HRM_PID"
echo "  MES: $MES_PID"
echo "  PDM: $PDM_PID"
echo "  QMS: $QMS_PID"
echo "  LIMS: $LIMS_PID"
echo "  EHS: $EHS_PID"
echo "  BI: $BI_PID"
echo "  Report: $REPORT_PID"
echo "  Web: $WEB_PID"
echo ""
echo "停止服务命令："
echo "  kill $CORE_PID $PM_PID $HRM_PID $MES_PID $PDM_PID $QMS_PID $LIMS_PID $EHS_PID $BI_PID $REPORT_PID $WEB_PID"
echo ""
