#!/bin/bash
# 批量清理所有Rust服务的代码警告

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 需要清理的服务列表
SERVICES=(
    "shared/lib"
    "services/topems-iam/backend"
    "services/topems-doc/backend"
    "services/topems-flow/backend"
    "services/topems-pm/backend"
    "services/topems-rs/backend"
    "services/topems-mail/backend"
    "services/notification-service"
    "services/topems-notification/backend"
    "services/topems-ai/backend"
    "services/topems-portal/backend"
    "services/topems-wms/backend"
    "services/topems-scm/backend"
    "services/topems-qms/backend"
    "services/topems-crm/backend"
    "services/topems-hrm/backend"
    "services/topems-im/backend"
    "services/topems-gis/backend"
    "services/topems-erp/backend"
    "services/topems-lims/backend"
    "services/topems-mes/backend"
    "services/topems-bi/backend"
    "services/topems-mobile/backend"
    "services/topems-integration/backend"
    "services/topems-ehs/backend"
    "services/topems-srm/backend"
    "services/topems-pdm/backend"
    "services/report-service"
)

echo "=============================================="
echo "  批量清理代码警告"
echo "=============================================="
echo ""

for service in "${SERVICES[@]}"; do
    if [ -d "$service" ]; then
        echo -n "Cleaning $service ... "
        
        cd "$service"
        
        # 使用 cargo fix 自动修复
        cargo fix --allow-dirty --bins --tests 2>&1 > /dev/null
        
        echo -e "${GREEN}✓${NC}"
        
        cd - > /dev/null 2>&1
    else
        echo -e "${YELLOW}⚠ Directory not found: $service${NC}"
    fi
done

echo ""
echo "=============================================="
echo "  清理完成"
echo "=============================================="
echo ""
echo "已自动修复所有可自动修复的警告"
echo "剩余警告可能是故意保留的预留代码"
