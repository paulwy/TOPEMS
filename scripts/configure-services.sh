#!/bin/bash

# TOPEMS 服务配置脚本
# 用于为所有服务创建正确的配置文件

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 颜色定义
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

echo "=============================================="
echo "  TOPEMS 服务配置脚本"
echo "=============================================="
echo ""

# 服务配置列表
services=(
    "services/topems-lims/backend 8006"
    "services/topems-rs/backend 8005"
    "platform/topems-iam/backend 8002"
    "platform/topems-doc/backend 8001"
    "services/topems-ai/backend 8003"
    "services/topems-erp/backend 8009"
    "services/topems-hrm/backend 8010"
    "services/topems-qms/backend 8012"
    "services/topems-ehs/backend 8016"
    "services/topems-gis/backend 8011"
    "services/topems-pdm/backend 8015"
    "services/topems-srm/backend 8018"
    "services/topems-im/backend 8017"
    "platform/topems-flow/backend 8004"
)

# 创建配置文件
for service_config in "${services[@]}"; do
    service_path=$(echo "$service_config" | cut -d' ' -f1)
    port=$(echo "$service_config" | cut -d' ' -f2)
    service_name=$(basename $(dirname "$service_path"))

    echo "配置 $service_name (端口 $port)..."

    config_path="$PROJECT_ROOT/$service_path/.env"

    cat > "$config_path" <<EOF
# TOPEMS $service_name Service Configuration
# 自动生成的配置文件

# 服务端口
PORT=$port

# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Redis 配置
REDIS_URL=redis://localhost:6379

# 日志配置
RUST_LOG=info

EOF

    log_success "配置文件已创建: $config_path"
done

echo ""
echo "=============================================="
echo "  配置完成！"
echo "=============================================="
echo ""
echo "端口映射概览："
echo "  IAM:     8002"
echo "  DOC:     8001"
echo "  AI:      8003"
echo "  FLOW:    8004"
echo "  RS:      8005"
echo "  LIMS:    8006"
echo "  ERP:     8009"
echo "  HRM:     8010"
echo "  GIS:     8011"
echo "  QMS:     8012"
echo "  PDM:     8015"
echo "  EHS:     8016"
echo "  IM:      8017"
echo "  SRM:     8018"
echo ""
echo "现在可以启动服务了！"
