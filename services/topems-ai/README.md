# TOPEMS-AI 智能AI知识库

TOPEMS-AI 是 TOPEMS 平台的智能AI知识库，为全平台提供AI能力支持。

## 核心功能

- 📄 多格式文档解析 (TXT, PDF, Markdown等)
- 🔍 向量数据库与相似性检索
- 🤖 RAG (检索增强生成) 问答系统
- 📚 知识库文档管理
- 💬 智能对话界面

## 技术栈

- **后端**：Rust + Axum + SQLx
- **前端**：React 18 + TypeScript 5
- **数据库**：PostgreSQL 16 + pgvector
- **AI服务**：Ollama (本地) / OpenAI API (云端)

## 前置条件

1. **PostgreSQL 16** 数据库，并安装 pgvector 扩展
2. **Ollama** (可选，用于本地运行LLM)
3. **Rust 1.75+** (后端开发)
4. **Node.js 18+** (前端开发)

## 快速开始

### 1. 数据库设置

首先安装 PostgreSQL 并设置 pgvector 扩展：

```sql
-- 创建数据库
CREATE DATABASE topems;

-- 连接到数据库
\c topems

-- 安装 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. 配置环境变量

复制环境变量模板并配置：

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，设置数据库连接和AI服务配置
```

主要配置项：

- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `OPENAI_API_KEY` / `OPENAI_BASE_URL`: OpenAI 或兼容API配置
- `OLLAMA_URL` / `OLLAMA_MODEL`: 本地 Ollama 配置

### 3. 运行后端服务

```bash
cd backend
cargo run
```

服务将在 [http://localhost:8003](http://localhost:8003) 启动

### 4. 运行前端服务

```bash
cd frontend
npm install
npm start
```

前端将在 [http://localhost:3000](http://localhost:3000) 启动

## API 接口

### 文档管理

- `GET /api/v1/documents`: 获取所有文档
- `GET /api/v1/documents/:id`: 获取单个文档
- `POST /api/v1/documents/upload`: 上传文档
- `DELETE /api/v1/documents/:id`: 删除文档

### AI 服务

- `POST /api/v1/ai/chat`: RAG 对话
- `POST /api/v1/ai/search`: 相似度搜索

### 系统

- `GET /health`: 健康检查

## 使用说明

### 上传文档

1. 点击侧边栏的"📄 上传文档"按钮
2. 选择要上传的文件 (TXT, PDF, Markdown等)
3. 确认上传，系统将自动解析并向量化文档
4. 文档状态变为"已处理"后即可用于问答

### 智能问答

1. 在主界面输入问题
2. 系统将从知识库中检索相关内容
3. 基于检索结果生成回答，并显示参考来源

## 项目结构

```text
topems-ai/
├── backend/
│   ├── src/
│   │   ├── api/              # API 路由和处理器
│   │   ├── db/               # 数据库相关
│   │   ├── models/           # 数据模型
│   │   ├── services/         # 业务逻辑服务
│   │   └── main.rs           # 程序入口
│   └── Cargo.toml
└── frontend/
    ├── src/
    │   └── App.tsx           # 主应用组件
    └── package.json
```

## 配置示例

### 使用 OpenAI API

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-3-small
```

### 使用 Ollama (本地)

```env
OLLAMA_API_KEY=ollama
OLLAMA_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:7b-instruct
EMBEDDING_MODEL=nomic-embed-text
```

启动 Ollama 并拉取模型：

```bash
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
ollama serve
```

## 开发说明

### 数据库迁移

首次运行时，数据库表会自动创建。如需手动运行迁移：

SQL 文件位置: `backend/src/db/migrations/`

### 添加新的文档解析器

在 `backend/src/services/document_parser.rs` 中扩展解析功能。

## 许可证

MIT License

## 版本

v1.0.0  
更新日期: 2026-05-25
