#!/bin/bash

set -e

TOPEMS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
export TOPEMS_DIR
export PATH=/opt/homebrew/Cellar/node/26.0.0/bin:$PATH

print_info() {
    echo -e "\033[1;34m[INFO] $1\033[0m"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS] $1\033[0m"
}

print_error() {
    echo -e "\033[1;31m[ERROR] $1\033[0m"
}

mkdir -p "$TOPEMS_DIR/logs"

print_info "🚀 启动 TOPEMS 本地开发环境..."

print_info "\n📦 启动 IAM 服务 (端口: 8002)..."
cd "$TOPEMS_DIR/platform/topems-iam/backend"
PORT=8002 cargo run 2>&1 > "$TOPEMS_DIR/logs/iam.log" &
IAM_PID=$!
echo "$IAM_PID" > "$TOPEMS_DIR/logs/iam.pid"
print_info "IAM 服务 PID: $IAM_PID"

print_info "\n⏳ 等待 IAM 服务启动..."
sleep 6

if curl -s http://localhost:8002/health > /dev/null; then
    print_success "✅ IAM 服务启动成功: http://localhost:8002"
else
    print_error "❌ IAM 服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/iam.log"
    exit 1
fi

print_info "\n📦 启动文档服务 (端口: 8001)..."
cd "$TOPEMS_DIR/platform/topems-doc/backend"
PORT=8001 cargo run 2>&1 > "$TOPEMS_DIR/logs/doc.log" &
DOC_PID=$!
echo "$DOC_PID" > "$TOPEMS_DIR/logs/doc.pid"
print_info "文档服务 PID: $DOC_PID"

print_info "\n⏳ 等待文档服务启动..."
sleep 6

if curl -s http://localhost:8001/health > /dev/null; then
    print_success "✅ 文档服务启动成功: http://localhost:8001"
else
    print_error "❌ 文档服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/doc.log"
fi

print_info "\n📦 启动流程服务 (端口: 8004)..."
cd "$TOPEMS_DIR/platform/topems-flow/backend"
PORT=8004 cargo run 2>&1 > "$TOPEMS_DIR/logs/flow.log" &
FLOW_PID=$!
echo "$FLOW_PID" > "$TOPEMS_DIR/logs/flow.pid"
print_info "流程服务 PID: $FLOW_PID"

print_info "\n⏳ 等待流程服务启动..."
sleep 6

if curl -s http://localhost:8004/health > /dev/null; then
    print_success "✅ 流程服务启动成功: http://localhost:8004"
else
    print_error "❌ 流程服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/flow.log"
fi

print_info "\n📦 启动 ERP 服务 (端口: 8008)..."
cd "$TOPEMS_DIR/services/topems-erp/backend"
PORT=8008 cargo run 2>&1 > "$TOPEMS_DIR/logs/erp.log" &
ERP_PID=$!
echo "$ERP_PID" > "$TOPEMS_DIR/logs/erp.pid"
print_info "ERP 服务 PID: $ERP_PID"

print_info "\n⏳ 等待 ERP 服务启动..."
sleep 8

if curl -s http://localhost:8008/health > /dev/null; then
    print_success "✅ ERP 服务启动成功: http://localhost:8008"
else
    print_error "❌ ERP 服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/erp.log"
fi

print_info "\n📦 启动 HRM 服务 (端口: 8018)..."
cd "$TOPEMS_DIR/services/topems-hrm/backend"
PORT=8018 cargo run 2>&1 > "$TOPEMS_DIR/logs/hrm.log" &
HRM_PID=$!
echo "$HRM_PID" > "$TOPEMS_DIR/logs/hrm.pid"
print_info "HRM 服务 PID: $HRM_PID"

print_info "\n⏳ 等待 HRM 服务启动..."
sleep 8

if curl -s http://localhost:8018/health > /dev/null; then
    print_success "✅ HRM 服务启动成功: http://localhost:8018"
else
    print_error "❌ HRM 服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/hrm.log"
fi

print_info "\n📦 启动 CRM 服务 (端口: 8009)..."
cd "$TOPEMS_DIR/services/topems-crm/backend"
PORT=8009 cargo run 2>&1 > "$TOPEMS_DIR/logs/crm.log" &
CRM_PID=$!
echo "$CRM_PID" > "$TOPEMS_DIR/logs/crm.pid"
print_info "CRM 服务 PID: $CRM_PID"

print_info "\n⏳ 等待 CRM 服务启动..."
sleep 8

if curl -s http://localhost:8009/health > /dev/null; then
    print_success "✅ CRM 服务启动成功: http://localhost:8009"
else
    print_error "❌ CRM 服务启动失败，查看日志: tail -f $TOPEMS_DIR/logs/crm.log"
fi

print_info "\n🌐 启动前端服务..."
cd "$TOPEMS_DIR/frontend"
npm run dev 2>&1 > "$TOPEMS_DIR/logs/frontend.log" &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$TOPEMS_DIR/logs/frontend.pid"
print_info "前端服务 PID: $FRONTEND_PID"

print_info "\n⏳ 等待前端服务启动..."
sleep 5

print_info "\n\n🎉 所有服务已启动！"
echo ""
print_info "服务列表:"
print_info "  前端服务:       http://localhost:3000"
print_info "  IAM 服务:       http://localhost:8002"
print_info "  文档服务:       http://localhost:8001"
print_info "  流程服务:       http://localhost:8004"
print_info "  ERP 服务:       http://localhost:8008"
print_info "  HRM 服务:       http://localhost:8018"
print_info "  CRM 服务:       http://localhost:8009"
echo ""
print_info "测试账号:"
print_info "  用户名: admin"
print_info "  密码: Admin123"
echo ""
print_info "查看日志:"
print_info "  tail -f $TOPEMS_DIR/logs/iam.log"
print_info "  tail -f $TOPEMS_DIR/logs/frontend.log"
echo ""
print_info "停止服务:"
print_info "  ./stop-local.sh"
