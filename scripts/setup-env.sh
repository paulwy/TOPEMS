#!/bin/bash

# TOPEMS 配置初始化脚本
# 用于快速设置开发环境配置

set -e

echo "🔧 TOPEMS 环境配置初始化脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确目录
if [ ! -f ".env.example" ]; then
    echo -e "${RED}错误: 请在 TOPEMS 项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建配置文件
setup_config() {
    echo ""
    echo "📦 创建配置文件..."
    
    # 主项目配置文件
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} 创建 .env 文件"
        echo -e "${YELLOW}⚠️${NC} 请编辑 .env 文件并设置实际的数据库密码和其他敏感信息"
    else
        echo -e "${YELLOW}⚠️${NC} .env 文件已存在，跳过"
    fi
    
    # 前端配置文件
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.development frontend/.env.local
        echo -e "${GREEN}✓${NC} 创建 frontend/.env.local 文件"
    else
        echo -e "${YELLOW}⚠️${NC} frontend/.env.local 已存在，跳过"
    fi
    
    # 创建必要的目录
    echo ""
    echo "📁 创建必要目录..."
    mkdir -p uploads
    mkdir -p logs
    echo -e "${GREEN}✓${NC} 创建 uploads/ 和 logs/ 目录"
}

# 检查依赖服务
check_services() {
    echo ""
    echo "🔍 检查依赖服务..."
    
    # 检查 Docker
    if command -v docker &> /dev/null; then
        if docker ps &> /dev/null; then
            echo -e "${GREEN}✓${NC} Docker 已安装并运行"
        else
            echo -e "${YELLOW}⚠️${NC} Docker 已安装但未运行"
        fi
    else
        echo -e "${YELLOW}⚠️${NC} Docker 未安装"
    fi
    
    # 检查 PostgreSQL
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL 客户端已安装"
    else
        echo -e "${YELLOW}⚠️${NC} PostgreSQL 客户端未安装"
    fi
    
    # 检查 Redis
    if command -v redis-cli &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis 客户端已安装"
    else
        echo -e "${YELLOW}⚠️${NC} Redis 客户端未安装"
    fi
}

# 启动基础设施服务
start_infrastructure() {
    echo ""
    echo "🚀 启动基础设施服务..."
    
    if [ -f "infrastructure/docker/docker-compose.yml" ]; then
        cd infrastructure/docker
        docker-compose up -d
        cd ../..
        echo -e "${GREEN}✓${NC} 基础设施服务已启动"
    else
        echo -e "${YELLOW}⚠️${NC} Docker Compose 文件不存在，跳过"
    fi
}

# 生成密钥
generate_secrets() {
    echo ""
    echo "🔐 生成安全密钥..."
    
    # 生成 JWT 密钥
    if grep -q "JWT_SECRET=topems" .env 2>/dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        echo -e "${GREEN}✓${NC} JWT 密钥已生成"
    fi
    
    # 生成会话密钥
    if grep -q "SESSION_SECRET=topems" .env 2>/dev/null; then
        SESSION_SECRET=$(openssl rand -base64 32)
        sed -i '' "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
        echo -e "${GREEN}✓${NC} 会话密钥已生成"
    fi
}

# 显示完成信息
show_completion() {
    echo ""
    echo "================================"
    echo -e "${GREEN}✨ 配置初始化完成！${NC}"
    echo "================================"
    echo ""
    echo "下一步操作："
    echo "1. 编辑 .env 文件，设置数据库密码"
    echo "2. 运行 docker-compose up -d 启动数据库"
    echo "3. 运行 cargo build 构建项目"
    echo "4. 运行 cargo run 启动服务"
    echo ""
    echo "配置文档: docs/my/CONFIGURATION_GUIDE.md"
    echo ""
}

# 主流程
main() {
    setup_config
    check_services
    
    read -p "是否启动基础设施服务? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_infrastructure
        generate_secrets
    fi
    
    show_completion
}

# 运行主流程
main
