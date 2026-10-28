#!/bin/bash

# =============================================
# TOPEMS 工具模块
# =============================================
# 环境检查/清理/服务检查

# 注意：此文件由 topems.sh source 引入，不要直接执行

# 检查服务状态并自动重启
check_and_restart_services() {
    info "检查服务状态并自动重启..."

    local restarted=0
    local running=0
    local total=0

    for service in $(get_all_services); do
        total=$((total + 1))
        local port
        port=$(get_service_port "$service")
        if check_port $port; then
            running=$((running + 1))
        else
            warning "$service 未运行，自动重启..."
            if start_service "$service" 2>/dev/null; then
                restarted=$((restarted + 1))
            else
                error "$service 重启失败"
            fi
        fi
    done

    echo ""
    if [ $restarted -eq 0 ]; then
        success "所有服务运行正常 (${running}/${total})"
    else
        info "已重启 ${restarted} 个服务"
    fi
}
