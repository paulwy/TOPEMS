#!/bin/bash

# TOPEMS 服务统一启动脚本

# 设置统一的环境变量
export JWT_SECRET="topems-jwt-secret"
export REFRESH_SECRET="topems-refresh-secret"
export JWT_EXPIRY_HOURS="24"
export RUST_LOG="${RUST_LOG:-info}"
export RUST_ENV="${RUST_ENV:-development}"
export ENV="${ENV:-dev}"
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

SERVICE_NAME=$(basename "$(pwd)")
LOG_FILE="/tmp/${SERVICE_NAME}.log"

echo "=================================================="
echo "TOPEMS-${SERVICE_NAME^^} 服务启动"
echo "=================================================="
echo ""
echo "JWT_SECRET: $JWT_SECRET"
echo "DATABASE_URL: ${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}"
echo "LOG_FILE: $LOG_FILE"
echo ""

# 启动服务
cargo run 2>&1 | tee "$LOG_FILE"
