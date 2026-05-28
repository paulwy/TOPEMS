#!/bin/bash

# TOPEMS LIMS 服务启动脚本（设置正确的 JWT_SECRET）

export JWT_SECRET="topems-jwt-secret"
export REFRESH_SECRET="topems-refresh-secret"
export JWT_EXPIRY_HOURS="24"
export RUST_LOG="info"

echo "=================================================="
echo "TOPEMS-LIMS 服务启动"
echo "=================================================="
echo ""
echo "JWT_SECRET: $JWT_SECRET"
echo "REFRESH_SECRET: $REFRESH_SECRET"
echo "JWT_EXPIRY_HOURS: $JWT_EXPIRY_HOURS"
echo ""

cd "$(dirname "$0")"
cargo run
