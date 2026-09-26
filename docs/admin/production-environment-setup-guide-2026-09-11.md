# TOPEMS 生产环境配置实施指南

**日期**：2026-09-11
**版本**：v1.0
**范围**：PostgreSQL 配置调优、pg_stat_statements、PgBouncer、Prometheus + Grafana 监控

---

## 一、概述

本文档提供 TOPEMS 项目生产环境的完整配置实施指南，包括：

1. **PostgreSQL 配置调优**：基于 16GB 内存 + SSD 的生产环境配置建议
2. **pg_stat_statements**：慢查询分析扩展的安装和使用
3. **PgBouncer**：连接池部署建议，降低 PostgreSQL 实际连接数
4. **Prometheus + Grafana**：数据库监控配置建议

---

## 二、PostgreSQL 配置调优

### 2.1 硬件配置假设

- **CPU**：4 核或以上
- **内存**：16GB
- **存储**：SSD
- **操作系统**：Linux（Ubuntu 22.04 / CentOS 8+）
- **PostgreSQL 版本**：16+

### 2.2 核心配置参数

#### 2.2.1 内存配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `shared_buffers` | 128MB | 4GB | 数据库专用内存，建议总内存的 25% |
| `effective_cache_size` | 4GB | 12GB | 优化器估算可用缓存，建议总内存的 75% |
| `work_mem` | 4MB | 16MB | 排序/哈希操作内存，复杂查询可适当增大 |
| `maintenance_work_mem` | 64MB | 512MB | VACUUM/CREATE INDEX 等维护操作内存 |
| `huge_pages` | try | on | 大页支持，提高内存性能 |

#### 2.2.2 检查点配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `max_wal_size` | 1GB | 4GB | 最大 WAL 大小，减少检查点频率 |
| `min_wal_size` | 80MB | 1GB | 最小 WAL 大小 |
| `checkpoint_completion_target` | 0.9 | 0.9 | 检查点完成目标，平滑写入 |
| `checkpoint_timeout` | 5min | 15min | 检查点超时时间 |

#### 2.2.3 连接配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `max_connections` | 100 | 200 | 最大连接数（配合 PgBouncer 使用） |
| `superuser_reserved_connections` | 3 | 5 | 超级用户保留连接数 |
| `tcp_keepalives_idle` | 0 | 60 | TCP 空闲超时（秒） |
| `tcp_keepalives_interval` | 0 | 10 | TCP 探测间隔（秒） |
| `tcp_keepalives_count` | 0 | 3 | TCP 探测次数 |

#### 2.2.4 查询优化配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `random_page_cost` | 4.0 | 1.1 | SSD 随机读取成本，降低以鼓励索引扫描 |
| `effective_io_concurrency` | 1 | 200 | SSD IO 并发度 |
| `default_statistics_target` | 100 | 200 | 统计信息采样精度，提高查询计划准确性 |
| `from_collapse_limit` | 8 | 16 | FROM 子句折叠限制 |
| `join_collapse_limit` | 8 | 16 | JOIN 折叠限制 |

#### 2.2.5 日志配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `logging_collector` | off | on | 启用日志收集器 |
| `log_directory` | log | log | 日志目录 |
| `log_filename` | postgresql-%Y-%m-%d.log | postgresql-%Y-%m-%d.log | 日志文件名格式 |
| `log_rotation_age` | 1d | 1d | 日志轮转周期 |
| `log_rotation_size` | 10MB | 100MB | 日志轮转大小 |
| `log_min_duration_statement` | -1 | 1000 | 慢查询日志阈值（毫秒），1 秒 |
| `log_lock_waits` | off | on | 记录锁等待 |
| `log_temp_files` | -1 | 0 | 记录临时文件使用（0 表示全部记录） |
| `log_checkpoints` | off | on | 记录检查点 |
| `log_connections` | off | on | 记录连接（生产环境可关闭以减少日志量） |
| `log_disconnections` | off | on | 记录断开连接 |

#### 2.2.6 扩展配置

| 参数 | 默认值 | 建议值 | 说明 |
|------|--------|--------|------|
| `shared_preload_libraries` | '' | 'pg_stat_statements' | 预加载扩展 |

### 2.3 完整配置示例

```ini
# ==================== 内存配置 ====================
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB
huge_pages = on

# ==================== 检查点配置 ====================
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min

# ==================== 连接配置 ====================
max_connections = 200
superuser_reserved_connections = 5
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 3

# ==================== 查询优化配置 ====================
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 200
from_collapse_limit = 16
join_collapse_limit = 16

# ==================== 日志配置 ====================
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_lock_waits = on
log_temp_files = 0
log_checkpoints = on
log_connections = off
log_disconnections = off

# ==================== 扩展配置 ====================
shared_preload_libraries = 'pg_stat_statements'
```

### 2.4 实施步骤

```bash
# 1. 备份当前配置
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup-$(date +%Y%m%d)

# 2. 修改配置文件
sudo vi /etc/postgresql/16/main/postgresql.conf

# 3. 验证配置语法
sudo -u postgres postgres -C /etc/postgresql/16/main -t

# 4. 重启 PostgreSQL
sudo systemctl restart postgresql

# 5. 验证配置生效
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
sudo -u postgres psql -c "SHOW max_connections;"
```

---

## 三、pg_stat_statements 慢查询分析

### 3.1 安装步骤

```bash
# 1. 修改 postgresql.conf，添加预加载扩展
echo "shared_preload_libraries = 'pg_stat_statements'" >> /etc/postgresql/16/main/postgresql.conf

# 2. 重启 PostgreSQL
sudo systemctl restart postgresql

# 3. 在目标数据库中创建扩展
sudo -u postgres psql -d topems -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 4. 验证扩展已创建
sudo -u postgres psql -d topems -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements';"
```

### 3.2 常用查询

#### 3.2.1 统计概览

```sql
SELECT 
  count(*) as total_queries,
  sum(calls) as total_calls,
  round(sum(total_exec_time)::numeric, 2) as total_time_ms,
  round(avg(mean_exec_time)::numeric, 2) as avg_mean_time_ms,
  round(max(max_exec_time)::numeric, 2) as max_time_ms
FROM pg_stat_statements;
```

#### 3.2.2 Top 10 总执行时间最长的查询

```sql
SELECT 
  queryid,
  LEFT(query, 100) as query_preview,
  calls,
  round(total_exec_time::numeric, 2) as total_time_ms,
  round(mean_exec_time::numeric, 2) as mean_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) as time_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

#### 3.2.3 Top 10 调用次数最多的查询

```sql
SELECT 
  queryid,
  LEFT(query, 100) as query_preview,
  calls,
  round(total_exec_time::numeric, 2) as total_time_ms,
  round(mean_exec_time::numeric, 2) as mean_time_ms
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;
```

#### 3.2.4 Top 10 平均执行时间最长的查询（调用次数 > 10）

```sql
SELECT 
  queryid,
  LEFT(query, 100) as query_preview,
  calls,
  round(mean_exec_time::numeric, 2) as mean_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round(total_exec_time::numeric, 2) as total_time_ms
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 3.2.5 重置统计信息

```sql
SELECT pg_stat_statements_reset();
```

### 3.3 慢查询优化流程

1. **识别慢查询**：使用 pg_stat_statements 找出总执行时间最长或平均执行时间最长的查询
2. **分析执行计划**：使用 `EXPLAIN ANALYZE` 分析查询执行计划
3. **优化索引**：根据执行计划添加缺失的索引
4. **重写查询**：优化查询逻辑，避免全表扫描、不必要的 JOIN、子查询等
5. **验证优化效果**：优化后再次使用 pg_stat_statements 验证性能提升

---

## 四、PgBouncer 连接池部署

### 4.1 为什么需要 PgBouncer

PostgreSQL 每个连接都需要分配内存（约 10MB），大量连接会导致：
- 内存消耗过大
- 上下文切换频繁
- 性能下降

PgBouncer 作为连接池中间件，可以：
- 复用数据库连接，降低实际连接数
- 支持事务级连接复用（Transaction mode）
- 提高数据库吞吐量
- 平滑数据库重启

### 4.2 部署架构

```
应用服务 (10个实例，每个 20 连接 = 200 逻辑连接)
    ↓
PgBouncer (连接池，最大 50 实际连接)
    ↓
PostgreSQL (max_connections = 100)
```

### 4.3 安装步骤

```bash
# Ubuntu/Debian
sudo apt-get install pgbouncer

# CentOS/RHEL
sudo yum install pgbouncer
```

### 4.4 配置文件

#### 4.4.1 /etc/pgbouncer/pgbouncer.ini

```ini
[databases]
topems = host=localhost port=5432 dbname=topems

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres
stats_users = postgres
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
server_round_robin = 1
ignore_startup_parameters = extra_float_digits
```

#### 4.4.2 /etc/pgbouncer/userlist.txt

```
"topems" "md5<password_hash>"
"postgres" "md5<password_hash>"
```

生成密码哈希：
```bash
echo -n "md5$(echo -n 'passwordusername' | md5sum | cut -d' ' -f1)"
```

### 4.5 关键配置说明

| 参数 | 建议值 | 说明 |
|------|--------|------|
| `pool_mode` | transaction | 事务级连接复用，性能最佳 |
| `max_client_conn` | 500 | 最大客户端连接数 |
| `default_pool_size` | 20 | 每个数据库/用户的默认连接池大小 |
| `reserve_pool_size` | 5 | 预留连接池大小 |
| `reserve_pool_timeout` | 3 | 预留连接池超时（秒） |
| `server_round_robin` | 1 | 轮询分配后端连接 |

### 4.6 应用配置修改

将应用的数据库连接字符串从：
```
DATABASE_URL=postgres://topems:password@localhost:5432/topems
```

改为：
```
DATABASE_URL=postgres://topems:password@localhost:6432/topems
```

### 4.7 监控 PgBouncer

```bash
# 连接 PgBouncer 管理控制台
psql -h localhost -p 6432 -U postgres pgbouncer

# 查看连接池状态
SHOW POOLS;

# 查看客户端连接
SHOW CLIENTS;

# 查看服务器连接
SHOW SERVERS;

# 查看统计信息
SHOW STATS;
```

---

## 五、Prometheus + Grafana 监控

### 5.1 监控架构

```
PostgreSQL → postgres_exporter → Prometheus → Grafana
PgBouncer → pgbouncer_exporter → Prometheus → Grafana
应用服务 → /metrics 端点 → Prometheus → Grafana
```

### 5.2 postgres_exporter 部署

#### 5.2.1 安装

```bash
# 下载 postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar xzf postgres_exporter-0.15.0.linux-amd64.tar.gz
sudo cp postgres_exporter-0.15.0.linux-amd64/postgres_exporter /usr/local/bin/
```

#### 5.2.2 创建监控用户

```sql
CREATE USER postgres_exporter WITH PASSWORD 'password';
GRANT pg_monitor TO postgres_exporter;
GRANT SELECT ON pg_stat_statements TO postgres_exporter;
```

#### 5.2.3 systemd 服务配置

```ini
# /etc/systemd/system/postgres_exporter.service
[Unit]
Description=PostgreSQL Exporter
After=network.target

[Service]
User=postgres
Environment="DATA_SOURCE_NAME=postgresql://postgres_exporter:password@localhost:5432/topems?sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter --web.listen-address=:9187 --extend.query-path=/etc/postgres_exporter/queries.yaml
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 5.2.4 扩展查询配置

```yaml
# /etc/postgres_exporter/queries.yaml
pg_stat_statements:
  query: "SELECT userid, dbid, queryid, calls, total_exec_time, mean_exec_time, max_exec_time FROM pg_stat_statements LIMIT 100"
  metrics:
    - userid:
        usage: "LABEL"
        description: "User OID"
    - dbid:
        usage: "LABEL"
        description: "Database OID"
    - queryid:
        usage: "LABEL"
        description: "Query ID"
    - calls:
        usage: "COUNTER"
        description: "Number of calls"
    - total_exec_time:
        usage: "COUNTER"
        description: "Total execution time in ms"
    - mean_exec_time:
        usage: "GAUGE"
        description: "Mean execution time in ms"
    - max_exec_time:
        usage: "GAUGE"
        description: "Max execution time in ms"
```

### 5.3 pgbouncer_exporter 部署

```bash
# 下载 pgbouncer_exporter
wget https://github.com/prometheus-community/pgbouncer_exporter/releases/download/v0.7.0/pgbouncer_exporter-0.7.0.linux-amd64.tar.gz
tar xzf pgbouncer_exporter-0.7.0.linux-amd64.tar.gz
sudo cp pgbouncer_exporter-0.7.0.linux-amd64/pgbouncer_exporter /usr/local/bin/

# systemd 服务
# /etc/systemd/system/pgbouncer_exporter.service
[Unit]
Description=PgBouncer Exporter
After=network.target

[Service]
User=postgres
ExecStart=/usr/local/bin/pgbouncer_exporter --pgBouncer.connectionString=postgres://postgres:password@localhost:6432/pgbouncer?sslmode=disable
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5.4 Prometheus 配置

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
        labels:
          instance: 'topems-db'

  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['localhost:9127']
        labels:
          instance: 'topems-pgbouncer'

  - job_name: 'topems-services'
    static_configs:
      - targets: ['localhost:9091', 'localhost:9092', 'localhost:9093']
        labels:
          instance: 'topems-app'
```

### 5.5 Grafana 仪表盘

#### 5.5.1 推荐仪表盘

1. **PostgreSQL Overview**：Dashboard ID 9628
   - 数据库连接数、查询吞吐量、缓存命中率
   - 表大小、索引大小、锁等待
   - 复制延迟（如有）

2. **pg_stat_statements**：自定义仪表盘
   - Top 10 慢查询
   - 查询吞吐量趋势
   - 平均执行时间趋势

3. **PgBouncer**：Dashboard ID 10945
   - 连接池使用率
   - 客户端/服务器连接数
   - 查询等待时间

4. **TOPEMS 应用监控**：自定义仪表盘
   - API 响应时间（P50/P95/P99）
   - API 错误率
   - 业务指标（订单量、库存量等）

#### 5.5.2 关键告警规则

```yaml
# /etc/prometheus/alerts/postgres.yml
groups:
  - name: postgres
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL instance {{ $labels.instance }} is down for more than 1 minute."

      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count > 150
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL high connections"
          description: "PostgreSQL has {{ $value }} connections, exceeding 75% of max_connections."

      - alert: PostgreSQLSlowQuery
        expr: rate(pg_stat_statements_seconds_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL slow queries"
          description: "PostgreSQL is experiencing high query execution time."

      - alert: PostgreSQLLockWait
        expr: pg_stat_activity_waiting_count > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL lock waits"
          description: "PostgreSQL has {{ $value }} sessions waiting for locks."
```

---

## 六、实施检查清单

### 6.1 PostgreSQL 配置调优

- [ ] 备份当前配置文件
- [ ] 修改 shared_buffers = 4GB
- [ ] 修改 effective_cache_size = 12GB
- [ ] 修改 work_mem = 16MB
- [ ] 修改 maintenance_work_mem = 512MB
- [ ] 修改 max_wal_size = 4GB
- [ ] 修改 random_page_cost = 1.1
- [ ] 修改 default_statistics_target = 200
- [ ] 启用 logging_collector
- [ ] 设置 log_min_duration_statement = 1000
- [ ] 重启 PostgreSQL
- [ ] 验证配置生效

### 6.2 pg_stat_statements

- [ ] 修改 shared_preload_libraries = 'pg_stat_statements'
- [ ] 重启 PostgreSQL
- [ ] 在 topems 数据库创建扩展
- [ ] 验证扩展已创建
- [ ] 运行常用查询验证数据收集

### 6.3 PgBouncer

- [ ] 安装 PgBouncer
- [ ] 配置 pgbouncer.ini
- [ ] 配置 userlist.txt
- [ ] 启动 PgBouncer 服务
- [ ] 修改应用连接字符串指向 PgBouncer
- [ ] 验证连接池工作正常
- [ ] 监控连接池使用率

### 6.4 Prometheus + Grafana

- [ ] 安装 postgres_exporter
- [ ] 创建监控用户并授权
- [ ] 配置 postgres_exporter 服务
- [ ] 安装 pgbouncer_exporter（如使用 PgBouncer）
- [ ] 配置 Prometheus 抓取目标
- [ ] 安装 Grafana
- [ ] 导入 PostgreSQL 仪表盘
- [ ] 配置告警规则
- [ ] 验证监控数据正常

---

## 七、总结

### 7.1 预期收益

| 优化项 | 预期收益 | 实施难度 |
|--------|---------|----------|
| PostgreSQL 配置调优 | 性能提升 20-50% | 低 |
| pg_stat_statements | 可观测性提升，快速定位慢查询 | 低 |
| PgBouncer | 连接数降低 75%，吞吐量提升 50% | 中 |
| Prometheus + Grafana | 全面监控，及时发现问题 | 中 |

### 7.2 推荐实施顺序

1. **第一优先级**：PostgreSQL 配置调优 + pg_stat_statements（简单，收益明显）
2. **第二优先级**：Prometheus + Grafana 监控（可观测性基础）
3. **第三优先级**：PgBouncer 连接池（高并发场景下收益明显）

### 7.3 注意事项

1. **配置变更需重启**：shared_buffers、shared_preload_libraries 等参数需要重启 PostgreSQL 才能生效
2. **灰度发布**：建议先在测试环境验证配置，再逐步应用到生产环境
3. **监控验证**：配置变更后密切监控数据库性能，确保没有负面影响
4. **备份恢复**：配置变更前备份配置文件，出现问题可以快速回滚
5. **业务低峰期**：重启 PostgreSQL 建议在业务低峰期进行，减少对业务的影响

---

**文档生成时间**：2026-09-11
**适用版本**：TOPEMS v1.0
**PostgreSQL 版本**：16+
**PgBouncer 版本**：1.20+
**Prometheus 版本**：2.45+
**Grafana 版本**：10.0+
