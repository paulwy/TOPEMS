# TOPEMS API 文档

## 概述

TOPEMS 是一个企业级研发管理平台，采用微服务架构设计，包含多个独立服务模块。

## 服务端口配置

| 服务名称 | 端口 | API前缀 | 健康检查 | 描述 |
|---------|------|--------|----------|------|
| topems-iam | 8001 | /api/v1 | /health | 身份认证服务 |
| topems-rs | 8002 | /api/v1 | /health | 研发管理系统 |
| topems-lims | 8003 | /api/v1 | /health | 实验室系统 |
| topems-qms | 8004 | /api/v1 | /health | 质量管理系统 |
| topems-mes | 8005 | /api/v1 | /health | 生产执行系统 |
| topems-erp | 8006 | /api/v1 | /health | 企业资源计划 |
| topems-scm | 8007 | /api/v1 | /health | 供应链系统 |
| topems-wms | 8008 | /api/v1 | /health | 仓库管理系统 |
| topems-crm | 8009 | /api/v1 | /health | 客户关系管理 |
| topems-hrm | 8010 | /api/v1 | /health | 人力资源管理 |
| topems-gis | 8011 | /api/v1 | /health | 地理信息系统 |
| topems-bi | 8012 | /api/v1 | /health | 商业智能 |
| topems-ehs | 8013 | /api/v1 | /health | 安全管理系统 |
| topems-pdm | 8014 | /api/v1 | /health | 产品数据管理 |
| topems-srm | 8015 | /api/v1 | /health | 供应商管理 |
| topems-im | 8016 | /api/v1 | /health | 即时通讯 |
| topems-ai | 8017 | /api/v1 | /health | AI知识库 |
| topems-mobile | 8018 | /api/v1 | /health | 移动端服务 |
| topems-integration | 8019 | /api/v1 | /health | 集成服务 |
| topems-portal | 8020 | /api/v1 | /health | 企业门户 |

## 统一响应格式

所有API响应都遵循统一格式：

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | HTTP状态码 |
| success | boolean | 是否成功 |
| data | any | 响应数据 |
| message | string | 响应消息 |
| timestamp | string | 时间戳 |

## 权限管理

### 角色定义

| 角色ID | 角色名称 | 描述 | 默认角色 |
|--------|---------|------|----------|
| superadmin | 超级管理员 | 拥有所有权限 | 否 |
| admin | 管理员 | 管理用户和角色 | 否 |
| project_manager | 项目经理 | 管理项目和文档 | 否 |
| developer | 开发人员 | 参与项目开发 | 否 |
| viewer | 查看者 | 只读权限 | 是 |

### 权限列表

| 权限ID | 权限名称 | 描述 | 分类 |
|--------|---------|------|------|
| users.read | 读取用户 | 查看用户列表和详情 | 用户管理 |
| users.create | 创建用户 | 创建新用户 | 用户管理 |
| users.update | 更新用户 | 更新用户信息 | 用户管理 |
| users.delete | 删除用户 | 删除用户 | 用户管理 |
| roles.read | 读取角色 | 查看角色列表 | 角色管理 |
| roles.create | 创建角色 | 创建新角色 | 角色管理 |
| roles.update | 更新角色 | 更新角色信息 | 角色管理 |
| roles.delete | 删除角色 | 删除角色 | 角色管理 |
| projects.read | 读取项目 | 查看项目列表 | 项目管理 |
| projects.create | 创建项目 | 创建新项目 | 项目管理 |
| projects.update | 更新项目 | 更新项目信息 | 项目管理 |
| projects.delete | 删除项目 | 删除项目 | 项目管理 |
| documents.read | 读取文档 | 查看文档 | 文档管理 |
| documents.create | 创建文档 | 创建文档 | 文档管理 |
| documents.update | 更新文档 | 更新文档 | 文档管理 |
| documents.delete | 删除文档 | 删除文档 | 文档管理 |
| workflows.read | 读取工作流 | 查看工作流 | 工作流管理 |
| workflows.create | 创建工作流 | 创建工作流 | 工作流管理 |
| workflows.update | 更新工作流 | 更新工作流 | 工作流管理 |
| workflows.delete | 删除工作流 | 删除工作流 | 工作流管理 |
| system.settings | 系统设置 | 修改系统设置 | 系统管理 |
| system.logs | 查看日志 | 查看系统日志 | 系统管理 |
| system.monitor | 系统监控 | 查看系统监控 | 系统管理 |
| system.export | 数据导出 | 导出系统数据 | 系统管理 |

### JWT令牌格式

```json
{
  "sub": "user-uuid",
  "exp": 1704067200,
  "username": "admin",
  "email": "admin@topems.com",
  "is_superuser": true,
  "roles": ["admin"],
  "permissions": ["users.read", "users.create"],
  "department": "IT",
  "tenant_id": "tenant-001"
}
```

## 健康检查

### 端点

```
GET /health
```

### 响应示例

```json
{
  "code": 200,
  "success": true,
  "data": {
    "service_name": "topems-iam",
    "status": "healthy",
    "message": "Service is running",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": "2d 3h 15m 30s",
    "response_time_ms": 15
  },
  "message": "OK",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 批量健康检查响应

```json
{
  "overall_status": "healthy",
  "services": [
    {"service_name": "topems-iam", "status": "healthy", ...},
    {"service_name": "topems-rs", "status": "healthy", ...}
  ],
  "timestamp": "2024-01-01T00:00:00Z",
  "total_services": 5,
  "healthy_count": 5,
  "degraded_count": 0,
  "unhealthy_count": 0,
  "avg_response_time_ms": 25
}
```

## 环境变量配置

### 必需配置

```env
# 数据库配置
DATABASE_URL=postgres://postgres:postgres@localhost:5432/topems_dev

# 认证配置
JWT_SECRET=your-secret-key-here
REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRY_HOURS=24

# Redis配置
REDIS_URL=redis://localhost:6379
```

### 可选配置

```env
# CORS配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# AI配置
OLLAMA_URL=http://localhost:11434/v1
OPENAI_API_KEY=your-api-key

# 服务端口（覆盖默认端口）
PORT=8080
```

## 监控指标

### 服务指标

```json
{
  "service_name": "topems-iam",
  "status": "healthy",
  "uptime_seconds": 86400,
  "request_count": 1000,
  "error_count": 5,
  "avg_response_time_ms": 25.5,
  "max_response_time_ms": 150,
  "min_response_time_ms": 5,
  "cpu_usage_percent": 15.2,
  "memory_usage_bytes": 256000000,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 系统指标

| 指标 | 说明 |
|------|------|
| request_count | 总请求数 |
| error_count | 错误请求数 |
| active_connections | 当前活跃连接数 |
| uptime | 系统运行时间 |

## 快速启动

```bash
# 复制环境配置
cp .env.example .env

# 修改配置文件
vim .env

# 启动所有服务
./scripts/start-all.sh

# 停止所有服务
./scripts/stop-all.sh

# 检查服务健康
curl http://localhost:8001/health
```

## 安全注意事项

1. **密钥管理**: JWT_SECRET 和 REFRESH_SECRET 必须在生产环境中使用强随机字符串
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **权限最小化**: 为用户分配最小必要权限
4. **日志审计**: 记录所有关键操作日志
5. **定期轮换**: 定期轮换密钥和凭证

## 版本信息

- 版本: 2.0.0
- 架构: 微服务架构
- 技术栈: Rust + Axum + PostgreSQL + Redis
- 许可证: MIT License
