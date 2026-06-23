# TOPEMS Doc 文件模块用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Doc 模块

Doc（文档管理模块）是 TOPEMS 的文档中心，提供：

- **文档管理** - 创建、编辑、版本控制
- **文件夹管理** - 树形目录结构
- **文档模板** - 标准化文档格式

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| Document | 文档，系统的核心内容单元 |
| Folder | 文件夹，文档的分类容器 |
| Template | 模板，文档的标准格式 |

---

## 2. 文档管理 API

### 2.1 创建文档

```bash
curl -X POST http://localhost:8000/api/core/doc/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "项目立项报告",
    "content": "# 项目立项报告\n\n## 一、项目背景\n...",
    "content_type": "markdown",
    "folder_id": "FOLDER_UUID",
    "author_id": "USER_UUID",
    "tags": ["项目", "立项"]
  }'
```

### 2.2 查询文档列表

```bash
curl "http://localhost:8000/api/core/doc/documents?page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.3 查询单个文档

```bash
curl http://localhost:8000/api/core/doc/documents/DOC_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.4 更新文档

```bash
curl -X PUT http://localhost:8000/api/core/doc/documents/DOC_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "项目立项报告（修订版）",
    "content": "# 项目立项报告\n\n## 一、项目背景\n...\n\n## 二、修订说明\n...",
    "version": 2
  }'
```

### 2.5 删除文档

```bash
curl -X DELETE http://localhost:8000/api/core/doc/documents/DOC_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.6 归档文档

```bash
curl -X PUT http://localhost:8000/api/core/doc/documents/DOC_UUID/archive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.7 发布文档

```bash
curl -X PUT http://localhost:8000/api/core/doc/documents/DOC_UUID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.8 查询文档历史版本

```bash
curl http://localhost:8000/api/core/doc/documents/DOC_UUID/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 文件夹管理 API

### 3.1 创建文件夹

```bash
curl -X POST http://localhost:8000/api/core/doc/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "项目文档",
    "parent_id": null,
    "owner_id": "USER_UUID"
  }'
```

### 3.2 查询文件夹列表

```bash
curl http://localhost:8000/api/core/doc/folders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 查询子文件夹

```bash
curl http://localhost:8000/api/core/doc/folders/FOLDER_UUID/children \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 更新文件夹

```bash
curl -X PUT http://localhost:8000/api/core/doc/folders/FOLDER_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "项目文档（2026）"
  }'
```

### 3.5 删除文件夹

```bash
curl -X DELETE http://localhost:8000/api/core/doc/folders/FOLDER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.6 移动文件夹

```bash
curl -X PUT http://localhost:8000/api/core/doc/folders/FOLDER_UUID/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "new_parent_id": "NEW_PARENT_UUID"
  }'
```

---

## 4. 文档模板 API

### 4.1 创建模板

```bash
curl -X POST http://localhost:8000/api/core/doc/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "周报模板",
    "description": "用于生成员工周报",
    "content": "# 周报\n\n## 本周工作总结\n{{work_summary}}\n\n## 下周工作计划\n{{next_week_plan}}\n\n## 存在问题\n{{issues}}",
    "variables": ["work_summary", "next_week_plan", "issues"],
    "created_by": "USER_UUID"
  }'
```

### 4.2 查询模板列表

```bash
curl http://localhost:8000/api/core/doc/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 获取模板详情

```bash
curl http://localhost:8000/api/core/doc/templates/TEMPLATE_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 使用模板创建文档

```bash
curl -X POST http://localhost:8000/api/core/doc/templates/TEMPLATE_UUID/create-document \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "张三的周报（2026-06-23）",
    "folder_id": "FOLDER_UUID",
    "author_id": "USER_UUID",
    "variables": {
      "work_summary": "完成了财务模块的开发",
      "next_week_plan": "开始测试工作",
      "issues": "无"
    }
  }'
```

### 4.5 更新模板

```bash
curl -X PUT http://localhost:8000/api/core/doc/templates/TEMPLATE_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "周报模板（修订版）",
    "content": "# 周报\n\n## 本周工作总结\n{{work_summary}}..."
  }'
```

### 4.6 删除模板

```bash
curl -X DELETE http://localhost:8000/api/core/doc/templates/TEMPLATE_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 文档搜索 API

### 5.1 全文搜索

```bash
curl "http://localhost:8000/api/core/doc/documents/search?keyword=项目立项&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 按标签搜索

```bash
curl "http://localhost:8000/api/core/doc/documents/search?tags=项目,立项" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.3 按作者搜索

```bash
curl "http://localhost:8000/api/core/doc/documents/search?author_id=USER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.4 按文件夹搜索

```bash
curl "http://localhost:8000/api/core/doc/documents/search?folder_id=FOLDER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. API 参考

### 6.1 文档 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/doc/documents` | 创建文档 |
| GET | `/api/core/doc/documents` | 文档列表 |
| GET | `/api/core/doc/documents/{id}` | 文档详情 |
| PUT | `/api/core/doc/documents/{id}` | 更新文档 |
| DELETE | `/api/core/doc/documents/{id}` | 删除文档 |
| PUT | `/api/core/doc/documents/{id}/archive` | 归档文档 |
| PUT | `/api/core/doc/documents/{id}/publish` | 发布文档 |
| GET | `/api/core/doc/documents/{id}/versions` | 版本历史 |
| GET | `/api/core/doc/documents/search` | 搜索文档 |

### 6.2 文件夹 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/doc/folders` | 创建文件夹 |
| GET | `/api/core/doc/folders` | 文件夹列表 |
| GET | `/api/core/doc/folders/{id}` | 文件夹详情 |
| GET | `/api/core/doc/folders/{id}/children` | 子文件夹 |
| PUT | `/api/core/doc/folders/{id}` | 更新文件夹 |
| DELETE | `/api/core/doc/folders/{id}` | 删除文件夹 |
| PUT | `/api/core/doc/folders/{id}/move` | 移动文件夹 |

### 6.3 模板 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/doc/templates` | 创建模板 |
| GET | `/api/core/doc/templates` | 模板列表 |
| GET | `/api/core/doc/templates/{id}` | 模板详情 |
| PUT | `/api/core/doc/templates/{id}` | 更新模板 |
| DELETE | `/api/core/doc/templates/{id}` | 删除模板 |
| POST | `/api/core/doc/templates/{id}/create-document` | 使用模板创建文档 |

---

## 7. 文档状态

| 状态 | 说明 |
|------|------|
| `draft` | 草稿 |
| `published` | 已发布 |
| `archived` | 已归档 |

---

## 8. 常见问题

### 8.1 文档删除后可以恢复吗

**说明：** 目前版本不支持直接恢复，删除前请确认。

### 8.2 如何设置文档访问权限

**说明：** 文档权限通过文件夹权限继承，详情请参考 IAM 模块。

### 8.3 模板变量如何使用

**说明：** 在模板内容中使用 `{{variable_name}}` 占位符，创建文档时提供具体值。

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
