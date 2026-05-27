#!/bin/bash

OUTPUT_DIR="/Users/xingzhai/TOPEMS/packages"
mkdir -p "$OUTPUT_DIR"

echo "=== 开始打包 TOPEMS 服务 ==="

services=("postgres:16-alpine" "redis:7-alpine" "rust:nightly" "docker-iam" "docker-doc" "docker-flow" "docker-rs" "docker-ai")

for service in "${services[@]}"; do
    echo "正在打包 $service..."
    filename=$(echo "$service" | tr ':' '_' | tr '/' '_').tar
    docker save "$service" -o "$OUTPUT_DIR/$filename"
    echo "✓ $filename"
done

echo ""
echo "=== 打包完成 ==="
echo "输出目录: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"