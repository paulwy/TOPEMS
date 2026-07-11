# TOPEMS-AI 智能服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8064`

---

> **API 路径**: `/api/ai/`

## 目录

1. [服务概述](#1-服务概述)
2. [智能对话 API](#2-智能对话-api)
3. [文本摘要 API](#3-文本摘要-api)
4. [文本向量化 API](#4-文本向量化-api)
5. [智能推荐 API](#5-智能推荐-api)
6. [文档处理 API](#6-文档处理-api)
7. [问答 API](#7-问答-api)
8. [模型管理 API](#8-模型管理-api)
9. [分析 API](#9-分析-api)
10. [健康检查 API](#10-健康检查-api)

---

## 1. 服务概述

TOPEMS-AI 是智能服务系统，提供智能对话、文本处理、推荐系统、文档分析等 AI 能力。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 智能对话 API

### 2.1 发起对话

```
POST /api/ai/chat
```

**请求体**：

```json
{
  "message": "帮我分析本月销售数据",
  "conversation_id": "uuid",
  "model": "gpt-4",
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid"
  }
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "response": "本月销售额为100万元，同比增长15%...",
    "tokens_used": 1500
  }
}
```

### 2.2 获取对话历史

```
GET /api/ai/chat/conversations?page=1&page_size=20
```

### 2.3 获取对话详情

```
GET /api/ai/chat/conversations/{id}
```

### 2.4 删除对话

```
DELETE /api/ai/chat/conversations/{id}
```

---

## 3. 文本摘要 API

### 3.1 文本摘要

```
POST /api/ai/summary
```

**请求体**：

```json
{
  "text": "长文本内容...",
  "max_length": 200,
  "language": "zh"
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "summary": "文本摘要内容...",
    "original_length": 2000,
    "summary_length": 150
  }
}
```

---

## 4. 文本向量化 API

### 4.1 文本向量化

```
POST /api/ai/embedding
```

**请求体**：

```json
{
  "text": "需要向量化的文本",
  "model": "text-embedding-ada-002"
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "embedding": [0.123, 0.456, 0.789, ...],
    "dimension": 1536
  }
}
```

### 4.2 批量向量化

```
POST /api/ai/embedding/batch
```

**请求体**：

```json
{
  "texts": ["文本1", "文本2", "文本3"],
  "model": "text-embedding-ada-002"
}
```

---

## 5. 智能推荐 API

### 5.1 获取推荐

```
POST /api/ai/recommend
```

**请求体**：

```json
{
  "user_id": "uuid",
  "type": "product",
  "count": 10,
  "context": {
    "current_page": "product_detail",
    "product_id": "uuid"
  }
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "recommendations": [
      { "id": "uuid1", "name": "产品A", "score": 0.95 },
      { "id": "uuid2", "name": "产品B", "score": 0.88 }
    ]
  }
}
```

### 5.2 获取相似产品

```
GET /api/ai/recommend/similar?product_id=uuid&count=5
```

---

## 6. 文档处理 API

### 6.1 文档解析

```
POST /api/ai/document/parse
```

**请求体**：

```json
{
  "file_url": "https://example.com/document.pdf",
  "extract_images": true,
  "extract_tables": true
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "content": "文档内容...",
    "images": ["url1", "url2"],
    "tables": [...]
  }
}
```

### 6.2 文档问答

```
POST /api/ai/document/qa
```

**请求体**：

```json
{
  "document_id": "uuid",
  "question": "文档中关于XX的内容是什么？"
}
```

---

## 7. 问答 API

### 7.1 知识库问答

```
POST /api/ai/qa
```

**请求体**：

```json
{
  "question": "公司的报销政策是什么？",
  "knowledge_base": "company_policy",
  "top_k": 5
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "answer": "公司报销政策如下：...",
    "sources": [
      { "title": "报销政策", "url": "url", "score": 0.92 }
    ]
  }
}
```

---

## 8. 模型管理 API

### 8.1 获取可用模型

```
GET /api/ai/models
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "status": "available",
      "max_tokens": 128000
    },
    {
      "id": "text-embedding-ada-002",
      "name": "Text Embedding",
      "provider": "openai",
      "status": "available",
      "dimension": 1536
    }
  ]
}
```

### 8.2 获取模型详情

```
GET /api/ai/models/{id}
```

---

## 9. 分析 API

### 9.1 数据分析

```
POST /api/ai/analysis
```

**请求体**：

```json
{
  "type": "sales_trend",
  "parameters": {
    "start_date": "2026-01-01",
    "end_date": "2026-08-31",
    "product_ids": ["uuid1", "uuid2"]
  }
}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "type": "sales_trend",
    "summary": "销售趋势分析结果...",
    "chart_data": {...}
  }
}
```

---

## 10. 健康检查 API

### 10.1 基础健康检查

```
GET /health
```

---

**版本**: 2.0.0
**最后更新**: 2026-08-14