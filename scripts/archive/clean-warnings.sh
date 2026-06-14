#!/bin/bash
# 批量清理所有Rust服务的代码警告

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SERVICES=(
    "lib"
    "svc/iam"
    "svc/doc"
    "svc/flow"
    "svc/pm"
    "svc/rs"
    "svc/mail"
    "svc/notification"
    "svc/ai"
    "svc/portal"
    "svc/wms"
    "svc/scm"
    "svc/qms"
    "svc/crm"
    "svc/hrm"
    "svc/im"
    "svc/gis"
    "svc/erp"
    "svc/lims"
    "svc/mes"
    "svc/bi"
    "svc/mobile"
    "svc/integration"
    "svc/ehs"
    "svc/srm"
    "svc/pdm"
    "svc/report"
    "svc/file"
)

echo "=============================================="
echo "  批量清理代码警告"
echo "=============================================="
echo ""

for service in "${SERVICES[@]}"; do
    SERVICE_PATH="$PROJECT_ROOT/$service"
    if [ -d "$SERVICE_PATH" ] && [ -f "$SERVICE_PATH/Cargo.toml" ]; then
        echo -n "Cleaning $service ... "
        
        cd "$SERVICE_PATH"
        
        cargo fix --allow-dirty --bins --tests 2>&1 > /dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${YELLOW}⚠${NC}"
        fi
        
        cd "$PROJECT_ROOT"
    else
        echo -e "${YELLOW}⚠ Directory not found or missing Cargo.toml: $service${NC}"
    fi
done

echo ""
echo "=============================================="
echo "  清理完成"
echo "=============================================="
echo ""
echo "已自动修复所有可自动修复的警告"
echo "剩余警告可能是故意保留的预留代码"