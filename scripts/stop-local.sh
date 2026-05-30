#!/bin/bash

TOPEMS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

print_info() {
    echo -e "\033[1;34m[INFO] $1\033[0m"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS] $1\033[0m"
}

print_info "🛑 停止 TOPEMS 本地服务..."

for service in iam doc flow erp hrm crm; do
    pid_file="$TOPEMS_DIR/logs/${service}.pid"
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            print_info "停止 ${service} 服务 (PID: $pid)"
        fi
        rm "$pid_file"
    fi
done

print_success "✅ 所有服务已停止"
