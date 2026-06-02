#!/bin/bash

# TOPEMS 统一服务启动脚本
# 使用方法: ./scripts/start-all-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 TOPEMS 服务启动脚本"
echo "========================"

cd "$PROJECT_ROOT"

# 1. 启动 Docker 服务
echo ""
echo "📦 1. 启动 Docker 服务 (PostgreSQL & Redis)..."
cd "$PROJECT_ROOT/docker"
docker-compose up -d
if [ $? -eq 0 ]; then
    echo "✅ Docker 服务启动成功"
else
    echo "❌ Docker 服务启动失败"
    exit 1
fi

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 5

# 2. 启动核心服务
echo ""
echo "🔐 2. 启动核心服务组..."

echo "启动 IAM 身份认证服务 (端口 8002)..."
cd "$PROJECT_ROOT/services/topems-iam/backend"
cargo run --bin topems-iam > /dev/null 2>&1 &
IAM_PID=$!
echo "✅ IAM 服务启动中 (PID: $IAM_PID)"

echo "启动 DOC 文档管理服务 (端口 8001)..."
cd "$PROJECT_ROOT/services/topems-doc/backend"
cargo run > /dev/null 2>&1 &
DOC_PID=$!
echo "✅ DOC 服务启动中 (PID: $DOC_PID)"

echo "启动 AI 服务 (端口 8003)..."
cd "$PROJECT_ROOT/services/topems-ai/backend"
cargo run > /dev/null 2>&1 &
AI_PID=$!
echo "✅ AI 服务启动中 (PID: $AI_PID)"

echo "启动 FLOW 工作流服务 (端口 8004)..."
cd "$PROJECT_ROOT/services/topems-flow/backend"
cargo run > /dev/null 2>&1 &
FLOW_PID=$!
echo "✅ FLOW 服务启动中 (PID: $FLOW_PID)"

echo "启动 RS 研发管理服务 (端口 8005)..."
cd "$PROJECT_ROOT/services/topems-rs/backend"
cargo run > /dev/null 2>&1 &
RS_PID=$!
echo "✅ RS 服务启动中 (PID: $RS_PID)"

echo "启动 LIMS 实验室管理 (端口 8006)..."
cd "$PROJECT_ROOT/services/topems-lims/backend"
cargo run > /dev/null 2>&1 &
LIMS_PID=$!
echo "✅ LIMS 服务启动中 (PID: $LIMS_PID)"

echo "启动 HRM 人力资源 (端口 8010)..."
cd "$PROJECT_ROOT/services/topems-hrm/backend"
cargo run > /dev/null 2>&1 &
HRM_PID=$!
echo "✅ HRM 服务启动中 (PID: $HRM_PID)"

# 3. 启动企业增强服务
echo ""
echo "🏭 3. 启动企业增强服务组..."

echo "启动 QMS 质量管理 (端口 8007)..."
cd "$PROJECT_ROOT/services/topems-qms/backend"
cargo run > /dev/null 2>&1 &
QMS_PID=$!
echo "✅ QMS 服务启动中 (PID: $QMS_PID)"

echo "启动 EHS 安全环保 (端口 8008)..."
cd "$PROJECT_ROOT/services/topems-ehs/backend"
cargo run > /dev/null 2>&1 &
EHS_PID=$!
echo "✅ EHS 服务启动中 (PID: $EHS_PID)"

echo "启动 ERP 企业资源 (端口 8009)..."
cd "$PROJECT_ROOT/services/topems-erp/backend"
cargo run > /dev/null 2>&1 &
ERP_PID=$!
echo "✅ ERP 服务启动中 (PID: $ERP_PID)"

echo "启动 BI 商业智能 (端口 8022)..."
cd "$PROJECT_ROOT/services/topems-bi/backend"
cargo run > /dev/null 2>&1 &
BI_PID=$!
echo "✅ BI 服务启动中 (PID: $BI_PID)"

# 4. 启动生态集成服务
echo ""
echo "🔗 4. 启动生态集成服务组..."

echo "启动 SCM 供应链 (端口 8016)..."
cd "$PROJECT_ROOT/services/topems-scm/backend"
cargo run > /dev/null 2>&1 &
SCM_PID=$!
echo "✅ SCM 服务启动中 (PID: $SCM_PID)"

echo "启动 SRM 供应商 (端口 8018)..."
cd "$PROJECT_ROOT/services/topems-srm/backend"
cargo run > /dev/null 2>&1 &
SRM_PID=$!
echo "✅ SRM 服务启动中 (PID: $SRM_PID)"

echo "启动 MAIL 邮件服务 (端口 8026)..."
cd "$PROJECT_ROOT/services/topems-mail/backend"
cargo run > /dev/null 2>&1 &
MAIL_PID=$!
echo "✅ MAIL 服务启动中 (PID: $MAIL_PID)"

echo "启动 NOTIFICATION 通知服务 (端口 8023)..."
cd "$PROJECT_ROOT/services/topems-notification/backend"
cargo run > /dev/null 2>&1 &
NOTIFICATION_PID=$!
echo "✅ NOTIFICATION 服务启动中 (PID: $NOTIFICATION_PID)"

echo "启动 PORTAL 统一门户 (端口 9021)..."
cd "$PROJECT_ROOT/services/topems-portal/backend"
PORT=9021 cargo run > /dev/null 2>&1 &
PORTAL_PID=$!
echo "✅ PORTAL 服务启动中 (PID: $PORTAL_PID)"

echo "启动 MES 制造执行 (端口 8014)..."
cd "$PROJECT_ROOT/services/topems-mes/backend"
cargo run > /dev/null 2>&1 &
MES_PID=$!
echo "✅ MES 服务启动中 (PID: $MES_PID)"

echo "启动 CRM 客户关系 (端口 8013)..."
cd "$PROJECT_ROOT/services/topems-crm/backend"
cargo run > /dev/null 2>&1 &
CRM_PID=$!
echo "✅ CRM 服务启动中 (PID: $CRM_PID)"

echo "启动 WMS 仓库管理 (端口 8020)..."
cd "$PROJECT_ROOT/services/topems-wms/backend"
cargo run > /dev/null 2>&1 &
WMS_PID=$!
echo "✅ WMS 服务启动中 (PID: $WMS_PID)"

# 5. 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 6. 检查服务健康状态
echo ""
echo "🔍 检查服务健康状态..."
echo ""

check_service() {
    local name=$1
    local url=$2
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $name 服务运行正常"
            return 0
        fi
        echo "⏳ 等待 $name 服务就绪... (尝试 $attempt/$max_attempts)"
        sleep 3
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name 服务启动失败"
    return 1
}

check_service "IAM" "http://localhost:8002/health"
check_service "DOC" "http://localhost:8001/health"
check_service "AI" "http://localhost:8003/health"
check_service "FLOW" "http://localhost:8004/health"
check_service "RS" "http://localhost:8005/health"
check_service "LIMS" "http://localhost:8006/health"
check_service "HRM" "http://localhost:8010/health"
check_service "QMS" "http://localhost:8007/health"
check_service "EHS" "http://localhost:8008/health"
check_service "ERP" "http://localhost:8009/health"
check_service "BI" "http://localhost:8022/health"
check_service "SCM" "http://localhost:8016/health"
check_service "SRM" "http://localhost:8018/health"
check_service "MAIL" "http://localhost:8026/health"
check_service "NOTIFICATION" "http://localhost:8023/health"
check_service "PORTAL" "http://localhost:9021/health"
check_service "MES" "http://localhost:8014/health"
check_service "CRM" "http://localhost:8013/health"
check_service "WMS" "http://localhost:8020/health"

echo ""
echo "========================"
echo "🎉 所有服务启动完成！"
echo ""
echo "服务地址:"
echo "  核心服务:"
echo "    - IAM: http://localhost:8002"
echo "    - DOC: http://localhost:8001"
echo "    - AI: http://localhost:8003"
echo "    - FLOW: http://localhost:8004"
echo "    - RS: http://localhost:8005"
echo "    - LIMS: http://localhost:8006"
echo "    - HRM: http://localhost:8010"
echo ""
echo "  企业增强服务:"
echo "    - QMS: http://localhost:8007"
echo "    - EHS: http://localhost:8008"
echo "    - ERP: http://localhost:8009"
echo "    - BI: http://localhost:8022"
echo ""
echo "  生态集成服务:"
echo "    - SCM: http://localhost:8016"
echo "    - SRM: http://localhost:8018"
echo "    - MAIL: http://localhost:8026"
echo "    - NOTIFICATION: http://localhost:8023"
echo "    - PORTAL: http://localhost:9021"
echo "    - MES: http://localhost:8014"
echo "    - CRM: http://localhost:8013"
echo "    - WMS: http://localhost:8020"
echo ""
echo "前端地址: http://localhost:3000"
echo ""
echo "测试账号:"
echo "  - admin / admin123"
echo "  - user / user123"
echo "  - guest / guest123"
echo ""
echo "查看日志:"
echo "  查看所有服务日志: ./scripts/check-services-status.sh --logs"
echo ""
echo "停止服务:"
echo "  - Docker: cd docker && docker-compose down"
echo "  - 停止所有服务: killall topems-iam topems-doc topems-ai topems-flow topems-rs topems-lims topems-hrm topems-qms topems-ehs topems-erp topems-bi topems-scm topems-srm topems-mail topems-notification topems-portal topems-mes topems-crm topems-wms"
echo ""
echo "检查状态:"
echo "  - 检查所有服务状态: ./scripts/check-services-status.sh"
