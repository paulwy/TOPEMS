# TOPEMS PostgreSQL 生产环境配置调优检查清单

**日期**：2026-09-11
**版本**：v1.0
**适用环境**：生产环境（PostgreSQL 16+，16GB 内存，SSD）

---

## 一、实施前检查清单

### 1.1 环境确认

- [ ] 确认 PostgreSQL 版本（建议 16+）
  ```bash
  psql --version
  ```
- [ ] 确认服务器内存（建议 16GB+）
  ```bash
  free -h
  ```
- [ ] 确认存储类型（建议 SSD）
  ```bash
  lsblk -d -o name,rota
  # rota=0 表示 SSD
  ```
- [ ] 确认操作系统（Linux Ubuntu 22.04 / CentOS 8+）
- [ ] 确认有 root 或 postgres 用户权限

### 1.2 备份准备

- [ ] 确认备份目录存在且有足够空间
  ```bash
  df -h /var/backups
  ```
- [ ] 确认可以创建配置文件备份
- [ ] 确认可以创建数据库备份（可选但推荐）
  ```bash
  pg_dump -U postgres topems > /var/backups/topems-$(date +%Y%m%d).sql
  ```

### 1.3 业务准备

- [ ] 确认当前为业务低峰期
- [ ] 通知相关团队配置变更计划
- [ ] 确认应用可以接受短暂的数据库重启（约 10-30 秒）
- [ ] 准备好回滚方案
- [ ] 确认监控系统正常运行，可以观察配置变更后的性能变化

### 1.4 配置文件确认

- [ ] 确认 PostgreSQL 配置文件路径
  ```bash
  psql -U postgres -c "SHOW config_file;"
  ```
- [ ] 确认当前配置参数
  ```bash
  psql -U postgres -c "
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

---

## 二、实施步骤

### 2.1 自动实施（推荐）

使用提供的自动化脚本：

```bash
# 1. 下载脚本到生产服务器
scp scripts/postgresql-production-config-tuning.sh user@server:/tmp/

# 2. 登录生产服务器
ssh user@server

# 3. 修改脚本中的配置变量（根据实际环境）
vi /tmp/postgresql-production-config-tuning.sh
# 修改 PG_CONF、PG_DATA、PG_SERVICE 等变量

# 4. 添加执行权限
chmod +x /tmp/postgresql-production-config-tuning.sh

# 5. 执行配置调优
sudo /tmp/postgresql-production-config-tuning.sh --apply
```

脚本会自动执行：
1. 前置检查
2. 配置备份
3. 配置应用
4. 配置语法验证
5. PostgreSQL 重启
6. 配置生效验证

### 2.2 手动实施

如无法使用自动化脚本，可按以下步骤手动实施：

#### 步骤 1：备份当前配置

```bash
# 备份配置文件
sudo cp /etc/postgresql/16/main/postgresql.conf \
  /etc/postgresql/16/main/postgresql.conf.backup-$(date +%Y%m%d-%H%M%S)

# 保存当前配置参数
sudo -u postgres psql -c "
  SELECT name, setting, unit FROM pg_settings
  WHERE name IN (...);
" > /var/backups/current-params-$(date +%Y%m%d).txt
```

#### 步骤 2：修改配置文件

编辑 `/etc/postgresql/16/main/postgresql.conf`，修改以下参数：

```ini
# 内存配置
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB

# 检查点配置
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB

# 查询优化配置（SSD）
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 200

# 连接配置
max_connections = 200

# 日志配置
logging_collector = on
log_min_duration_statement = 1000

# 扩展配置
shared_preload_libraries = 'pg_stat_statements'
```

#### 步骤 3：验证配置语法

```bash
sudo -u postgres postgres -C /var/lib/postgresql/16/main -t
```

#### 步骤 4：重启 PostgreSQL

```bash
sudo systemctl restart postgresql

# 等待启动
sudo systemctl status postgresql
pg_isready -U postgres
```

#### 步骤 5：创建 pg_stat_statements 扩展

```bash
sudo -u postgres psql -d topems -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

#### 步骤 6：验证配置生效

```bash
sudo -u postgres psql -c "
  SELECT name, setting, unit FROM pg_settings
  WHERE name IN (...);
"
```

---

## 三、实施后验证清单

### 3.1 基础验证

- [ ] PostgreSQL 服务运行正常
  ```bash
  sudo systemctl status postgresql
  pg_isready -U postgres
  ```
- [ ] 数据库连接正常
  ```bash
  psql -U postgres -d topems -c "SELECT 1;"
  ```
- [ ] 应用可以正常连接数据库
- [ ] 应用日志无数据库连接错误

### 3.2 配置验证

- [ ] shared_buffers = 4GB
- [ ] effective_cache_size = 12GB
- [ ] work_mem = 16MB
- [ ] maintenance_work_mem = 512MB
- [ ] max_wal_size = 4GB
- [ ] min_wal_size = 1GB
- [ ] checkpoint_timeout = 15min
- [ ] random_page_cost = 1.1
- [ ] effective_io_concurrency = 200
- [ ] default_statistics_target = 200
- [ ] max_connections = 200
- [ ] shared_preload_libraries = pg_stat_statements
- [ ] log_min_duration_statement = 1000
- [ ] logging_collector = on

验证命令：
```bash
sudo -u postgres psql -c "
  SELECT name, setting, unit FROM pg_settings
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

### 3.3 功能验证

- [ ] pg_stat_statements 扩展已创建
  ```bash
  sudo -u postgres psql -d topems -c "
    SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements';
  "
  ```
- [ ] pg_stat_statements 可以正常查询
  ```bash
  sudo -u postgres psql -d topems -c "
    SELECT count(*) as queries, sum(calls) as calls
    FROM pg_stat_statements;
  "
  ```
- [ ] 慢查询日志正常记录
  ```bash
  tail -f /var/log/postgresql/postgresql-*.log | grep -i "duration"
  ```

### 3.4 性能验证

- [ ] 数据库响应时间正常（无明显变慢）
- [ ] 应用接口响应时间正常
- [ ] 数据库 CPU 使用率正常
- [ ] 数据库内存使用率正常
- [ ] 数据库 I/O 正常
- [ ] 无新增的慢查询（除预期外）

### 3.5 业务验证

- [ ] 核心业务流程正常（订单、库存、客户等）
- [ ] 报表查询正常
- [ ] 数据导入导出正常
- [ ] 定时任务正常执行
- [ ] 无用户反馈数据库相关问题

---

## 四、回滚方案

### 4.1 自动回滚

如使用自动化脚本，可直接回滚：

```bash
sudo /tmp/postgresql-production-config-tuning.sh --rollback
```

### 4.2 手动回滚

如手动实施，按以下步骤回滚：

```bash
# 1. 恢复配置文件
sudo cp /etc/postgresql/16/main/postgresql.conf.backup-YYYYMMDD-HHMMSS \
  /etc/postgresql/16/main/postgresql.conf

# 2. 重启 PostgreSQL
sudo systemctl restart postgresql

# 3. 验证回滚成功
sudo -u postgres psql -c "SHOW shared_buffers;"
# 应显示原值（如 128MB）
```

### 4.3 回滚触发条件

出现以下情况时应考虑回滚：
- PostgreSQL 无法启动
- 应用无法连接数据库
- 数据库响应时间明显变慢（超过 50%）
- 出现大量新的慢查询
- 内存使用率过高（超过 90%）
- 业务功能异常

---

## 五、注意事项

### 5.1 硬件配置差异

本配置基于 **16GB 内存 + SSD**，如硬件配置不同，请调整参数：

| 内存 | shared_buffers | effective_cache_size | work_mem |
|------|---------------|---------------------|----------|
| 8GB | 2GB | 6GB | 8MB |
| 16GB | 4GB | 12GB | 16MB |
| 32GB | 8GB | 24GB | 32MB |
| 64GB | 16GB | 48GB | 64MB |

如使用 HDD（机械硬盘），请勿修改 `random_page_cost`（保持默认 4.0）。

### 5.2 连接数配置

- `max_connections = 200` 是配合 PgBouncer 使用的配置
- 如未使用 PgBouncer，可根据实际需求调整（建议不超过 500）
- 大量连接会消耗内存，每个连接约需 10MB 内存

### 5.3 重启影响

- 配置变更需要重启 PostgreSQL 才能生效
- 重启期间数据库不可用（约 10-30 秒）
- 建议在业务低峰期执行
- 如应用有重试机制，可减少重启影响

### 5.4 监控建议

配置变更后应密切监控：
- 数据库响应时间
- 慢查询数量
- 内存使用率
- CPU 使用率
- I/O 等待时间
- 连接数

建议观察 24-48 小时，确认无异常后再视为稳定。

### 5.5 性能基准测试

建议在配置变更前后运行性能基准测试，量化性能提升：

```bash
# 使用 pgbench 进行基准测试
pgbench -i -s 10 topems  # 初始化测试数据
pgbench -c 10 -j 2 -T 60 topems  # 运行测试
```

对比测试结果，评估配置调优效果。

---

## 六、相关文档

- 生产环境配置实施指南：`docs/assessments/production-environment-setup-guide-2026-09-11.md`
- PostgreSQL 配置调优建议：`docs/assessments/postgresql-production-config-tuning-2026-09-11.md`
- 数据库性能优化报告：`docs/assessments/database-performance-optimization-report-2026-09-11.md`
- 自动化配置脚本：`scripts/postgresql-production-config-tuning.sh`

---

**文档生成时间**：2026-09-11
**适用版本**：TOPEMS v1.0
**PostgreSQL 版本**：16+
**硬件配置**：16GB 内存 + SSD
