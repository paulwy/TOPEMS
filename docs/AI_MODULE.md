# TOPEMS AI 模块

## 功能概览

TOPEMS AI 模块提供了一系列智能功能，包括对话、文档生成、文本分析和文档管理。

### 1. AI 聊天 (`/ai`)

**功能特点：**
- 多角色AI助手：通用助手、数据分析、文档助手、编程助手
- 基于本地知识库的智能问答
- Markdown渲染和代码高亮
- 对话历史本地存储
- 支持复制代码片段

### 2. 文档生成

**功能特点：**
- 多种文档模板：会议纪要、职位描述等
- AI智能填充文档内容
- 支持Markdown和JSON格式输出

### 3. 文本分析

**功能特点：**
- **情感分析**：判断文本情感（积极/消极/中性），显示置信度和关键词
- **文本分类**：自动分类文本，支持自定义分类类别
- **实体提取**：识别文本中的人名、地名、机构等实体
- **关键词提取**：提取文本核心关键词及权重

### 4. 文档管理

**功能特点：**
- 文档上传和删除
- 向量数据库支持语义搜索
- 文档状态跟踪
- 文件大小和上传时间统计

## 技术架构

### 前端
- React 18 + TypeScript
- Zustand 状态管理
- Tailwind CSS UI
- React Markdown 渲染
- React Syntax Highlighter 代码高亮

### 后端 (Rust/Axum)
- RESTful API
- PostgreSQL + pgvector 向量数据库
- Ollama/OpenAI AI模型支持
- Token认证

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

## 环境配置

### 后端环境变量
```bash
# AI服务配置
OPENAI_API_KEY=your-api-key          # OpenAI API密钥
OPENAI_BASE_URL=https://api.openai.com/v1  # API地址
OPENAI_MODEL=gpt-3.5-turbo           # 模型名称

# 或使用 Ollama 本地AI
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:7b-instruct

# 向量模型
EMBEDDING_MODEL=nomic-embed-text

# 数据库
DATABASE_URL=postgres://user:pass@localhost:5432/topems
```

### 启动服务
```bash
# 后端
cd services/topems-ai/backend
cargo run

# 前端
cd frontend
npm run dev
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

1. AI功能需要配置有效的API密钥或Ollama服务
2. 向量数据库需要PostgreSQL + pgvector扩展
3. 建议使用HTTPS连接保护API通信
4. 大文件上传可能需要调整服务器超时设置
