#!/bin/bash

# TOPEMS 配置验证脚本
# 用于验证环境变量配置的完整性和正确性

set -e

echo "🔍 TOPEMS 配置验证"
echo "==================="
echo ""

# 计数器
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_required() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "  ✗ $var_name 未设置"
        ((FAILED++))
        return 1
    else
        echo -e "  ✓ $var_name 已设置"
        ((PASSED++))
        return 0
    fi
}

check_min_length() {
    local var_name=$1
    local var_value=${!var_name}
    local min_length=$2
    
    if [ ${#var_value} -lt $min_length ]; then
        echo -e "  ⚠️ $var_name 长度不足（${#var_value} < $min_length）"
        ((WARNINGS++))
        return 1
    fi
    return 0
}

check_port() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [[ ! $var_value =~ ^[0-9]+$ ]] || [ $var_value -lt 1 ] || [ $var_value -gt 65535 ]; then
        echo -e "  ✗ $var_name 端口无效: $var_value"
        ((FAILED++))
        return 1
    fi
    return 0
}

check_url() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [[ ! $var_value =~ ^https?:// ]]; then
        echo -e "  ⚠️ $var_name URL 格式不正确: $var_value"
        ((WARNINGS++))
        return 1
    fi
    return 0
}

# 加载环境变量
if [ -f .env ]; then
    source .env
    echo "✓ 已加载 .env 文件"
else
    echo -e "\033[0;31m✗ .env 文件不存在\033[0m"
    exit 1
fi

echo ""
echo "开始验证配置..."
echo ""

# 1. 应用环境
echo "1. 应用环境"
check_required APP_ENV
check_required NODE_ENV

# 2. 数据库配置
echo ""
echo "2. 数据库配置"
check_required DATABASE_URL
check_required DB_HOST
check_port DB_PORT
check_required DB_NAME
check_required DB_USER
check_required DB_PASSWORD
check_min_length DB_PASSWORD 8

# 3. 认证配置
echo ""
echo "3. 认证配置"
check_required JWT_SECRET
check_min_length JWT_SECRET 32
check_required JWT_EXPIRY_HOURS
check_required JWT_REFRESH_SECRET
check_min_length JWT_REFRESH_SECRET 32
check_required SESSION_SECRET
check_min_length SESSION_SECRET 32

# 4. Redis 配置
echo ""
echo "4. Redis 配置"
check_required REDIS_HOST
check_port REDIS_PORT

# 5. 服务端口
echo ""
echo "5. 服务端口配置"
check_port IAM_PORT
check_port DOC_PORT
check_port AI_PORT
check_port FLOW_PORT

# 6. CORS 配置
echo ""
echo "6. CORS 配置"
check_required CORS_ORIGINS

# 7. 文件存储
echo ""
echo "7. 文件存储配置"
check_required UPLOAD_DIR
check_required UPLOAD_MAX_SIZE
check_required ALLOWED_FILE_TYPES

# 8. AI 配置
echo ""
echo "8. AI 服务配置"
check_url OLLAMA_BASE_URL
check_required OLLAMA_MODEL

# 9. 日志配置
echo ""
echo "9. 日志配置"
check_required LOG_LEVEL

# 10. 生产环境特殊检查
if [ "$APP_ENV" = "production" ]; then
    echo ""
    echo "10. 生产环境特殊检查"
    
    if [ "$ENABLE_DEBUG_MODE" = "true" ]; then
        echo -e "  ⚠️ 警告: 生产环境不应启用调试模式"
        ((WARNINGS++))
    fi
    
    if [ "$ENABLE_HTTPS" != "true" ]; then
        echo -e "  ⚠️ 警告: 生产环境建议启用 HTTPS"
        ((WARNINGS++))
    fi
    
    if [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"test"* ]]; then
        echo -e "  ✗ 生产环境 JWT 密钥包含敏感词汇"
        ((FAILED++))
    fi
fi

# 显示汇总
echo ""
echo "==================="
echo "验证结果汇总"
echo "==================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo -e "警告: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}配置验证失败，请修复上述错误${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}配置存在警告，建议检查${NC}"
    exit 0
else
    echo -e "${GREEN}✓ 所有配置验证通过${NC}"
    exit 0
fi
