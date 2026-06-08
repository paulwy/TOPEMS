#!/bin/bash
# 文件: scripts/build-all-services.sh
# 构建所有 TOPEMS 服务的脚本

set -e

# ==================== 配置 ====================
REGISTRY="${REGISTRY:-topems}"
TAG="${TAG:-latest}"
BUILD_PARALLEL="${BUILD_PARALLEL:-4}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ==================== 服务列表 ====================

# 平台核心服务
PLATFORM_SERVICES=(
    "platform/topems-iam/backend:iam-service"
    "platform/topems-doc/backend:doc-service"
    "platform/topems-flow/backend:flow-service"
)

# 业务服务
BUSINESS_SERVICES=(
    "services/topems-pm/backend:pm-service"
    "services/notification-service:notification-service"
    "services/topems-integration/backend:integration-service"
    "services/topems-portal/backend:portal-service"
    "services/topems-erp/backend:erp-service"
    "services/topems-hrm/backend:hrm-service"
    "services/topems-crm/backend:crm-service"
    "services/topems-ai/backend:ai-service"
    "services/topems-rs/backend:rs-service"
    "services/topems-lims/backend:lims-service"
    "services/topems-pdm/backend:pdm-service"
    "services/topems-mes/backend:mes-service"
    "services/topems-qms/backend:qms-service"
    "services/topems-ehs/backend:ehs-service"
    "services/topems-scm/backend:scm-service"
    "services/topems-srm/backend:srm-service"
    "services/topems-wms/backend:wms-service"
    "services/topems-gis/backend:gis-service"
    "services/topems-im/backend:im-service"
    "services/topems-bi/backend:bi-service"
    "services/report-service:report-service"
    "services/topems-mail/backend:mail-service"
    "services/topems-mobile/backend:mobile-service"
)

# 前端
FRONTEND="frontend:frontend"

# ==================== 构建函数 ====================

build_service() {
    local context=$1
    local name=$2

    # 检查目录
    if [ ! -d "$context" ]; then
        log_warn "目录不存在: $context, 跳过"
        return 1
    fi

    # 检查 Dockerfile
    if [ ! -f "$context/Dockerfile" ]; then
        log_warn "Dockerfile 不存在: $context/Dockerfile, 跳过"
        return 1
    fi

    # 构建镜像
    local full_name="${REGISTRY}/${name}:${TAG}"

    echo -n "  🔨 构建: ${full_name} ... "

    if docker build -t "$full_name" -f "$context/Dockerfile" "$context" > /dev/null 2>&1; then
        echo "✅"
        return 0
    else
        echo "❌"
        log_error "构建失败: $context"
        return 1
    fi
}

export_image() {
    local name=$1
    local output_dir=$2
    local full_name="${REGISTRY}/${name}:${TAG}"

    echo "  📦 导出: $full_name"
    docker save "$full_name" -o "${output_dir}/${name}.tar"
}

# ==================== 主流程 ====================

case "${1:-build}" in
    build)
        log_step "🚀 开始构建所有服务"
        echo ""

        # 记录开始时间
        START_TIME=$(date +%s)

        # 统计
        TOTAL=0
        SUCCESS=0
        FAILED=0

        # 平台服务
        echo "=============================================="
        echo "🏗️  构建平台服务"
        echo "=============================================="
        for item in "${PLATFORM_SERVICES[@]}"; do
            context=$(echo $item | cut -d: -f1)
            name=$(echo $item | cut -d: -f2)
            TOTAL=$((TOTAL + 1))

            if build_service "$context" "$name"; then
                SUCCESS=$((SUCCESS + 1))
            else
                FAILED=$((FAILED + 1))
            fi
        done

        # 业务服务
        echo ""
        echo "=============================================="
        echo "🏗️  构建业务服务"
        echo "=============================================="
        for item in "${BUSINESS_SERVICES[@]}"; do
            context=$(echo $item | cut -d: -f1)
            name=$(echo $item | cut -d: -f2)
            TOTAL=$((TOTAL + 1))

            if build_service "$context" "$name"; then
                SUCCESS=$((SUCCESS + 1))
            else
                FAILED=$((FAILED + 1))
            fi
        done

        # 前端
        echo ""
        echo "=============================================="
        echo "🏗️  构建前端"
        echo "=============================================="
        context=$(echo $FRONTEND | cut -d: -f1)
        name=$(echo $FRONTEND | cut -d: -f2)
        TOTAL=$((TOTAL + 1))

        if build_service "$context" "$name"; then
            SUCCESS=$((SUCCESS + 1))
        else
            FAILED=$((FAILED + 1))
        fi

        # 计算耗时
        END_TIME=$(date +%s)
        ELAPSED=$((END_TIME - START_TIME))
        MINUTES=$((ELAPSED / 60))
        SECONDS=$((ELAPSED % 60))

        echo ""
        echo "=============================================="
        echo "📊 构建完成"
        echo "=============================================="
        echo "总计: $TOTAL | 成功: $SUCCESS | 失败: $FAILED"
        echo "耗时: ${MINUTES}分${SECONDS}秒"
        echo ""

        # 显示已构建的镜像
        log_info "已构建的镜像:"
        docker images | grep "^${REGISTRY}/" | awk '{print "  ✅ " $1 ":" $2}'

        if [ $FAILED -gt 0 ]; then
            log_warn "有 $FAILED 个服务构建失败"
            exit 1
        fi
        ;;

    export)
        OUTPUT_DIR="${2:-./exported-images}"
        mkdir -p "$OUTPUT_DIR"

        log_step "📦 导出所有镜像到 $OUTPUT_DIR"
        echo ""

        ALL_IMAGES=""

        for item in "${PLATFORM_SERVICES[@]}" "${BUSINESS_SERVICES[@]}"; do
            name=$(echo $item | cut -d: -f2)
            export_image "$name" "$OUTPUT_DIR"
            ALL_IMAGES="$ALL_IMAGES ${REGISTRY}/${name}:${TAG}"
        done

        export_image "frontend" "$OUTPUT_DIR"
        ALL_IMAGES="$ALL_IMAGES ${REGISTRY}/frontend:${TAG}"

        echo ""
        log_info "打包所有镜像..."
        docker save $ALL_IMAGES -o "${OUTPUT_DIR}/all-services.tar"

        echo ""
        log_info "✅ 导出完成: ${OUTPUT_DIR}/all-services.tar"
        ;;

    clean)
        log_step "🧹 清理构建缓存"
        echo ""

        # 清理未使用的镜像
        docker image prune -f

        # 清理构建缓存
        docker builder prune -f

        log_info "✅ 清理完成"
        ;;

    list)
        log_step "📋 所有服务列表"
        echo ""
        echo "平台服务 (3个):"
        for item in "${PLATFORM_SERVICES[@]}"; do
            name=$(echo $item | cut -d: -f2)
            echo "  📦 ${REGISTRY}/${name}:${TAG}"
        done

        echo ""
        echo "业务服务 (${#BUSINESS_SERVICES[@]}个):"
        for item in "${BUSINESS_SERVICES[@]}"; do
            name=$(echo $item | cut -d: -f2)
            echo "  📦 ${REGISTRY}/${name}:${TAG}"
        done

        echo ""
        echo "前端 (1个):"
        echo "  📦 ${REGISTRY}/frontend:${TAG}"
        ;;

    *)
        echo "用法: $0 {build|export|clean|list} [选项]"
        echo ""
        echo "命令:"
        echo "  build     构建所有服务 (默认)"
        echo "  export    导出所有镜像到 tar 文件"
        echo "  clean     清理 Docker 构建缓存"
        echo "  list      列出所有服务"
        echo ""
        echo "示例:"
        echo "  $0 build              # 构建所有服务"
        echo "  $0 export ./images    # 导出镜像到 ./images 目录"
        echo "  $0 clean              # 清理缓存"
        exit 1
        ;;
esac
