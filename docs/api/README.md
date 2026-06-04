# TOPEMS API 文档

## 概述

本文档集合包含TOPEMS系统的所有API文档。

## API 版本

当前版本: v1

所有API路径前缀: `/api/v1`

## 核心API文档

| API名称 | 文档链接 | 服务端口 |
|--------|---------|---------|
| 认证授权 | [API_AUTH.md](./API_AUTH.md) | 8000 |
| 工作流 | [API_WORKFLOW.md](./API_WORKFLOW.md) | 8006 |
| 通知服务 | [API_NOTIFICATION.md](./API_NOTIFICATION.md) | 8003 |
| 报表服务 | [API_REPORT.md](./API_REPORT.md) | 8053 |
| 研发管理 | [API_RS.md](./API_RS.md) | 8020 |
| 实验室管理 | [API_LIMS.md](./API_LIMS.md) | 8022 |
| 质量管理 | [API_QMS.md](./API_QMS.md) | 8031 |
| 安全管理 | [API_EHS.md](./API_EHS.md) | 8032 |
| 供应商管理 | [API_SRM.md](./API_SRM.md) | 8041 |
| 产品数据管理 | [API_PDM.md](./API_PDM.md) | 8023 |

## 通用规范

### 认证

所有需要认证的API请求都必须包含JWT Token：

```http
Authorization: Bearer {token}
```

### 响应格式

所有API响应遵循统一格式：

#### 成功响应
```json
{
  "code": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-06-04T12:00:00Z"
}
```

#### 错误响应
```json
{
  "code": 400,
  "message": "Error message",
  "error": "Detailed error",
  "timestamp": "2026-06-04T12:00:00Z"
}
```

### HTTP状态码

| 状态码 | 描述 |
|-------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### 分页

列表API支持分页参数：

```http
GET /api/v1/resources?page=1&per_page=20&sort_by=created_at&sort_order=desc
```

参数说明：
- `page`: 页码（默认1）
- `per_page`: 每页数量（默认20）
- `sort_by`: 排序字段
- `sort_order`: 排序方向（asc/desc）

## 健康检查

所有服务都提供健康检查端点：

```http
GET /health
```

响应：
```json
{
  "status": "healthy",
  "version": "2.0.0"
}
```

## 前端代理配置

开发环境使用Vite代理，避免CORS问题，配置见：`frontend/vite.config.ts`

## 快速开始

### 1. 认证
```bash
# 登录获取Token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### 2. 使用Token调用API
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer {token}"
```

## 更多文档

- [系统架构](../architecture/overview.md)
- [数据库设计](../architecture/database.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [用户指南](../guides/USER_GUIDE.md)

---
**版本**: 2.0.0
**最后更新**: 2026-06-04
