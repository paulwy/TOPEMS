# PostgreSQL 生产环境配置调优建议

**日期**：2026-09-11
**适用环境**：生产环境（基于 16GB 内存服务器）
**当前环境**：开发环境（16GB 内存，90MB 数据库）

---

## 一、当前配置 vs 建议配置

| 配置项 | 当前值（开发） | 建议值（生产） | 单位 | 说明 |
|--------|---------------|---------------|------|------|
| shared_buffers | 128 MB | 4 GB | MB | 数据库缓存，建议内存的 25% |
| effective_cache_size | 4 GB | 12 GB | MB | 查询优化器估算可用缓存，建议内存的 50-75% |
| work_mem | 4 MB | 32 MB | MB | 排序和哈希操作内存，根据并发查询数调整 |
| maintenance_work_mem | 64 MB | 512 MB | MB | 维护操作（VACUUM、CREATE INDEX）内存 |
| max_connections | 500 | 200 | 个 | 最大连接数，配合连接池使用 |
| checkpoint_completion_target | 0.9 | 0.9 | - | 检查点完成目标，已优化 |
| wal_buffers | 4 MB | 16 MB | MB | WAL 缓冲区 |
| random_page_cost | 4.0 | 1.1 | - | 随机页读取成本，SSD 建议 1.1 |
| effective_io_concurrency | 16 | 200 | - | 有效 IO 并发数，SSD 建议 200 |
| log_min_duration_statement | 1000 ms | 500 ms | ms | 慢查询日志阈值，生产环境建议更敏感 |
| logging_collector | off | on | - | 日志收集器，建议开启 |
| log_checkpoints | off | on | - | 记录检查点日志 |
| log_lock_waits | off | on | - | 记录锁等待 |
| log_temp_files | -1 | 0 | KB | 记录临时文件（0 表示记录所有） |

---

## 二、详细配置说明

### 2.1 内存相关配置

#### shared_buffers
- **当前值**：128 MB
- **建议值**：4 GB（16GB 内存的 25%）
- **说明**：
  - PostgreSQL 专用缓存，用于缓存表和索引数据
  - 建议设置为系统内存的 25%
  - 过大可能导致系统内存不足，过小会导致频繁磁盘 IO
  - 修改需要重启 PostgreSQL

#### effective_cache_size
- **当前值**：4 GB
- **建议值**：12 GB（16GB 内存的 75%）
- **说明**：
  - 查询优化器估算可用缓存大小（包括 shared_buffers + 操作系统缓存）
  - 不实际分配内存，仅影响查询计划选择
  - 建议设置为系统内存的 50-75%
  - 可以通过 `pg_ctl reload` 热加载

#### work_mem
- **当前值**：4 MB
- **建议值**：32 MB
- **说明**：
  - 每个排序或哈希操作的内存上限
  - 复杂查询可能同时使用多个 work_mem
  - 计算公式：`可用内存 / (max_connections * 2)`
  - 16GB 内存、200 连接：`16GB / 400 ≈ 40MB`，建议 32MB
  - 可以通过 `pg_ctl reload` 热加载

#### maintenance_work_mem
- **当前值**：64 MB
- **建议值**：512 MB
- **说明**：
  - 维护操作（VACUUM、CREATE INDEX、ALTER TABLE）的内存上限
  - 较大的值可以加快索引创建和 VACUUM 速度
  - 建议设置为 256MB - 1GB
  - 可以通过 `pg_ctl reload` 热加载

### 2.2 连接相关配置

#### max_connections
- **当前值**：500
- **建议值**：200
- **说明**：
  - 最大连接数，每个连接占用约 10MB 内存
  - 500 连接可能占用 5GB 内存，影响性能
  - 建议配合连接池（PgBouncer）使用，降低实际连接数
  - 修改需要重启 PostgreSQL

### 2.3 IO 相关配置

#### random_page_cost
- **当前值**：4.0
- **建议值**：1.1
- **说明**：
  - 随机页读取成本相对于顺序页读取的比例
  - 机械硬盘建议 4.0，SSD 建议 1.1
  - 生产环境通常使用 SSD，建议设置为 1.1
  - 可以通过 `pg_ctl reload` 热加载

#### effective_io_concurrency
- **当前值**：16
- **建议值**：200
- **说明**：
  - 有效 IO 并发数，影响位图堆扫描的预读
  - 机械硬盘建议 2-4，SSD 建议 200
  - 生产环境通常使用 SSD，建议设置为 200
  - 可以通过 `pg_ctl reload` 热加载

### 2.4 WAL 相关配置

#### wal_buffers
- **当前值**：4 MB
- **建议值**：16 MB
- **说明**：
  - WAL（预写日志）缓冲区大小
  - 较大的值可以减少 WAL 写入次数
  - 建议设置为 shared_buffers 的 1/32，最大 16MB
  - 修改需要重启 PostgreSQL

#### checkpoint_completion_target
- **当前值**：0.9
- **建议值**：0.9
- **说明**：
  - 检查点完成目标，已优化
  - 0.9 表示在 90% 的检查点间隔内完成写入
  - 可以平滑 IO 负载，避免突发写入

### 2.5 日志相关配置

#### log_min_duration_statement
- **当前值**：1000 ms
- **建议值**：500 ms
- **说明**：
  - 慢查询日志阈值
  - 生产环境建议设置为 500ms，更敏感地发现慢查询
  - 可以通过 `pg_ctl reload` 热加载

#### logging_collector
- **当前值**：off
- **建议值**：on
- **说明**：
  - 日志收集器，将 stderr 日志重定向到文件
  - 建议开启，便于日志管理和分析
  - 修改需要重启 PostgreSQL

#### log_checkpoints
- **当前值**：off
- **建议值**：on
- **说明**：
  - 记录检查点开始和完成日志
  - 有助于监控检查点性能和 IO 负载

#### log_lock_waits
- **当前值**：off
- **建议值**：on
- **说明**：
  - 记录锁等待超过 deadlock_timeout 的会话
  - 有助于发现锁竞争和性能瓶颈

#### log_temp_files
- **当前值**：-1（禁用）
- **建议值**：0（记录所有）
- **说明**：
  - 记录使用临时文件的查询（排序/哈希操作溢出内存）
  - 0 表示记录所有临时文件，有助于发现 work_mem 不足的查询
  - 单位为 KB，大于此值才记录

---

## 三、配置实施步骤

### 3.1 修改配置文件

```bash
# 备份配置文件
cp /opt/homebrew/var/postgresql@18/postgresql.conf \
   /opt/homebrew/var/postgresql@18/postgresql.conf.backup-prod

# 修改配置
cat >> /opt/homebrew/var/postgresql@18/postgresql.conf << 'EOF'

# ============================================
# 生产环境性能优化配置
# ============================================

# 内存配置
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 512MB

# 连接配置
max_connections = 200

# IO 配置（SSD）
random_page_cost = 1.1
effective_io_concurrency = 200

# WAL 配置
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# 日志配置
log_min_duration_statement = 500ms
logging_collector = on
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0

EOF
```

### 3.2 重启 PostgreSQL

```bash
# 重启 PostgreSQL（需要重启的配置：shared_buffers、max_connections、wal_buffers、logging_collector）
brew services restart postgresql@18

# 或者使用 pg_ctl
pg_ctl restart -D /opt/homebrew/var/postgresql@18
```

### 3.3 验证配置

```sql
-- 验证关键配置
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
  'shared_buffers', 'effective_cache_size', 'work_mem',
  'maintenance_work_mem', 'max_connections', 'random_page_cost',
  'effective_io_concurrency', 'wal_buffers', 'log_min_duration_statement'
)
ORDER BY name;
```

---

## 四、性能监控建议

### 4.1 关键监控指标

| 指标类别 | 指标名 | 告警阈值 | 说明 |
|----------|--------|----------|------|
| 数据库 | 慢查询数量 | > 10/分钟 | 慢查询日志统计 |
| 数据库 | 连接池使用率 | > 80% | 活跃连接数 / 最大连接数 |
| 数据库 | 缓存命中率 | < 95% | 索引缓存命中率 |
| 数据库 | 锁等待时间 | > 1s | 锁等待统计 |
| 数据库 | 临时文件大小 | > 100MB/小时 | work_mem 不足的信号 |
| 数据库 | 检查点频率 | > 6次/小时 | WAL 配置可能需要调整 |
| API | P95 响应时间 | > 500ms | API 响应时间 |
| API | P99 响应时间 | > 2s | API 响应时间 |
| API | 错误率 | > 1% | HTTP 5xx 错误率 |

### 4.2 监控工具

1. **Prometheus + Grafana**：指标收集和可视化
2. **pg_stat_statements**：PostgreSQL 查询统计（需安装扩展）
3. **OpenTelemetry**：分布式追踪（已集成）
4. **pgBadger**：PostgreSQL 日志分析工具

### 4.3 安装 pg_stat_statements 扩展

```sql
-- 在 postgresql.conf 中添加
shared_preload_libraries = 'pg_stat_statements'

-- 重启 PostgreSQL 后创建扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查询慢查询 Top 10
SELECT
  queryid,
  LEFT(query, 100) as query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## 五、注意事项

### 5.1 配置调整原则

1. **逐步调整**：不要一次性调整所有配置，每次调整 1-2 项，观察效果
2. **基准测试**：调整前后进行性能基准测试，对比效果
3. **监控验证**：调整后密切监控关键指标，确保没有负面影响
4. **回滚准备**：保留配置备份，必要时可以快速回滚

### 5.2 硬件相关

1. **SSD vs 机械硬盘**：本建议基于 SSD，如果使用机械硬盘，random_page_cost 和 effective_io_concurrency 需要调整
2. **内存大小**：本建议基于 16GB 内存，如果内存大小不同，需要按比例调整
3. **CPU 核心数**：work_mem 和 max_connections 也需要考虑 CPU 核心数

### 5.3 连接池

1. **使用 PgBouncer**：建议使用 PgBouncer 作为外部连接池，降低 PostgreSQL 实际连接数
2. **事务级连接池**：推荐使用事务级连接池（transaction pooling），提高连接复用率
3. **连接池大小**：PgBouncer 的最大连接数可以设置为 PostgreSQL max_connections 的 2-3 倍

---

## 六、总结

### 6.1 主要优化项

1. **内存优化**：shared_buffers 从 128MB 提升到 4GB，effective_cache_size 从 4GB 提升到 12GB
2. **IO 优化**：random_page_cost 从 4.0 降低到 1.1（SSD），effective_io_concurrency 从 16 提升到 200
3. **连接优化**：max_connections 从 500 降低到 200，配合连接池使用
4. **日志优化**：开启详细日志（检查点、锁等待、临时文件），慢查询阈值从 1000ms 降低到 500ms

### 6.2 预期收益

| 优化项 | 预期性能提升 | 实施难度 |
|--------|-------------|----------|
| 内存优化 | 20-40% 查询速度提升 | 低 |
| IO 优化 | 10-30% 随机查询速度提升 | 低 |
| 连接优化 | 降低内存占用，提高稳定性 | 中 |
| 日志优化 | 提高问题发现和诊断能力 | 低 |

### 6.3 后续建议

1. **安装 pg_stat_statements**：用于生产环境的真实慢查询分析
2. **部署 PgBouncer**：降低 PostgreSQL 实际连接数，提高连接复用率
3. **建立性能基准**：在优化前后进行性能对比，量化优化效果
4. **持续监控**：配置 Prometheus + Grafana 监控，及时发现性能问题
5. **定期审查**：每季度进行一次配置审查，根据业务增长调整配置

---

**文档生成时间**：2026-09-11
**适用版本**：PostgreSQL 18.4
**硬件配置**：16GB 内存，SSD 存储
**注意事项**：本建议基于通用最佳实践，实际配置需要根据业务负载和硬件配置进行调整
