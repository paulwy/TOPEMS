# TOPEMS PostgreSQL 生产环境配置调优部署操作手册

**日期**：2026-09-11
**版本**：v1.0
**适用环境**：生产环境（Linux，PostgreSQL 16+，16GB 内存，SSD）
**执行人员**：DBA / 运维工程师
**预计耗时**：30-60 分钟（含验证）

---

## 一、部署概述

### 1.1 部署目标

在生产环境应用 PostgreSQL 配置调优，提升数据库性能：
- 内存配置优化（shared_buffers、effective_cache_size、work_mem）
- 检查点配置优化（减少检查点频率，降低写入开销）
- 查询优化配置（SSD 优化，提高查询计划准确性）
- 连接配置优化（配合 PgBouncer 使用）
- 日志配置优化（慢查询日志，性能监控）
- 扩展配置（pg_stat_statements，慢查询分析）

### 1.2 配置参数清单

| 类别 | 参数 | 原值（默认） | 目标值 | 说明 |
|------|------|-------------|--------|------|
| 内存 | shared_buffers | 128MB | 4GB | 数据库专用内存（25%） |
| 内存 | effective_cache_size | 4GB | 12GB | 优化器估算可用缓存（75%） |
| 内存 | work_mem | 4MB | 16MB | 排序/哈希操作内存 |
| 内存 | maintenance_work_mem | 64MB | 512MB | VACUUM/CREATE INDEX 内存 |
| 检查点 | checkpoint_timeout | 5min | 15min | 减少检查点频率 |
| 检查点 | max_wal_size | 1GB | 4GB | 最大 WAL 大小 |
| 检查点 | min_wal_size | 80MB | 1GB | 最小 WAL 大小 |
| 查询优化 | random_page_cost | 4.0 | 1.1 | SSD 随机读取成本 |
| 查询优化 | effective_io_concurrency | 16 | 200 | SSD IO 并发度 |
| 查询优化 | default_statistics_target | 100 | 200 | 统计信息采样精度 |
| 连接 | max_connections | 100 | 200 | 配合 PgBouncer 使用 |
| 日志 | logging_collector | off | on | 启用日志收集器 |
| 日志 | log_min_duration_statement | -1 | 1000 | 慢查询日志阈值（1秒） |
| 扩展 | shared_preload_libraries | '' | 'pg_stat_statements' | 预加载扩展 |

### 1.3 部署影响

- **重启需求**：是（部分参数需要重启才能生效）
- **停机时间**：约 10-30 秒（PostgreSQL 重启时间）
- **业务影响**：重启期间数据库不可用，应用会出现短暂连接失败
- **回滚能力**：支持一键回滚（自动备份配置文件）

---

## 二、部署前准备

### 2.1 环境确认

#### 2.1.1 确认服务器配置

```bash
# 确认操作系统
cat /etc/os-release

# 确认 CPU 核心数
nproc

# 确认内存大小
free -h

# 确认磁盘类型（SSD 或 HDD）
lsblk -d -o name,rota
# rota=0 表示 SSD，rota=1 表示 HDD

# 确认磁盘空间
df -h
```

**要求**：
- 操作系统：Linux（Ubuntu 22.04 / CentOS 8+）
- CPU：4 核或以上
- 内存：16GB 或以上
- 存储：SSD（如为 HDD，请勿修改 random_page_cost）
- 磁盘空间：至少 10GB 可用空间（用于备份和日志）

#### 2.1.2 确认 PostgreSQL 配置

```bash
# 确认 PostgreSQL 版本
psql --version
# 要求：PostgreSQL 16 或以上

# 确认配置文件路径
psql -U postgres -c "SHOW config_file;"

# 确认数据目录
psql -U postgres -c "SHOW data_directory;"

# 确认当前运行状态
systemctl status postgresql
pg_isready -U postgres
```

#### 2.1.3 确认当前配置参数

```bash
psql -U postgres -c "
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN (
  'shared_buffers', 'effective_cache_size', 'work_mem',
  'maintenance_work_mem', 'max_wal_size', 'min_wal_size',
  'checkpoint_timeout', 'random_page_cost', 'effective_io_concurrency',
  'default_statistics_target', 'max_connections',
  'shared_preload_libraries', 'log_min_duration_statement',
  'logging_collector'
)
ORDER BY name;
"
```

保存当前配置参数，用于部署后对比。

### 2.2 备份准备

#### 2.2.1 创建备份目录

```bash
# 创建备份目录
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql
sudo chmod 750 /var/backups/postgresql

# 确认备份目录空间
df -h /var/backups
```

#### 2.2.2 备份配置文件

```bash
# 备份配置文件
sudo cp /etc/postgresql/16/main/postgresql.conf \
  /var/backups/postgresql/postgresql.conf.backup-$(date +%Y%m%d-%H%M%S)

# 备份 pg_hba.conf（可选）
sudo cp /etc/postgresql/16/main/pg_hba.conf \
  /var/backups/postgresql/pg_hba.conf.backup-$(date +%Y%m%d-%H%M%S)

# 确认备份文件
ls -la /var/backups/postgresql/
```

#### 2.2.3 备份数据库（推荐）

```bash
# 备份 topems 数据库（根据数据库大小，可能需要较长时间）
sudo -u postgres pg_dump -Fc topems > \
  /var/backups/postgresql/topems-$(date +%Y%m%d-%H%M%S).dump

# 确认备份文件大小
ls -lh /var/backups/postgresql/topems-*.dump
```

### 2.3 业务准备

#### 2.3.1 确认业务低峰期

```bash
# 查看当前数据库连接数和活跃连接
psql -U postgres -c "
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
"

# 查看当前数据库 QPS（每秒查询数）
psql -U postgres -c "
SELECT 
  sum(xact_commit + xact_rollback) as total_transactions,
  now() - pg_postmaster_start_time() as uptime
FROM pg_stat_database 
WHERE datname = 'topems';
"
```

建议在业务低峰期执行部署（如凌晨 2:00-4:00）。

#### 2.3.2 通知相关团队

- 通知开发团队：数据库将在指定时间重启，约 10-30 秒不可用
- 通知运维团队：准备好监控和回滚方案
- 通知业务团队：可能出现短暂的服务不可用

#### 2.3.3 准备回滚方案

确认回滚脚本可用：
```bash
# 确认回滚脚本存在
ls -la /tmp/postgresql-production-config-tuning.sh

# 确认备份文件存在
ls -la /var/backups/postgresql/postgresql.conf.backup-*

# 测试回滚命令（不实际执行）
echo "回滚命令: sudo /tmp/postgresql-production-config-tuning.sh --rollback"
```

### 2.4 监控准备

#### 2.4.1 确认监控系统正常

```bash
# 确认 Prometheus 正常运行（如有）
systemctl status prometheus

# 确认 Grafana 正常运行（如有）
systemctl status grafana-server

# 确认数据库监控指标正常
curl -s http://localhost:9187/metrics | head -20
```

#### 2.4.2 记录部署前基线指标

```bash
# 记录部署前数据库性能指标
psql -U postgres -c "
SELECT 
  'connections' as metric, count(*)::text as value
FROM pg_stat_activity
UNION ALL
SELECT 
  'database_size', pg_size_pretty(pg_database_size('topems'))
UNION ALL
SELECT 
  'uptime', (now() - pg_postmaster_start_time())::text;
"

# 记录部署前系统资源使用
top -bn1 | head -10
free -h
iostat -x 1 2
```

---

## 三、部署步骤

### 3.1 方式一：自动部署（推荐）

#### 步骤 1：上传部署脚本到生产服务器

```bash
# 从本地上传脚本到生产服务器
scp scripts/postgresql-production-config-tuning.sh user@production-server:/tmp/

# 登录生产服务器
ssh user@production-server
```

#### 步骤 2：修改脚本配置变量

```bash
# 编辑脚本，根据实际环境修改变量
vi /tmp/postgresql-production-config-tuning.sh

# 需要修改的变量：
# PG_CONF="/etc/postgresql/16/main/postgresql.conf"  # 配置文件路径
# PG_DATA="/var/lib/postgresql/16/main"               # 数据目录
# PG_SERVICE="postgresql"                              # systemd 服务名
# BACKUP_DIR="/var/backups/postgresql"                # 备份目录
# LOG_FILE="/var/log/postgresql-config-tuning.log"    # 日志文件
```

#### 步骤 3：添加执行权限

```bash
chmod +x /tmp/postgresql-production-config-tuning.sh
```

#### 步骤 4：执行配置调优

```bash
# 执行配置调优（需要 root 或 postgres 权限）
sudo /tmp/postgresql-production-config-tuning.sh --apply
```

脚本会自动执行以下步骤：
1. 前置检查（环境、权限、配置文件）
2. 配置备份（配置文件 + 当前参数）
3. 配置应用（修改 14 项参数）
4. 配置语法验证
5. PostgreSQL 重启
6. 配置生效验证

#### 步骤 5：确认部署成功

脚本执行完成后，确认输出显示所有配置验证通过。

### 3.2 方式二：手动部署

如无法使用自动化脚本，可按以下步骤手动部署。

#### 步骤 1：备份当前配置

```bash
# 备份配置文件
sudo cp /etc/postgresql/16/main/postgresql.conf \
  /var/backups/postgresql/postgresql.conf.backup-$(date +%Y%m%d-%H%M%S)

# 保存当前配置参数
sudo -u postgres psql -c "
SELECT name, setting, unit FROM pg_settings
WHERE name IN (...);
" > /var/backups/postgresql/current-params-$(date +%Y%m%d).txt
```

#### 步骤 2：修改配置文件

编辑 `/etc/postgresql/16/main/postgresql.conf`，修改以下参数：

```ini
# ==================== 内存配置 ====================
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB

# ==================== 检查点配置 ====================
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB

# ==================== 查询优化配置（SSD） ====================
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 200

# ==================== 连接配置 ====================
max_connections = 200

# ==================== 日志配置 ====================
logging_collector = on
log_min_duration_statement = 1000

# ==================== 扩展配置 ====================
shared_preload_libraries = 'pg_stat_statements'
```

**注意**：
- 如参数已存在，修改其值
- 如参数被注释（以 # 开头），取消注释并修改值
- 如参数不存在，在文件末尾添加

#### 步骤 3：验证配置语法

```bash
# 验证配置文件语法
sudo -u postgres postgres -C /var/lib/postgresql/16/main -t

# 如无错误输出，说明语法正确
# 如有错误，根据错误信息修正
```

#### 步骤 4：重启 PostgreSQL

```bash
# 重启 PostgreSQL
sudo systemctl restart postgresql

# 等待启动（最多 30 秒）
for i in {1..30}; do
  if pg_isready -U postgres -q; then
    echo "PostgreSQL 启动成功（等待 ${i}s）"
    break
  fi
  sleep 1
done

# 确认服务状态
sudo systemctl status postgresql
pg_isready -U postgres
```

#### 步骤 5：创建 pg_stat_statements 扩展

```bash
# 在 topems 数据库中创建扩展
sudo -u postgres psql -d topems -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 验证扩展已创建
sudo -u postgres psql -d topems -c "
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_stat_statements';
"
```

#### 步骤 6：验证配置生效

```bash
sudo -u postgres psql -c "
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
  'shared_buffers', 'effective_cache_size', 'work_mem',
  'maintenance_work_mem', 'max_wal_size', 'min_wal_size',
  'checkpoint_timeout', 'random_page_cost', 'effective_io_concurrency',
  'default_statistics_target', 'max_connections',
  'shared_preload_libraries', 'log_min_duration_statement',
  'logging_collector'
)
ORDER BY name;
"
```

确认所有参数值与目标值一致。

---

## 四、部署后验证

### 4.1 基础验证

```bash
# 确认 PostgreSQL 服务运行正常
sudo systemctl status postgresql
pg_isready -U postgres

# 确认数据库连接正常
sudo -u postgres psql -d topems -c "SELECT 1 as connection_test;"

# 确认应用可以连接数据库（从应用服务器测试）
# telnet database-server 5432
# 或使用应用的健康检查端点
```

### 4.2 配置验证

逐一验证 14 项配置参数：

```bash
sudo -u postgres psql -c "
SELECT 
  name, 
  setting, 
  unit,
  CASE 
    WHEN name = 'shared_buffers' AND setting = '262144' THEN 'PASS'
    WHEN name = 'effective_cache_size' AND setting = '786432' THEN 'PASS'
    WHEN name = 'work_mem' AND setting = '16384' THEN 'PASS'
    WHEN name = 'maintenance_work_mem' AND setting = '524288' THEN 'PASS'
    WHEN name = 'max_wal_size' AND setting = '4096' THEN 'PASS'
    WHEN name = 'min_wal_size' AND setting = '1024' THEN 'PASS'
    WHEN name = 'checkpoint_timeout' AND setting = '900' THEN 'PASS'
    WHEN name = 'random_page_cost' AND setting = '1.1' THEN 'PASS'
    WHEN name = 'effective_io_concurrency' AND setting = '200' THEN 'PASS'
    WHEN name = 'default_statistics_target' AND setting = '200' THEN 'PASS'
    WHEN name = 'max_connections' AND setting = '200' THEN 'PASS'
    WHEN name = 'shared_preload_libraries' AND setting = 'pg_stat_statements' THEN 'PASS'
    WHEN name = 'log_min_duration_statement' AND setting = '1000' THEN 'PASS'
    WHEN name = 'logging_collector' AND setting = 'on' THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM pg_settings
WHERE name IN (
  'shared_buffers', 'effective_cache_size', 'work_mem',
  'maintenance_work_mem', 'max_wal_size', 'min_wal_size',
  'checkpoint_timeout', 'random_page_cost', 'effective_io_concurrency',
  'default_statistics_target', 'max_connections',
  'shared_preload_libraries', 'log_min_duration_statement',
  'logging_collector'
)
ORDER BY name;
"
```

**注意**：shared_buffers 和 effective_cache_size 的单位是 8KB，需要换算：
- shared_buffers = 4GB = 4 * 1024 * 1024 / 8 = 524286（约 524288）
- effective_cache_size = 12GB = 12 * 1024 * 1024 / 8 = 1572864

### 4.3 功能验证

```bash
# 验证 pg_stat_statements 扩展
sudo -u postgres psql -d topems -c "
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_stat_statements';
"

# 验证 pg_stat_statements 可以正常查询
sudo -u postgres psql -d topems -c "
SELECT 
  count(*) as queries,
  sum(calls) as calls,
  round(sum(total_exec_time)::numeric, 2) as total_time_ms
FROM pg_stat_statements;
"

# 验证慢查询日志正常记录
# 执行一个慢查询（1.5 秒）
sudo -u postgres psql -d topems -c "SELECT pg_sleep(1.5);"

# 检查慢查询日志
tail -20 /var/log/postgresql/postgresql-*.log | grep -i "duration"
```

### 4.4 性能验证

```bash
# 查看当前数据库连接数
sudo -u postgres psql -c "
SELECT 
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;
"

# 查看数据库缓存命中率
sudo -u postgres psql -c "
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2) as cache_hit_rate
FROM pg_statio_user_tables;
"

# 查看索引命中率
sudo -u postgres psql -c "
SELECT 
  sum(idx_blks_read) as idx_read,
  sum(idx_blks_hit) as idx_hit,
  round(sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)) * 100, 2) as index_hit_rate
FROM pg_statio_user_indexes;
"

# 查看系统资源使用
top -bn1 | head -10
free -h
iostat -x 1 2
```

### 4.5 业务验证

- [ ] 核心业务流程正常（订单创建、库存查询、客户管理等）
- [ ] 报表查询正常（销售报表、库存报表、财务报表等）
- [ ] 数据导入导出正常
- [ ] 定时任务正常执行（数据同步、报表生成等）
- [ ] 应用日志无数据库连接错误
- [ ] 无用户反馈数据库相关问题

---

## 五、回滚方案

### 5.1 自动回滚（推荐）

如使用自动化脚本部署，可直接回滚：

```bash
# 执行回滚
sudo /tmp/postgresql-production-config-tuning.sh --rollback
```

脚本会自动执行：
1. 恢复配置文件（使用最近一次备份）
2. 重启 PostgreSQL
3. 验证回滚成功

### 5.2 手动回滚

如手动部署，按以下步骤回滚：

```bash
# 步骤 1：恢复配置文件
sudo cp /var/backups/postgresql/postgresql.conf.backup-YYYYMMDD-HHMMSS \
  /etc/postgresql/16/main/postgresql.conf

# 步骤 2：重启 PostgreSQL
sudo systemctl restart postgresql

# 步骤 3：验证回滚成功
sudo -u postgres psql -c "SHOW shared_buffers;"
# 应显示原值（如 128MB）

sudo -u postgres psql -c "SHOW effective_cache_size;"
# 应显示原值（如 4GB）
```

### 5.3 回滚触发条件

出现以下情况时应立即回滚：

1. **PostgreSQL 无法启动**
   - 症状：`systemctl status postgresql` 显示 failed
   - 处理：立即回滚配置

2. **应用无法连接数据库**
   - 症状：应用日志大量数据库连接错误
   - 处理：检查连接配置，如无法解决则回滚

3. **数据库响应时间明显变慢**
   - 症状：接口响应时间增加超过 50%
   - 处理：检查慢查询，如无法优化则回滚

4. **出现大量新的慢查询**
   - 症状：慢查询日志数量激增
   - 处理：分析慢查询，如无法优化则回滚

5. **内存使用率过高**
   - 症状：内存使用率超过 90%，出现 swap
   - 处理：降低 shared_buffers，如无法解决则回滚

6. **业务功能异常**
   - 症状：核心业务流程无法正常执行
   - 处理：检查数据库日志，如无法解决则回滚

---

## 六、常见问题排查

### 6.1 PostgreSQL 无法启动

**症状**：`systemctl start postgresql` 失败

**排查步骤**：
```bash
# 查看 PostgreSQL 日志
sudo tail -50 /var/log/postgresql/postgresql-*.log

# 查看 systemd 日志
sudo journalctl -u postgresql -n 50

# 验证配置文件语法
sudo -u postgres postgres -C /var/lib/postgresql/16/main -t
```

**常见原因**：
- 配置文件语法错误 → 根据错误信息修正
- 共享内存不足 → 降低 shared_buffers
- 端口被占用 → 检查 5432 端口
- 数据目录权限错误 → 检查数据目录权限

### 6.2 应用无法连接数据库

**症状**：应用日志显示 "Connection refused" 或 "Connection timeout"

**排查步骤**：
```bash
# 确认 PostgreSQL 运行状态
sudo systemctl status postgresql
pg_isready -U postgres

# 确认端口监听
sudo netstat -tlnp | grep 5432
# 或
sudo ss -tlnp | grep 5432

# 测试本地连接
psql -U postgres -c "SELECT 1;"

# 测试远程连接（从应用服务器）
telnet database-server 5432
```

**常见原因**：
- PostgreSQL 未启动 → 启动 PostgreSQL
- 防火墙阻止 → 开放 5432 端口
- pg_hba.conf 配置错误 → 检查客户端认证配置
- max_connections 已满 → 增加连接数或使用 PgBouncer

### 6.3 配置参数未生效

**症状**：`SHOW parameter` 显示的值与配置文件不一致

**排查步骤**：
```bash
# 确认配置文件路径
psql -U postgres -c "SHOW config_file;"

# 确认参数在配置文件中的值
grep -n "^shared_buffers" /etc/postgresql/16/main/postgresql.conf

# 确认参数是否被其他配置覆盖
psql -U postgres -c "
SELECT name, setting, source, sourcefile, sourceline
FROM pg_settings
WHERE name = 'shared_buffers';
"

# 确认是否需要重启
psql -U postgres -c "
SELECT name, context
FROM pg_settings
WHERE name = 'shared_buffers';
"
# context=postmaster 表示需要重启
# context=user 表示可以使用 SET 命令动态修改
```

**常见原因**：
- 参数需要重启但未重启 → 重启 PostgreSQL
- 参数被其他配置文件覆盖 → 检查 sourcefile
- 参数拼写错误 → 检查配置文件
- 参数被注释 → 取消注释

### 6.4 pg_stat_statements 无法使用

**症状**：查询 pg_stat_statements 表报错 "relation does not exist"

**排查步骤**：
```bash
# 确认 shared_preload_libraries 配置
psql -U postgres -c "SHOW shared_preload_libraries;"

# 确认扩展已创建
psql -U postgres -d topems -c "
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_stat_statements';
"

# 如未创建，创建扩展
psql -U postgres -d topems -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

**常见原因**：
- shared_preload_libraries 未配置 → 配置并重启
- 扩展未在目标数据库创建 → 在目标数据库创建扩展
- PostgreSQL 未重启 → 重启 PostgreSQL

---

## 七、最佳实践

### 7.1 部署时机

- **业务低峰期**：建议在凌晨 2:00-4:00 执行
- **避免重大活动前**：不要在大促、节假日等重大活动前部署
- **预留回滚时间**：部署后至少观察 24 小时，确认无异常

### 7.2 监控观察

部署后应密切监控以下指标（至少 24-48 小时）：

- **数据库响应时间**：P50/P95/P99 响应时间
- **慢查询数量**：每分钟慢查询数量
- **内存使用率**：数据库内存使用率，避免超过 80%
- **CPU 使用率**：数据库 CPU 使用率
- **I/O 等待时间**：磁盘 I/O 等待时间
- **连接数**：活跃连接数和总连接数
- **缓存命中率**：数据缓存命中率和索引缓存命中率

### 7.3 性能基准测试

建议在部署前后运行性能基准测试，量化性能提升：

```bash
# 使用 pgbench 进行基准测试

# 初始化测试数据（如未初始化）
sudo -u postgres pgbench -i -s 10 topems

# 运行测试（10 个并发，2 个线程，持续 60 秒）
sudo -u postgres pgbench -c 10 -j 2 -T 60 topems

# 记录测试结果，对比部署前后的 TPS（每秒事务数）
```

### 7.4 配置调整

如部署后发现性能问题，可根据实际情况调整配置：

- **内存不足**：降低 shared_buffers（如从 4GB 降到 2GB）
- **连接数不足**：增加 max_connections（如从 200 增到 300）
- **慢查询过多**：降低 log_min_duration_statement（如从 1000ms 降到 500ms）
- **HDD 环境**：将 random_page_cost 改回 4.0

### 7.5 文档记录

部署完成后，应记录以下信息：

- 部署时间和执行人员
- 部署前配置参数和部署后配置参数
- 部署过程中遇到的问题和解决方案
- 部署后性能指标对比
- 回滚方案和备份文件位置

---

## 八、相关文档和资源

- 生产环境配置实施指南：`docs/assessments/production-environment-setup-guide-2026-09-11.md`
- PostgreSQL 配置调优建议：`docs/assessments/postgresql-production-config-tuning-2026-09-11.md`
- 数据库性能优化报告：`docs/assessments/database-performance-optimization-report-2026-09-11.md`
- 生产环境应用检查清单：`docs/assessments/postgresql-production-config-checklist-2026-09-11.md`
- 自动化配置脚本：`scripts/postgresql-production-config-tuning.sh`

---

**文档生成时间**：2026-09-11
**适用版本**：TOPEMS v1.0
**PostgreSQL 版本**：16+
**硬件配置**：16GB 内存 + SSD
**预计部署耗时**：30-60 分钟
**回滚耗时**：5-10 分钟
