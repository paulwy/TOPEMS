#!/bin/bash

# TOPEMS Docker 快速启动脚本
# 用于在 Docker 环境中启动所有 TOPEMS 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示横幅
show_banner() {
    echo ""
    echo "================================================"
    echo "  TOPEMS - 全面集成的企业管理系统"
    echo "  Docker 快速启动脚本"
    echo "================================================"
    echo ""
}

# 检查 Docker
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 创建必要目录
create_directories() {
    log_info "创建必要的数据目录..."
    
    mkdir -p docker/data/postgres
    mkdir -p docker/data/redis
    mkdir -p docker/logs
    mkdir -p docker/ssl
    
    log_success "目录创建完成"
}

# 检查端口占用
check_ports() {
    log_info "检查必要端口..."
    
    ports=(5432 6379 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 3000 80 443)
    
    for port in "${ports[@]}"; do
        if netstat -an 2>/dev/null | grep -q ":$port " || ss -an 2>/dev/null | grep -q ":$port "; then
            log_warning "端口 $port 已被占用"
        fi
    done
}

# 创建环境文件
create_env_file() {
    if [ ! -f ".env" ]; then
        log_info "创建 .env 配置文件..."
        
        cat > .env << EOF
# PostgreSQL 配置
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret
POSTGRES_DB=topems
POSTGRES_PORT=5432

# Redis 配置
REDIS_PORT=6379

# 服务端口配置
IAM_PORT=8002
DOC_PORT=8001
AI_PORT=8003
FLOW_PORT=8004
RS_PORT=8005
LIMS_PORT=8006
QMS_PORT=8007
EHS_PORT=8008
SRM_PORT=8009
PDM_PORT=8010

# 前端配置
FRONTEND_PORT=3000

# Nginx 配置
NGINX_PORT=80
NGINX_SSL_PORT=443

# JWT 配置
JWT_SECRET=topems-jwt-secret-key-change-in-production-$(date +%s)
JWT_EXPIRATION_HOURS=24

# AI 配置
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5:7b-instruct

# 日志配置
RUST_LOG=info

# 重启策略
RESTART_POLICY=unless-stopped

# 文件上传配置
MAX_FILE_SIZE=104857600
EOF
        
        log_success ".env 配置文件已创建"
    else
        log_info ".env 配置文件已存在"
    fi
}

# 启动服务
start_services() {
    log_info "启动 TOPEMS 服务..."
    
    cd docker
    
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    cd ..
    
    log_success "服务启动完成"
}

# 等待服务健康
wait_for_health() {
    log_info "等待服务健康检查..."
    
    services=(postgres redis iam doc ai flow rs lims qms ehs srm pdm frontend nginx)
    
    for service in "${services[@]}"; do
        echo -n "检查 $service..."
        
        max_attempts=30
        attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if docker ps --format '{{.Names}}' | grep -q "topems-$service"; then
                health=$(docker inspect --format='{{.State.Health.Status}}' "topems-$service" 2>/dev/null || echo "none")
                
                if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                    echo -e " ${GREEN}OK${NC}"
                    break
                fi
            fi
            
            attempt=$((attempt + 1))
            echo -n "."
            sleep 2
        done
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e " ${YELLOW}跳过${NC}"
        fi
    done
}

# 显示服务状态
show_status() {
    echo ""
    echo "================================================"
    echo "  TOPEMS 服务状态"
    echo "================================================"
    echo ""
    
    docker ps --filter "name=topems-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "================================================"
    echo "  访问地址"
    echo "================================================"
    echo ""
    echo "  前端界面: http://localhost"
    echo "  API 网关: http://localhost/api"
    echo "  IAM 服务: http://localhost:8002"
    echo "  DOC 服务: http://localhost:8001"
    echo "  AI 服务:  http://localhost:8003"
    echo "  FLOW 服务: http://localhost:8004"
    echo "  RS 服务:  http://localhost:8005"
    echo "  LIMS 服务: http://localhost:8006"
    echo "  QMS 服务: http://localhost:8007"
    echo "  EHS 服务: http://localhost:8008"
    echo "  SRM 服务: http://localhost:8009"
    echo "  PDM 服务: http://localhost:8010"
    echo ""
    echo "  默认管理员: admin@topems.com / admin123"
    echo ""
}

# 主函数
main() {
    show_banner
    check_docker
    create_directories
    check_ports
    create_env_file
    start_services
    wait_for_health
    show_status
    
    log_success "TOPEMS 已成功启动！"
    echo ""
    echo "查看日志: cd docker && docker-compose logs -f"
    echo "停止服务: ./docker-stop.sh"
    echo ""
}

main "$@"
