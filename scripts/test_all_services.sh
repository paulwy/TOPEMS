#!/bin/bash

echo "=========================================="
echo "   TOPEMS 完整功能测试"
echo "=========================================="

# 获取 token
echo -e "\n📋 获取访问令牌..."
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "❌ 无法获取访问令牌"
  exit 1
fi

echo "✅ 获取访问令牌成功"
echo "Token: ${TOKEN:0:50}..."

# 测试各个服务
echo -e "\n\n📡 服务健康检查"
echo "----------------------------------------"
for port in 8001 8002 8003 8004 8005 8006; do
  name=""
  case $port in
    8001) name="DOC" ;;
    8002) name="IAM" ;;
    8003) name="AI" ;;
    8004) name="FLOW" ;;
    8005) name="RS" ;;
    8006) name="LIMS" ;;
  esac

  response=$(curl -s http://localhost:$port/health 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$response" ]; then
    echo "✅ $name ($port) - 正常"
  else
    echo "❌ $name ($port) - 无响应"
  fi
done

# 测试 DOC 服务
echo -e "\n\n📄 DOC 服务 API 测试"
echo "----------------------------------------"
response=$(curl -s http://localhost:8001/api/v1/documents -H "Authorization: Bearer $TOKEN")
if [ -n "$response" ]; then
  echo "✅ DOC API 响应正常"
  echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('文档数量:', len(d.get('data',{}).get('items',[])))" 2>/dev/null || echo "响应: ${response:0:100}..."
else
  echo "❌ DOC API 无响应"
fi

# 测试 AI 服务
echo -e "\n\n🤖 AI 服务 API 测试"
echo "----------------------------------------"
response=$(curl -s -X POST http://localhost:8003/api/v1/knowledge/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":5}')
if [ -n "$response" ]; then
  echo "✅ AI API 响应正常"
  echo "$response" | head -c 150
  echo
else
  echo "❌ AI API 无响应"
fi

# 测试 RS 服务
echo -e "\n\n🔬 RS 服务 API 测试"
echo "----------------------------------------"
response=$(curl -s http://localhost:8005/api/v1/projects -H "Authorization: Bearer $TOKEN")
if [ -n "$response" ]; then
  echo "✅ RS API 响应正常"
  echo "$response" | head -c 150
  echo
else
  echo "❌ RS API 无响应"
fi

# 测试 LIMS 服务
echo -e "\n\n🧪 LIMS 服务 API 测试"
echo "----------------------------------------"
response=$(curl -s http://localhost:8006/api/v1/samples -H "Authorization: Bearer $TOKEN")
if [ -n "$response" ]; then
  echo "✅ LIMS API 响应正常"
  echo "$response" | head -c 150
  echo
else
  echo "❌ LIMS API 无响应"
fi

echo -e "\n\n=========================================="
echo "   测试完成"
echo "=========================================="
