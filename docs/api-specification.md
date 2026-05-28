# TOPEMS API 规范

## 1. API 设计原则

### 1.1 RESTful 规范

- 使用 HTTP 方法语义（GET, POST, PUT, DELETE）
- 资源命名使用复数名词
- 使用 HTTP 状态码
- 保持无状态性

### 1.2 版本控制

```
/api/v1/{resource}
/api/v2/{resource}
```

### 1.3 路径命名

```
/api/v1/files                    # 资源列表
/api/v1/files/{id}               # 特定资源
/api/v1/files/{id}/versions      # 子资源
```

## 2. 请求格式

### 2.1 请求头

```
Content-Type: application/json
Authorization: Bearer {token}
Accept-Language: zh-CN
```

### 2.2 查询参数

```javascript
GET /api/v1/files?page=1&page_size=20&folder_id=xxx
```

### 2.3 请求体 (JSON)

```json
{
  "name": "文件.txt",
  "folder_id": "uuid",
  "size": 1024
}
```

## 3. 响应格式

### 3.1 成功响应

```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "uuid",
    "name": "文件.txt",
    "created_at": "2026-05-20T10:00:00Z"
  },
  "message": "操作成功",
  "timestamp": "2026-05-20T10:00:00Z"
}
```

### 3.2 错误响应

```json
{
  "code": 404,
  "success": false,
  "data": null,
  "message": "资源不存在",
  "timestamp": "2026-05-20T10:00:00Z"
}
```

### 3.3 分页响应

```json
{
  "code": 200,
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "page_size": 20
  },
  "message": "获取成功",
  "timestamp": "2026-05-20T10:00:00Z"
}
```

## 4. HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容）|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 5. 服务 API 端口

### 中台底座服务

| 服务名称 | 端口 | API前缀 | 健康检查 | 状态 | 描述 |
|---------|------|--------|----------|------|------|
| topems-doc | 8001 | /api/v1 | /health | ✅ | 文档管理服务 |
| topems-iam | 8002 | /api/v1 | /health | ✅ | 身份认证服务 |
| topems-ai | 8003 | /api/v1 | /health | ✅ | AI知识库 |
| topems-flow | 8004 | /api/v1 | /health | ✅ | 工作流引擎 |

### 业务服务

| 服务名称 | 端口 | API前缀 | 健康检查 | 状态 | 描述 |
|---------|------|--------|----------|------|------|
| topems-rs | 8005 | /api/v1 | /health | 🔄 | 研发管理系统 - 阶段二重点 |
| topems-lims | 8006 | /api/v1 | /health | 🔄 | 实验室系统 - 阶段二重点 |
| topems-qms | 8007 | /api/v1 | /health | 📋 | 质量管理系统 |
| topems-ehs | 8008 | /api/v1 | /health | 📋 | 安全管理系统 |
| topems-srm | 8009 | /api/v1 | /health | 📋 | 供应商管理 |
| topems-pdm | 8010 | /api/v1 | /health | 📋 | 产品数据管理 |
| topems-gis | 8017 | /api/v1 | /health | ✅ | 地理信息系统 |
| topems-im | 8019 | /api/v1 | /health | ✅ | 即时通讯 (Mock) |
| topems-mobile | 8022 | /api/v1 | /health | ✅ | 移动端服务 (Mock) |

### 说明

- ✅ **已完成**: 服务已开发完成，可正常运行
- 🔄 **进行中**: 服务开发中，阶段二重点任务
- 📋 **待启动**: 服务待开发，后续阶段任务

## 6. 通用 API

### 6.1 健康检查

```
GET /health
Response: "OK" or {"status": "healthy"}
```

### 6.2 认证

```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

## 7. API 文档工具

推荐使用 Swagger/OpenAPI 生成在线文档：

- Swagger UI: `/swagger-ui`
- ReDoc: `/docs`
- OpenAPI JSON: `/openapi.json`

## 版本

v1.1.0  
更新日期: 2026-05-27  
更新内容:
- 统一响应格式（新增 code 和 timestamp 字段）
- 更新服务端口配置表
- 添加完整的服务描述信息
