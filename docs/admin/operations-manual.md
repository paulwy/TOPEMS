# TOPEMS 运维手册

> **环境边界（2026-11-13 实测）**：本文命令按 **Linux + systemd** 模板编写，**不是当前本机生产**。当前 xingzhai 生产机为 **macOS launchd**：`com.topems.server`（`/Users/xingzhai/topems/bin/topems-server`，`:8099`）+ `com.topems.nginx`（80/443 直接 `proxy_pass http://127.0.0.1:8099`，无 upstream 块），生产库 `topems_prod`（`ehs` 71 表）；文中 `topems` 库、`/etc/systemd`、`/var/log/nginx` 等为 Linux 模板/历史示例。当前生产操作以 `docs/deploy/macos-production-ops.md` 为准。

## 概述

本文档是 TOPEMS 系统的运维手册，包含日常运维操作、服务管理、监控告警、故障排查、备份恢复、性能优化等内容，供运维人员参考使用。

## 1. 系统架构概览

### 1.1 组件清单

| 组件 | 名称 | 默认端口 | 说明 |
|------|------|---------|------|
| 后端服务 | topems-backend | 8013 | 主后端服务 |
| 前端服务 | topems-web | 3000/80 | Web 前端服务 |
| 数据库 | MySQL/PostgreSQL | 3306/5432 | 关系型数据库 |
| 缓存 | Redis | 6379 | 缓存和会话存储 |
| 消息队列 | RabbitMQ | 5672 | 异步消息处理（可选） |
| 监控 | Prometheus | 9090 | 指标采集和存储 |
| 可视化 | Grafana | 3001 | 监控仪表盘 |
| 日志 | ELK/Loki | - | 日志收集和分析 |

### 1.2 服务依赖关系

```
用户 → Nginx → 前端服务 → 后端服务 → 数据库
                                      → Redis
                                      → AI 服务
                                      → 消息队列
```

## 2. 日常运维操作

### 2.1 服务管理

#### 2.1.1 使用 systemd 管理服务

```bash
# 查看服务状态
systemctl status topems-backend
systemctl status topems-web

# 启动服务
systemctl start topems-backend
systemctl start topems-web

# 停止服务
systemctl stop topems-backend
systemctl stop topems-web

# 重启服务
systemctl restart topems-backend
systemctl restart topems-web

# 重新加载配置
systemctl reload topems-backend

# 设置开机自启
systemctl enable topems-backend
systemctl enable topems-web

# 取消开机自启
systemctl disable topems-backend

# 查看服务日志
journalctl -u topems-backend -f
journalctl -u topems-backend --since "1 hour ago"
journalctl -u topems-backend --since "2026-08-28" --until "2026-08-29"
```

#### 2.1.2 使用脚本管理服务

```bash
# 健康检查
./scripts/dev/health-check.sh

# 服务监控（自动恢复异常服务）
./scripts/topems.sh check

# 一键启动所有服务
./scripts/topems.sh start-all

# 一键停止所有服务
./scripts/topems.sh stop-all

# 一键停止所有服务 + PostgreSQL/Redis
./scripts/topems.sh stop-all --with-db

# 一键重启所有服务
./scripts/topems.sh restart-all
```

### 2.2 配置管理

#### 2.2.1 配置文件位置

| 配置文件 | 位置 | 说明 |
|---------|------|------|
| 后端配置 | /etc/topems/backend.env | 后端环境变量配置 |
| 前端配置 | /etc/topems/frontend.env | 前端环境变量配置 |
| Nginx 配置 | /etc/nginx/conf.d/topems.conf | Nginx 反向代理配置 |
| systemd 配置 | /etc/systemd/system/topems-*.service | systemd 服务配置 |
| 日志配置 | /etc/topems/logging.yaml | 日志级别和输出配置 |

#### 2.2.2 修改配置

```bash
# 1. 编辑配置文件
vim /etc/topems/backend.env

# 2. 验证配置（重启后用统一脚本检查状态）
./scripts/topems.sh status

# 3. 重启服务使配置生效
systemctl restart topems-backend

# 4. 验证服务正常
systemctl status topems-backend
curl http://localhost:8013/health
```

### 2.3 日志管理

#### 2.3.1 日志位置

| 日志类型 | 位置 | 说明 |
|---------|------|------|
| 后端应用日志 | /var/log/topems/backend.log | 应用运行日志 |
| 后端错误日志 | /var/log/topems/backend-error.log | 错误日志 |
| 前端访问日志 | /var/log/nginx/topems-access.log | Nginx 访问日志 |
| 前端错误日志 | /var/log/nginx/topems-error.log | Nginx 错误日志 |
| systemd 日志 | journalctl -u topems-backend | systemd 收集的日志 |

#### 2.3.2 日志查看

```bash
# 实时查看后端日志
tail -f /var/log/topems/backend.log

# 查看最近 100 行日志
tail -n 100 /var/log/topems/backend.log

# 搜索错误日志
grep "ERROR" /var/log/topems/backend.log | tail -50

# 搜索特定时间段的日志
grep "2026-08-28 10:" /var/log/topems/backend.log

# 使用 journalctl 查看
journalctl -u topems-backend -f --no-pager
journalctl -u topems-backend --since "1 hour ago" --no-pager
```

#### 2.3.3 日志轮转

日志轮转由 logrotate 管理，配置文件：`/etc/logrotate.d/topems`

```bash
# 手动触发日志轮转
logrotate -f /etc/logrotate.d/topems

# 查看日志轮转配置
cat /etc/logrotate.d/topems
```

## 3. 监控告警

### 3.1 监控指标

#### 3.1.1 系统指标

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|---------|---------|
| CPU 使用率 | 服务器 CPU 使用率 | < 70% | > 85% |
| 内存使用率 | 服务器内存使用率 | < 75% | > 90% |
| 磁盘使用率 | 磁盘空间使用率 | < 70% | > 85% |
| 网络入流量 | 网络入站流量 | - | > 带宽 80% |
| 网络出流量 | 网络出站流量 | - | > 带宽 80% |

#### 3.1.2 应用指标

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|---------|---------|
| 请求响应时间 | API 响应时间 p95 | < 2000ms | > 3000ms |
| 请求吞吐量 | 每秒请求数 | > 100 RPS | < 50 RPS |
| 错误率 | 请求失败率 | < 1% | > 5% |
| 活跃连接数 | 活跃用户连接数 | - | > 最大连接 80% |
| AI 响应时间 | AI 服务响应时间 | < 3000ms | > 5000ms |
| 缓存命中率 | Redis 缓存命中率 | > 80% | < 50% |

#### 3.1.3 数据库指标

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|---------|---------|
| 连接数 | 活跃数据库连接数 | < 80% 最大连接 | > 90% 最大连接 |
| 慢查询数 | 每秒慢查询数 | < 5 | > 20 |
| 查询响应时间 | 平均查询响应时间 | < 100ms | > 500ms |
| 锁等待时间 | 平均锁等待时间 | < 50ms | > 200ms |
| 主从延迟 | 主从复制延迟 | < 1s | > 10s |

### 3.2 告警规则

告警规则配置文件：`deploy/docker/prometheus/rules/`

- `topems-alerts.yml` - 系统和应用告警规则
- `ai-alerts.yml` - AI 服务专用告警规则

### 3.3 告警通知

支持的通知渠道：
- **飞书 Webhook** - 发送到飞书群
- **邮件** - 发送到管理员邮箱
- **短信** - 发送到管理员手机（可选）

配置文件：`/etc/topems/alerts.yml`

### 3.4 监控仪表盘

Grafana 仪表盘：
- 访问地址：`http://<server>:3001`
- 默认用户名：admin
- 仪表盘列表：
  1. TOPEMS 系统概览
  2. TOPEMS 应用性能
  3. TOPEMS AI 服务监控
  4. TOPEMS 数据库监控
  5. TOPEMS 业务指标

## 4. 故障排查

### 4.1 常见故障及处理

#### 4.1.1 服务无法启动

**症状：** systemctl start 后服务立即退出

**排查步骤：**
```bash
# 1. 查看服务状态
systemctl status topems-backend

# 2. 查看详细日志
journalctl -u topems-backend -n 100 --no-pager

# 3. 查看应用日志
tail -100 /var/log/topems/backend.log

# 4. 检查配置文件
cat /etc/topems/backend.env

# 5. 检查端口是否被占用
netstat -tlnp | grep 8013

# 6. 检查依赖服务是否正常
systemctl status mysql
systemctl status redis
```

**常见原因：**
- 配置文件错误
- 端口被占用
- 依赖服务未启动
- 权限不足
- 磁盘空间不足

#### 4.1.2 服务响应慢

**症状：** API 响应时间明显增加

**排查步骤：**
```bash
# 1. 检查系统资源
top
htop
free -h
df -h

# 2. 检查应用性能
curl -w "响应时间: %{time_total}s\n" http://localhost:8013/health

# 3. 查看慢查询
grep "slow" /var/log/topems/backend.log

# 4. 检查数据库性能
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW STATUS LIKE 'Slow_queries';"

# 5. 检查缓存命中率
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# 6. 检查 AI 服务响应时间
grep "ai_response_time" /var/log/topems/backend.log | tail -20
```

**常见原因：**
- 数据库慢查询
- 缓存命中率低
- AI 服务响应慢
- 系统资源不足
- 网络延迟

#### 4.1.3 服务频繁重启

**症状：** 服务每隔一段时间自动重启

**排查步骤：**
```bash
# 1. 查看重启历史
journalctl -u topems-backend | grep "Started\|Stopped"

# 2. 查看 OOM 日志
dmesg | grep -i "oom\|killed"

# 3. 检查内存使用
free -h
ps aux --sort=-%mem | head -10

# 4. 检查是否有内存泄漏
# 观察内存使用是否持续增长

# 5. 检查 systemd 配置
cat /etc/systemd/system/topems-backend.service
```

**常见原因：**
- 内存溢出（OOM）
- 内存泄漏
- 健康检查失败触发重启
- 未捕获的异常导致崩溃

#### 4.1.4 数据库连接失败

**症状：** 应用日志中出现数据库连接错误

**排查步骤：**
```bash
# 1. 检查数据库服务状态
systemctl status mysql

# 2. 测试数据库连接
mysql -h <host> -u <user> -p -e "SELECT 1;"

# 3. 检查连接数
mysql -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -e "SHOW VARIABLES LIKE 'max_connections';"

# 4. 检查慢查询
mysql -e "SHOW STATUS LIKE 'Slow_queries';"

# 5. 检查数据库日志
tail -100 /var/log/mysql/error.log
```

**常见原因：**
- 数据库服务未启动
- 连接数达到上限
- 网络不通
- 认证信息错误
- 数据库锁等待

#### 4.1.5 Redis 连接失败

**症状：** 应用日志中出现 Redis 连接错误

**排查步骤：**
```bash
# 1. 检查 Redis 服务状态
systemctl status redis

# 2. 测试 Redis 连接
redis-cli -h <host> -p <port> ping

# 3. 检查 Redis 内存使用
redis-cli INFO memory | grep used_memory_human

# 4. 检查 Redis 连接数
redis-cli INFO clients | grep connected_clients

# 5. 检查 Redis 日志
tail -100 /var/log/redis/redis-server.log
```

**常见原因：**
- Redis 服务未启动
- 内存不足
- 连接数达到上限
- 网络不通
- 认证信息错误

### 4.2 应急处理流程

#### 4.2.1 服务完全不可用

1. **立即通知**：通知相关人员和用户
2. **快速恢复**：尝试重启服务
   ```bash
   systemctl restart topems-backend
   ```
3. **检查依赖**：确认数据库、Redis 等依赖服务正常
4. **查看日志**：定位故障原因
5. **回滚版本**：如为新版本问题，回滚到上一版本
6. **恢复验证**：确认服务恢复正常
7. **事后分析**：编写故障报告，制定改进措施

#### 4.2.2 性能严重下降

1. **识别瓶颈**：使用监控工具定位性能瓶颈
2. **临时缓解**：
   - 增加服务器资源
   - 开启缓存
   - 限流降级
3. **根因分析**：定位性能问题根因
4. **优化修复**：实施性能优化
5. **验证效果**：确认性能恢复正常

#### 4.2.3 数据错误

1. **停止写入**：暂停相关写入操作
2. **评估影响**：确定受影响的数据范围
3. **备份当前**：备份当前数据库状态
4. **恢复数据**：从备份恢复或修复数据
5. **验证数据**：确认数据正确性
6. **恢复服务**：逐步恢复写入操作
7. **事后分析**：分析数据错误原因，制定预防措施

## 5. 备份恢复

### 5.1 备份策略

| 备份类型 | 频率 | 保留时间 | 说明 |
|---------|------|---------|------|
| 全量备份 | 每天凌晨 2:00 | 30 天 | 完整数据库备份 |
| 增量备份 | 每小时 | 7 天 | 增量数据备份 |
| 配置备份 | 每次修改后 | 永久 | 配置文件备份 |
| 日志备份 | 每天 | 90 天 | 应用日志备份 |

### 5.2 数据库备份

```bash
# 手动全量备份
mysqldump -u root -p --all-databases > /backup/topems_$(date +%Y%m%d).sql

# 备份指定数据库
mysqldump -u root -p topems > /backup/topems_$(date +%Y%m%d).sql

# 压缩备份
mysqldump -u root -p topems | gzip > /backup/topems_$(date +%Y%m%d).sql.gz

# 使用脚本备份
./scripts/backup/backup-database.sh
```

### 5.3 数据库恢复

```bash
# 从备份恢复
mysql -u root -p topems < /backup/topems_20260828.sql

# 从压缩备份恢复
gunzip < /backup/topems_20260828.sql.gz | mysql -u root -p topems

# 使用脚本恢复
./scripts/backup/restore-database.sh /backup/topems_20260828.sql
```

### 5.4 配置文件备份

```bash
# 备份所有配置文件
tar -czf /backup/config_$(date +%Y%m%d).tar.gz /etc/topems/ /etc/nginx/conf.d/topems.conf /etc/systemd/system/topems-*.service

# 恢复配置文件
tar -xzf /backup/config_20260828.tar.gz -C /
```

### 5.5 备份验证

```bash
# 验证备份文件完整性
md5sum /backup/topems_20260828.sql

# 验证备份可恢复（在测试环境）
mysql -u root -p test_topems < /backup/topems_20260828.sql
mysql -u root -p -e "SELECT COUNT(*) FROM test_topems.users;"
```

## 6. 性能优化

### 6.1 应用优化

- **数据库优化**：添加索引、优化查询、使用连接池
- **缓存优化**：增加缓存层、优化缓存策略、提高缓存命中率
- **异步处理**：将耗时操作改为异步处理
- **代码优化**：优化算法、减少不必要的计算和 IO

### 6.2 数据库优化

```sql
-- 查看慢查询
SHOW STATUS LIKE 'Slow_queries';

-- 查看当前连接
SHOW PROCESSLIST;

-- 分析查询执行计划
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- 添加索引
CREATE INDEX idx_users_email ON users(email);

-- 优化表
OPTIMIZE TABLE users;
```

### 6.3 缓存优化

```bash
# 查看缓存命中率
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# 查看内存使用
redis-cli INFO memory | grep used_memory_human

# 清理过期键
redis-cli --scan --pattern "*" | xargs redis-cli del
```

### 6.4 系统优化

```bash
# 查看系统资源
top
htop
vmstat 1
iostat -x 1

# 查看网络连接
netstat -an | grep ESTABLISHED | wc -l
ss -s

# 调整文件描述符限制
ulimit -n 65535
```

## 7. 安全管理

### 7.1 定期安全检查

- 每周检查系统更新和安全补丁
- 每月检查用户权限和访问日志
- 每季度进行安全扫描和渗透测试
- 定期更新 SSL 证书

### 7.2 访问控制

- 使用强密码策略
- 启用多因素认证（MFA）
- 定期审查用户权限
- 及时禁用离职人员账号

### 7.3 日志审计

- 定期审查访问日志
- 监控异常登录行为
- 保留审计日志至少 90 天

## 8. 常用运维脚本

| 脚本/命令 | 位置 | 说明 |
|------|------|------|
| 健康检查 | scripts/dev/health-check.sh | 检查所有服务健康状态 |
| 服务监控 | ./scripts/topems.sh check | 监控服务状态并自动恢复异常服务 |
| 数据库备份 | ./scripts/topems.sh db backup | 数据库全量备份 |
| 配置备份 | 手工 cp .env /etc/topems/backend.env（无专用脚本） | 配置文件备份 |
| 日志清理 | ./scripts/topems.sh clean --logs | 清理过期日志（logs/*.log） |
| 性能分析 | 系统 top / htop（无专用脚本） | 系统性能分析 |

## 9. 联系方式

| 角色 | 姓名 | 电话 | 邮箱 |
|------|------|------|------|
| 运维负责人 | | | |
| 开发负责人 | | | |
| 数据库管理员 | | | |
| 安全负责人 | | | |

## 10. 附录

### 10.1 常用命令速查

```bash
# 服务管理
systemctl start|stop|restart|status topems-backend

# 日志查看
journalctl -u topems-backend -f
tail -f /var/log/topems/backend.log

# 数据库
mysql -u root -p -e "SHOW PROCESSLIST;"

# Redis
redis-cli ping
redis-cli INFO

# 系统监控
top
free -h
df -h
netstat -tlnp
```

### 10.2 相关文档

- [部署指南（`../deployment/deployment-guide.md` 已不可达）
- [服务稳定性最佳实践](./service-stability-best-practices.md)
- [性能测试最佳实践](../performance/performance-testing-best-practices.md)
- [AI 服务告警 Runbook](ai-alerts-runbook.md)
- [项目验收清单](../project/project-acceptance-checklist.md)
- [上线检查清单](../project/go-live-checklist.md)

---

*本文档由 TOPEMS 团队维护，最后更新：2026-08-28*
