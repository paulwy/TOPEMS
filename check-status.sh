#!/bin/bash
# TOPEMS 服务状态快速检查

echo "=========================================="
echo "    TOPEMS 服务状态"
echo "=========================================="
echo ""
echo "端口    服务名称                    状态"
echo "------  ------------------------  ------"

check_service() {
    local port=$1
    local name=$2

    if lsof -i :$port > /dev/null 2>&1; then
        local pid=$(lsof -t -i :$port 2>/dev/null || echo "?")
        printf "%-7s  %-25s  ${GREEN}运行中 (PID: %s)${NC}\n" "$port" "$name" "$pid"
        return 0
    else
        printf "%-7s  %-25s  ${RED}已停止${NC}\n" "$port" "$name"
        return 1
    fi
}

# 检查核心服务
echo "--- 核心服务 ---"
check_service 8001 "DOC (文档管理)"
check_service 8002 "IAM (身份认证)"
check_service 8003 "AI (AI服务)"
check_service 8004 "FLOW (工作流)"
check_service 8005 "LIMS (实验室管理)"
check_service 8010 "HRM (人力资源)"

echo ""
echo "--- 其他服务 ---"
check_service 8006 "ERP (企业资源)"
check_service 8007 "SCM (供应链)"
check_service 8008 "WMS (仓库管理)"
check_service 8009 "CRM (客户管理)"
check_service 8011 "GIS (地理信息)"
check_service 8012 "QMS (质量管理)"
check_service 8013 "MES (制造执行)"
check_service 8016 "EHS (环境健康)"
check_service 8017 "PDM (产品数据)"
check_service 8018 "Mobile (移动端)"
check_service 8019 "Integration (集成)"
check_service 8020 "BI (商业智能)"
check_service 8021 "SRM (供应商管理)"
check_service 8023 "Notification (通知)"
check_service 8024 "Report (报表)"

echo ""
echo "=========================================="
echo "    检查完成"
echo "=========================================="
