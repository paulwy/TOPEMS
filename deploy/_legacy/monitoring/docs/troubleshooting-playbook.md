# TOPEMS 问题排查 Playbook

## 目录

1. [服务不可用](#1-服务不可用)
2. [高延迟](#2-高延迟)
3. [错误率上升](#3-错误率上升)
4. [数据库问题](#4-数据库问题)
5. [Redis 问题](#5-redis-问题)
6. [RabbitMQ 问题](#6-rabbitmq-问题)
7. [内存问题](#7-内存问题)
8. [CPU 问题](#8-cpu-问题)
9. [网络问题](#9-网络问题)
10. [日志排查](#10-日志排查)
11. [链路追踪排查](#11-链路追踪排查)

---

## 1. 服务不可用

### 症状
- `ServiceDownP0` 告警触发
- 健康检查失败
- 请求超时

### 排查步骤

#### Step 1: 检查进程状态
```bash
# 检查服务进程
systemctl status topems-<service-name>

# 或使用 docker
docker ps | grep topems-<service-name>
```

#### Step 2: 检查端口监听
```bash
netstat -tlnp | grep <port>
ss -tlnp | grep <port>
```

#### Step 3: 检查服务日志
```bash
journalctl -u topems-<service-name> --no-pager -n 100

# 或查看容器日志
docker logs topems-<service-name> --tail 100
```

#### Step 4: 检查系统资源
```bash
# CPU/内存/磁盘
top
free -h
df -h

# 文件描述符
cat /proc/<pid>/limits | grep open
```

#### Step 5: 检查网络连接
```bash
curl -I http://localhost:<port>/health
```

#### Step 6: 检查数据库连接
```bash
psql -h localhost -U topems -d topems -c "SELECT 1"
```

#### 常见原因
- 进程崩溃（OOM、panic）
- 端口占用
- 数据库连接池耗尽
- 配置错误
- 依赖服务不可用

---

## 2. 高延迟

### 症状
- P95/P99 延迟超过阈值
- `ServiceHighLatencyP1` 告警触发
- 用户反馈响应慢

### 排查步骤

#### Step 1: 查看延迟指标
```bash
# 查询 P95 延迟
promql: job:http_request_duration_seconds:p95{job="topems-<service>"}

# 查询 P99 延迟
promql: job:http_request_duration_seconds:p99{job="topems-<service>"}
```

#### Step 2: 分析慢查询
```bash
# PostgreSQL 慢查询
psql -d topems -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# 查看当前运行查询
psql -d topems -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### Step 3: 检查数据库连接池
```bash
promql: db_pool_available{job="topems-<service>"}
promql: db_pool_used{job="topems-<service>"}
```

#### Step 4: 检查外部调用延迟
```bash
promql: job:service_call_duration_seconds:p95{job="topems-<service>"}
promql: job:db_query_duration_seconds:p95{job="topems-<service>"}
```

#### Step 5: 检查系统资源
```bash
# CPU 使用率
promql: process_cpu_seconds_total{job="topems-<service>"}

# 内存使用率
promql: process_resident_memory_bytes{job="topems-<service>"}
```

#### Step 6: 使用链路追踪
在 Jaeger 中搜索高延迟请求的 Trace ID，分析各个 Span 的耗时分布

#### 常见原因
- 数据库慢查询
- 外部服务响应慢
- 锁竞争
- 内存不足（频繁 GC）
- 线程池耗尽

---

## 3. 错误率上升

### 症状
- `ServiceHighErrorRateP1` 告警触发
- 5xx 错误率超过阈值
- 用户收到错误响应

### 排查步骤

#### Step 1: 查看错误率
```bash
promql: job:http_request_error_rate:ratio5m{job="topems-<service>"}
```

#### Step 2: 按状态码分析
```bash
promql: sum by (status_code) (rate(http_requests_total{job="topems-<service>"}[5m]))
```

#### Step 3: 查看错误日志
```bash
# 使用 Loki 查询错误日志
logql: {job="topems-<service>"} |= "ERROR"

# 按时间范围过滤
logql: {job="topems-<service>"} |= "ERROR" | time > 5m
```

#### Step 4: 检查依赖服务
```bash
# 检查数据库是否正常
promql: up{job="postgresql"}

# 检查 Redis 是否正常
promql: up{job="redis"}

# 检查其他服务是否正常
promql: up{job=~"topems-.*"}
```

#### Step 5: 检查认证/权限问题
```bash
# 查看 401/403 错误
promql: sum(rate(http_requests_total{status_code=~"40[13]"}[5m]))
```

#### 常见原因
- 依赖服务故障
- 数据库连接失败
- 认证配置错误
- 代码 bug
- 资源不足

---

## 4. 数据库问题

### 症状
- `DatabasePoolCriticalP0` 告警触发
- `DatabaseSlowQueriesP1` 告警触发
- 数据库连接失败

### 排查步骤

#### Step 1: 检查数据库状态
```bash
# 检查 PostgreSQL 进程
systemctl status postgresql

# 检查连接数
psql -d topems -c "SELECT count(*) FROM pg_stat_activity;"

# 检查连接池状态
promql: db_pool_available{job="postgresql"}
promql: db_pool_used{job="postgresql"}
```

#### Step 2: 分析慢查询
```bash
# 启用 pg_stat_statements（需提前配置）
psql -d topems -c "SELECT 
  queryid, 
  query, 
  calls, 
  total_time/1000 as total_seconds,
  mean_time/1000 as mean_seconds,
  max_time/1000 as max_seconds
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;"
```

#### Step 3: 检查锁等待
```bash
psql -d topems -c "SELECT 
  pid, 
  usename, 
  waiting, 
  query, 
  now() - query_start as duration
FROM pg_stat_activity 
WHERE waiting = true;"
```

#### Step 4: 检查数据库磁盘空间
```bash
df -h
psql -d topems -c "SELECT 
  pg_size_pretty(pg_database_size('topems')) as db_size;"
```

#### Step 5: 检查 WAL 日志
```bash
ls -la /var/lib/postgresql/<version>/main/pg_wal/
```

#### 常见原因
- 连接池耗尽
- 慢查询未优化
- 锁竞争
- 磁盘空间不足
- WAL 日志堆积

---

## 5. Redis 问题

### 症状
- `RedisCriticalMemoryP0` 告警触发
- `RedisHighMemoryP1` 告警触发
- Redis 命令超时

### 排查步骤

#### Step 1: 检查 Redis 状态
```bash
redis-cli ping
redis-cli info
```

#### Step 2: 检查内存使用
```bash
redis-cli info memory

# 查看最大内存配置
redis-cli config get maxmemory

# 查看淘汰策略
redis-cli config get maxmemory-policy
```

#### Step 3: 检查慢命令
```bash
redis-cli slowlog get 10
```

#### Step 4: 检查连接数
```bash
redis-cli info clients

# 查看最大连接数
redis-cli config get maxclients
```

#### Step 5: 检查持久化状态
```bash
redis-cli info persistence
```

#### 常见原因
- 内存不足（Key 过多或过大）
- 慢命令（如 KEYS、SMEMBERS）
- 连接数过多
- 持久化阻塞

---

## 6. RabbitMQ 问题

### 症状
- `RabbitMQHighQueueP1` 告警触发
- `RabbitMQConnectionP0` 告警触发
- 消息堆积

### 排查步骤

#### Step 1: 检查 RabbitMQ 状态
```bash
rabbitmqctl status

# 检查队列状态
rabbitmqctl list_queues name messages consumers

# 检查连接状态
rabbitmqctl list_connections

# 检查交换机状态
rabbitmqctl list_exchanges
```

#### Step 2: 检查消息堆积
```bash
# 查看队列消息数
rabbitmqctl list_queues name messages

# 查看队列消费者数
rabbitmqctl list_queues name consumers

# 查看队列内存使用
rabbitmqctl list_queues name memory
```

#### Step 3: 检查队列绑定
```bash
rabbitmqctl list_bindings
```

#### Step 4: 检查消费者状态
```bash
rabbitmqctl list_consumers
```

#### Step 5: 检查磁盘空间
```bash
rabbitmqctl list_queues name disk_reads disk_writes
```

#### 常见原因
- 消费者宕机或处理能力不足
- 消息生产速度大于消费速度
- 队列配置错误
- 网络问题

---

## 7. 内存问题

### 症状
- `MemoryCriticalP0` 告警触发
- `MemoryHighP1` 告警触发
- OOM Kill

### 排查步骤

#### Step 1: 检查内存使用
```bash
free -h
top
htop
```

#### Step 2: 检查进程内存
```bash
# 按内存排序
ps aux --sort=-%mem | head -20

# 查看特定进程
pmap -x <pid>
```

#### Step 3: 检查内存泄漏
```bash
# 安装 memstat（如有）
memstat -p <pid>

# 或使用 Rust-specific 工具
cargo install cargo-memory
```

#### Step 4: 检查缓存
```bash
cat /proc/meminfo
```

#### Step 5: 检查 OOM 日志
```bash
dmesg | grep -i oom
journalctl | grep -i oom
```

#### 常见原因
- 内存泄漏
- 缓存未清理
- 大对象加载到内存
- 线程/协程过多

---

## 8. CPU 问题

### 症状
- `CPUCriticalP0` 告警触发
- `CPUHighP1` 告警触发
- 系统响应慢

### 排查步骤

#### Step 1: 检查 CPU 使用
```bash
top
htop
mpstat
```

#### Step 2: 检查进程 CPU
```bash
ps aux --sort=-%cpu | head -20
```

#### Step 3: 检查线程/协程
```bash
# 查看线程数
ps -T -p <pid> | wc -l

# 查看 Go/Rust 协程（如果适用）
```

#### Step 4: 检查中断
```bash
cat /proc/interrupts
```

#### Step 5: 检查负载
```bash
uptime
cat /proc/loadavg
```

#### 常见原因
- 死循环
- 并发度过高
- 计算密集型任务
- 频繁 GC
- 中断风暴

---

## 9. 网络问题

### 症状
- 服务间通信失败
- 网络超时
- DNS 解析失败

### 排查步骤

#### Step 1: 检查网络连通性
```bash
ping <host>
telnet <host> <port>
nc -zv <host> <port>
```

#### Step 2: 检查 DNS 解析
```bash
nslookup <hostname>
dig <hostname>
```

#### Step 3: 检查端口转发
```bash
iptables -L
iptables -t nat -L
```

#### Step 4: 检查网络延迟
```bash
mtr <host>
traceroute <host>
```

#### Step 5: 检查 SSL/TLS
```bash
openssl s_client -connect <host>:<port>
```

#### 常见原因
- 防火墙规则
- DNS 配置错误
- 网络分区
- SSL 证书过期
- 端口未开放

---

## 10. 日志排查

### 使用 Loki 查询

#### 基础查询
```logql
# 查询特定服务的所有日志
{job="topems-iam"}

# 查询错误日志
{job="topems-iam"} |= "ERROR"

# 查询包含特定关键词的日志
{job="topems-iam"} |= "user_id"

# 排除特定关键词
{job="topems-iam"} != "DEBUG"
```

#### 时间范围过滤
```logql
# 最近 5 分钟
{job="topems-iam"} |= "ERROR" | time > 5m

# 特定时间范围
{job="topems-iam"} |= "ERROR" | time >= 2024-01-01T00:00:00Z | time <= 2024-01-01T23:59:59Z
```

#### 多条件查询
```logql
# 同时包含多个关键词
{job="topems-iam"} |= "ERROR" |= "authentication"

# 按级别过滤
{job="topems-iam"} | json | level = "ERROR"
```

#### 聚合查询
```logql
# 按错误类型聚合
count_over_time({job="topems-iam"} |= "ERROR" [1m])

# 按服务聚合错误数
sum by (job) (count_over_time({job=~"topems-.*"} |= "ERROR" [5m]))
```

---

## 11. 链路追踪排查

### 使用 Jaeger

#### 搜索 Trace
1. 打开 Jaeger UI（通常 http://localhost:16686）
2. 选择服务
3. 设置时间范围
4. 搜索 Trace

#### 分析 Trace
1. **查看 Trace 耗时**：分析总耗时是否超过阈值
2. **分析 Span 分布**：找出耗时最长的 Span
3. **检查错误 Span**：查找带有错误标记的 Span
4. **查看上下文**：检查每个 Span 的标签和日志

#### 常用查询
```bash
# 搜索高延迟 Trace
# 在 Jaeger UI 中设置 min duration 过滤

# 搜索错误 Trace
# 在 Jaeger UI 中搜索包含 error 的 tags

# 按操作名称搜索
# 在 Jaeger UI 中搜索特定的 operation name
```

---

## 附录

### 常用 PromQL 查询

#### 服务健康
```promql
# 所有服务状态
up{job=~"topems-.*"}

# 运行中的服务数
count(up{job=~"topems-.*"} == 1)

# 宕机的服务数
count(up{job=~"topems-.*"} == 0)
```

#### 请求指标
```promql
# 请求速率
sum(rate(http_requests_total[5m]))

# 错误率
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# P95 延迟
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

#### 资源使用
```promql
# CPU 使用率
sum(rate(process_cpu_seconds_total[5m]))

# 内存使用
sum(process_resident_memory_bytes)

# 磁盘使用
1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)
```

### 常用日志关键词

| 关键词 | 含义 |
|--------|------|
| `ERROR` | 错误 |
| `WARN` | 警告 |
| `panic` | 程序崩溃 |
| `timeout` | 超时 |
| `connection` | 连接问题 |
| `deadlock` | 死锁 |
| `OOM` | 内存不足 |

### 紧急联系方式

| 角色 | 联系方式 |
|------|----------|
| On-call | oncall@topems.com |
| DevOps | devops@topems.com |
| 值班经理 | 飞书群：TOPEMS-值班 |

---

**文档版本**: v1.0  
**最后更新**: 2026-06-30  
**维护人**: DevOps 团队