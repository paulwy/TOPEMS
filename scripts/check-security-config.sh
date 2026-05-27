#!/bin/bash

# TOPEMS 生产环境安全配置检查脚本
# 用于验证生产环境配置是否安全

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}TOPEMS 生产环境安全配置检查${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# 检查是否在正确的目录
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo -e "${RED}错误: 请在 TOPEMS 项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 项目根目录确认${NC}"
echo ""

# 检查根目录环境变量
check_env_file() {
    local file=$1
    local desc=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ 检查 $desc: $file${NC}"
        
        # 检查是否包含默认密码
        if grep -q "CHANGE_ME_IN_PRODUCTION" "$file"; then
            echo -e "${RED}  ✗ 发现默认密码标记 CHANGE_ME_IN_PRODUCTION${NC}"
            ((ERRORS++))
        fi
        
        # 检查 JWT_SECRET
        if grep -q "JWT_SECRET" "$file"; then
            local jwt_secret=$(grep "JWT_SECRET" "$file" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
            if [ -z "$jwt_secret" ] || [ "$jwt_secret" = "CHANGE_ME_IN_PRODUCTION" ]; then
                echo -e "${RED}  ✗ JWT_SECRET 未配置或使用默认值${NC}"
                ((ERRORS++))
            else
                local len=${#jwt_secret}
                if [ "$len" -lt 32 ]; then
                    echo -e "${YELLOW}  ⚠ JWT_SECRET 长度过短 (建议至少32字符)${NC}"
                    ((WARNINGS++))
                else
                    echo -e "${GREEN}  ✓ JWT_SECRET 已配置${NC}"
                fi
            fi
        fi
        
        # 检查数据库密码
        if grep -q "POSTGRES_PASSWORD" "$file"; then
            local pg_pwd=$(grep "POSTGRES_PASSWORD" "$file" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
            if [ -z "$pg_pwd" ] || [ "$pg_pwd" = "CHANGE_ME_IN_PRODUCTION" ] || [ "$pg_pwd" = "topems_dev" ] || [ "$pg_pwd" = "topems_test_secret" ]; then
                echo -e "${RED}  ✗ POSTGRES_PASSWORD 使用默认值或未配置${NC}"
                ((ERRORS++))
            else
                echo -e "${GREEN}  ✓ POSTGRES_PASSWORD 已配置${NC}"
            fi
        fi
        
        # 检查是否使用 localhost
        if grep -q "localhost" "$file" || grep -q "127.0.0.1" "$file"; then
            echo -e "${YELLOW}  ⚠ 发现 localhost/127.0.0.1 地址，生产环境应使用实际域名${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}  ⚠ 文件不存在: $file${NC}"
        ((WARNINGS++))
    fi
    echo ""
}

# 检查前端生产环境配置
check_frontend_config() {
    echo -e "${GREEN}✓ 检查前端运行时配置${NC}"
    
    local runtime_file="frontend/src/config/runtime.ts"
    if [ -f "$runtime_file" ]; then
        # 检查默认值模式
        if grep -q "http://localhost" "$runtime_file"; then
            echo -e "${YELLOW}  ⚠ runtime.ts 包含 localhost 默认值（这是正常的，生产应通过环境变量覆盖）${NC}"
        fi
        echo -e "${GREEN}  ✓ 前端配置正常，确保生产环境设置 VITE_* 环境变量${NC}"
    else
        echo -e "${RED}  ✗ 找不到前端配置文件${NC}"
        ((ERRORS++))
    fi
    echo ""
}

# 检查登录页演示账号
check_login_page() {
    echo -e "${GREEN}✓ 检查登录页面${NC}"
    
    local login_file="frontend/src/pages/LoginPage.tsx"
    if [ -f "$login_file" ]; then
        if grep -q "演示账号" "$login_file"; then
            echo -e "${YELLOW}  ⚠ 登录页包含演示账号信息${NC}"
            ((WARNINGS++))
        else
            echo -e "${GREEN}  ✓ 登录页已处理演示账号${NC}"
        fi
    fi
    echo ""
}

# 执行检查
check_env_file ".env.production" "根目录生产环境配置"
check_env_file "frontend/.env.production" "前端生产环境配置"
check_frontend_config
check_login_page

# 检查后端共享配置
echo -e "${GREEN}✓ 检查后端共享配置${NC}"
local config_file="shared/lib/src/config/mod.rs"
if [ -f "$config_file" ]; then
    echo -e "${GREEN}  ✓ 后端配置存在（默认值用于开发环境，生产通过环境变量覆盖）${NC}"
else
    echo -e "${RED}  ✗ 找不到后端配置文件${NC}"
    ((ERRORS++))
fi
echo ""

# 总结
echo -e "${YELLOW}========================================${NC}"
echo -e "检查完成"
echo -e "${RED}错误: $ERRORS${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$ERRORS" -gt 0 ]; then
    echo -e ""
    echo -e "${RED}请修复上述错误后再部署到生产环境${NC}"
    exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo -e ""
    echo -e "${YELLOW}请评估上述警告${NC}"
fi

echo -e ""
echo -e "${GREEN}✓ 安全检查通过${NC}"
