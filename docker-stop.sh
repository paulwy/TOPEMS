#!/bin/bash

# TOPEMS Docker 停止脚本
# 用于停止所有 TOPEMS 服务

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
    echo "  TOPEMS - Docker 停止脚本"
    echo "================================================"
    echo ""
}

# 停止服务
stop_services() {
    log_info "停止 TOPEMS 服务..."
    
    cd docker
    
    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi
    
    cd ..
    
    log_success "服务已停止"
}

# 清理未使用的资源
cleanup_resources() {
    log_info "清理未使用的 Docker 资源..."
    
    docker system prune -f --volumes
    
    log_success "资源清理完成"
}

# 移除数据（可选）
remove_data() {
    read -p "是否删除所有数据卷？（yes/no）: " confirm
    
    if [ "$confirm" = "yes" ]; then
        log_warning "删除所有数据卷..."
        
        docker volume rm $(docker volume ls -qf name=topems) 2>/dev/null || true
        rm -rf docker/data/*
        
        log_success "数据已删除"
    else
        log_info "保留数据卷"
    fi
}

# 主函数
main() {
    show_banner
    stop_services
    
    echo ""
    echo "================================================"
    echo "  选项"
    echo "================================================"
    echo ""
    echo "  1. 仅停止服务（保留数据）"
    echo "  2. 停止并清理未使用的资源"
    echo "  3. 停止并删除所有数据"
    echo ""
    
    read -p "请选择 (1/2/3): " choice
    
    case $choice in
        1)
            log_info "服务已停止，数据已保留"
            ;;
        2)
            cleanup_resources
            ;;
        3)
            remove_data
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "TOPEMS 已成功停止！"
    echo ""
}

main "$@"
