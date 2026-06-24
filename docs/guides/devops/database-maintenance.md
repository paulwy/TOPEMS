# TOPEMS 数据库维护指南

## 目录

- [概述](#概述)
- [备份策略](#备份策略)
- [数据恢复](#数据恢复)
- [数据库迁移](#数据库迁移)
- [性能维护](#性能维护)
- [常见问题处理](#常见问题处理)

---

## 概述

### 数据库信息

| 项目 | 说明 |
|------|------|
| 数据库类型 | PostgreSQL 14+ |
| 默认端口 | 5432 |
| 默认用户 | topems |
| 默认数据库 | topems |
| 连接工具 | psql, pgAdmin, DBeaver |

### 环境变量

```bash
# 数据库连接
export DATABASE_URL="postgresql://topems:password@localhost:5432/topems"

# 或分别设置
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=topems
export PGUSER=topems
export PGPASSWORD=your_password
```

---

## 备份策略

### 自动备份（推荐）

使用 `deploy/scripts/setup-db.sh` 配置自动备份：

```bash
# 配置每日全量备份
./deploy/scripts/setup-db.sh --backup --schedule "0 2 * * *"
```

### 手动备份

#### 全量备份

```bash
# 语法
pg_dump -h <host> -p <port> -U <user> -Fc -f <backup_file>.dump <database>

# 示例
pg_dump -h localhost -p 5432 -U topems -Fc -f topems_backup_$(date +%Y%m%d).dump topems
```

#### 压缩备份

```bash
# 备份并压缩
pg_dump -h localhost -p 5432 -U topems -Fc topems | gzip > topems_backup_$(date +%Y%m%d).dump.gz
```

#### 只备份表结构

```bash
pg_dump -h localhost -p 5432 -U topems -Fc --schema-only topems -f schema_backup.dump
```

#### 只备份数据

```bash
pg_dump -h localhost -p 5432 -U topems -Fc --data-only topems -f data_backup.dump
```

### 备份验证

```bash
# 验证备份文件完整性
pg_restore --list topems_backup.dump

# 测试恢复（到临时数据库）
pg_restore -h localhost -p 5432 -U topems -d topems_test --create topems_backup.dump
```

### 备份保留策略

```bash
# 创建备份目录
mkdir -p /opt/topems/backups

# 保留最近 7 天的每日备份
find /opt/topems/backups -name "*.dump" -mtime +7 -delete

# 保留最近 4 周的每周备份（每月 1 日）
find /opt/topems/backups -name "*_week_*.dump" -mtime +28 -delete
```

### 备份脚本示例

```bash
#!/bin/bash
# backup.sh - TOPEMS 数据库备份脚本

set -e

BACKUP_DIR="/opt/topems/backups"
DATABASE_URL="postgresql://topems:password@localhost:5432/topems"
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/topems_${TIMESTAMP}.dump"

# 执行备份
echo "Starting backup to $BACKUP_FILE"
pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_FILE"

# 压缩备份
gzip "$BACKUP_FILE"

# 删除过期备份
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

# 列出备份文件
ls -lh "$BACKUP_DIR"

echo "Backup completed: ${BACKUP_FILE}.gz"
```

---

## 数据恢复

### 完全恢复

```bash
# 停止服务
systemctl stop topems.target

# 删除现有数据库（谨慎操作）
psql -h localhost -U topems -c "DROP DATABASE topems;"

# 创建空数据库
psql -h localhost -U topems -c "CREATE DATABASE topems;"

# 恢复数据
pg_restore -h localhost -U topems -d topems --no-owner topems_backup.dump.gz

# 启动服务
systemctl start topems.target
```

### 恢复到指定时间点（PITR）

#### 配置要求

PostgreSQL 需要配置 WAL 归档：

```ini
# postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

#### 执行 PITR 恢复

```bash
# 创建恢复点目录
mkdir -p /tmp/pitr_recovery

# 执行 PITR 恢复
pg_restore -h localhost -U topems -d topems \
  --point-in-time="2024-01-15 10:30:00+08" \
  topems_backup.dump
```

### 表级恢复

```bash
# 从备份中提取单个表
pg_restore -h localhost -U topems -d topems \
  --table=users topems_backup.dump

# 恢复前先清空表数据
psql -h localhost -U topems -c "TRUNCATE TABLE users CASCADE;"
```

### 跨数据库恢复

```bash
# 从备份恢复到不同数据库
pg_restore -h localhost -U topems -d topems_new \
  --create topems_backup.dump
```

---

## 数据库迁移

### 版本升级迁移

#### PostgreSQL 12 -> 14

```bash
# 1. 停止服务
systemctl stop topems.target

# 2. 备份数据库
./backup.sh

# 3. 安装 PostgreSQL 14
apt-get install postgresql-14

# 4. 初始化新集群
pg_createcluster 14 main --start

# 5. 迁移数据
pg_dumpall -h localhost -U postgres | psql -h localhost -U postgres -d postgres

# 6. 更新连接配置
# 编辑 /etc/postgresql/14/main/postgresql.conf
# 设置 port = 5432

# 7. 重启 PostgreSQL
systemctl restart postgresql

# 8. 验证
psql -h localhost -U topems -c "SELECT version();"
```

### 迁移到新服务器

#### 1. 源服务器操作

```bash
# 执行完整备份
pg_dump -h localhost -p 5432 -U topems -Fc -f /tmp/topems_full.dump topems

# 传输备份文件
scp /tmp/topems_full.dump user@newserver:/tmp/
```

#### 2. 目标服务器操作

```bash
# 安装 PostgreSQL
apt-get install postgresql-14

# 创建数据库和用户
psql -h localhost -U postgres -c "CREATE USER topems WITH PASSWORD 'new_password';"
psql -h localhost -U postgres -c "CREATE DATABASE topems OWNER topems;"

# 恢复数据
pg_restore -h localhost -U postgres -d topems /tmp/topems_full.dump

# 更新应用配置
# 修改 .env 文件中的 DATABASE_URL
```

### 分库分表迁移

对于大规模数据，需要考虑分库分表策略：

```sql
-- 示例：将历史数据归档到独立表
CREATE TABLE events_archive PARTITION OF events
    FOR VALUES FROM ('2020-01-01') TO ('2023-01-01');
```

---

## 性能维护

### 定期维护任务

```bash
# 重建索引（推荐每月执行）
psql -h localhost -U topems -d topems -c "REINDEX DATABASE topems;"

# 更新统计信息
psql -h localhost -U topems -d topems -c "ANALYZE;"

# 清理死亡元组
psql -h localhost -U topems -d topems -c "VACUUM (VERBOSE, ANALYZE);"
```

### 维护脚本

```bash
#!/bin/bash
# maintenance.sh - 数据库维护脚本

DATABASE_URL="postgresql://topems:password@localhost:5432/topems"

echo "=== PostgreSQL 维护开始 ==="
date

# 更新统计信息
echo "执行 ANALYZE..."
psql "$DATABASE_URL" -c "ANALYZE;"

# 清理死亡元组
echo "执行 VACUUM..."
psql "$DATABASE_URL" -c "VACUUM (VERBOSE, ANALYZE);"

# 重建膨胀索引
echo "检查索引膨胀..."
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
"

# 检查长事务
echo "检查长事务..."
psql "$DATABASE_URL" -c "
SELECT pid, usename, pg_blocking_pids(pid) AS blocked_by,
       query, state, wait_event_type, wait_event, query_start
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0
   OR state != 'idle'
   OR query_start < now() - interval '10 minutes';
"

# 检查连接数
echo "检查连接数..."
psql "$DATABASE_URL" -c "
SELECT
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    max_connections
FROM pg_stat_activity, (SELECT setting::int AS max_connections FROM pg_settings WHERE name = 'max_connections') AS m;
"

echo "=== PostgreSQL 维护完成 ==="
```

### 慢查询分析

```sql
-- 查看最慢的查询
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 连接池配置

```ini
# postgresql.conf - 推荐配置
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 512MB
work_mem = 64MB
```

---

## 常见问题处理

### 连接数过多

```sql
-- 查看当前连接
SELECT count(*) FROM pg_stat_activity;

-- 终止空闲连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '30 minutes';

-- 终止所有非活跃连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state != 'active';
```

### 磁盘空间不足

```bash
# 查看数据库大小
psql -h localhost -U topems -c "SELECT pg_database_datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"

# 查看表大小
psql -h localhost -U topems -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
"

# 清理 WAL 日志
pg_archivecleanup /var/lib/postgresql/wal_archive $(pg_controldata | grep "Latest checkpoint" | awk '{print $NF}')
```

### 数据库无响应

```bash
# 检查活跃查询
psql -h localhost -U topems -c "SELECT pid, now() - query_start AS duration, state, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"

# 取消长时间运行的查询
SELECT pg_cancel_backend(pid);  -- 优雅取消
SELECT pg_terminate_backend(pid);  -- 强制终止

# 检查锁
psql -h localhost -U topems -c "
SELECT
    l.locktype,
    l.relation::regclass,
    l.mode,
    l.granted,
    l.pid,
    a.usename,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
"
```

### 复制延迟（主从部署）

```sql
-- 检查复制状态
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    (sent_lsn - replay_lsn) AS replication_lag
FROM pg_stat_replication;
```

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [监控告警运维指南](./monitoring-alerting.md)
- [故障排查指南](./troubleshooting.md)
