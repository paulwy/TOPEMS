# TOPEMS 向量搜索架构设计

## 1. 设计目标

在 Docker PostgreSQL 无 pgvector 的限制下，实现统一的向量搜索能力。

## 2. 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| AI 模型 | **Ollama + Qwen2.5:7b-instruct** | 本地部署，支持嵌入生成 |
| 向量存储 | Redis HNSW | Docker 内置，高性能向量搜索 |
| 关系数据 | PostgreSQL | 业务数据存储 |
| 嵌入接口 | Ollama API | `/api/embeddings` |

## 3. 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        开发/生产环境                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │  HRM 服务    │                                               │
│  │   (Rust)     │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│  ┌──────┴───────────────────────┐                               │
│  │        AI 服务层              │                               │
│  │  ┌─────────────────────────┐ │                               │
│  │  │   Ollama                │ │                               │
│  │  │   qwen2.5:7b-instruct  │ │                               │
│  │  └─────────────────────────┘ │                               │
│  │  ┌─────────────────────────┐ │                               │
│  │  │   嵌入服务 (embedding)  │ │                               │
│  │  │   向量存储 (vector)     │ │                               │
│  │  └─────────────────────────┘ │                               │
│  └──────┬───────────────────────┘                               │
│         │                                                        │
│  ┌──────┴───────┐          ┌──────────────┐                   │
│  │   Redis      │          │ PostgreSQL   │                   │
│  │  (向量存储)  │          │  (业务数据)   │                   │
│  │  HNSW 索引   │          │              │                   │
│  └──────────────┘          └──────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 数据流向

```
用户文本 → Ollama 嵌入 → Redis 向量存储 → 相似度搜索 → 返回结果
    ↓
PostgreSQL 业务数据 → 关联查询
```

## 4. Ollama 配置

### 4.1 安装 Ollama

```bash
# macOS
brew install ollama

# 启动服务
ollama serve

# 拉取模型
ollama pull qwen2.5:7b-instruct

# 验证安装
curl http://localhost:11434/api/tags
```

### 4.2 测试嵌入 API

```bash
curl http://localhost:11434/api/embeddings \
  -d '{
    "model": "qwen2.5:7b-instruct",
    "prompt": "Rust 编程语言专家"
  }'
```

### 4.3 环境变量配置

```bash
# .env 或 .env.local
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_VECTOR_DIMENSION=3584
```

## 5. 实现方案

### 5.1 创建向量存储模块

```rust
// lib/src/vector_store.rs

use redis::{Client, Commands};
use serde::{Deserialize, Serialize};

/// 向量存储trait
#[async_trait]
pub trait VectorStore: Send + Sync {
    /// 存储向量
    async fn store(&self, key: &str, vector: &[f32], metadata: Value) -> Result<()>;
    
    /// 搜索相似向量
    async fn search(&self, vector: &[f32], limit: usize) -> Result<Vec<SearchResult>>;
    
    /// 删除向量
    async fn delete(&self, key: &str) -> Result<()>;
}

/// Redis 向量存储实现
pub struct RedisVectorStore {
    client: Client,
    index_name: String,
}
```

### 3.2 环境配置

```bash
# .env

# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
# 或使用本地 pgvector
LOCAL_DATABASE_URL=postgres://xingzhai@localhost:5432/topems

# Redis 配置
REDIS_URL=redis://localhost:6379

# 向量配置
VECTOR_DIMENSION=1536
VECTOR_INDEX=employee_vectors
EMBEDDING_PROVIDER=openai  # 或 local
OPENAI_API_KEY=sk-xxx
```

### 3.3 服务启动配置

```bash
# scripts/start-local.sh

# 根据环境选择数据库
if [ "$USE_LOCAL_PGVECTOR" = "true" ]; then
    export DATABASE_URL=$LOCAL_DATABASE_URL
    echo "使用本地 pgvector"
else
    export DATABASE_URL=$DOCKER_DATABASE_URL
    echo "使用 Docker PostgreSQL"
fi

# 启动 Redis 向量索引
redis-cli FT.CREATE employee_vectors \
    ON HASH \
    PREFIX 1 "vec:employee:" \
    SCHEMA \
        embedding VECTOR HNSW 6 DIM 1536 TYPE FLOAT32 DISTANCE COSINE
```

## 4. 数据表设计

### 4.1 PostgreSQL（关系数据）

```sql
-- 员工表
CREATE TABLE hrm.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    department_id UUID REFERENCES hrm.departments(id),
    position VARCHAR(100),
    skills TEXT[],  -- 技能数组
    resume_text TEXT,  -- 简历全文
    embedding_id VARCHAR(255),  -- Redis 向量 ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 技能表
CREATE TABLE hrm.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    description TEXT,
    embedding_id VARCHAR(255),  -- Redis 向量 ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Redis（向量数据）

```
# Key 格式
vec:employee:{uuid}          → Hash: {embedding: [...], metadata: {...}}
vec:skill:{uuid}            → Hash: {embedding: [...], metadata: {...}}

# 索引
employee_vectors            → HNSW 索引
skill_vectors              → HNSW 索引
```

## 5. API 设计

### 5.1 员工向量 API

```rust
// 创建员工时生成向量
POST /api/v1/employees
{
    "name": "张三",
    "skills": ["Rust", "PostgreSQL"],
    "resume_text": "10年经验..."
}
// 自动：
// 1. 保存员工到 PostgreSQL
// 2. 生成嵌入向量
// 3. 存储到 Redis

// 相似员工搜索
POST /api/v1/employees/similar
{
    "embedding": [0.1, 0.2, ...],  // 或传入文本自动生成
    "limit": 10,
    "threshold": 0.8
}

// 技能匹配
POST /api/v1/employees/match-skills
{
    "skills": ["Rust", "Python"],
    "limit": 10
}
```

### 5.2 技能管理 API

```rust
// 创建技能
POST /api/v1/skills
{
    "name": "Rust",
    "category": "Programming"
}

// 搜索技能
POST /api/v1/skills/search
{
    "query": "backend programming language",
    "limit": 5
}

// 推荐相关技能
GET /api/v1/skills/{id}/related?limit=10
```

## 6. 嵌入生成服务

### 6.1 嵌入接口

```rust
#[async_trait]
pub trait EmbeddingService: Send + Sync {
    /// 生成文本嵌入
    async fn embed(&self, text: &str) -> Result<Vec<f32>>;
    
    /// 批量生成嵌入
    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>>;
}

/// OpenAI 嵌入服务
pub struct OpenAIEmbedding {
    api_key: String,
    model: String,
}

/// 本地 BGE 嵌入服务
pub struct LocalEmbedding {
    endpoint: String,  // localhost:8000
}
```

### 6.2 配置

```yaml
# config/embedding.yaml
providers:
  - name: openai
    enabled: true
    model: text-embedding-3-small
    dimension: 1536
    api_key_env: OPENAI_API_KEY
    
  - name: local
    enabled: false
    endpoint: http://localhost:8000/embed
    model: BAAI/bge-large-zh-v1.5
    dimension: 1024
```

## 7. 实施计划

### Phase 1: 基础架构 ✅ 已完成
- [x] 创建向量存储模块（Redis 实现）
- [x] 创建嵌入服务接口
- [x] 配置管理

### Phase 2: 数据模型 ✅ 已完成
- [x] 设计员工向量表
- [x] 设计技能向量表
- [x] PostgreSQL 迁移

### Phase 3: API 开发 ✅ 已完成
- [x] 员工相似度搜索 API
- [x] 技能匹配 API
- [x] 嵌入自动生成

### Phase 4: 测试优化 ✅ 已完成
- [x] Ollama 连接测试
- [x] 向量生成测试
- [x] 相似度搜索测试

## 8. 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| Web 框架 | Axum | 0.7 |
| 数据库 | PostgreSQL | 16 |
| 向量存储 | Redis | 8.x |
| Redis 客户端 | redis-rs | 0.24 |
| ORM | SQLx | 0.8 |
| 嵌入 | Ollama / OpenAI | Qwen2.5:7b |

## 9. 性能指标

| 指标 | 目标 | 实际 |
|------|------|------|
| 向量搜索延迟 | < 50ms | ~20ms |
| 嵌入生成延迟 | < 2s | ~300ms |
| 吞吐量 | 100 QPS | - |
| 向量维度 | 3584 | 3584 |

## 10. 验证测试

### HRM 技能匹配测试结果

```
搜索关键词: Rust, 系统编程

匹配结果:
1. 张三 (技术部) - 相似度: 0.9185 ✅
   匹配技能: ["Rust", "系统编程"]

2. 赵六 (前端部) - 相似度: 0.6001
   匹配技能: ["Rust"]
```

### Ollama 集成验证

```bash
# 健康检查
curl http://localhost:11434/api/tags
# 响应: {"models":[{"name":"qwen2.5:7b-instruct",...}]}

# 嵌入测试
curl -X POST http://localhost:11434/api/embeddings \
  -d '{"model":"qwen2.5:7b-instruct","prompt":"Rust编程"}'
# 响应: {"embedding":[...],"model":"qwen2.5:7b-instruct"}
```

## 11. 注意事项

1. **开发/生产统一**
   - 开发使用 Ollama 本地模型
   - 生产使用 Ollama 或 OpenAI API

2. **备份策略**
   - PostgreSQL 数据定期备份
   - Redis 向量定期持久化

3. **监控指标**
   - 向量搜索 QPS
   - 嵌入生成延迟
   - Redis 内存使用

4. **环境要求**
   - Ollama 服务必须运行在 localhost:11434
   - Redis 必须启用 RediSearch 模块
   - Qwen2.5:7b 模型需要约 4GB 内存
