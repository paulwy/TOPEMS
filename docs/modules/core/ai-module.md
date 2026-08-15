# AI 模块技术文档

## 1. 概述

AI（人工智能）模块是 TOPEMS 平台的智能服务核心，集成 Ollama 本地 LLM 和 PostgreSQL + pgvector 向量存储，提供智能对话、文档问答(RAG)、代码助手、知识库管理、Prompt 模板、多模态分析等 AI 能力。后端服务位于 `svc/ai/`，前端页面位于 `apps/web/src/pages/ai/`，API 客户端位于 `apps/web/src/api/ai/`。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 智能对话 | LLM 对话、会话管理、消息重新生成 |
| 文档问答(RAG) | 文档上传、分块、向量化、检索增强生成 |
| 知识库 | 知识库管理、文档索引、自动索引 |
| 代码助手 | 编程辅助、代码生成、代码解释 |
| 多模态分析 | 文本分类、情感分析、智能问答 |
| Prompt 模板 | 模板管理、分类、收藏、变量占位符 |
| 智能表单 | AI Form 表单辅助填写 |
| 模型管理 | Ollama/OpenAI 双模式、模型配置、用量统计 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      AI 模块架构                             │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                                │
│  ├── pages/ai/                   # 8 条路由对应页面         │
│  └── modules/ai/config.ts                                    │
│      ├── source: core            # 核心模块                  │
│      ├── suite: platform         # 平台组                    │
│      └── order: 7                                            │
├─────────────────────────────────────────────────────────────┤
│  API 层 (TypeScript)                                        │
│  └── api/ai/index.ts             # 统一 API 客户端入口       │
│      ├── documentApi / chatApi / analysisApi / codeApi      │
│      ├── qaApi / vectorApi / recommendationApi              │
│      ├── assistantApi                                       │
│      ├── 对话增强: updateConversation / regenerateMessage   │
│      ├── 仪表盘: getDashboardStats / getActivityTrend       │
│      ├── 模型管理: listModels / getModelConfig              │
│      └── Prompt 模板: listPromptTemplates / CRUD            │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL + pgvector, svc/ai/)           │
│  ├── main.rs                     # 端口 8013, api_prefix     │
│  │                               # /api/ai                   │
│  ├── routes.rs                   # 统一路由注册              │
│  ├── handlers/                   # AI 处理器                 │
│  │   ├── ai_handlers             # 核心 AI 处理              │
│  │   ├── connector_handlers      # 连接器管理                │
│  │   └── health                  # 健康检查                  │
│  ├── modules/                    # 业务模块                  │
│  │   ├── ai_form/                # 智能表单                  │
│  │   ├── ai_knowledge/           # 知识库(RAG)               │
│  │   ├── agent / analysis / code_assistant                   │
│  │   ├── document / embedding / vector                       │
│  │   ├── qa / recommendation / multimodal                    │
│  │   ├── models / openapi / ai_plugin                        │
│  │   └── ai_search_calc / ai_text_calc / ai_math_calc        │
│  ├── services/                   # 服务层 (13 个)            │
│  │   ├── agent / analysis / audit / cache / db               │
│  │   ├── document / embedding / multimodal / pdf             │
│  │   ├── qa / recommendation / search / vector               │
│  ├── middleware/tenant.rs        # 租户中间件                │
│  └── shared/permission.rs                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 服务配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| 服务端口 | 8013 | `architecture/ports.md` |
| API 前缀 | `/api/ai` | `svc/ai/src/main.rs` |
| 旧版前缀 | `/api/v1/ai`, `/api/core/ai/v1` | 兼容保留 |
| 环境变量 | `AI_PORT` | `ports.md` |
| 最大数据库连接 | 10 | `main.rs` |
| 事件系统 | 启用 | `main.rs` |
| 持久化 | PostgreSQL + pgvector | `main.rs` |
| AI Provider | Ollama / OpenAI 双模式 | `main.rs` |
| HTTP 超时 | 120 秒 | `main.rs` |
| 自动索引 | 默认开启 (`DISABLE_AUTO_INDEX` 可关闭) | `main.rs` |
| 插件类型 | ai | `plugin.yaml` |
| SEARCH_PATH | `ai_service, public, shared` | `main.rs` |

### 1.4 AI Provider 配置

| 模式 | 环境变量 | 默认值 |
|------|---------|--------|
| Ollama（本地） | `OLLAMA_URL` | `localhost:11434` |
| Ollama 模型 | `OLLAMA_MODEL` | `qwen2.5:7b-instruct` |
| Ollama Embedding | `EMBEDDING_MODEL` | `nomic-embed-text` |
| OpenAI（远程） | `OPENAI_BASE_URL` + `OPENAI_API_KEY` | — |
| 文件服务 | `FILE_SERVICE_URL` | `http://localhost:8000` |

当 `OLLAMA_URL` 或 base_url 包含 `localhost:11434` 时，系统自动判定为 Ollama 模式。

---

## 2. 核心功能详解

### 2.1 预测分析

**功能说明**：基于历史数据进行预测分析。

**数据模型**：

```typescript
interface Prediction {
  id: string;                    // 预测ID
  model_id: string;              // 模型ID
  model_name: string;            // 模型名称
  type: 'demand' | 'sales' | 'fault' | 'quality'; // 预测类型
  input_data: Record<string, any>; // 输入数据
  result: PredictionResult;      // 预测结果
  confidence: number;            // 置信度(%)
  created_at: string;            // 创建时间
}

interface PredictionResult {
  value: number;                 // 预测值
  unit: string;                  // 单位
  range: [number, number];       // 预测范围
  trend: 'up' | 'down' | 'stable'; // 趋势
  explanation: string;           // 解释说明
}
```

### 2.2 智能推荐

**功能说明**：基于用户行为和偏好提供个性化推荐。

**数据模型**：

```typescript
interface Recommendation {
  id: string;                    // 推荐ID
  user_id: string;               // 用户ID
  type: 'product' | 'content' | 'service'; // 推荐类型
  items: RecommendationItem[];   // 推荐项
  strategy: string;              // 推荐策略
  created_at: string;            // 创建时间
}

interface RecommendationItem {
  id: string;                    // 推荐项ID
  item_id: string;               // 物品ID
  item_name: string;             // 物品名称
  score: number;                 // 推荐分数
  reason: string;                // 推荐理由
}
```

### 2.3 图像识别

**功能说明**：基于图像进行目标检测和识别。

**数据模型**：

```typescript
interface ImageAnalysis {
  id: string;                    // 分析ID
  image_url: string;             // 图像URL
  type: 'quality' | 'object' | 'defect'; // 分析类型
  results: DetectionResult[];    // 检测结果
  confidence: number;            // 整体置信度
  created_at: string;            // 创建时间
}

interface DetectionResult {
  id: string;                    // 检测结果ID
  label: string;                 // 标签
  confidence: number;            // 置信度(%)
  bounding_box: [number, number, number, number]; // 边界框 [x, y, width, height]
  severity?: 'low' | 'medium' | 'high'; // 严重程度
}
```

### 2.4 自然语言处理

**功能说明**：处理和分析文本数据。

**数据模型**：

```typescript
interface NlpAnalysis {
  id: string;                    // 分析ID
  text: string;                  // 输入文本
  type: 'classification' | 'sentiment' | 'qa' | 'summary'; // 分析类型
  result: NlpResult;             // 分析结果
  created_at: string;            // 创建时间
}

interface NlpResult {
  classification?: {
    category: string;            // 分类类别
    confidence: number;          // 置信度
  };
  sentiment?: {
    score: number;               // 情感分数 (-1到1)
    label: 'positive' | 'negative' | 'neutral'; // 情感标签
  };
  answer?: string;               // 问答答案
  summary?: string;              // 摘要
}
```

### 2.5 模型管理

**功能说明**：管理AI模型的训练和部署。

**数据模型**：

```typescript
interface Model {
  id: string;                    // 模型ID
  name: string;                  // 模型名称
  type: 'classification' | 'regression' | 'clustering' | 'nlp'; // 模型类型
  status: 'training' | 'trained' | 'deployed' | 'retired'; // 状态
  accuracy: number;              // 准确率
  last_trained_at: string;       // 最后训练时间
  deployed_at?: string;          // 部署时间
  created_at: string;            // 创建时间
}
```

---

## 3. API 接口文档

> 所有 API 路径前缀为 `/api/ai`（旧版 `/api/v1/ai` 兼容保留），服务端口 8013。

### 3.1 对话与问答

| 接口 | 方法 | 路径 |
|------|------|------|
| 发送对话 | POST | `/api/ai/chat` |
| 获取会话消息 | GET | `/api/ai/conversations/:id/messages` |
| 重新生成回答 | POST | `/api/ai/chat/regenerate` |
| 文档问答 | POST | `/api/ai/qa/ask` |

### 3.2 文档与知识库

| 接口 | 方法 | 路径 |
|------|------|------|
| 上传文档 | POST | `/api/ai/documents` |
| 文档列表 | GET | `/api/ai/documents` |
| 向量检索 | POST | `/api/ai/vector/search` |
| 知识库列表 | GET | `/api/ai/knowledge` |

### 3.3 分析能力

| 接口 | 方法 | 路径 |
|------|------|------|
| 文本分类 | POST | `/api/ai/text/classify` |
| 情感分析 | POST | `/api/ai/sentiment/analyze` |
| 代码助手 | POST | `/api/ai/code` |
| 多模态分析 | POST | `/api/ai/multimodal` |

### 3.4 模型与管理

| 接口 | 方法 | 路径 |
|------|------|------|
| 模型列表 | GET | `/api/ai/models` |
| 模型配置 | GET/PUT | `/api/ai/models/config` |
| 用量统计 | GET | `/api/ai/usage/stats` |
| 仪表盘统计 | GET | `/api/ai/dashboard/stats` |
| Prompt 模板列表 | GET | `/api/ai/prompts` |
| 连接器管理 | GET/POST | `/api/ai/connectors` |

---

## 4. 前端路由

AI 模块共 8 条前端路由：

| 路由 | 路径 | 分组 | 说明 |
|------|------|------|------|
| dashboard | /ai/dashboard | overview | 仪表盘 |
| chat | /ai/chat | process | 智能对话 |
| code | /ai/code | process | 代码助手 |
| document | /ai/document | business | 文档管理 |
| knowledge | /ai/knowledge | business | 知识库 |
| prompts | /ai/prompts | business | Prompt 模板 |
| assistant | /ai/assistant | business | AI 助手 |
| settings | /ai/settings | setting | 系统设置（需 `ai:connector:manage`） |

默认访问权限：`ai:dashboard:read`

---

## 5. 权限定义

`plugin.yaml` 定义了 12 个权限：

| 权限标识 | 说明 |
|---------|------|
| `ai:search` | 搜索 |
| `ai:chat` | 对话 |
| `ai:generate` | 生成 |
| `ai:read` / `ai:write` / `ai:delete` | 基础 CRUD |
| `ai:vector:read` / `ai:vector:write` | 向量操作 |
| `ai:qa:ask` | 问答 |
| `ai:sentiment:analyze` | 情感分析 |
| `ai:text:classify` | 文本分类 |
| `ai:connector:manage` | 连接器管理（含设置页访问） |

---

## 6. 相关文档

- [AI 用户手册](../../user-guide/modules/ai.md)
- [AI API 文档](../../api/API_AI.md)
- [系统架构总览](../../architecture/overview.md)
- [标准端口分配](../../architecture/ports.md)
- [Code Wiki 项目百科](../../architecture/code-wiki.md)

---

**文档版本**: v2.0 | **最后更新**: 2026-08-15 | **服务端口**: 8013 | **代码目录**: `svc/ai/`