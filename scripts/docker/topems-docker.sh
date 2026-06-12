#!/bin/bash

# TOPEMS Docker方案启动脚本
# 特性:
# - 使用Docker Compose管理服务
# - 自动检查Docker服务状态
# - 支持环境变量配置
# - 健康检查和状态报告

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查并处理容器名称冲突
check_container_conflict() {
  local container_name=$1
  if docker inspect "$container_name" >/dev/null 2>&1; then
    warning "检测到同名容器 '$container_name' 已存在"
    info "正在停止并移除旧容器..."
    docker stop "$container_name" >/dev/null 2>&1 || true
    docker rm "$container_name" >/dev/null 2>&1 || true
    success "旧容器 '$container_name' 已移除"
  fi
}

# 检查Docker是否运行
check_docker() {
  info "检查Docker服务状态..."
  if ! docker info >/dev/null 2>&1; then
    error "Docker服务未运行，请先启动Docker"
    exit 1
  fi
  success "Docker服务正常运行"
}

# 检查Docker Compose
check_compose() {
  info "检查Docker Compose..."
  if ! docker compose version >/dev/null 2>&1; then
    warning "Docker Compose v2 未找到，尝试使用 docker-compose"
    if ! docker-compose version >/dev/null 2>&1; then
      error "Docker Compose 未安装"
      exit 1
    fi
    COMPOSE_CMD="docker-compose"
  else
    COMPOSE_CMD="docker compose"
  fi
  success "Docker Compose 可用"
}

# 创建环境变量文件
create_env_file() {
  if [ ! -f "$PROJECT_ROOT/docker/.env" ]; then
    info "创建Docker环境变量文件..."
    cat > "$PROJECT_ROOT/docker/.env" << EOF
# TOPEMS Docker Configuration
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret
POSTGRES_DB=topems
POSTGRES_PORT=5432
REDIS_PASSWORD=topems_redis_secret
REDIS_PORT=6379
JWT_SECRET=topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
EOF
    success "环境变量文件创建完成"
  fi
}

# 启动数据库服务
start_database() {
  info "启动数据库服务..."
  
  # 检查并处理容器名称冲突
  info "检查容器名称冲突..."
  check_container_conflict "topems-postgres"
  check_container_conflict "topems-redis"
  
  $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres redis
  
  # 等待数据库就绪
  info "等待数据库服务就绪..."
  for i in {1..30}; do
    if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres pg_isready -U topems >/dev/null 2>&1; then
      success "PostgreSQL 就绪"
      break
    fi
    if [ $i -eq 30 ]; then
      error "PostgreSQL 启动超时"
      exit 1
    fi
    sleep 1
  done
  
  for i in {1..30}; do
    if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" exec -T redis redis-cli -a topems_redis_secret ping | grep -q PONG; then
      success "Redis 就绪"
      break
    fi
    if [ $i -eq 30 ]; then
      error "Redis 启动超时"
      exit 1
    fi
    sleep 1
  done
}

# 启动后端服务
start_backend() {
  info "启动后端服务..."
  $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" --profile backend up -d
  
  # 等待IAM服务就绪
  info "等待IAM服务就绪..."
  for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
      success "IAM服务就绪"
      break
    fi
    if [ $i -eq 30 ]; then
      warning "IAM服务启动可能需要更长时间"
    fi
    sleep 2
  done
}

# 启动前端服务
start_frontend() {
  info "启动前端服务..."
  $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" --profile frontend up -d
  
  # 等待前端服务就绪
  info "等待前端服务就绪..."
  for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
      success "前端服务就绪"
      break
    fi
    if [ $i -eq 30 ]; then
      warning "前端服务启动可能需要更长时间"
    fi
    sleep 2
  done
}

# 显示状态
show_status() {
  info "服务状态检查..."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              TOPEMS Docker服务状态              "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 数据库状态
  echo ""
  echo "📦 数据库服务:"
  if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" ps postgres | grep -q "Up"; then
    echo "  ✅ PostgreSQL (端口 5432)"
  else
    echo "  ❌ PostgreSQL"
  fi
  
  if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" ps redis | grep -q "Up"; then
    echo "  ✅ Redis (端口 6379)"
  else
    echo "  ❌ Redis"
  fi
  
  # 后端服务状态
  echo ""
  echo "🔧 后端服务:"
  services=("iam:8000" "notification:8004" "portal:8005" "flow:8006" "erp:8010")
  for service in "${services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" ps "$name" 2>/dev/null | grep -q "Up"; then
      if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "  ✅ $name (端口 $port)"
      else
        echo "  ⚠️ $name (端口 $port) - 运行中但未就绪"
      fi
    else
      echo "  ❌ $name (端口 $port)"
    fi
  done
  
  # 前端服务状态
  echo ""
  echo "🌐 前端服务:"
  if $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" ps web | grep -q "Up"; then
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
      echo "  ✅ Frontend (端口 3000)"
    else
      echo "  ⚠️ Frontend (端口 3000) - 运行中但未就绪"
    fi
  else
    echo "  ❌ Frontend"
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 停止服务
stop_services() {
  info "停止所有服务..."
  $COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" down
  success "所有服务已停止"
}

# 主入口
case "$1" in
  start)
    check_docker
    check_compose
    create_env_file
    start_database
    start_backend
    start_frontend
    show_status
    ;;
  start-db)
    check_docker
    check_compose
    create_env_file
    start_database
    show_status
    ;;
  start-backend)
    check_docker
    check_compose
    start_backend
    show_status
    ;;
  start-frontend)
    check_docker
    check_compose
    start_frontend
    show_status
    ;;
  stop)
    check_docker
    check_compose
    stop_services
    ;;
  status)
    check_docker
    check_compose
    show_status
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  *)
    echo "使用方法: $0 {start|start-db|start-backend|start-frontend|stop|status|restart}"
    echo ""
    echo "命令说明:"
    echo "  start           - 启动所有服务（数据库+后端+前端）"
    echo "  start-db        - 仅启动数据库服务"
    echo "  start-backend   - 仅启动后端服务"
    echo "  start-frontend  - 仅启动前端服务"
    echo "  stop            - 停止所有服务"
    echo "  status          - 查看服务状态"
    echo "  restart         - 重启所有服务"
    exit 1
    ;;
esac