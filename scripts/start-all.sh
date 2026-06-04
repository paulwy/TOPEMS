#!/bin/bash

# TOPEMS 一键启动脚本 (超兼容版)
# 完全兼容macOS旧版bash (3.2)，不使用关联数组

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          TOPEMS 系统一键启动脚本 (超兼容版)                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 函数定义
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_detail() {
    echo -e "${BLUE}[DETAIL]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 清理端口函数
cleanup_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "端口 $port 被占用，正在强制清理..."
        lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
        sleep 2
        # 再次检查确保
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_error "无法清理端口 $port，请手动检查"
            return 1
        else
            log_success "端口 $port 已清理"
        fi
    fi
    return 0
}

# 检查可执行文件是否存在
check_executable() {
    local service_path=$1
    local service_name=$2
    local executable="$PROJECT_ROOT/$service_path/target/release/topems-$service_name"
    
    if [ ! -f "$executable" ]; then
        log_warn "$service_name 服务的可执行文件不存在"
        log_detail "路径: $executable"
        return 1
    fi
    return 0
}

# 编译服务
build_service() {
    local service_path=$1
    local service_name=$2
    
    log_info "编译 $service_name 服务..."
    cd "$PROJECT_ROOT/$service_path"
    
    if cargo build --release 2>&1; then
        log_success "$service_name 编译成功"
        return 0
    else
        log_error "$service_name 编译失败"
        return 1
    fi
}

# 等待数据库就绪
wait_for_db() {
    log_info "等待数据库服务就绪..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec topems-postgres pg_isready -U topems -d topems >/dev/null 2>&1; then
            log_success "数据库已就绪"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -ne "等待数据库... $attempt/$max_attempts\r"
        sleep 2
    done
    
    log_error "数据库无法连接"
    return 1
}

# 1. 检查 Docker
log_info "检查 Docker 服务..."
if ! docker info > /dev/null 2>&1; then
    log_warn "Docker 未运行，正在尝试启动..."
    open -a Docker
    sleep 15
    if ! docker info > /dev/null 2>&1; then
        log_error "无法启动 Docker，请手动启动 Docker Desktop"
        exit 1
    fi
fi
log_success "Docker 已就绪"

# 2. 启动数据库服务
log_info "准备数据库服务..."
cd docker
if [ ! -f .env ]; then
    log_detail "创建环境变量配置..."
    cp .env.example .env
fi

# 检查容器是否已在运行
if docker ps --format '{{.Names}}' | grep -E '^(topems-postgres|topems-redis)$' > /dev/null 2>&1; then
    log_success "数据库容器已在运行，跳过创建"
else
    log_detail "启动数据库容器..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d
fi

cd "$PROJECT_ROOT"
wait_for_db
sleep 2

# 3. 配置环境变量
log_info "配置环境变量..."

# 从 .env 文件加载环境变量
if [ -f "$PROJECT_ROOT/.env" ]; then
    log_detail "从 .env 文件加载配置..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# 安全检查：确保 JWT_SECRET 和 REFRESH_SECRET 已设置
if [ -z "$JWT_SECRET" ]; then
    log_error "JWT_SECRET 环境变量未设置！请设置至少 32 字符的密钥"
    log_info "示例: export JWT_SECRET='your-secure-jwt-secret-key-at-least-32-characters'"
    exit 1
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    log_error "JWT_REFRESH_SECRET 环境变量未设置！请设置至少 32 字符的密钥"
    log_info "示例: export JWT_REFRESH_SECRET='your-secure-refresh-secret-key-at-least-32-characters'"
    exit 1
fi

# 验证密钥长度
if [ ${#JWT_SECRET} -lt 32 ]; then
    log_error "JWT_SECRET 长度不足 32 字符，不符合安全要求"
    exit 1
fi

if [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    log_error "JWT_REFRESH_SECRET 长度不足 32 字符，不符合安全要求"
    exit 1
fi

# 设置 REFRESH_SECRET 为 JWT_REFRESH_SECRET 的别名（兼容代码）
export REFRESH_SECRET="$JWT_REFRESH_SECRET"

export JWT_EXPIRY_HOURS="24"
export RUST_LOG="info"
export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

# 4. 清理所有服务端口
log_info "清理所有服务端口..."
cleanup_port 8001 || true
cleanup_port 8002 || true
cleanup_port 8003 || true
cleanup_port 8004 || true
cleanup_port 8005 || true
cleanup_port 8006 || true
cleanup_port 8009 || true
cleanup_port 8010 || true
cleanup_port 8011 || true
cleanup_port 8012 || true
cleanup_port 8015 || true
cleanup_port 8016 || true
cleanup_port 8013 || true
cleanup_port 8018 || true
cleanup_port 8055 || true
cleanup_port 8023 || true
cleanup_port 3000 || true

# 5. 依次启动各个服务
log_info "检查并启动后端服务..."
echo ""

# IAM服务
echo "----------------------------------------"
log_info "处理服务: iam (端口 8002)"
IAM_PID=""
if check_executable "platform/topems-iam/backend" "iam"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/platform/topems-iam/backend"
    SERVER_PORT=8002 ./target/release/topems-iam &
    IAM_PID=$!
    cd "$PROJECT_ROOT"
    log_success "iam 服务已启动 (PID: $IAM_PID, 端口: 8002)"
else
    log_warn "跳过 iam 服务"
fi

# DOC服务
echo "----------------------------------------"
log_info "处理服务: doc (端口 8001)"
DOC_PID=""
if check_executable "platform/topems-doc/backend" "doc"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/platform/topems-doc/backend"
    SERVER_PORT=8001 ./target/release/topems-doc &
    DOC_PID=$!
    cd "$PROJECT_ROOT"
    log_success "doc 服务已启动 (PID: $DOC_PID, 端口: 8001)"
else
    log_warn "跳过 doc 服务"
fi

# AI服务
echo "----------------------------------------"
log_info "处理服务: ai (端口 8003)"
AI_PID=""
if check_executable "services/topems-ai/backend" "ai"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-ai/backend"
    SERVER_PORT=8003 ./target/release/topems-ai &
    AI_PID=$!
    cd "$PROJECT_ROOT"
    log_success "ai 服务已启动 (PID: $AI_PID, 端口: 8003)"
else
    log_warn "跳过 ai 服务"
fi

# FLOW服务 (特殊处理，可能需要编译)
echo "----------------------------------------"
log_info "处理服务: flow (端口 8004)"
FLOW_PID=""
if ! check_executable "platform/topems-flow/backend" "flow"; then
    log_warn "flow 服务需要编译，正在编译..."
    if build_service "platform/topems-flow/backend" "flow"; then
        log_detail "正在启动..."
        cd "$PROJECT_ROOT/platform/topems-flow/backend"
        SERVER_PORT=8004 ./target/release/topems-flow &
        FLOW_PID=$!
        cd "$PROJECT_ROOT"
        log_success "flow 服务已启动 (PID: $FLOW_PID, 端口: 8004)"
    else
        log_warn "跳过 flow 服务"
    fi
else
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/platform/topems-flow/backend"
    SERVER_PORT=8004 ./target/release/topems-flow &
    FLOW_PID=$!
    cd "$PROJECT_ROOT"
    log_success "flow 服务已启动 (PID: $FLOW_PID, 端口: 8004)"
fi

# RS服务
echo "----------------------------------------"
log_info "处理服务: rs (端口 8005)"
RS_PID=""
if check_executable "services/topems-rs/backend" "rs"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-rs/backend"
    SERVER_PORT=8005 ./target/release/topems-rs &
    RS_PID=$!
    cd "$PROJECT_ROOT"
    log_success "rs 服务已启动 (PID: $RS_PID, 端口: 8005)"
else
    log_warn "跳过 rs 服务"
fi

# LIMS服务
echo "----------------------------------------"
log_info "处理服务: lims (端口 8006)"
LIMS_PID=""
if check_executable "services/topems-lims/backend" "lims"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-lims/backend"
    SERVER_PORT=8006 ./target/release/topems-lims &
    LIMS_PID=$!
    cd "$PROJECT_ROOT"
    log_success "lims 服务已启动 (PID: $LIMS_PID, 端口: 8006)"
else
    log_warn "跳过 lims 服务"
fi

# QMS服务
echo "----------------------------------------"
log_info "处理服务: qms (端口 8012)"
QMS_PID=""
if check_executable "services/topems-qms/backend" "qms"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-qms/backend"
    SERVER_PORT=8012 ./target/release/topems-qms &
    QMS_PID=$!
    cd "$PROJECT_ROOT"
    log_success "qms 服务已启动 (PID: $QMS_PID, 端口: 8012)"
else
    log_warn "跳过 qms 服务"
fi

# EHS服务
echo "----------------------------------------"
log_info "处理服务: ehs (端口 8013)"
EHS_PID=""
if check_executable "services/topems-ehs/backend" "ehs"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-ehs/backend"
    SERVER_PORT=8013 ./target/release/topems-ehs &
    EHS_PID=$!
    cd "$PROJECT_ROOT"
    log_success "ehs 服务已启动 (PID: $EHS_PID, 端口: 8013)"
else
    log_warn "跳过 ehs 服务"
fi

# ERP服务
echo "----------------------------------------"
log_info "处理服务: erp (端口 8009)"
ERP_PID=""
if check_executable "services/topems-erp/backend" "erp"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-erp/backend"
    SERVER_PORT=8009 ./target/release/topems-erp &
    ERP_PID=$!
    cd "$PROJECT_ROOT"
    log_success "erp 服务已启动 (PID: $ERP_PID, 端口: 8009)"
else
    log_warn "跳过 erp 服务"
fi

# HRM服务
echo "----------------------------------------"
log_info "处理服务: hrm (端口 8010)"
HRM_PID=""
if check_executable "services/topems-hrm/backend" "hrm"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-hrm/backend"
    SERVER_PORT=8010 ./target/release/topems-hrm &
    HRM_PID=$!
    cd "$PROJECT_ROOT"
    log_success "hrm 服务已启动 (PID: $HRM_PID, 端口: 8010)"
else
    log_warn "跳过 hrm 服务"
fi

# GIS服务
echo "----------------------------------------"
log_info "处理服务: gis (端口 8011)"
GIS_PID=""
if check_executable "services/topems-gis/backend" "gis"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-gis/backend"
    SERVER_PORT=8011 ./target/release/topems-gis &
    GIS_PID=$!
    cd "$PROJECT_ROOT"
    log_success "gis 服务已启动 (PID: $GIS_PID, 端口: 8011)"
else
    log_warn "跳过 gis 服务"
fi

# PDM服务
echo "----------------------------------------"
log_info "处理服务: pdm (端口 8015)"
PDM_PID=""
if check_executable "services/topems-pdm/backend" "pdm"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-pdm/backend"
    SERVER_PORT=8015 ./target/release/topems-pdm &
    PDM_PID=$!
    cd "$PROJECT_ROOT"
    log_success "pdm 服务已启动 (PID: $PDM_PID, 端口: 8015)"
else
    log_warn "跳过 pdm 服务"
fi

# SRM服务
echo "----------------------------------------"
log_info "处理服务: srm (端口 8018)"
SRM_PID=""
if check_executable "services/topems-srm/backend" "srm"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-srm/backend"
    SERVER_PORT=8018 ./target/release/topems-srm &
    SRM_PID=$!
    cd "$PROJECT_ROOT"
    log_success "srm 服务已启动 (PID: $SRM_PID, 端口: 8018)"
else
    log_warn "跳过 srm 服务"
fi

# IM服务
echo "----------------------------------------"
log_info "处理服务: im (端口 8016)"
IM_PID=""
if check_executable "services/topems-im/backend" "im"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-im/backend"
    SERVER_PORT=8016 ./target/release/topems-im &
    IM_PID=$!
    cd "$PROJECT_ROOT"
    log_success "im 服务已启动 (PID: $IM_PID, 端口: 8016)"
else
    log_warn "跳过 im 服务"
fi

# MOBILE服务
echo "----------------------------------------"
log_info "处理服务: mobile (端口 8055)"
MOBILE_PID=""
if check_executable "services/topems-mobile/backend" "mobile"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/topems-mobile/backend"
    PORT=8055 ./target/release/topems-mobile &
    MOBILE_PID=$!
    cd "$PROJECT_ROOT"
    log_success "mobile 服务已启动 (PID: $MOBILE_PID, 端口: 8055)"
else
    log_warn "跳过 mobile 服务"
fi

# NOTIFICATION服务
echo "----------------------------------------"
log_info "处理服务: notification (端口 8023)"
NOTIFICATION_PID=""
if check_executable "services/notification-service" "notification"; then
    log_detail "正在启动..."
    cd "$PROJECT_ROOT/services/notification-service"
    SERVER_PORT=8023 ./target/release/notification-service &
    NOTIFICATION_PID=$!
    cd "$PROJECT_ROOT"
    log_success "notification 服务已启动 (PID: $NOTIFICATION_PID, 端口: 8023)"
else
    log_warn "跳过 notification 服务"
fi

# 6. 启动前端
echo ""
log_info "检查并启动前端服务 (端口 3000)..."
if [ ! -d "frontend/node_modules" ]; then
    log_warn "前端依赖未安装，正在安装..."
    cd frontend
    npm install
    cd "$PROJECT_ROOT"
fi

cd frontend
npm run dev &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"
log_success "前端服务已启动 (PID: $FRONTEND_PID, 端口: 3000)"

# 7. 等待服务启动
echo ""
log_info "等待服务启动并稳定运行..."
echo ""
wait_count=1
while [ $wait_count -le 15 ]; do
    echo -ne "等待中... $wait_count/15\r"
    sleep 1
    wait_count=$((wait_count + 1))
done
echo ""

# 8. 健康检查
echo ""
log_info "执行健康检查..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success_count=0
total_count=0

# IAM检查
total_count=$((total_count + 1))
if [ -n "$IAM_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} IAM (8002) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} IAM (8002) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} IAM (8002) - 未启动"
fi

# DOC检查
total_count=$((total_count + 1))
if [ -n "$DOC_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} DOC (8001) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} DOC (8001) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} DOC (8001) - 未启动"
fi

# AI检查
total_count=$((total_count + 1))
if [ -n "$AI_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8003/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} AI (8003) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} AI (8003) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} AI (8003) - 未启动"
fi

# FLOW检查
total_count=$((total_count + 1))
if [ -n "$FLOW_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8004/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} FLOW (8004) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} FLOW (8004) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} FLOW (8004) - 未启动"
fi

# RS检查
total_count=$((total_count + 1))
if [ -n "$RS_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8005/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} RS (8005) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} RS (8005) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} RS (8005) - 未启动"
fi

# LIMS检查
total_count=$((total_count + 1))
if [ -n "$LIMS_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8006/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} LIMS (8006) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} LIMS (8006) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} LIMS (8006) - 未启动"
fi

# QMS检查
total_count=$((total_count + 1))
if [ -n "$QMS_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8012/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} QMS (8012) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} QMS (8012) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} QMS (8012) - 未启动"
fi

# EHS检查
total_count=$((total_count + 1))
if [ -n "$EHS_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8013/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} EHS (8013) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} EHS (8013) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} EHS (8013) - 未启动"
fi

# ERP检查
total_count=$((total_count + 1))
if [ -n "$ERP_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8009/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} ERP (8009) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} ERP (8009) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} ERP (8009) - 未启动"
fi

# HRM检查
total_count=$((total_count + 1))
if [ -n "$HRM_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8010/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} HRM (8010) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} HRM (8010) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} HRM (8010) - 未启动"
fi

# GIS检查
total_count=$((total_count + 1))
if [ -n "$GIS_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8011/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} GIS (8011) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} GIS (8011) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} GIS (8011) - 未启动"
fi

# PDM检查
total_count=$((total_count + 1))
if [ -n "$PDM_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8015/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} PDM (8015) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} PDM (8015) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} PDM (8015) - 未启动"
fi

# SRM检查
total_count=$((total_count + 1))
if [ -n "$SRM_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8018/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} SRM (8018) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} SRM (8018) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} SRM (8018) - 未启动"
fi

# IM检查
total_count=$((total_count + 1))
if [ -n "$IM_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8016/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} IM (8016) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} IM (8016) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} IM (8016) - 未启动"
fi

# MOBILE检查
total_count=$((total_count + 1))
if [ -n "$MOBILE_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8055/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} MOBILE (8055) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} MOBILE (8055) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} MOBILE (8055) - 未启动"
fi

# NOTIFICATION检查
total_count=$((total_count + 1))
if [ -n "$NOTIFICATION_PID" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8023/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✅${NC} NOTIFICATION (8023) - 运行正常"
        success_count=$((success_count + 1))
    else
        echo -e "${YELLOW}⏳${NC} NOTIFICATION (8023) - 启动中/检查失败"
    fi
else
    echo -e "${RED}❌${NC} NOTIFICATION (8023) - 未启动"
fi

# 前端检查
total_count=$((total_count + 1))
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|304"; then
    echo -e "${GREEN}✅${NC} Frontend (3000) - 运行正常"
    success_count=$((success_count + 1))
else
    echo -e "${YELLOW}⏳${NC} Frontend (3000) - 启动中"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "启动检查完成：$success_count/$total_count 服务正常"
echo ""

# 9. 显示访问信息
log_info "系统启动完成"
echo ""
echo "🌐 访问地址:"
echo "   前端门户: http://localhost:3000"
echo "   IAM: http://localhost:8002"
echo "   DOC: http://localhost:8001"
echo "   AI: http://localhost:8003"
echo "   FLOW: http://localhost:8004"
echo "   RS: http://localhost:8005"
echo "   LIMS: http://localhost:8006"
echo "   ERP: http://localhost:8009"
echo "   HRM: http://localhost:8010"
echo "   QMS: http://localhost:8012"
echo "   EHS: http://localhost:8016"
echo "   GIS: http://localhost:8011"
echo "   PDM: http://localhost:8015"
echo "   SRM: http://localhost:8018"
echo "   IM: http://localhost:8016"
echo "   MOBILE: http://localhost:8055"
echo ""
echo "📄 文档管理页面: http://localhost:3000/documents"
echo ""
echo "🔑 测试账号:"
echo "   admin / admin123 (系统管理员)"
echo "   user / user123 (普通用户)"
echo "   guest / guest123 (访客)"
echo ""
echo "📊 运行的服务进程:"
if [ -n "$IAM_PID" ]; then echo "   IAM: $IAM_PID"; fi
if [ -n "$DOC_PID" ]; then echo "   DOC: $DOC_PID"; fi
if [ -n "$AI_PID" ]; then echo "   AI: $AI_PID"; fi
if [ -n "$FLOW_PID" ]; then echo "   FLOW: $FLOW_PID"; fi
if [ -n "$RS_PID" ]; then echo "   RS: $RS_PID"; fi
if [ -n "$LIMS_PID" ]; then echo "   LIMS: $LIMS_PID"; fi
if [ -n "$QMS_PID" ]; then echo "   QMS: $QMS_PID"; fi
if [ -n "$EHS_PID" ]; then echo "   EHS: $EHS_PID"; fi
if [ -n "$ERP_PID" ]; then echo "   ERP: $ERP_PID"; fi
if [ -n "$HRM_PID" ]; then echo "   HRM: $HRM_PID"; fi
if [ -n "$GIS_PID" ]; then echo "   GIS: $GIS_PID"; fi
if [ -n "$PDM_PID" ]; then echo "   PDM: $PDM_PID"; fi
if [ -n "$SRM_PID" ]; then echo "   SRM: $SRM_PID"; fi
if [ -n "$IM_PID" ]; then echo "   IM: $IM_PID"; fi
if [ -n "$MOBILE_PID" ]; then echo "   MOBILE: $MOBILE_PID"; fi
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 清理函数
cleanup() {
    echo ""
    log_info "正在停止所有服务..."
    
    # 停止后端服务
    [ -n "$IAM_PID" ] && kill $IAM_PID 2>/dev/null || true
    [ -n "$DOC_PID" ] && kill $DOC_PID 2>/dev/null || true
    [ -n "$AI_PID" ] && kill $AI_PID 2>/dev/null || true
    [ -n "$FLOW_PID" ] && kill $FLOW_PID 2>/dev/null || true
    [ -n "$RS_PID" ] && kill $RS_PID 2>/dev/null || true
    [ -n "$LIMS_PID" ] && kill $LIMS_PID 2>/dev/null || true
    [ -n "$QMS_PID" ] && kill $QMS_PID 2>/dev/null || true
    [ -n "$EHS_PID" ] && kill $EHS_PID 2>/dev/null || true
    [ -n "$ERP_PID" ] && kill $ERP_PID 2>/dev/null || true
    [ -n "$HRM_PID" ] && kill $HRM_PID 2>/dev/null || true
    [ -n "$GIS_PID" ] && kill $GIS_PID 2>/dev/null || true
    [ -n "$PDM_PID" ] && kill $PDM_PID 2>/dev/null || true
    [ -n "$SRM_PID" ] && kill $SRM_PID 2>/dev/null || true
    [ -n "$IM_PID" ] && kill $IM_PID 2>/dev/null || true
    [ -n "$MOBILE_PID" ] && kill $MOBILE_PID 2>/dev/null || true
    [ -n "$NOTIFICATION_PID" ] && kill $NOTIFICATION_PID 2>/dev/null || true
    
    # 停止前端
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    
    log_success "所有服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup INT TERM

# 保持脚本运行
wait
