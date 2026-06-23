# pgvector 使用指南

## 概述

pgvector 是 PostgreSQL 的向量存储扩展，用于：
- AI 嵌入向量存储
- 相似度搜索
- RAG（检索增强生成）
- 员工/技能匹配

## 安装验证

```bash
# 检查 pgvector 是否安装
SELECT * FROM pg_extension WHERE extname = 'vector';

# 查看可用版本
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

## 创建向量表

### 基本语法

```sql
-- 创建带向量列的表
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    embedding vector(1536),  -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 HNSW 索引（推荐，性能更好）
CREATE INDEX idx_items_embedding_hnsw
ON items USING hnsw (embedding vector_cosine_ops);

-- 或使用 IVFFlat 索引（数据量较小时）
CREATE INDEX idx_items_embedding_ivfflat
ON items USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 维度说明

| 模型 | 向量维度 |
|------|---------|
| OpenAI text-embedding-3-small | 1536 |
| OpenAI text-embedding-3-large | 3072 |
| text-embedding-ada-002 | 1536 |
| BGE-large-zh | 1024 |

## 向量操作

### 插入向量

```sql
-- 直接插入
INSERT INTO items (name, embedding)
VALUES ('Rust Developer', '[0.1, 0.2, 0.3, ...]::vector');

-- 从 Python 插入（使用 psycopg2）
cursor.execute(
    "INSERT INTO items (name, embedding) VALUES (%s, %s)",
    ('Rust Developer', embedding_list)
)
```

### 相似度搜索

```sql
-- 余弦相似度搜索（推荐）
SELECT id, name,
       1 - (embedding <=> '[0.1, 0.2, ...]::vector') AS similarity
FROM items
ORDER BY embedding <=> '[0.1, 0.2, ...]::vector'
LIMIT 5;

-- L2 距离（欧氏距离）
SELECT id, name,
       embedding <-> '[0.1, 0.2, ...]::vector' AS distance
FROM items
ORDER BY embedding <-> '[0.1, 0.2, ...]::vector'
LIMIT 5;

-- 内积（用于归一化向量）
SELECT id, name,
       embedding <#> '[0.1, 0.2, ...]::vector' AS dot_product
FROM items
ORDER BY embedding <#> '[0.1, 0.2, ...]::vector'
LIMIT 5;
```

### 员工技能匹配示例

```sql
-- 查找与技能最匹配的员工
SELECT
    e.id,
    e.name,
    e.department,
    1 - (ee.embedding <=> target_skill.embedding) AS similarity
FROM hrm.employees e
JOIN hrm.employee_embeddings ee ON e.id = ee.employee_id
CROSS JOIN (
    SELECT embedding FROM hrm.skill_embeddings
    WHERE skill_name = 'Rust'
) target_skill
WHERE 1 - (ee.embedding <=> target_skill.embedding) > 0.8
ORDER BY similarity DESC
LIMIT 10;
```

## 性能优化

### 索引选择

| 场景 | 推荐索引 |
|------|---------|
| 小数据集 (<10K) | 无索引（顺序扫描） |
| 中等数据集 (10K-1M) | IVFFlat |
| 大数据集 (>1M) | HNSW |

### HNSW 参数

```sql
-- 高性能搜索（内存占用高）
CREATE INDEX idx_items_hnsw
ON items USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 平衡模式
CREATE INDEX idx_items_hnsw
ON items USING hnsw (embedding vector_cosine_ops)
WITH (m = 12, ef_construction = 32);
```

### 查询优化

```sql
-- 设置搜索参数（HNSW）
SET hnsw.ef_search = 40;  -- 默认 40，可调整

-- 使用近似最近邻（更快，但不精确）
SET enable_seqscan = off;  -- 强制使用索引
```

## 在代码中使用

### Rust (sqlx)

```rust
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeEmbedding {
    pub id: uuid::Uuid,
    pub employee_id: uuid::Uuid,
    pub embedding: Vec<f32>,
}

// 插入向量
async fn insert_embedding(
    pool: &PgPool,
    employee_id: uuid::Uuid,
    embedding: &[f32],
) -> Result<()> {
    let embedding_str = format!(
        "[{}]::vector",
        embedding.iter()
            .map(|x| x.to_string())
            .collect::<Vec<_>>()
            .join(",")
    );

    sqlx::query!(
        r#"
        INSERT INTO hrm.employee_embeddings (employee_id, embedding)
        VALUES ($1, $2::vector)
        "#,
        employee_id,
        embedding_str
    )
    .execute(pool)
    .await?;

    Ok(())
}

// 相似度搜索
async fn find_similar_employees(
    pool: &PgPool,
    target_embedding: &[f32],
    limit: i64,
) -> Result<Vec<(uuid::Uuid, f32)>> {
    let embedding_str = format!(
        "[{}]::vector",
        target_embedding.iter()
            .map(|x| x.to_string())
            .collect::<Vec<_>>()
            .join(",")
    );

    let rows = sqlx::query!(
        r#"
        SELECT
            employee_id,
            1 - (embedding <=> $1::vector) AS similarity
        FROM hrm.employee_embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        "#,
        embedding_str,
        limit
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| (r.employee_id, r.similarity as f32))
        .collect())
}
```

### Python (psycopg2)

```python
import psycopg2
import numpy as np

def insert_embedding(conn, employee_id: str, embedding: list[float]):
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO hrm.employee_embeddings (employee_id, embedding) VALUES (%s, %s::vector)",
            (employee_id, embedding_str)
        )
    conn.commit()

def find_similar_employees(conn, target_embedding: list[float], limit: int = 10):
    embedding_str = "[" + ",".join(map(str, target_embedding)) + "]"
    with conn.cursor() as cur:
        cur.execute("""
            SELECT employee_id, 1 - (embedding <=> %s::vector) AS similarity
            FROM hrm.employee_embeddings
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (embedding_str, embedding_str, limit))
        return cur.fetchall()
```

## 团队协作

### 统一开发环境

```bash
# 所有开发者执行
bash scripts/install-pgvector.sh

# 或重建 PostgreSQL 容器
bash scripts/rebuild-postgres.sh
```

### 数据库迁移

```sql
-- 团队成员共享的迁移文件
-- migrations/006_create_pgvector_tables.sql

-- 向量表
CREATE TABLE IF NOT EXISTS hrm.employee_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES hrm.employees(id),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW 索引
CREATE INDEX IF NOT EXISTS idx_employee_embeddings_hnsw
ON hrm.employee_embeddings USING hnsw (embedding vector_cosine_ops);
```

## 常见问题

### Q: 向量维度不匹配
```sql
-- 检查向量维度
SELECT length(embedding) FROM hrm.employee_embeddings LIMIT 1;
```

### Q: 索引未生效
```sql
-- 检查查询计划
EXPLAIN ANALYZE SELECT ... FROM items ORDER BY embedding <=> ...;
```

### Q: 内存不足
```sql
-- 查看索引内存使用
SELECT pg_size_pretty(pg_relation_size('idx_items_embedding_hnsw'));
```
