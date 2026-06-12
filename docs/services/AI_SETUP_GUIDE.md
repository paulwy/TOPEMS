## TOPEMS-AI 配置指南

**版本**: 2.1.0
**最后更新**: 2026-06-13

## 功能介绍

TOPEMS-AI 现在支持真实 AI 服务！包括：

- **Ollama 本地 AI 服务（推荐！免费！）** - 使用 qwen2.5:7b-instruct 等模型
- OpenAI (GPT-3.5, GPT-4)
- 阿里云通义千问
- 任何兼容 OpenAI API 格式的服务
- 内置模拟模式（无需 API Key）

### 默认配置

TOPEMS 默认使用 Ollama 本地 AI，配置如下：

| 配置项 | 值 |
|--------|-----|
| OLLAMA_BASE_URL | http://localhost:11434/v1 |
| OLLAMA_MODEL | qwen2.5:7b-instruct |
| EMBEDDING_MODEL | nomic-embed-text |

### 模型分工说明

TOPEMS-AI 使用两个模型，分别负责不同的任务：

#### 模型对比

| 特性 | `qwen2.5:7b-instruct` | `nomic-embed-text` |
|------|------------------------|---------------------|
| **用途** | LLM (大语言模型) | Embedding (嵌入模型) |
| **功能** | 生成式 AI 回答 | 文本向量化 |
| **维度** | N/A | 1536 维向量 |
| **API 端点** | `/chat/completions` | `/embeddings` |
| **应用场景** | 聊天、摘要、校验、补全 | 文档搜索、相似度匹配 |

#### 工作流程

```
用户提问 "TOPEMS是什么？"
        │
        ▼
┌───────────────────────────────────────┐
│ 1. nomic-embed-text                    │
│    将问题转换为向量                      │
│    查询向量数据库 (pgvector)            │
│    找到相关文档分块                      │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 2. qwen2.5:7b-instruct                │
│    接收问题 + 相关文档内容               │
│    生成自然语言回答                      │
└───────────────────────────────────────┘
        │
        ▼
     返回回答
```

#### 功能对应表

| 功能 | 使用模型 |
|------|---------|
| 智能问答 (RAG) | nomic-embed-text + qwen2.5 |
| 文档向量索引 | nomic-embed-text |
| 内容生成 | qwen2.5 |
| 智能摘要 | qwen2.5 |
| 表单校验 | qwen2.5 |
| 数据补全 | qwen2.5 |
| 情感分析 | qwen2.5 |
| 关键词提取 | qwen2.5 |

## 快速开始

### 1. 启动 Ollama（如未运行）

```bash
ollama serve
```

### 2. 安装模型（如未安装）

```bash
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

### 3. 查看状态

```bash
cd <项目目录>
./scripts/topems.sh status
```

会显示：

```
🤖 AI/LLM 配置:
   已安装模型:
   • nomic-embed-text:latest
   • qwen2.5:7b-instruct
   当前配置:
   • 提供商: 🖥️ Ollama 本地
   • LLM: qwen2.5:7b-instruct
   • 嵌入: nomic-embed-text
   Ollama: ✅ 运行中
   pgvector: ✅ 已安装
```

### 4. 环境变量配置

在 `.env` 文件中配置：

```env
# AI 服务配置 (Ollama 本地 AI - 默认配置)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:7b-instruct
EMBEDDING_MODEL=nomic-embed-text
```

## 配置其他 AI 服务

## 知识库

TOPEMS-AI 会自动从知识库中提取内容作为上下文。当前包含：

1. TOPEMS 系统架构文档
2. TOPEMS 快速启动指南
3. 化工新材料研发流程

你可以修改代码中的 `documents` 数组来添加自己的知识库内容。

## 界面功能

全新的聊天界面：

- 📚 左侧：知识库文档列表
- 💬 中间：聊天区域
- ⌨️ 底部：问题输入
- ⏳ 实时打字动画
- 📋 快速问题示例

## 测试示例

试试这些问题：

- "TOPEMS 是什么？"
- "化工新材料研发流程是怎样的？"
- "如何启动 TOPEMS 系统？"

## API 端点

TOPEMS-AI 提供以下 API 端点：

### 1. 内容生成 `/api/v1/ai/generate`

```bash
curl -X POST http://localhost:8013/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "prompt": "写一段关于项目管理的介绍"
    },
    "output_format": "text"
  }'
```

### 2. 智能表单校验 `/api/v1/ai/validate`

```bash
curl -X POST http://localhost:8013/api/v1/ai/validate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "研发部",
      "manager": "张三",
      "employee_count": 50
    },
    "context": {
      "module": "HRM",
      "entityType": "department"
    }
  }'
```

### 3. 数据智能补全 `/api/v1/ai/complete`

```bash
curl -X POST http://localhost:8013/api/v1/ai/complete \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "李四",
      "department": "研发部"
    },
    "fields_to_complete": ["position", "email"],
    "context": {
      "module": "HRM",
      "entityType": "employee"
    }
  }'
```

### 4. 智能摘要 `/api/v1/ai/summarize`

```bash
curl -X POST http://localhost:8013/api/v1/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "会议讨论了项目进度和问题...",
    "max_length": 200
  }'
```

## 常见问题

### Q: AI 校验和补全功能返回空结果？

A: 确保 Ollama 服务正在运行，或配置了有效的 API Key。检查后端日志查看详细错误信息。

### Q: 如何调整 AI 重试次数？

A: 在前端代码中配置 `useAIHelper` hook 的 `maxRetries` 参数：

```typescript
const { generate } = useAIHelper({
  featureType: 'validate',
  maxRetries: 3,  // 默认2次
  retryDelay: 2000  // 默认1000ms
});
```

### Q: 如何查看 AI 操作的详细日志？

A: 打开浏览器开发者工具的 Console 面板，或查看后端服务的日志输出。
