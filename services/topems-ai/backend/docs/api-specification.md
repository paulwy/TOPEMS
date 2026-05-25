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
  "success": true,
  "data": {
    "id": "uuid",
    "name": "文件.txt",
    "created_at": "2026-05-20T10:00:00Z"
  },
  "error": null
}
```

### 3.2 错误响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "文件不存在",
    "details": {}
  }
}
```

### 3.3 分页响应

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

| 服务 | 端口 | Swagger |
|------|------|---------|
| topems-doc | 8001 | ✅ |
| topems-iam | 8002 | ⏳ |
| topems-ai | 8003 | ⏳ |
| topems-flow | 8004 | ⏳ |
| topems-mobile | 8005 | ⏳ |
| topems-im | 8006 | ⏳ |

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

v1.0.0  
更新日期: 2026-05-20
