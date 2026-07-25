# 数据库分区表策略

## 1. 分区策略概述

### 何时使用分区表

数据库分区是将大型表分解为更小、更易管理的物理存储单元的技术。在以下场景推荐使用分区表：

- **单表数据量超过 1000 万行**
- **存在明显的时间或地域分区键**
- **查询模式可利用分区裁剪**
- **需要归档历史数据**

### 分区优势

- **查询性能提升**：通过分区裁剪减少扫描数据量
- **维护便利**：可独立备份、恢复单个分区
- **数据归档**：轻松删除或归档旧分区
- **索引优化**：每个分区维护独立索引，减少索引膨胀

---

## 2. 推荐分区的大表清单

| 表名 | 模块 | 分区类型 | 分区键 | 预估数据量 |
|------|------|---------|--------|-----------|
| `audit_logs` | core_infra | RANGE | `created_at` | 高频写入，千万级 |
| `event_logs` | monitoring | RANGE | `created_at` | 高频写入，千万级 |
| `notification_history` | notification | RANGE | `created_at` | 中频写入，百万级 |
| `system_metrics` | monitor | RANGE | `recorded_at` | 高频写入，千万级 |
| `operation_logs` | core_infra | RANGE | `created_at` | 中频写入，百万级 |

---

## 3. 分区类型选择

### RANGE 分区（范围分区）

**适用场景**：时间序列数据、有明确范围的数值数据

```sql
PARTITION BY RANGE (created_at)
```

**优点**：
- 最适合按时间查询的数据（审计日志、事件日志）
- 支持自动分区裁剪
- 便于归档和删除旧数据

**缺点**：
- 分区键必须包含主键
- 插入时需要确保数据落在定义的分区范围内

---

### LIST 分区（列表分区）

**适用场景**：按地区、类型等离散值分区

```sql
PARTITION BY LIST (region_code)
```

**优点**：
- 适合按固定类别查询的数据
- 分区数量可控

**缺点**：
- 需要预先知道所有可能的值
- 新增值时需要手动添加分区

---

### HASH 分区（哈希分区）

**适用场景**：无明显范围特征的数据

```sql
PARTITION BY HASH (user_id)
```

**优点**：
- 数据分布均匀
- 无需关心分区范围

**缺点**：
- 不支持范围查询优化
- 不便于归档旧数据

---

## 4. 分区键选择建议

### 时间类分区键（推荐）

```sql
-- 推荐：使用 timestamptz 类型
created_at TIMESTAMP WITH TIME ZONE NOT NULL,
PRIMARY KEY (id, created_at)
```

### 整型分区键

```sql
-- 适用于自增 ID 或年份
year_column INT NOT NULL,
PRIMARY KEY (id, year_column)
```

### 选择原则

1. **主键必须包含分区键**：复合主键 `(id, partition_key)`
2. **查询条件包含分区键**：确保分区裁剪生效
3. **避免频繁更新分区键**：会导致行在分区间移动
4. **分区粒度适中**：按月或按季度，避免分区数量过多

---

## 5. 分区维护操作

### 创建新分区

```sql
-- 创建下个月的审计日志分区
CREATE TABLE audit_logs_2026_07 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 可以预先创建未来 3-6 个月的分区
CREATE TABLE audit_logs_2026_08 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

### 归档旧分区

```sql
-- 方法 1：分离分区（数据仍在磁盘，但脱离分区表）
ALTER TABLE core_infra.audit_logs_partitioned DETACH PARTITION audit_logs_2025_01;

-- 方法 2：删除旧分区（永久删除）
DROP TABLE audit_logs_2025_01;

-- 方法 3：导出后删除（归档到其他存储）
COPY audit_logs_2025_01 TO '/backup/audit_logs_2025_01.csv';
DROP TABLE audit_logs_2025_01;
```

### 查看分区信息

```sql
-- 查看所有分区
SELECT
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'audit_logs_%'
ORDER BY tablename;

-- 查看分区定义
SELECT
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_expression
FROM pg_class base
JOIN pg_inherits inh ON inh.inhparent = base.oid
JOIN pg_class child ON child.oid = inh.inhrelid
WHERE base.relname = 'audit_logs_partitioned';
```

---

## 6. 示例：审计日志表按月分区

### 完整建表语句

```sql
-- 创建分区表
CREATE TABLE IF NOT EXISTS core_infra.audit_logs_partitioned (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建索引
CREATE INDEX idx_audit_logs_tenant_created ON core_infra.audit_logs_partitioned
    (tenant_id, created_at);
CREATE INDEX idx_audit_logs_user ON core_infra.audit_logs_partitioned
    (user_id);
CREATE INDEX idx_audit_logs_action ON core_infra.audit_logs_partitioned
    (action, created_at);

-- 创建未来 6 个月的分区
CREATE TABLE audit_logs_2026_07 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_logs_2026_08 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_logs_2026_09 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit_logs_2026_10 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit_logs_2026_11 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit_logs_2026_12 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
```

### 查询示例

```sql
-- 查询当月审计日志（自动分区裁剪）
SELECT * FROM core_infra.audit_logs_partitioned
WHERE created_at >= '2026-07-01' AND created_at < '2026-08-01'
  AND tenant_id = 'xxx';

-- 查询最近 3 个月的审计日志（跨分区查询）
SELECT * FROM core_infra.audit_logs_partitioned
WHERE created_at >= NOW() - INTERVAL '3 months'
ORDER BY created_at DESC;
```

---

## 7. 分区自动化建议

### 定时任务创建分区

```bash
# 使用 crontab 每月自动创建下下个月的分区
0 0 1 * * psql -c "CREATE TABLE IF NOT EXISTS audit_logs_$(date +%Y_%m -d '2 months') PARTITION OF core_infra.audit_logs_partitioned FOR VALUES FROM ('$(date +%Y-%m-01 -d '2 months')') TO ('$(date +%Y-%m-01 -d '3 months')');"
```

### 归档脚本示例

```bash
#!/bin/bash
# archive_old_partitions.sh

# 归档 6 个月前的分区
ARCHIVE_MONTH=$(date +%Y_%m -d '6 months ago')
TABLE_NAME="audit_logs_${ARCHIVE_MONTH}"

# 导出到 CSV
psql -c "COPY ${TABLE_NAME} TO '/archive/${TABLE_NAME}.csv' WITH CSV HEADER;"

# 删除分区
psql -c "DROP TABLE IF EXISTS ${TABLE_NAME};"
```

---

## 8. 注意事项

1. **分区数量限制**：单个分区表建议不超过 100 个分区
2. **主键约束**：分区键必须包含在主键中
3. **外键限制**：分区表不支持外键引用
4. **更新分区键**：避免更新分区键值，会导致行移动
5. **性能监控**：定期检查分区裁剪效果（使用 `EXPLAIN ANALYZE`）
6. **备份策略**：单个分区可以独立备份，提高备份效率

---

## 9. 监控与优化

### 查看分区裁剪效果

```sql
EXPLAIN ANALYZE
SELECT * FROM core_infra.audit_logs_partitioned
WHERE created_at >= '2026-07-01' AND created_at < '2026-08-01';
```

**预期输出**：应显示 `Seq Scan on audit_logs_2026_07`，而不是全表扫描。

### 定期维护

```sql
-- 每月运行一次
ANALYZE core_infra.audit_logs_partitioned;

-- 清理过期数据
VACUUM FULL audit_logs_2026_01;
```

---

## 参考资料

- [PostgreSQL 17 Partitioning Documentation](https://www.postgresql.org/docs/17/ddl-partitioning.html)
- [Partition Maintenance Best Practices](https://www.postgresql.org/docs/17/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-MAINTENANCE)