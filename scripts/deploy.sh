#!/bin/bash
# 文件: scripts/deploy.sh
# TOPEMS 一键部署脚本 (离线环境使用)

set -e

# ==================== 配置 ====================
VERSION="${1:-latest}"
PROJECT_NAME="topems"
DATA_DIR="${TOPEMS_DATA_DIR:-/data/topems}"
NETWORK_NAME="${PROJECT_NAME}-network"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[${PROJECT_NAME}]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ==================== 初始化 ====================

init() {
    step "初始化部署环境..."

    # 创建目录
    mkdir -p ${DATA_DIR}/{postgres,redis,logs,docs,uploads,backups}
    mkdir -p ${DATA_DIR}/postgres/{data,backups}

    # 创建 Docker 网络
    if ! docker network ls | grep -q ${NETWORK_NAME}; then
        log "创建 Docker 网络: ${NETWORK_NAME}"
        docker network create --driver bridge ${NETWORK_NAME}
    else
        log "使用现有网络: ${NETWORK_NAME}"
    fi
}

# ==================== 环境配置 ====================

setup_env() {
    step "配置环境变量..."

    if [ -f "${DATA_DIR}/.env" ]; then
        warn "环境配置文件已存在，将使用现有配置"
        log "配置文件: ${DATA_DIR}/.env"
    else
        log "创建环境配置文件..."

        # 生成随机密钥
        JWT_SECRET=$(openssl rand -base64 32)
        REFRESH_SECRET=$(openssl rand -base64 32)
        DB_PASSWORD="topems_$(openssl rand -hex 16)"

        cat > ${DATA_DIR}/.env << EOF
# ==================== 数据库配置 ====================
POSTGRES_USER=topems
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=topems
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ==================== Redis 配置 ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ==================== JWT 配置 ====================
JWT_SECRET=${JWT_SECRET}
REFRESH_SECRET=${REFRESH_SECRET}

# ==================== AI 配置 ====================
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=nomic-embed-text
USE_OLLAMA=false
OPENAI_API_KEY=
OPENAI_BASE_URL=

# ==================== 版本 ====================
VERSION=${VERSION}
EOF

        log "环境配置已创建: ${DATA_DIR}/.env"
    fi
}

# ==================== 加载镜像 ====================

load_images() {
    step "加载 Docker 镜像..."

    # 查找镜像文件
    IMAGE_FILES=(
        "./images/base-images.tar"
        "./images/base-images.tar.gz"
        "./images/all-images.tar"
        "./images/all-images.tar.gz"
        "./images/pgvector-16.tar"
        "./images/postgres-16-alpine.tar"
        "./images/redis-7-alpine.tar"
        "./images/nginx-1.25-alpine.tar"
    )

    LOADED=0

    for img_file in "${IMAGE_FILES[@]}"; do
        if [ -f "$img_file" ]; then
            log "加载镜像: $img_file"
            if [[ "$img_file" == *.gz ]]; then
                gunzip -c "$img_file" | docker load
            else
                docker load -i "$img_file"
            fi
            LOADED=$((LOADED + 1))
        fi
    done

    if [ $LOADED -eq 0 ]; then
        warn "未找到镜像文件，请确保镜像已放置在 ./images 目录"
        warn "可以使用 scripts/download-images.sh 下载镜像"
    else
        log "成功加载 $LOADED 个镜像文件"
    fi

    # 验证关键镜像
    step "验证关键镜像..."
    verify_image "postgres" || warn "postgres 镜像未找到"
    verify_image "redis" || warn "redis 镜像未找到"
    verify_image "nginx" || warn "nginx 镜像未找到"
}

verify_image() {
    local pattern=$1
    if docker images | grep -qE "^${pattern}[[:space:]]"; then
        echo -e "  ${GREEN}✓${NC} $pattern"
        return 0
    else
        echo -e "  ${YELLOW}✗${NC} $pattern (未找到)"
        return 1
    fi
}

# ==================== 启动基础设施 ====================

start_infrastructure() {
    step "启动基础设施服务..."

    # 加载环境变量
    set -a
    source ${DATA_DIR}/.env
    set +a

    # PostgreSQL
    log "启动 PostgreSQL..."
    if docker ps -a | grep -q "${PROJECT_NAME}-postgres"; then
        docker rm -f ${PROJECT_NAME}-postgres 2>/dev/null || true
    fi

    docker run -d \
        --name ${PROJECT_NAME}-postgres \
        --network ${NETWORK_NAME} \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e POSTGRES_DB=${POSTGRES_DB} \
        -v ${DATA_DIR}/postgres/data:/var/lib/postgresql/data \
        -p 5432:5432 \
        --restart unless-stopped \
        $(docker images | grep "^postgres" | awk '{print $1":"$2}' | head -1)

    # Redis
    log "启动 Redis..."
    if docker ps -a | grep -q "${PROJECT_NAME}-redis"; then
        docker rm -f ${PROJECT_NAME}-redis 2>/dev/null || true
    fi

    docker run -d \
        --name ${PROJECT_NAME}-redis \
        --network ${NETWORK_NAME} \
        -v ${DATA_DIR}/redis:/data \
        -p 6379:6379 \
        --restart unless-stopped \
        redis:7-alpine redis-server --appendonly yes

    # 等待就绪
    log "等待服务就绪..."
    sleep 10

    # 健康检查
    for i in {1..30}; do
        if docker exec ${PROJECT_NAME}-postgres pg_isready -U ${POSTGRES_USER} > /dev/null 2>&1; then
            log "PostgreSQL 已就绪"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

# ==================== 初始化数据库 ====================

init_database() {
    step "初始化数据库..."

    set -a
    source ${DATA_DIR}/.env
    set +a

    docker exec ${PROJECT_NAME}-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} << 'EOF'

-- ==================== 启用扩展 ====================

-- pgvector (AI 向量存储)
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== 创建 Schema ====================

-- 平台服务
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS flow;

-- 业务服务
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS hrm;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS pm;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS qms;
CREATE SCHEMA IF NOT EXISTS ehs;
CREATE SCHEMA IF NOT EXISTS scm;
CREATE SCHEMA IF NOT EXISTS srm;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS gis;
CREATE SCHEMA IF NOT EXISTS im;
CREATE SCHEMA IF NOT EXISTS bi;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS mail;
CREATE SCHEMA IF NOT EXISTS mobile;

-- ==================== 验证 ====================

-- 显示扩展
SELECT '已安装扩展:' as info;
SELECT extname, extversion FROM pg_extension;

-- 显示 Schema
SELECT '已创建 Schema:' as info;
SELECT schema_name FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public')
ORDER BY schema_name;

EOF

    log "数据库初始化完成"
}

# ==================== 执行数据库迁移 ====================

run_migrations() {
    step "执行数据库迁移..."

    set -a
    source ${DATA_DIR}/.env
    set +a

    # 迁移目录列表（按服务顺序排列）
    # 注意：部分服务的迁移目录在 backend/src/db/migrations
    local MIGRATION_DIRS=(
        # 平台服务
        "services/topems-iam/backend/src/db/migrations"
        "services/topems-doc/backend/src/db/migrations"
        "services/topems-flow/backend/migrations"
        # 业务服务
        "services/topems-erp/backend/migrations"
        "services/topems-hrm/backend/migrations"
        "services/topems-crm/backend/migrations"
        "services/topems-ai/backend/migrations"
        "services/topems-pm/backend/migrations"
        "services/topems-rs/backend/migrations"
        "services/topems-lims/backend/migrations"
        "services/topems-pdm/backend/migrations"
        "services/topems-mes/backend/migrations"
        "services/topems-qms/backend/migrations"
        "services/topems-ehs/backend/migrations"
        "services/topems-scm/backend/migrations"
        "services/topems-srm/backend/migrations"
        "services/topems-wms/backend/migrations"
        "services/topems-gis/backend/migrations"
        "services/topems-im/backend/migrations"
        "services/topems-bi/backend/migrations"
        "services/topems-mail/backend/migrations"
        "services/topems-mobile/backend/migrations"
        "services/topems-portal/backend/migrations"
        "services/topems-integration/backend/migrations"
        "services/topems-notification/backend/src/db/migrations"
        "services/report-service/migrations"
    )

    for migration_dir in "${MIGRATION_DIRS[@]}"; do
        if [ -d "$migration_dir" ]; then
            log "执行迁移: $migration_dir"
            
            # 查找迁移SQL文件
            sql_files=$(find "$migration_dir" -name "*.sql" | sort)
            
            if [ -n "$sql_files" ]; then
                for sql_file in $sql_files; do
                    log "  执行: $(basename "$sql_file")"
                    docker exec -i ${PROJECT_NAME}-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < "$sql_file" || \
                        warn "  迁移文件执行失败: $sql_file"
                done
            else
                warn "  未找到迁移SQL文件"
            fi
        else
            log "  跳过不存在的目录: $migration_dir"
        fi
    done

    log "数据库迁移完成"
}

# ==================== 部署服务 ====================

deploy_services() {
    step "部署 TOPEMS 服务..."

    set -a
    source ${DATA_DIR}/.env
    set +a

    # 查找并启动服务
    COMPOSE_FILES=(
        "./docker-compose.prod.yml"
        "./docker-compose.yml"
        "./docker-compose.ci.yml"
    )

    COMPOSE_FILE=""
    for f in "${COMPOSE_FILES[@]}"; do
        if [ -f "$f" ]; then
            COMPOSE_FILE="$f"
            break
        fi
    done

    if [ -z "$COMPOSE_FILE" ]; then
        warn "未找到 docker-compose 文件，将手动部署基础服务"

        # 手动部署 IAM 服务示例
        deploy_service "iam-service" "services/topems-iam/backend" 8000
        return
    fi

    log "使用配置文件: $COMPOSE_FILE"

    # 修改配置中的镜像名称
    export COMPOSE_FILE
    docker-compose -f "$COMPOSE_FILE" up -d

    log "服务部署完成"
}

deploy_service() {
    local service_name=$1
    local context=$2
    local port=$3
    local image="${PROJECT_NAME}/${service_name}:latest"

    log "部署 ${service_name}..."

    # 构建或加载镜像
    if docker images | grep -q "^${PROJECT_NAME}/${service_name}"; then
        log "使用现有镜像: $image"
    else
        warn "镜像不存在: $image"
        warn "请先构建: ./scripts/build-all-services.sh build"
        return 1
    fi

    docker run -d \
        --name ${PROJECT_NAME}-${service_name} \
        --network ${NETWORK_NAME} \
        -e APP_ENV=production \
        -e DATABASE_URL="postgres://${POSTGRES_USER}@postgres:5432/${POSTGRES_DB}" \
        -e REDIS_URL="redis://redis:6379/0" \
        -e JWT_SECRET=${JWT_SECRET} \
        -e PORT=${port} \
        -v ${DATA_DIR}/logs:/app/logs \
        -p ${port}:${port} \
        --restart unless-stopped \
        $image
}

# ==================== 状态检查 ====================

check_status() {
    step "检查部署状态..."
    echo ""

    echo "📦 容器状态:"
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  无运行中的容器"

    echo ""
    echo "🔌 端口监听:"
    for port in 80 5432 6379 8000 8001 8013; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "  ${GREEN}✓${NC} 端口 $port 已监听"
        else
            echo -e "  ${YELLOW}○${NC} 端口 $port 未监听"
        fi
    done

    echo ""
    echo "💾 资源使用:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        --filter "name=${PROJECT_NAME}" 2>/dev/null || echo "  无数据"
}

# ==================== 显示完成信息 ====================

show_complete() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✅ TOPEMS 部署完成!${NC}"
    echo "=============================================="
    echo ""
    echo "📍 访问地址:"
    echo "   前端:    http://localhost"
    echo "   IAM:     http://localhost:8000"
    echo "   DOC:     http://localhost:8001"
    echo "   AI:      http://localhost:8013"
    echo ""
    echo "📁 数据目录: ${DATA_DIR}"
    echo "📝 环境配置: ${DATA_DIR}/.env"
    echo "📊 日志目录: ${DATA_DIR}/logs"
    echo ""
    echo "🔧 常用命令:"
    echo "   查看状态:  docker ps | grep topems"
    echo "   查看日志:  docker logs -f topems-iam"
    echo "   进入容器:  docker exec -it topems-iam /bin/sh"
    echo "   停止服务:  docker stop \$(docker ps -q -f name=topems)"
    echo ""
    echo "🔐 初始账号:"
    echo "   用户名: admin"
    echo "   密码:  admin123"
    echo ""
}

# ==================== 主流程 ====================

main() {
    echo "=============================================="
    echo "TOPEMS 离线部署脚本"
    echo "=============================================="
    echo ""
    echo "📁 数据目录: ${DATA_DIR}"
    echo "🌐 网络名称: ${NETWORK_NAME}"
    echo ""
    echo "部署流程:"
    echo "  1. 初始化部署环境"
    echo "  2. 配置环境变量"
    echo "  3. 加载 Docker 镜像"
    echo "  4. 启动基础设施 (PostgreSQL/Redis)"
    echo "  5. 初始化数据库 (创建 Schema)"
    echo "  6. 执行数据库迁移脚本"
    echo "  7. 部署各服务"
    echo ""

    # 执行部署步骤
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 1/7: 初始化部署环境"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    init
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 2/7: 配置环境变量"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    setup_env
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 3/7: 加载 Docker 镜像"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    load_images
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 4/7: 启动基础设施 (PostgreSQL/Redis)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    start_infrastructure
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 5/7: 初始化数据库 (创建 Schema)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    init_database
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 6/7: 执行数据库迁移脚本"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    run_migrations
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 7/7: 部署各服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    deploy_services

    # 显示状态
    echo ""
    check_status
    show_complete
}

# ==================== 命令行参数 ====================

case "${1:-deploy}" in
    deploy)
        main
        ;;
    start)
        log "启动所有服务..."
        docker start $(docker ps -a -q -f name=${PROJECT_NAME})
        ;;
    stop)
        log "停止所有服务..."
        docker stop $(docker ps -q -f name=${PROJECT_NAME})
        ;;
    restart)
        log "重启所有服务..."
        docker restart $(docker ps -q -f name=${PROJECT_NAME})
        ;;
    status)
        check_status
        ;;
    logs)
        SERVICE="${2:-}"
        if [ -z "$SERVICE" ]; then
            error "请指定服务名: $0 logs <service-name>"
        fi
        docker logs -f ${PROJECT_NAME}-${SERVICE}
        ;;
    clean)
        warn "清理所有容器和数据..."
        read -p "确认清理? (y/N): " confirm
        if [ "$confirm" = "y" ]; then
            docker stop $(docker ps -q -f name=${PROJECT_NAME}) 2>/dev/null || true
            docker rm $(docker ps -a -q -f name=${PROJECT_NAME}) 2>/dev/null || true
            log "清理完成"
        fi
        ;;
    help|--help|-h)
        echo "用法: $0 <command>"
        echo ""
        echo "命令:"
        echo "  deploy   部署所有服务 (默认)"
        echo "  start    启动服务"
        echo "  stop     停止服务"
        echo "  restart  重启服务"
        echo "  status   查看状态"
        echo "  logs     查看日志 (需指定服务名)"
        echo "  clean    清理容器"
        echo ""
        echo "示例:"
        echo "  $0 deploy           # 完整部署"
        echo "  $0 logs iam          # 查看 IAM 服务日志"
        echo "  $0 status           # 查看状态"
        exit 0
        ;;
    *)
        error "未知命令: $1"
        ;;
esac
