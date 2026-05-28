
# TOPEMS 数据库查询优化指南

## 1. 基本查询优化

### 1.1 使用索引查询

**避免全表扫描：**

```sql
-- ❌ 不好 - 全表扫描
SELECT * FROM samples WHERE name LIKE '%test%';

-- ✅ 好的 - 使用 GIN 索引
SELECT * FROM samples 
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'test');

-- ✅ 好的 - 前缀匹配使用 B 树索引
SELECT * FROM samples WHERE name LIKE 'test%';
```

### 1.2 只选择需要的列

```sql
-- ❌ 不好 - 选择所有列
SELECT * FROM samples;

-- ✅ 好的 - 只选择需要的列
SELECT id, name, status, created_at FROM samples;
```

### 1.3 使用 LIMIT 分页

```sql
-- ❌ 不好 - 获取过多数据
SELECT * FROM samples;

-- ✅ 好的 - 使用 LIMIT 和 OFFSET
SELECT * FROM samples ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- ✅ 更好 - 使用键集分页
SELECT * FROM samples 
WHERE id < 'last_id' 
ORDER BY id DESC LIMIT 20;
```

---

## 2. JOIN 优化

### 2.1 使用 JOIN 代替子查询

```sql
-- ❌ 不好 - 子查询
SELECT * FROM samples 
WHERE project_id IN (
    SELECT id FROM projects WHERE status = 'active'
);

-- ✅ 好的 - 使用 JOIN
SELECT s.* FROM samples s
INNER JOIN projects p ON s.project_id = p.id
WHERE p.status = 'active';
```

### 2.2 过滤早于 JOIN

```sql
-- ✅ 好的 - 先过滤再 JOIN
SELECT s.* FROM samples s
INNER JOIN (
    SELECT * FROM projects WHERE status = 'active'
) p ON s.project_id = p.id;
```

---

## 3. WHERE 子句优化

### 3.1 避免在列上使用函数

```sql
-- ❌ 不好 - 函数调用导致索引失效
SELECT * FROM samples WHERE DATE(created_at) = '2024-01-01';

-- ✅ 好的 - 使用范围查询
SELECT * FROM samples 
WHERE created_at >= '2024-01-01 00:00:00' 
  AND created_at < '2024-01-02 00:00:00';
```

### 3.2 使用适当的数据类型

```sql
-- ❌ 不好 - 隐式类型转换
SELECT * FROM samples WHERE id = '123';

-- ✅ 好的 - 正确类型
SELECT * FROM samples WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 4. 批量操作优化

### 4.1 使用批量 INSERT

```sql
-- ❌ 不好 - 多次 INSERT
INSERT INTO samples (name, status) VALUES ('Sample 1', 'received');
INSERT INTO samples (name, status) VALUES ('Sample 2', 'received');

-- ✅ 好的 - 批量 INSERT
INSERT INTO samples (name, status) VALUES
('Sample 1', 'received'),
('Sample 2', 'received'),
('Sample 3', 'received');
```

### 4.2 使用事务

```sql
-- ✅ 好的 - 使用事务
BEGIN TRANSACTION;
UPDATE samples SET status = 'testing' WHERE id IN (1, 2, 3);
UPDATE projects SET progress = 50 WHERE id = 1;
COMMIT;
```

---

## 5. 性能监控 SQL

### 5.1 检查索引使用

```sql
-- 检查索引使用情况
SELECT
  schemaname || '.' || tablename as table,
  indexrelname as index,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 5.2 查找慢查询

```sql
-- 需要 pg_stat_statements 扩展
SELECT
  query,
  calls,
  mean_time,
  total_time,
  rows,
  shared_blks_hit,
  shared_blks_read
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 5.3 检查表大小

```sql
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 6. 常见查询模式优化

### 6.1 分页查询

```sql
-- 高效的分页查询（带总数）
WITH sample_count AS (
  SELECT COUNT(*) as total FROM samples WHERE status = 'received'
)
SELECT 
  s.*,
  sc.total
FROM samples s, sample_count sc
WHERE s.status = 'received'
ORDER BY s.created_at DESC
LIMIT 20 OFFSET 0;
```

### 6.2 聚合查询

```sql
-- ✅ 好的 - 使用合适的聚合
SELECT 
  project_id,
  COUNT(*) as sample_count,
  COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count,
  COUNT(CASE WHEN status = 'testing' THEN 1 END) as testing_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM samples
GROUP BY project_id;
```

---

## 7. 索引使用检查

### 7.1 使用 EXPLAIN 分析查询

```sql
-- 分析查询计划
EXPLAIN ANALYZE
SELECT * FROM samples WHERE project_id = 'some-id';
```

### 7.2 检查索引有效性

```sql
-- 检查索引扫描次数
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'samples';
```

---

## 8. 常见反模式

### 8.1 N+1 查询问题

```rust
// ❌ 不好 - N+1 查询
let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects")
    .fetch_all(&pool)
    .await?;

for project in projects {
    // 每个项目又查询一次
    let samples = sqlx::query_as::<_, Sample>("SELECT * FROM samples WHERE project_id = ?")
        .bind(project.id)
        .fetch_all(&pool)
        .await?;
}

// ✅ 好的 - 批量查询
let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects")
    .fetch_all(&pool)
    .await?;

let project_ids: Vec<_> = projects.iter().map(|p| p.id).collect();

let samples = sqlx::query_as::<_, Sample>("SELECT * FROM samples WHERE project_id = ANY($1)")
    .bind(&project_ids)
    .fetch_all(&pool)
    .await?;
```

---

## 9. 连接池配置优化

### 9.1 sqlx 连接池配置

```rust
let pool = PgPoolOptions::new()
    .max_connections(20)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(10))
    .idle_timeout(Duration::from_secs(300))
    .max_lifetime(Duration::from_secs(1800))
    .connect("postgres://...")
    .await?;
```

---

## 10. 数据库参数优化

### 10.1 PostgreSQL 配置建议

```ini
# postgresql.conf

# 连接设置
max_connections = 100

# 内存设置
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB

# WAL 写入设置
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 500

# 查询优化
random_page_cost = 1.1
effective_io_concurrency = 200
```

---

## 总结

1. **索引优化** - 为常用查询列创建索引
2. **查询优化** - 避免全表扫描，使用适当的过滤条件
3. **分页优化** - 使用高效的分页方法
4. **批量操作** - 减少数据库往返次数
5. **监控分析** - 使用 EXPLAIN 和系统视图监控性能
6. **连接池** - 合理配置连接池参数
7. **数据库配置** - 根据硬件优化 PostgreSQL 参数
