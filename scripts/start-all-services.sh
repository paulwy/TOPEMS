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

# 2. 启动核心平台服务 (基础设施层)
echo ""
echo "🔐 2. 启动核心平台服务组 (8000-8009)..."

echo "启动 IAM 身份认证服务 (端口 8000)..."
cd "$PROJECT_ROOT/services/topems-iam/backend"
cargo run --bin topems-iam > /dev/null 2>&1 &
IAM_PID=$!
echo "✅ IAM 服务启动中 (PID: $IAM_PID)"

echo "启动 DOC 文档管理服务 (端口 8001)..."
cd "$PROJECT_ROOT/services/topems-doc/backend"
cargo run > /dev/null 2>&1 &
DOC_PID=$!
echo "✅ DOC 服务启动中 (PID: $DOC_PID)"

echo "启动 FLOW 工作流服务 (端口 8002)..."
cd "$PROJECT_ROOT/services/topems-flow/backend"
cargo run > /dev/null 2>&1 &
FLOW_PID=$!
echo "✅ FLOW 服务启动中 (PID: $FLOW_PID)"

echo "启动 NOTIFICATION 通知服务 (端口 8003)..."
cd "$PROJECT_ROOT/services/topems-notification/backend"
cargo run > /dev/null 2>&1 &
NOTIFICATION_PID=$!
echo "✅ NOTIFICATION 服务启动中 (PID: $NOTIFICATION_PID)"

echo "启动 INTEGRATION 系统集成 (端口 8004)..."
cd "$PROJECT_ROOT/services/topems-integration/backend"
cargo run > /dev/null 2>&1 &
INTEGRATION_PID=$!
echo "✅ INTEGRATION 服务启动中 (PID: $INTEGRATION_PID)"

echo "启动 PORTAL 统一门户 (端口 8005)..."
cd "$PROJECT_ROOT/services/topems-portal/backend"
cargo run > /dev/null 2>&1 &
PORTAL_PID=$!
echo "✅ PORTAL 服务启动中 (PID: $PORTAL_PID)"

# 3. 启动研发创新服务 (8020-8029)
echo ""
echo "🔬 3. 启动研发创新服务组 (8020-8029)..."

echo "启动 RS 研发管理服务 (端口 8020)..."
cd "$PROJECT_ROOT/services/topems-rs/backend"
cargo run > /dev/null 2>&1 &
RS_PID=$!
echo "✅ RS 服务启动中 (PID: $RS_PID)"

echo "启动 LIMS 实验室管理 (端口 8021)..."
cd "$PROJECT_ROOT/services/topems-lims/backend"
cargo run > /dev/null 2>&1 &
LIMS_PID=$!
echo "✅ LIMS 服务启动中 (PID: $LIMS_PID)"

echo "启动 AI 服务 (端口 8022)..."
cd "$PROJECT_ROOT/services/topems-ai/backend"
cargo run > /dev/null 2>&1 &
AI_PID=$!
echo "✅ AI 服务启动中 (PID: $AI_PID)"

echo "启动 PDM 产品数据 (端口 8023)..."
cd "$PROJECT_ROOT/services/topems-pdm/backend"
cargo run > /dev/null 2>&1 &
PDM_PID=$!
echo "✅ PDM 服务启动中 (PID: $PDM_PID)"

# 4. 启动企业资源服务 (8010-8019)
echo ""
echo "🏭 4. 启动企业资源服务组 (8010-8019)..."

echo "启动 ERP 企业资源 (端口 8010)..."
cd "$PROJECT_ROOT/services/topems-erp/backend"
cargo run > /dev/null 2>&1 &
ERP_PID=$!
echo "✅ ERP 服务启动中 (PID: $ERP_PID)"

echo "启动 HRM 人力资源 (端口 8011)..."
cd "$PROJECT_ROOT/services/topems-hrm/backend"
cargo run > /dev/null 2>&1 &
HRM_PID=$!
echo "✅ HRM 服务启动中 (PID: $HRM_PID)"

echo "启动 CRM 客户关系 (端口 8012)..."
cd "$PROJECT_ROOT/services/topems-crm/backend"
cargo run > /dev/null 2>&1 &
CRM_PID=$!
echo "✅ CRM 服务启动中 (PID: $CRM_PID)"

# 5. 启动制造与质量服务 (8030-8039)
echo ""
echo "⚙️ 5. 启动制造与质量服务组 (8030-8039)..."

echo "启动 MES 制造执行 (端口 8030)..."
cd "$PROJECT_ROOT/services/topems-mes/backend"
cargo run > /dev/null 2>&1 &
MES_PID=$!
echo "✅ MES 服务启动中 (PID: $MES_PID)"

echo "启动 QMS 质量管理 (端口 8031)..."
cd "$PROJECT_ROOT/services/topems-qms/backend"
cargo run > /dev/null 2>&1 &
QMS_PID=$!
echo "✅ QMS 服务启动中 (PID: $QMS_PID)"

echo "启动 EHS 安全环保 (端口 8032)..."
cd "$PROJECT_ROOT/services/topems-ehs/backend"
cargo run > /dev/null 2>&1 &
EHS_PID=$!
echo "✅ EHS 服务启动中 (PID: $EHS_PID)"

# 6. 启动供应链服务 (8040-8049)
echo ""
echo "📦 6. 启动供应链服务组 (8040-8049)..."

echo "启动 SCM 供应链 (端口 8040)..."
cd "$PROJECT_ROOT/services/topems-scm/backend"
cargo run > /dev/null 2>&1 &
SCM_PID=$!
echo "✅ SCM 服务启动中 (PID: $SCM_PID)"

echo "启动 SRM 供应商 (端口 8041)..."
cd "$PROJECT_ROOT/services/topems-srm/backend"
cargo run > /dev/null 2>&1 &
SRM_PID=$!
echo "✅ SRM 服务启动中 (PID: $SRM_PID)"

echo "启动 WMS 仓库管理 (端口 8042)..."
cd "$PROJECT_ROOT/services/topems-wms/backend"
cargo run > /dev/null 2>&1 &
WMS_PID=$!
echo "✅ WMS 服务启动中 (PID: $WMS_PID)"

# 7. 启动专业服务 (8050-8059)
echo ""
echo "🌍 7. 启动专业服务组 (8050-8059)..."

echo "启动 GIS 地理信息 (端口 8050)..."
cd "$PROJECT_ROOT/services/topems-gis/backend"
cargo run > /dev/null 2>&1 &
GIS_PID=$!
echo "✅ GIS 服务启动中 (PID: $GIS_PID)"

echo "启动 IM 即时通讯 (端口 8051)..."
cd "$PROJECT_ROOT/services/topems-im/backend"
cargo run > /dev/null 2>&1 &
IM_PID=$!
echo "✅ IM 服务启动中 (PID: $IM_PID)"

echo "启动 BI 商业智能 (端口 8052)..."
cd "$PROJECT_ROOT/services/topems-bi/backend"
cargo run > /dev/null 2>&1 &
BI_PID=$!
echo "✅ BI 服务启动中 (PID: $BI_PID)"

echo "启动 REPORT 报表服务 (端口 8053)..."
cd "$PROJECT_ROOT/services/report-service"
cargo run > /dev/null 2>&1 &
REPORT_PID=$!
echo "✅ REPORT 服务启动中 (PID: $REPORT_PID)"

echo "启动 MAIL 邮件服务 (端口 8054)..."
cd "$PROJECT_ROOT/services/topems-mail/backend"
cargo run > /dev/null 2>&1 &
MAIL_PID=$!
echo "✅ MAIL 服务启动中 (PID: $MAIL_PID)"

echo "启动 MOBILE 移动服务 (端口 8055)..."
cd "$PROJECT_ROOT/services/topems-mobile/backend"
cargo run > /dev/null 2>&1 &
MOBILE_PID=$!
echo "✅ MOBILE 服务启动中 (PID: $MOBILE_PID)"

# 10. 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 11. 检查服务健康状态
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

echo "=== 核心平台 (8000-8009) ==="
check_service "IAM" "http://localhost:8000/health"
check_service "DOC" "http://localhost:8001/health"
check_service "FLOW" "http://localhost:8002/health"
check_service "NOTIFICATION" "http://localhost:8003/health"
check_service "INTEGRATION" "http://localhost:8004/health"
check_service "PORTAL" "http://localhost:8005/health"

echo ""
echo "=== 企业资源 (8010-8019) ==="
check_service "ERP" "http://localhost:8010/health"
check_service "HRM" "http://localhost:8011/health"
check_service "CRM" "http://localhost:8012/health"

echo ""
echo "=== 研发创新 (8020-8029) ==="
check_service "RS" "http://localhost:8020/health"
check_service "LIMS" "http://localhost:8021/health"
check_service "AI" "http://localhost:8022/health"
check_service "PDM" "http://localhost:8023/health"

echo ""
echo "=== 制造质量 (8030-8039) ==="
check_service "MES" "http://localhost:8030/health"
check_service "QMS" "http://localhost:8031/health"
check_service "EHS" "http://localhost:8032/health"

echo ""
echo "=== 供应链 (8040-8049) ==="
check_service "SCM" "http://localhost:8040/health"
check_service "SRM" "http://localhost:8041/health"
check_service "WMS" "http://localhost:8042/health"

echo ""
echo "=== 专业服务 (8050-8059) ==="
check_service "GIS" "http://localhost:8050/health"
check_service "IM" "http://localhost:8051/health"
check_service "BI" "http://localhost:8052/health"
check_service "REPORT" "http://localhost:8053/health"
check_service "MAIL" "http://localhost:8054/health"
check_service "MOBILE" "http://localhost:8055/health"

echo ""
echo "========================"
echo "🎉 所有服务启动完成！"
echo ""
echo "服务地址:"
echo ""
echo "  🔐 核心平台 (8000-8009):"
echo "    - IAM:           http://localhost:8000"
echo "    - DOC:           http://localhost:8001"
echo "    - FLOW:          http://localhost:8002"
echo "    - NOTIFICATION:  http://localhost:8003"
echo "    - INTEGRATION:   http://localhost:8004"
echo "    - PORTAL:        http://localhost:8005"
echo ""
echo "  🏭 企业资源 (8010-8019):"
echo "    - ERP:           http://localhost:8010"
echo "    - HRM:           http://localhost:8011"
echo "    - CRM:           http://localhost:8012"
echo ""
echo "  🔬 研发创新 (8020-8029):"
echo "    - RS:            http://localhost:8020"
echo "    - LIMS:          http://localhost:8021"
echo "    - AI:            http://localhost:8022"
echo "    - PDM:           http://localhost:8023"
echo ""
echo "  ⚙️ 制造质量 (8030-8039):"
echo "    - MES:           http://localhost:8030"
echo "    - QMS:           http://localhost:8031"
echo "    - EHS:           http://localhost:8032"
echo ""
echo "  📦 供应链 (8040-8049):"
echo "    - SCM:           http://localhost:8040"
echo "    - SRM:           http://localhost:8041"
echo "    - WMS:           http://localhost:8042"
echo ""
echo "  🌍 专业服务 (8050-8059):"
echo "    - GIS:           http://localhost:8050"
echo "    - IM:            http://localhost:8051"
echo "    - BI:            http://localhost:8052"
echo "    - REPORT:        http://localhost:8053"
echo "    - MAIL:          http://localhost:8054"
echo "    - MOBILE:        http://localhost:8055"
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
echo "  - 停止所有服务: ./scripts/stop-all-services.sh"
echo ""
echo "检查状态:"
echo "  - 检查所有服务状态: ./scripts/check-services-status.sh"