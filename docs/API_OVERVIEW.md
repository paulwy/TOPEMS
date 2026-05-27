# TOPEMS API 概览

**版本**: v2.1.0
**更新日期**: 2026-05-22
**API 版本**: v1

---

## 1. 文档概述

本文档是 TOPEMS（化工新材料企业数字化平台）的完整 API 参考文档，涵盖了平台所有微服务的接口规范。

### 1.1 文档结构

| 文档 | 说明 |
|------|------|
| [API_OVERVIEW.md](./API_OVERVIEW.md) | API 概览和架构（本文档） |
| [API_AUTH.md](./API_AUTH.md) | 认证和授权 API |
| [API_RS.md](./API_RS.md) | 研发管理系统 API |
| [API_LIMS.md](./API_LIMS.md) | 实验室管理系统 API |
| [API_QMS.md](./API_QMS.md) | 质量管理系统 API |
| [API_EHS.md](./API_EHS.md) | 环境健康安全系统 API |
| [API_SRM.md](./API_SRM.md) | 供应商管理系统 API |
| [API_PDM.md](./API_PDM.md) | 生产管理系统 API |
| [API_WORKFLOW.md](./API_WORKFLOW.md) | 工作流系统 API |
| [API_REPORT.md](./API_REPORT.md) | 报表系统 API |
| [API_NOTIFICATION.md](./API_NOTIFICATION.md) | 通知系统 API |

---

## 2. 系统架构

### 2.1 微服务架构

TOPEMS 采用微服务架构，包含以下核心服务：

```
┌─────────────────────────────────────────────────────────────┐
│                      统一门户 (Port 3000)                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 中台底座系统  │    │ 业务系统     │    │ 共享服务     │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ IAM (8002)   │    │ RS (8005)    │    │ Notification │
│ FLOW (8004)  │    │ LIMS (8006)  │    │ (8006)       │
│ DOC (8001)   │    │ QMS          │    │ Report       │
│ AI (8003)    │    │ EHS          │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 2.2 服务端口映射

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| topems-doc | 8001 | HTTP | 文档管理服务 |
| topems-iam | 8002 | HTTP | 身份认证与权限管理 |
| topems-ai | 8003 | HTTP | AI 知识库服务 |
| topems-flow | 8004 | HTTP | 工作流引擎 |
| topems-rs | 8005 | HTTP | 研发管理系统 |
| topems-lims | 8006 | HTTP | 实验室信息管理系统 |
| topems-qms | 待定 | HTTP | 质量管理系统 |
| topems-ehs | 待定 | HTTP | 环境健康安全系统 |
| topems-srm | 待定 | HTTP | 供应商管理系统 |
| topems-pdm | 待定 | HTTP | 生产管理系统 |
| notification | 8006 | HTTP | 通知服务 |

---

## 3. API 设计规范

### 3.1 RESTful 原则

- 使用 HTTP 方法语义
- 资源命名使用复数名词
- 使用标准 HTTP 状态码
- 保持无状态性

### 3.2 版本控制

```
/api/v1/{resource}    # 当前版本
/api/v2/{resource}    # 未来版本
```

### 3.3 路径命名规范

```
/api/v1/files                    # 资源列表
/api/v1/files/{id}               # 特定资源
/api/v1/files/{id}/versions      # 子资源
/api/v1/files/{id}/download      # 特定操作
```

---

## 4. 请求格式

### 4.1 请求头

| 请求头 | 必需 | 说明 |
|--------|------|------|
| Content-Type | 是 | application/json |
| Authorization | 是 | Bearer {token} |
| Accept-Language | 否 | zh-CN, en-US |
| X-Request-ID | 否 | 请求追踪 ID |

### 4.2 通用请求头示例

```http
POST /api/v1/projects HTTP/1.1
Host: localhost:8005
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: zh-CN
```

### 4.3 查询参数

```javascript
GET /api/v1/projects?page=1&page_size=20&status=active
```

### 4.4 请求体 (JSON)

```json
{
  "name": "项目名称",
  "description": "项目描述",
  "status": "active"
}
```

---

## 5. 响应格式

### 5.1 成功响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "项目名称",
    "created_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

### 5.2 错误响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "资源不存在",
    "details": {
      "resource_type": "project",
      "resource_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### 5.3 分页响应

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

### 5.4 列表响应

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "项目1" },
    { "id": "2", "name": "项目2" }
  ]
}
```

---

## 6. HTTP 状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功获取或更新资源 |
| 201 | Created | 成功创建资源 |
| 204 | No Content | 成功删除资源 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或 Token 过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 7. 错误代码

### 7.1 通用错误码

| 错误码 | 说明 |
|--------|------|
| INVALID_REQUEST | 无效的请求参数 |
| UNAUTHORIZED | 未授权访问 |
| FORBIDDEN | 权限不足 |
| RESOURCE_NOT_FOUND | 资源不存在 |
| RESOURCE_CONFLICT | 资源冲突 |
| VALIDATION_ERROR | 数据验证失败 |
| INTERNAL_ERROR | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 服务不可用 |

### 7.2 业务错误码

| 错误码 | 说明 |
|--------|------|
| PROJECT_NOT_FOUND | 项目不存在 |
| PROJECT_INACTIVE | 项目已停用 |
| SAMPLE_NOT_FOUND | 样品不存在 |
| CHECK_IN_PROGRESS | 检查进行中 |
| APPROVAL_PENDING | 审批待处理 |
| APPROVAL_REJECTED | 审批被拒绝 |

---

## 8. 认证授权

### 8.1 JWT Token

所有 API 请求（除登录接口外）都需要携带有效的 JWT Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 8.2 Token 刷新

Token 有效期为 24 小时，使用 refresh_token 可以刷新：

```bash
curl -X POST http://localhost:8002/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "refresh_token_here"}'
```

### 8.3 权限检查

```bash
curl -X POST http://localhost:8002/api/v1/users/me/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"permission": "rs:project:create"}'
```

---

## 9. 健康检查

每个服务都提供健康检查接口：

```bash
# 检查各服务状态
curl http://localhost:8001/health  # DOC 服务
curl http://localhost:8002/health  # IAM 服务
curl http://localhost:8003/health  # AI 服务
curl http://localhost:8004/health  # FLOW 服务
curl http://localhost:8005/health  # RS 服务
curl http://localhost:8006/health  # LIMS 服务
```

响应示例：

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 10. API 文档工具

推荐使用 Swagger/OpenAPI 生成在线文档：

- Swagger UI: `/swagger-ui`
- ReDoc: `/docs`
- OpenAPI JSON: `/openapi.json`

---

## 11. 限流策略

| 级别 | 限制 | 说明 |
|------|------|------|
| 全局 | 1000 请求/分钟 | 所有 API |
| 认证 | 10 请求/秒 | 登录接口 |
| 数据写入 | 100 请求/分钟 | POST/PUT/DELETE |
| 数据查询 | 300 请求/分钟 | GET |

---

## 12. 支持与反馈

- 📧 技术支持: support@topems.com
- 🐛 问题反馈: GitHub Issues
- 💡 功能建议: GitHub Discussions

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 统一 API 规范，完善错误码 |
| v1.0.0 | 2026-05-20 | 初始版本 |
