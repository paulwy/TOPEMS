# TOPEMS 服务集成测试指南

本文档提供了如何在 TOPEMS 微服务架构中执行集成测试的指导。

## 环境准备

### 前置条件

1. 确保 Docker 和 Docker Compose 已安装
2. 确保所有服务代码已编译
3. 准备统一的 JWT 密钥配置

### 快速启动测试环境

```bash
# 从项目根目录启动所有服务
cd /Users/xingzhai/TOPEMS

# 复制全局配置
cp .env.example .env

# 修改 JWT_SECRET 为统一值（生产环境需使用安全密钥）
# 确保所有服务使用相同的 JWT_SECRET

# 使用 docker-compose 启动服务
docker-compose -f docker/docker-compose.yml up -d
```

## 服务间通信测试

### 1. 从 IAM 服务获取 Token

```bash
# 登录获取 JWT token
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin123",
    "password": "Admin123"
  }'
```

响应示例：

```json
{
  "code": 200,
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": "...",
      "username": "admin123",
      "email": "admin@topems.com",
      "role": "管理员",
      "roles": ["..."],
      "permissions": ["..."],
      "is_superuser": true,
      "created_at": "...",
      "is_active": true
    }
  },
  "message": "登录成功",
  "timestamp": "2026-05-23T..."
}
```

### 2. 使用 Token 访问文档服务

```bash
# 保存 token 到变量
TOKEN="YOUR_JWT_TOKEN_HERE"

# 测试获取文件列表（需要认证）
curl -X GET http://localhost:8001/api/v1/files \
  -H "Authorization: Bearer $TOKEN"

# 测试上传文件（需要认证）
curl -X POST http://localhost:8001/api/v1/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/file.txt"

# 健康检查（不需要认证）
curl http://localhost:8001/health
```

## 自动化集成测试脚本

### Bash 测试脚本

创建一个简单的 Bash 测试脚本 `scripts/test-integration.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 开始 TOPEMS 服务集成测试"
echo "================================"

# 配置
IAM_SERVICE_URL="http://localhost:8002"
DOC_SERVICE_URL="http://localhost:8001"
ADMIN_USER="admin123"
ADMIN_PASSWORD="Admin123"
TEST_FILE="/tmp/test-topems.txt"

# 创建测试文件
echo "TOPEMS Integration Test Content" > $TEST_FILE
echo "✅ 测试文件已创建"

# 测试 1: IAM 服务健康检查
echo ""
echo "🧪 测试 1: IAM 服务健康检查"
curl -f -s -o /dev/null $IAM_SERVICE_URL/health
if [ $? -eq 0 ]; then
    echo "✅ IAM 服务运行正常"
else
    echo "❌ IAM 服务不可用"
    exit 1
fi

# 测试 2: 文档服务健康检查
echo ""
echo "🧪 测试 2: 文档服务健康检查"
curl -f -s -o /dev/null $DOC_SERVICE_URL/health
if [ $? -eq 0 ]; then
    echo "✅ 文档服务运行正常"
else
    echo "❌ 文档服务不可用"
    exit 1
fi

# 测试 3: IAM 登录获取 Token
echo ""
echo "🧪 测试 3: IAM 登录获取 Token"
TOKEN=$(curl -s -X POST $IAM_SERVICE_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASSWORD\"}" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 获取 Token 失败"
    exit 1
else
    echo "✅ 成功获取 Token"
fi

# 测试 4: 使用 Token 访问文档服务
echo ""
echo "🧪 测试 4: 使用 Token 访问文档服务"
RESPONSE=$(curl -s -X GET $DOC_SERVICE_URL/api/v1/files \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ 文档服务 API 正常响应"
    echo "$RESPONSE" | head -20
else
    echo "❌ 文档服务 API 响应异常"
    echo "$RESPONSE"
    exit 1
fi

# 清理
rm -f $TEST_FILE
echo ""
echo "✅ 清理完成"

echo ""
echo "================================"
echo "🎉 所有集成测试通过!"
```

## Postman 测试集合

您可以创建以下 Postman 集合进行更详细的测试：

### 1. IAM 服务集合

- POST /api/v1/auth/login
- POST /api/v1/auth/verify
- POST /api/v1/auth/refresh
- GET /api/v1/users
- GET /api/v1/users/me

### 2. 文档服务集合

- GET /health
- GET /api/v1/files
- POST /api/v1/files
- GET /api/v1/files/:id
- DELETE /api/v1/files/:id
- GET /api/v1/files/:id/download

### 3. 集成流程

1. 使用 IAM 登录获取 Token
2. 将 Token 保存为环境变量
3. 使用 Token 访问文档服务
4. 验证各个 API 功能

## 故障排查

### 常见问题

1. **Token 验证失败**
   - 确认 JWT_SECRET 在所有服务中一致
   - 检查 Token 是否已过期
   - 确认 Token 格式正确（Bearer 前缀）

2. **CORS 错误**
   - 确认 CORS 配置包含前端和其他服务的域名
   - 检查是否允许了所有需要的 HTTP 方法

3. **服务无法连接**
   - 检查 docker-compose 或本地服务是否正常运行
   - 确认端口没有冲突
   - 查看服务日志排查问题

4. **数据库连接失败**
   - 确认数据库容器已启动
   - 检查 DATABASE_URL 配置正确
   - 验证数据库用户权限

### 查看服务日志

```bash
# 查看所有服务日志
docker-compose -f docker/docker-compose.yml logs -f

# 查看特定服务日志
docker-compose -f docker/docker-compose.yml logs -f iam-service
docker-compose -f docker/docker-compose.yml logs -f doc-service
```

## 性能测试

### 使用 Apache Bench (ab) 进行简单负载测试

```bash
# 健康检查性能测试
ab -n 1000 -c 10 http://localhost:8002/health
ab -n 1000 -c 10 http://localhost:8001/health
```

### 使用 k6 进行高级负载测试

创建 `k6/load-test.js` 脚本，用于模拟多个用户并发访问服务。

## 安全测试

1. **测试未授权访问**
   - 不提供 Token 访问受保护的 API，验证返回 401

2. **测试 Token 过期**
   - 修改系统时间或使用过期 Token 验证被拒绝

3. **测试权限控制**
   - 使用不同角色账号测试权限级别

4. **测试输入验证**
   - 发送恶意输入验证服务的安全性
