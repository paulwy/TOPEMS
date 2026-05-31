#!/bin/bash

cd "$(dirname "$0")"

export SERVER_PORT=8006
export DATABASE_URL="postgres://topems:topems123@localhost:5432/topems_lims"
export REDIS_URL="redis://localhost:6379"
export RUST_LOG=info

echo "环境变量检查:"
echo "SERVER_PORT=$SERVER_PORT"
echo "DATABASE_URL=$DATABASE_URL"
echo ""

# 使用 env 运行二进制文件，确保所有环境变量都被传递
exec env \
    SERVER_PORT="$SERVER_PORT" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    RUST_LOG="$RUST_LOG" \
    ./target/release/topems-lims
