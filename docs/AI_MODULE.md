# TOPEMS AI 模块

## 功能概览

TOPEMS AI 模块提供了一系列智能功能，包括对话、文档生成、文本分析和向量搜索。

### 1. AI 聊天 (`/ai`)

**功能特点：**
- 多角色 AI 助手：通用助手、数据分析、文档助手、编程助手
- 基于本地知识库的智能问答
- Markdown 渲染和代码高亮
- 对话历史本地存储
- 支持复制代码片段

### 2. 文档生成

**功能特点：**
- 多种文档模板：会议纪要、职位描述等
- AI 智能填充文档内容
- 支持 Markdown 和 JSON 格式输出

### 3. 文本分析

**功能特点：**
- **情感分析**：判断文本情感（积极/消极/中性），显示置信度和关键词
- **文本分类**：自动分类文本，支持自定义分类类别
- **实体提取**：识别文本中的人名、地名、机构等实体
- **关键词提取**：提取文本核心关键词及权重

### 4. 向量搜索

**功能特点：**
- 基于 Redis HNSW 的高性能向量存储
- Ollama 本地嵌入生成（Qwen2.5:7b-instruct）
- 员工/技能相似度匹配
- RAG 检索增强生成

## 技术架构

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| AI 模型 | Ollama + Qwen2.5:7b | 本地部署，保护隐私 |
| 向量存储 | Redis HNSW | 高性能相似度搜索 |
| 嵌入服务 | Ollama API | 文本向量化 |
| 后端 | Rust/Axum | 高性能 REST API |
| 前端 | React 18 + TypeScript | 现代 Web 界面 |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (AIPage.tsx)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     AI 服务 (svc/ai)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │  聊天 (chat)   │  │  文档 (doc)    │  │  分析      │ │
│  │  问答 (qa)     │  │  生成 (gen)    │  │  (analysis)│ │
│  └─────────────────┘  └─────────────────┘  └────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    共享库 (lib)                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  向量存储       │  │  嵌入服务       │                   │
│  │  (vector_store)│  │  (embedding)   │                   │
│  │  Redis HNSW    │  │  Ollama/OpenAI  │                   │
│  └─────────────────┘  └─────────────────┘                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    Redis      │  │  PostgreSQL   │  │    Ollama    │
│  (向量存储)   │  │  (业务数据)   │  │  (LLM + 嵌入) │
└───────────────┘  └───────────────┘  └───────────────┘
```

### 前端

- React 18 + TypeScript
- Zustand 状态管理
- Tailwind CSS UI
- React Markdown 渲染
- React Syntax Highlighter 代码高亮

### 后端 (Rust/Axum)

- RESTful API
- PostgreSQL 业务数据存储
- Redis HNSW 向量存储
- Ollama AI 模型支持（Qwen2.5:7b-instruct）
- Token 认证

## API 端点

### AI 对话
- `POST /api/v1/ai/chat` - 聊天问答

### 文档生成
- `POST /api/v1/ai/generate` - AI内容生成
- `GET /api/v1/ai/templates` - 获取模板列表

### 文本分析
- `POST /api/v1/analysis/sentiment` - 情感分析
- `POST /api/v1/analysis/classify` - 文本分类
- `POST /api/v1/analysis/entities` - 实体提取
- `POST /api/v1/analysis/keywords` - 关键词提取

### 文档管理
- `GET /api/v1/documents` - 获取文档列表
- `POST /api/v1/documents/upload` - 上传文档
- `DELETE /api/v1/documents/delete` - 删除文档

### 向量检索
- `POST /api/v1/vectors/search` - 向量相似度搜索
- `GET /api/v1/vectors/stats` - 向量统计信息

### HRM 技能匹配
- `POST /api/v1/employees/match-skills` - 技能匹配员工
- `POST /api/v1/employees/:id/similar` - 查找相似员工
- `GET /api/v1/skills/search` - 搜索技能

## 环境配置

### Ollama 配置

```bash
# 1. 安装 Ollama
brew install ollama

# 2. 启动服务并拉取模型
ollama serve
ollama pull qwen2.5:7b-instruct

# 3. 验证安装
curl http://localhost:11434/api/tags
```

### 后端环境变量

```bash
# AI 提供者配置
AI_PROVIDER=ollama                    # ollama, openai, local, mock

# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_VECTOR_DIMENSION=3584

# OpenAI 配置（可选）
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=text-embedding-3-small

# Redis 向量存储
REDIS_URL=redis://localhost:6379
VECTOR_INDEX_PREFIX=topems

# 数据库
DATABASE_URL=postgres://user:pass@localhost:5432/topems
```

### 初始化向量存储

```bash
# 运行安装脚本
bash scripts/install-pgvector.sh

# 或手动初始化
docker exec topems-redis redis-cli FT.CREATE employee_vectors \
  ON HASH PREFIX 1 "vec:employee:" \
  SCHEMA embedding VECTOR HNSW 6 DIM 3584 TYPE FLOAT32 DISTANCE COSINE
```

### 启动服务

```bash
# 启动 Ollama
ollama serve

# 后端
cargo run -p topems-ai

# 前端
cd frontend && npm run dev
```

## 组件列表

### AI 组件
- `AIAnalyzer` - 文本分析组件
- `AIDocumentGenerator` - 文档生成组件
- `DocumentManager` - 文档管理组件
- `AIHelperButton` - AI辅助按钮
- `AIGenerateModal` - AI生成弹窗
- `AICodeGenerator` - 代码生成器
- `AITextOptimizer` - 文本优化器
- `AIFormValidator` - 表单验证器
- `AIDataCompleter` - 数据补全器
- `AISummarizer` - 摘要生成器

## 使用示例

### 文本分析
```typescript
import { aiApi } from '@/api/ai';

// 情感分析
const sentiment = await aiApi.analyzeSentiment({
  text: '这个产品真的很好用，强烈推荐！'
});

// 文本分类
const classification = await aiApi.classifyText({
  text: '这是一段科技新闻内容',
  categories: ['科技', '娱乐', '体育']
});

// 实体提取
const entities = await aiApi.extractEntities({
  text: '张三在北京大学工作'
});

// 关键词提取
const keywords = await aiApi.extractKeywords({
  text: '人工智能技术正在改变世界',
  max_keywords: 5
});
```

### 文档管理
```typescript
// 上传文档
const doc = await aiApi.createDocument({
  title: '产品手册',
  content: '这是文档内容...',
  filename: 'manual.pdf'
});

// 搜索文档
const results = await aiApi.search({
  query: '产品功能介绍',
  limit: 10
});
```

## 注意事项

1. AI 功能需要 Ollama 服务运行或配置 OpenAI API 密钥
2. 向量存储依赖 Redis（Docker 内置），无需额外安装 pgvector
3. 建议使用 HTTPS 连接保护 API 通信
4. 大文件上传可能需要调整服务器超时设置
5. Qwen2.5:7b 模型需要约 4GB 内存
