# TOPEMS AI 模块用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 AI 模块

AI 模块是 TOPEMS 的智能服务核心，集成 Ollama 本地 LLM 和向量搜索能力，提供：

- **智能对话** - 基于知识库的 AI 问答
- **内容生成** - 自动生成各类文本内容
- **文本摘要** - 自动提取文档关键信息
- **向量搜索** - 语义相似度匹配

### 1.2 技术架构

| 组件 | 技术 | 说明 |
|------|------|------|
| AI 模型 | Ollama + Qwen2.5:7b | 本地部署，保护隐私 |
| 向量存储 | Redis HNSW | 高性能相似度搜索 |
| 嵌入服务 | Ollama API | 文本向量化 |

### 1.3 核心概念

| 概念 | 说明 |
|------|------|
| Chat | 智能对话，基于上下文理解用户意图 |
| Generate | 内容生成，根据提示词生成文本 |
| Summarize | 文本摘要，提取文档关键信息 |
| Vector Search | 向量搜索，通过语义匹配查找相关内容 |

---

## 2. 快速开始

### 2.1 环境要求

- Ollama 服务运行中（端口 11434）
- Redis 服务运行中（向量存储）
- 已在本地下载 AI 模型：`qwen2.5:7b-instruct`

### 2.2 安装配置

```bash
# 1. 安装 Ollama
brew install ollama

# 2. 启动 Ollama 服务
ollama serve

# 3. 拉取模型
ollama pull qwen2.5:7b-instruct

# 4. 验证安装
curl http://localhost:11434/api/tags
```

### 2.3 启动 AI 服务

```bash
# 确保 Unified Core 运行
cd svc/unified-core
cargo run
```

---

## 3. AI 对话 API

### 3.1 智能对话

```bash
curl -X POST http://localhost:8000/api/core/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "如何创建会计凭证？",
    "context": {
      "context": "财务模块使用帮助"
    }
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "response": "创建会计凭证的步骤如下：\n1. 登录系统\n2. 进入财务模块\n3. 点击\"新建凭证\"\n4. 填写凭证日期、类型\n5. 添加借贷分录\n6. 保存并提交审核",
    "model": "qwen2.5:7b-instruct",
    "tokens_used": 256,
    "processing_time_ms": 1250
  }
}
```

### 3.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 用户问题 |
| context | object | 否 | 上下文信息 |

### 3.3 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| response | string | AI 回复内容 |
| model | string | 使用的模型 |
| tokens_used | number | 消耗的 Token 数 |
| processing_time_ms | number | 处理时间（毫秒） |

---

## 4. 内容生成 API

### 4.1 生成文本

```bash
curl -X POST http://localhost:8000/api/core/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "为一台新的智能考勤机写一段产品介绍",
    "output_format": "text"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "content": "智能考勤机是一款基于人工智能技术的现代化考勤管理设备...",
    "format": "text"
  }
}
```

### 4.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 生成提示词 |
| output_format | string | 否 | 输出格式（默认 text） |

---

## 5. 文本摘要 API

### 5.1 生成摘要

```bash
curl -X POST http://localhost:8000/api/core/ai/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "这是一份长文档的内容...（省略数千字）",
    "max_length": 200
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "summary": "本文介绍了智能考勤系统的核心功能，包括人脸识别、远程打卡、异常提醒等，帮助企业提升考勤管理效率。"
  }
}
```

### 5.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | 是 | 待摘要文本 |
| max_length | number | 否 | 摘要最大长度（默认 200） |

---

## 6. 向量搜索 API

### 6.1 获取向量统计

```bash
curl http://localhost:8000/api/core/ai/vectors/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "total_vectors": 1523,
    "index_size_mb": 128,
    "dimension": 768,
    "last_updated": "2026-06-23T10:30:00Z"
  }
}
```

### 6.2 向量搜索

```bash
curl -X POST http://localhost:8000/api/core/ai/vectors/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "查找与考勤相关的文档",
    "top_k": 5,
    "threshold": 0.7
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc-001",
        "content": "智能考勤系统使用指南...",
        "score": 0.95,
        "metadata": {
          "title": "考勤系统操作手册",
          "category": "user-guide"
        }
      }
    ],
    "query_time_ms": 45
  }
}
```

### 6.3 清空向量库

```bash
curl -X POST http://localhost:8000/api/core/ai/vectors/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. AI 模板

### 7.1 获取模板列表

```bash
curl http://localhost:8000/api/core/ai/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "template-001",
      "name": "周报生成",
      "description": "根据工作内容生成周报",
      "prompt_template": "请根据以下工作内容生成周报：\n{content}",
      "category": "office"
    },
    {
      "id": "template-002",
      "name": "会议纪要",
      "description": "生成会议纪要模板",
      "prompt_template": "请根据以下会议内容生成纪要：\n{content}",
      "category": "office"
    }
  ]
}
```

---

## 8. 健康检查

### 8.1 检查 AI 服务状态

```bash
curl http://localhost:8000/api/core/ai/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "ollama_connected": true,
    "redis_connected": true,
    "model_loaded": "qwen2.5:7b-instruct"
  }
}
```

---

## 9. API 参考

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/ai/chat` | 智能对话 |
| POST | `/api/core/ai/generate` | 内容生成 |
| POST | `/api/core/ai/summarize` | 文本摘要 |
| GET | `/api/core/ai/templates` | 获取 AI 模板 |
| GET | `/api/core/ai/vectors/stats` | 向量统计 |
| POST | `/api/core/ai/vectors/search` | 向量搜索 |
| POST | `/api/core/ai/vectors/clear` | 清空向量库 |
| GET | `/api/core/ai/health` | 健康检查 |

---

## 10. 常见问题

### 10.1 Ollama 服务未启动

**错误：** `connection refused`

**解决方案：**
```bash
ollama serve
```

### 10.2 模型未下载

**错误：** `model not found`

**解决方案：**
```bash
ollama pull qwen2.5:7b-instruct
```

### 10.3 向量搜索无结果

**可能原因：**
- 向量库为空
- 相似度阈值过高

**解决方案：**
- 调整 `threshold` 参数
- 先添加文档到向量库

### 10.4 响应时间过长

**可能原因：**
- 模型较大
- 服务器资源不足

**解决方案：**
- 使用较小的模型
- 增加服务器内存

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
