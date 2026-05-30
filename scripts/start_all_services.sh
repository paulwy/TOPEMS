#!/bin/bash

echo "=== TOPEMS 服务启动脚本 ==="
echo ""

JWT_SECRET="topems-jwt-secret-key-change-in-production-2026"

# 服务配置: 服务名 前端期望端口 默认端口 路径
services=(
  "iam 8002 8002 /Users/xingzhai/TOPEMS/platform/topems-iam/backend"
  "doc 8001 8001 /Users/xingzhai/TOPEMS/platform/topems-doc/backend"
  "flow 8004 8004 /Users/xingzhai/TOPEMS/platform/topems-flow/backend"
  "ai 8003 8003 /Users/xingzhai/TOPEMS/services/topems-ai/backend"
  "gis 8017 8011 /Users/xingzhai/TOPEMS/services/topems-gis/backend"
  "im 8019 8014 /Users/xingzhai/TOPEMS/services/topems-im/backend"
  "mobile 8022 8013 /Users/xingzhai/TOPEMS/services/topems-mobile/backend"
  "bi 8018 8012 /Users/xingzhai/TOPEMS/services/topems-bi/backend"
  "notification 8023 8006 /Users/xingzhai/TOPEMS/services/notification-service"
  "integration 8020 8020 /Users/xingzhai/TOPEMS/services/topems-integration/backend"
  "portal 8021 8021 /Users/xingzhai/TOPEMS/services/topems-portal/backend"
)

# 结果记录
declare -A results=()
declare -A errors=()

echo "🚀 启动服务..."
echo ""

for service in "${services[@]}"; do
  name=$(echo "$service" | awk '{print $1}')
  target_port=$(echo "$service" | awk '{print $2}')
  default_port=$(echo "$service" | awk '{print $3}')
  path=$(echo "$service" | cut -d' ' -f4-)
  
  echo "📦 启动 $name (端口: $target_port)..."
  
  # 检查端口是否被占用
  if lsof -Pi :"$target_port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ $name 启动失败: 端口 $target_port 已被占用"
    results[$name]="❌ 端口占用"
    errors[$name]="端口 $target_port 已被占用"
    echo ""
    continue
  fi
  
  cd "$path"
  export SERVER_PORT="$target_port"
  export PORT="$target_port"
  export JWT_SECRET="$JWT_SECRET"
  export USE_MEMORY_STORAGE="true"
  
  # 启动服务（后台运行）
  nohup cargo run > "/tmp/${name}_output.log" 2>&1 &
  pid=$!
  
  # 等待启动
  sleep 8
  
  # 检查是否成功启动
  if curl -s -f "http://localhost:$target_port/health" > /dev/null 2>&1; then
    results[$name]="✅ 成功"
    echo "✅ $name 启动成功!"
  else
    # 检查是否有编译错误
    if kill -0 $pid 2>/dev/null; then
      # 进程还在运行，可能需要更多时间
      sleep 5
      if curl -s -f "http://localhost:$target_port/health" > /dev/null 2>&1; then
        results[$name]="✅ 成功"
        echo "✅ $name 启动成功!"
      else
        kill $pid 2>/dev/null
        results[$name]="❌ 失败"
        errors[$name]="服务未响应健康检查"
        echo "❌ $name 启动失败!"
        tail -20 "/tmp/${name}_output.log"
      fi
    else
      results[$name]="❌ 失败"
      errors[$name]="进程已退出"
      echo "❌ $name 启动失败!"
      tail -20 "/tmp/${name}_output.log"
    fi
  fi
  
  echo ""
done

echo "=== 服务启动状态汇总 ==="
echo ""

for service in "${services[@]}"; do
  name=$(echo "$service" | awk '{print $1}')
  target_port=$(echo "$service" | awk '{print $2}')
  echo "$name (端口 $target_port): ${results[$name]}"
done

echo ""
echo "=== 详细错误信息 ==="
echo ""

for name in "${!errors[@]}"; do
  echo "$name: ${errors[$name]}"
done

echo ""
echo "=== 健康检查 ==="
echo ""

for service in "${services[@]}"; do
  name=$(echo "$service" | awk '{print $1}')
  target_port=$(echo "$service" | awk '{print $2}')
  
  if curl -s -f "http://localhost:$target_port/health" > /dev/null 2>&1; then
    echo "✅ $name (端口 $target_port): 健康"
  else
    echo "❌ $name (端口 $target_port): 未响应"
  fi
done