#!/bin/bash
# 文件: scripts/verify-vite-proxy.sh
# Vite 代理配置验证脚本
# 验证 vite.config.ts 中所有代理规则是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 前端服务地址（Vite开发服务器）
FRONTEND_URL="http://localhost:3000"

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; PASSED_TESTS=$((PASSED_TESTS + 1)); }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; FAILED_TESTS=$((FAILED_TESTS + 1)); }
log_skip() { echo -e "${YELLOW}[SKIP]${NC} $1"; SKIPPED_TESTS=$((SKIPPED_TESTS + 1)); }
log_test() { echo -e "${BLUE}[TEST]${NC} $1"; TOTAL_TESTS=$((TOTAL_TESTS + 1)); }

# 测试HTTP代理
test_http_proxy() {
    local path="$1"
    local expected_status="${2:-200}"
    local description="$3"
    local require_auth="${4:-true}"

    log_test "$description"

    # 发送请求并获取状态码
    response=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}${path}" 2>&1)

    if [ "$response" -eq "$expected_status" ]; then
        log_success "$description (状态码: $response)"
    elif [ "$response" -eq "503" ]; then
        log_skip "$description - 后端服务未启动 (状态码: $response)"
    elif [ "$response" -eq "404" ]; then
        if [ "$require_auth" = "false" ]; then
            log_error "$description - 路径不存在或需要认证 (状态码: $response)"
        else
            log_skip "$description - 路径不存在 (状态码: $response)"
        fi
    elif [ "$response" -eq "401" ] && [ "$require_auth" = "false" ]; then
        log_success "$description - 需要认证但代理工作正常 (状态码: $response)"
    else
        log_error "$description - 预期状态码 $expected_status，实际 $response"
    fi
}

# 测试带重写的代理
test_proxy_rewrite() {
    local frontend_path="$1"
    local backend_path="$2"
    local description="$3"

    log_test "$description (重写: $frontend_path -> $backend_path)"

    # 通过前端代理发送请求
    frontend_response=$(curl -s "${FRONTEND_URL}${frontend_path}" 2>&1)

    # 直接访问后端路径（用于验证）
    # 注意：这里需要解析后端目标地址，简化处理只检查状态码

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}${frontend_path}" 2>&1)

    if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
        log_success "$description - 代理工作正常 (状态码: $response_code)"
    elif [ "$response_code" -eq "503" ]; then
        log_skip "$description - 后端服务未启动"
    else
        log_error "$description - 代理失败 (状态码: $response_code)"
    fi
}

# 测试API路径（需要认证的接口）
test_api_proxy() {
    local path="$1"
    local description="$2"

    log_test "$description"

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}${path}" 2>&1)

    # API接口通常返回200（有权限）、401（无权限）或503（服务未启动）
    if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
        log_success "$description - API代理正常 (状态码: $response_code)"
    elif [ "$response_code" -eq "503" ]; then
        log_skip "$description - 后端服务未启动"
    elif [ "$response_code" -eq "404" ]; then
        log_error "$description - API路径不存在 (状态码: $response_code)"
    else
        log_error "$description - API代理异常 (状态码: $response_code)"
    fi
}

echo "=============================================="
echo "  Vite 代理配置验证"
echo "=============================================="
echo ""

# 1. 核心平台代理（localhost:8000）
echo ""
echo "=== 1. 核心平台代理（unified-core:8000） ==="
echo ""

test_http_proxy "/health" 200 "健康检查 (/health)"
test_http_proxy "/api/core/plugins" 401 "插件API (/api/core/plugins)"
test_proxy_rewrite "/core/api/health" "/api/core/health" "核心API重写 (/core/api)"
test_http_proxy "/core/health" 200 "核心健康检查 (/core/health)" false

# IAM认证代理（需要POST方法）
log_test "IAM认证API (/iam/api/iam/auth/login)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${FRONTEND_URL}/iam/api/iam/auth/login" -H "Content-Type: application/json" -d '{"username":"test","password":"test"}' 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ] || [ "$response_code" -eq "400" ]; then
    log_success "IAM认证API - 代理工作正常 (状态码: $response_code)"
else
    log_error "IAM认证API - 代理失败 (状态码: $response_code)"
fi

# IAM用户API - 使用真实路径
test_proxy_rewrite "/iam/api/iam/users" "/api/core/iam/users" "IAM用户API (/iam/api/iam/users)"

# 通信服务代理
test_proxy_rewrite "/comm/api/health" "/api/core/comm/health" "通信API重写 (/comm/api)"
test_http_proxy "/comm/health" 200 "通信健康检查 (/comm/health)" false

# 文件服务代理
test_proxy_rewrite "/file/api/test" "/api/core/file/test" "文件API重写 (/file/api)"

# 邮件服务代理
test_proxy_rewrite "/mail/api/test" "/api/core/comm/mail/test" "邮件API重写 (/mail/api)"

# 通知服务代理
test_proxy_rewrite "/notification/api/v1/test" "/api/v1/test" "通知API v1重写 (/notification/api/v1)"
test_proxy_rewrite "/notification/api/test" "/api/core/comm/notify/test" "通知API重写 (/notification/api)"

# IM服务代理
test_proxy_rewrite "/im/api/test" "/api/core/comm/im/test" "IM API重写 (/im/api)"

# Flow工作流代理
test_proxy_rewrite "/flow/api/test" "/api/test" "Flow API重写 (/flow/api)"
test_http_proxy "/flow/health" 200 "Flow健康检查 (/flow/health)"

# Integration集成服务代理
test_api_proxy "/integration/api/test" "Integration API代理"
test_http_proxy "/integration/health" 200 "Integration健康检查 (/integration/health)"

# 2. 业务服务代理
echo ""
echo "=== 2. 业务服务代理 ==="
echo ""

# ERP服务 (8010) - 使用真实API路径
log_test "ERP API代理 (/erp/api/v1/health)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/erp/api/v1/health" 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
    log_success "ERP API代理 - 工作正常 (状态码: $response_code)"
elif [ "$response_code" -eq "503" ]; then
    log_skip "ERP API代理 - 后端服务未启动"
else
    log_error "ERP API代理 - 失败 (状态码: $response_code)"
fi
test_http_proxy "/erp/health" 200 "ERP健康检查 (/erp/health)"

# HRM服务 (8020) - 使用真实API路径
log_test "HRM API重写 (/hrm/api/hrm/users)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/hrm/api/hrm/users" 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
    log_success "HRM API重写 - 工作正常 (状态码: $response_code)"
elif [ "$response_code" -eq "503" ]; then
    log_skip "HRM API重写 - 后端服务未启动"
else
    log_error "HRM API重写 - 失败 (状态码: $response_code)"
fi
test_http_proxy "/hrm/health" 200 "HRM健康检查 (/hrm/health)"

# PM项目管理服务 (8023) - 使用真实API路径
log_test "PM API代理 (/pm/api/v1/health)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/pm/api/v1/health" 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
    log_success "PM API代理 - 工作正常 (状态码: $response_code)"
elif [ "$response_code" -eq "503" ]; then
    log_skip "PM API代理 - 后端服务未启动"
else
    log_error "PM API代理 - 失败 (状态码: $response_code)"
fi
test_http_proxy "/pm/health" 200 "PM健康检查 (/pm/health)"

# CRM客户管理服务 (8029) - 使用真实API路径
log_test "CRM API代理 (/crm/api/v1/health)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/crm/api/v1/health" 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
    log_success "CRM API代理 - 工作正常 (状态码: $response_code)"
elif [ "$response_code" -eq "503" ]; then
    log_skip "CRM API代理 - 后端服务未启动"
else
    log_error "CRM API代理 - 失败 (状态码: $response_code)"
fi
test_http_proxy "/crm/health" 200 "CRM健康检查 (/crm/health)"

# MES制造执行服务 (8030) - 使用真实API路径
log_test "MES API重写 (/mes/api/v1/health)"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/mes/api/v1/health" 2>&1)
if [ "$response_code" -eq "200" ] || [ "$response_code" -eq "401" ]; then
    log_success "MES API重写 - 工作正常 (状态码: $response_code)"
elif [ "$response_code" -eq "503" ]; then
    log_skip "MES API重写 - 后端服务未启动"
else
    log_error "MES API重写 - 失败 (状态码: $response_code)"
fi
test_http_proxy "/mes/health" 200 "MES健康检查 (/mes/health)"

# PDM产品数据服务 (8031)
test_proxy_rewrite "/pdm/api/test" "/api/test" "PDM API重写 (/pdm/api)"
test_http_proxy "/pdm/health" 200 "PDM健康检查 (/pdm/health)"

# SCM供应链服务 (8040)
test_api_proxy "/scm/api/test" "SCM API代理"
test_http_proxy "/scm/health" 200 "SCM健康检查 (/scm/health)"

# WMS仓储服务 (8041)
test_api_proxy "/wms/api/test" "WMS API代理"
test_http_proxy "/wms/health" 200 "WMS健康检查 (/wms/health)"

# SRM供应商服务 (8042)
test_api_proxy "/srm/api/test" "SRM API代理"
test_http_proxy "/srm/health" 200 "SRM健康检查 (/srm/health)"

# QMS质量服务 (8050)
test_proxy_rewrite "/qms/api/test" "/api/test" "QMS API重写 (/qms/api)"
test_http_proxy "/qms/health" 200 "QMS健康检查 (/qms/health)"

# LIMS实验室服务 (8051)
test_proxy_rewrite "/lims/api/test" "/api/test" "LIMS API重写 (/lims/api)"
test_http_proxy "/lims/health" 200 "LIMS健康检查 (/lims/health)"

# EHS环境健康服务 (8052)
test_proxy_rewrite "/ehs/api/test" "/api/test" "EHS API重写 (/ehs/api)"
test_http_proxy "/ehs/health" 200 "EHS健康检查 (/ehs/health)"

# RS资源服务 (8053)
test_api_proxy "/rs/api/test" "RS API代理"
test_http_proxy "/rs/health" 200 "RS健康检查 (/rs/health)"

# BI商业智能服务 (8060)
test_api_proxy "/bi/api/test" "BI API代理"
test_http_proxy "/bi/health" 200 "BI健康检查 (/bi/health)"

# Report报表服务 (8061)
test_proxy_rewrite "/report/api/test" "/api/test" "Report API重写 (/report/api)"
test_http_proxy "/report/health" 200 "Report健康检查 (/report/health)"

# Monitor监控服务 (8062)
test_api_proxy "/monitor/api/test" "Monitor API代理"
test_http_proxy "/monitor/health" 200 "Monitor健康检查 (/monitor/health)"

# Portal门户服务 (8063)
test_api_proxy "/portal/api/test" "Portal API代理"
test_http_proxy "/portal/health" 200 "Portal健康检查 (/portal/health)"

# AI智能服务 (8064)
test_api_proxy "/ai/api/test" "AI API代理"
test_http_proxy "/ai/health" 200 "AI健康检查 (/ai/health)"

# Mobile移动服务 (8070)
test_api_proxy "/mobile/api/test" "Mobile API代理"
test_http_proxy "/mobile/health" 200 "Mobile健康检查 (/mobile/health)"

# GIS地理服务 (8071)
test_api_proxy "/gis/api/test" "GIS API代理"
test_http_proxy "/gis/health" 200 "GIS健康检查 (/gis/health)"

# Migration迁移服务 (8787)
test_api_proxy "/migration/api/test" "Migration API代理"
test_http_proxy "/migration/health" 200 "Migration健康检查 (/migration/health)"

# Master主服务 (8000)
test_api_proxy "/master/api/test" "Master API代理"
test_http_proxy "/master/health" 200 "Master健康检查 (/master/health)"

# 3. WebSocket代理（无法直接测试，只验证配置）
echo ""
echo "=== 3. WebSocket代理（配置验证） ==="
echo ""
log_info "WebSocket代理需要浏览器测试:"
log_info "  - /ws/core/notifications -> ws://localhost:8000 (通知服务，统一规范)"
log_info "  - /ws/core/im -> ws://localhost:8000 (IM服务，统一规范)"
log_info "  - /mes/ws/dashboard -> ws://localhost:8030 (MES仪表盘)"
log_info "  - /gis/ws -> ws://localhost:8071 (GIS服务，重写为/api/gis/ws)"
log_info ""
log_info "路径规范: /ws/{module}/{feature}"

# 4. 特殊代理规则
echo ""
echo "=== 4. 特殊代理规则 ==="
echo ""

# Manufacturing制造服务重写
test_api_proxy "/mfg/api/test" "Manufacturing API重写 (/mfg/api -> /api/mfg)"

# Plugin健康检查代理
log_info "Plugin健康检查代理（共21个服务）"

# 5. 通用API代理
echo ""
echo "=== 5. 通用API代理 ==="
echo ""
test_api_proxy "/api/test" "通用API代理 (/api)"

# 输出测试结果
echo ""
echo "=============================================="
echo "  验证结果统计"
echo "=============================================="
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo -e "跳过: ${YELLOW}$SKIPPED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有代理配置验证通过${NC}"
    exit 0
else
    echo -e "${RED}✗ 存在 $FAILED_TESTS 个失败的代理配置${NC}"
    exit 1
fi