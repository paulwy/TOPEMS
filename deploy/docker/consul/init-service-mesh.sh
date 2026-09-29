#!/bin/bash
# V22.0 服务网格初始化脚本
# =============================================================================
# 功能：
# 1. 等待 Consul 服务可用
# 2. 注册服务到 Consul
# 3. 配置服务意图（零信任网络）
# 4. 验证服务网格状态
#
# 使用：./init-service-mesh.sh

set -e

CONSUL_ADDR=${CONSUL_ADDR:-"http://consul:8500"}
CONSUL_TOKEN=${CONSUL_TOKEN:-""}

echo "🚀 初始化 TOPEMS 服务网格..."
echo "📍 Consul 地址: $CONSUL_ADDR"

# 等待 Consul 可用
echo "⏳ 等待 Consul 服务可用..."
for i in $(seq 1 30); do
    if curl -sf "$CONSUL_ADDR/v1/status/leader" >/dev/null 2>&1; then
        echo "✅ Consul 服务可用"
        break
    fi
    echo "  重试 $i/30..."
    sleep 2
done

if ! curl -sf "$CONSUL_ADDR/v1/status/leader" >/dev/null 2>&1; then
    echo "❌ Consul 服务不可用，请先启动 Consul"
    exit 1
fi

CONSUL_ARGS=()
if [ -n "$CONSUL_TOKEN" ]; then
    CONSUL_ARGS=(-H "X-Consul-Token: $CONSUL_TOKEN")
fi

# 注册服务（从 HCL 配置文件加载）
echo "📋 注册服务到 Consul..."
for hcl_file in /consul/config/*.hcl; do
    if [ -f "$hcl_file" ]; then
        echo "  加载配置: $hcl_file"
        curl -s --request PUT \
            --data @"$hcl_file" \
            "${CONSUL_ARGS[@]}" \
            "$CONSUL_ADDR/v1/agent/service/register" || true
    fi
done

echo "✅ 服务注册完成"

# 配置服务意图（零信任网络）
echo "🔐 配置服务意图（零信任网络）..."

# 默认拒绝所有流量
curl -s --request PUT \
    --data '{"SourceName":"*","DestinationName":"*","Action":"deny"}' \
    "${CONSUL_ARGS[@]}" \
    "$CONSUL_ADDR/v1/connect/intentions" || true

# 允许网关 → 所有服务
for service in unified-core erp hrm pm crm mes pdm scm wms srm qms lims ehs; do
    curl -s --request PUT \
        --data "{\"SourceName\":\"traefik\",\"DestinationName\":\"$service\",\"Action\":\"allow\"}" \
        "${CONSUL_ARGS[@]}" \
        "$CONSUL_ADDR/v1/connect/intentions" || true
    echo "  ✅ traefik → $service"
done

# 允许服务间通信
declare -a INTENTIONS=(
    "unified-core:erp"
    "unified-core:hrm"
    "erp:wms"
    "erp:hrm"
    "hrm:unified-core"
    "scm:wms"
    "scm:srm"
    "pm:unified-core"
    "pm:erp"
    "crm:erp"
    "mes:wms"
    "mes:scm"
    "finance:erp"
    "erp:finance"
    "srm:unified-core"
    "wms:unified-core"
)

for intention in "${INTENTIONS[@]}"; do
    source="${intention%%:*}"
    dest="${intention##*:}"
    curl -s --request PUT \
        --data "{\"SourceName\":\"$source\",\"DestinationName\":\"$dest\",\"Action\":\"allow\"}" \
        "${CONSUL_ARGS[@]}" \
        "$CONSUL_ADDR/v1/connect/intentions" || true
    echo "  ✅ $source → $dest"
done

echo "✅ 服务意图配置完成"

# 验证服务网格状态
echo "📊 服务网格状态："
echo ""
echo "已注册服务："
curl -s "${CONSUL_ARGS[@]}" "$CONSUL_ADDR/v1/agent/services" | python3 -c "
import json, sys
services = json.load(sys.stdin)
for sid, info in sorted(services.items()):
    if not sid.startswith('mesh-gateway'):
        print(f\"  • {info['Service']:20s} @ {info['Address']}:{info['Port']}\")
" 2>/dev/null || echo "  (无法解析服务列表)"

echo ""
echo "服务意图："
curl -s "${CONSUL_ARGS[@]}" "$CONSUL_ADDR/v1/connect/intentions" | python3 -c "
import json, sys
intentions = json.load(sys.stdin)
for i in intentions:
    action = '✅ allow' if i['Action'] == 'allow' else '❌ deny'
    print(f\"  {action}  {i['SourceName']:20s} → {i['DestinationName']}\")
" 2>/dev/null || echo "  (无法解析意图列表"

echo ""
echo "🎉 服务网格初始化完成"
