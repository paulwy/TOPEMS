#!/bin/bash
set -e

echo "=== 启动 TOPEMS 服务 ==="

# 确保数据库和 Redis 运行
echo "1. 启动数据库服务..."
docker-compose up -d postgres redis

# 等待数据库就绪
echo "2. 等待数据库就绪..."
sleep 10

# 启动 IAM 服务
echo "3. 启动 IAM 服务..."
cd /Users/air/TOPEMS/services/topems-iam/backend
nohup cargo run --bin topems-iam > /tmp/topems-iam.log 2>&1 &
IAM_PID=$!
echo "IAM 服务 PID: $IAM_PID"

# 等待 IAM 服务启动
sleep 5

# 启动 RS 服务
echo "4. 启动 RS 服务..."
cd /Users/air/TOPEMS/services/topems-rs/backend
nohup cargo run > /tmp/topems-rs.log 2>&1 &
RS_PID=$!
echo "RS 服务 PID: $RS_PID"

# 保存 PID
echo "$IAM_PID" > /tmp/topems-iam.pid
echo "$RS_PID" > /tmp/topems-rs.pid

# 等待服务启动
sleep 5

echo "=== 服务启动完成 ==="
echo "IAM 服务: http://localhost:8002"
echo "RS 服务: http://localhost:8000"
echo "日志文件: /tmp/topems-iam.log, /tmp/topems-rs.log"
