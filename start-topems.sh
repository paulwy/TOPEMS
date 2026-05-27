#!/bin/bash

echo "==================================="
echo "  TOPEMS 平台一键启动脚本 v2.2"
echo "==================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 停止现有服务
echo -e "${BLUE}[1/6]${NC} 停止现有服务..."
lsof -ti:3000,3006,8001,8002,8003,8004,8005 | xargs kill -9 2>/dev/null || true
sleep 2

# 启动 IAM 服务
echo -e "${BLUE}[2/6]${NC} 启动 IAM 身份认证服务 (端口 8002)..."
cd /Users/xingzhai/TOPEMS/platform/topems-iam/backend
cargo run > /tmp/topems-iam.log 2>&1 &
IAM_PID=$!
echo -e "  ${GREEN}✓${NC} IAM 服务已启动 (PID: $IAM_PID)"

# 等待 IAM 服务启动
sleep 5

# 启动 DOC 服务
echo -e "${BLUE}[3/6]${NC} 启动 DOC 文档管理服务 (端口 8001)..."
cd /Users/xingzhai/TOPEMS/platform/topems-doc/backend
cargo run > /tmp/topems-doc.log 2>&1 &
DOC_PID=$!
echo -e "  ${GREEN}✓${NC} DOC 服务已启动 (PID: $DOC_PID)"

# 等待 DOC 服务启动
sleep 3

# 启动 AI 服务
echo -e "${BLUE}[4/6]${NC} 启动 AI 知识库服务 (端口 8004)..."
cd /Users/xingzhai/TOPEMS/platform/topems-ai/backend
cargo run > /tmp/topems-ai.log 2>&1 &
AI_PID=$!
echo -e "  ${GREEN}✓${NC} AI 服务已启动 (PID: $AI_PID)"

# 等待 AI 服务启动
sleep 3

# 启动 RS 服务
echo -e "${BLUE}[5/6]${NC} 启动 RS 科研研发服务 (端口 8005)..."
cd /Users/xingzhai/TOPEMS/services/topems-rs/backend
cargo run > /tmp/topems-rs.log 2>&1 &
RS_PID=$!
echo -e "  ${GREEN}✓${NC} RS 服务已启动 (PID: $RS_PID)"

# 等待 RS 服务启动
sleep 5

# 启动前端
echo -e "${BLUE}[6/6]${NC} 启动前端服务 (端口 3000)..."
cd /Users/xingzhai/TOPEMS
npm run dev > /tmp/topems-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "  ${GREEN}✓${NC} 前端服务已启动 (PID: $FRONTEND_PID)"

# 等待前端启动
sleep 5

echo ""
echo "==================================="
echo -e "${GREEN}✓ 所有服务启动完成！${NC}"
echo "==================================="
echo ""
echo "服务地址："
echo "  - 统一门户:  ${GREEN}http://localhost:3000${NC}"
echo "  - IAM API:    http://localhost:8002"
echo "  - DOC API:   http://localhost:8001"
echo "  - AI API:    http://localhost:8004"
echo "  - RS API:    http://localhost:8005"
echo ""
echo "测试账号："
echo "  - 管理员:    admin123 / Admin123"
echo "  - 普通用户:  testuser / Test123456"
echo "  - 访客:      guestuser / Guest123"
echo ""
echo "日志文件："
echo "  - IAM:       tail -f /tmp/topems-iam.log"
echo "  - DOC:       tail -f /tmp/topems-doc.log"
echo "  - AI:        tail -f /tmp/topems-ai.log"
echo "  - RS:        tail -f /tmp/topems-rs.log"
echo "  - Frontend:  tail -f /tmp/topems-frontend.log"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# 保持脚本运行
wait
