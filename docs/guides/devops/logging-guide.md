# TOPEMS 日志管理指南

## 目录

- [日志架构](#日志架构)
- [日志配置](#日志配置)
- [日志格式](#日志格式)
- [日志级别](#日志级别)
- [日志收集](#日志收集)
- [日志分析](#日志分析)
- [日志轮转](#日志轮转)
- [合规与审计](#合规与审计)

---

## 日志架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOPEMS 日志架构                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Service Logs          System Logs        Access Logs          │
│   ───────────          ───────────        ───────────           │
│        │                    │                   │               │
│        ▼                    ▼                   ▼               │
│   ┌─────────┐          ┌─────────┐         ┌─────────┐         │
│   │  stdout │          │ journald │         │  nginx  │         │
│   └────┬────┘          └────┬────┘         └────┬────┘         │
│        │                    │                   │               │
│        └────────────────────┼───────────────────┘               │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │  Promtail   │                            │
│                      │  (collect)  │                            │
│                      └──────┬──────┘                            │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │    Loki     │                            │
│                      │  (storage)  │                            │
│                      └──────┬──────┘                            │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │   Grafana   │                            │
│                      │  (explore)  │                            │
│                      └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 日志类型

| 类型 | 说明 | 位置 |
|------|------|------|
| 应用日志 | 服务运行日志 | `/opt/topems/logs/` |
| 系统日志 | 系统级日志 | `journalctl` |
| 访问日志 | HTTP 请求日志 | `/var/log/nginx/` |
| 安全日志 | 认证审计日志 | `/opt/topems/logs/security/` |
| 数据库日志 | PostgreSQL 日志 | `/var/log/postgresql/` |

---

## 日志配置

### 应用日志配置

**配置文件**: `.env`

```env
# 日志级别 (trace, debug, info, warn, error)
LOG_LEVEL=info

# 日志格式 (json, text)
LOG_FORMAT=json

# 日志输出位置
LOG_DIR=/opt/topems/logs
```

### 服务日志配置示例

每个服务可以单独配置：

```env
# unified-core 服务日志
UNIFIED_CORE_LOG_LEVEL=info
UNIFIED_CORE_LOG_FORMAT=json

# ai 服务日志
AI_SERVICE_LOG_LEVEL=debug
AI_SERVICE_LOG_FORMAT=text
```

### Promtail 配置

**配置文件**: `deploy/monitoring/loki/promtail-config.yml`

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: topems
    static_configs:
      - targets:
          - localhost
        labels:
          job: topems
          __path__: /opt/topems/logs/**/*.log

  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log

  - job_name: system
    journal:
      max_age: 12h
      labels:
        job: system
```

---

## 日志格式

### JSON 格式（生产环境推荐）

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "topems-portal",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Request processed successfully",
  "method": "GET",
  "path": "/api/v1/users",
  "status": 200,
  "duration_ms": 45,
  "client_ip": "192.168.1.100",
  "user_id": "user_123"
}
```

### 文本格式（开发环境）

```
2024-01-15 10:30:00 [INFO] [topems-portal] Request processed: GET /api/v1/users - 200 (45ms)
```

### 日志字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| timestamp | string | ISO 8601 时间戳 |
| level | string | 日志级别 |
| service | string | 服务名称 |
| trace_id | string | 分布式追踪 ID |
| span_id | string | 跨度 ID |
| message | string | 日志消息 |
| method | string | HTTP 方法 |
| path | string | 请求路径 |
| status | int | HTTP 状态码 |
| duration_ms | int | 响应时间（毫秒） |
| client_ip | string | 客户端 IP |
| user_id | string | 用户 ID |

---

## 日志级别

| 级别 | 数值 | 用途 | 示例 |
|------|------|------|------|
| trace | 0 | 最详细调试信息 | 函数入口/出口、变量值 |
| debug | 1 | 调试信息 | 中间计算结果、循环进度 |
| info | 2 | 一般信息 | 请求处理、配置加载 |
| warn | 3 | 警告信息 | 资源使用偏高、retry |
| error | 4 | 错误信息 | 操作失败、异常 |
| fatal | 5 | 致命错误 | 启动失败、OOM |

### 生产环境建议

```env
# 生产环境日志级别
LOG_LEVEL=info
UNIFIED_CORE_LOG_LEVEL=info
AI_SERVICE_LOG_LEVEL=warn
PORTAL_LOG_LEVEL=info
```

### 动态调整日志级别

```bash
# 通过 API 调整（需要启用管理端点）
curl -X POST http://localhost:8080/admin/log-level \
  -H "Content-Type: application/json" \
  -d '{"service": "topems-portal", "level": "debug"}'
```

---

## 日志收集

### Docker 环境日志收集

```bash
# 查看容器日志
docker logs -f topems-portal

# 查看最近 100 行
docker logs --tail 100 topems-portal

# 查看错误日志
docker logs --tail 100 --since 10m topems-portal | grep ERROR
```

### Systemd 日志收集

```bash
# 查看服务日志
journalctl -u topems-portal -f

# 按时间范围查看
journalctl -u topems-portal --since "2024-01-15 10:00:00" --until "2024-01-15 11:00:00"

# 按日志级别过滤
journalctl -u topems-portal -p err

# 查看最近错误
journalctl -u topems-portal -p err -n 50
```

### Loki 日志查询

#### LogQL 查询示例

```logql
# 查找所有错误日志
{service="topems-portal"} |= "ERROR"

# 查找特定用户的日志
{service="topems-portal"} | json | user_id="user_123"

# 查找慢请求（响应时间 > 1秒）
{service="topems-portal"} | json | duration_ms > 1000

# 统计错误率
sum(rate({service="topems-portal"} |= "ERROR"[5m])) / sum(rate({service="topems-portal"}[5m]))
```

### 日志字段提取

```logql
# 提取 JSON 字段
{service="topems-portal"} | json | status = 500

# 正则提取
{service="topems-portal"} | regex `(?P<method>\w+) (?P<path>\S+)`

# 过滤并统计
{service="topems-portal"} | json | status != 200 | line_format "{{.timestamp}} {{.method}} {{.path}}"
```

---

## 日志分析

### 常用分析场景

#### 1. 查找错误日志

```bash
# 方式一：grep
grep -r "ERROR" /opt/topems/logs/ | tail -100

# 方式二：Loki LogQL
'{service="topems-portal"}' |= "ERROR"
```

#### 2. 分析请求模式

```logql
# 按路径统计请求量
sum by (path) (rate({service="topems-portal"} | json [5m]))

# 找出最慢的 10 个请求
topk(10, sum by (path) (rate({service="topems-portal"} | json [5m])))
```

#### 3. 分析用户行为

```logql
# 查找特定用户的所有操作
{service="topems-portal"} | json | user_id="user_123"

# 统计用户操作频率
sum by (user_id) (rate({service="topems-portal"} | json [1h]))
```

#### 4. 分析性能问题

```logql
# 统计 P99 响应时间
quantile by (path) (0.99, rate(duration_ms[5m]))

# 查找超时请求
{service="topems-portal"} | json | duration_ms > 30000
```

### 日志聚合分析

```bash
# 统计每种错误出现次数
cat /opt/topems/logs/topems-portal.log | \
  jq -r '.message' | \
  sort | uniq -c | sort -rn | head -20

# 统计 HTTP 状态码分布
cat /opt/topems/logs/topems-portal.log | \
  jq -r '.status' | \
  sort | uniq -c | sort -rn
```

---

## 日志轮转

### logrotate 配置

```bash
# /etc/logrotate.d/topems
/opt/topems/logs/*.log {
    daily
    rotate 30
    missingok
    compress
    delaycompress
    notifempty
    create 0644 topems topems
    sharedscripts
    postrotate
        systemctl reload topems-portal > /dev/null 2>&1 || true
    endscript
}
```

### 手动执行日志轮转

```bash
# 测试配置
logrotate -d /etc/logrotate.d/topems

# 强制执行
logrotate -f /etc/logrotate.d/topems
```

### 应用内日志轮转

如果应用支持，可以配置应用自身进行日志轮转：

```toml
# Rust 应用配置 (Cargo.toml 或 config)
[logging]
max_file_size = "100MB"
max_files = 10
```

### 日志保留策略

| 日志类型 | 开发环境 | 生产环境 |
|----------|----------|----------|
| 应用日志 | 7 天 | 90 天 |
| 访问日志 | 7 天 | 180 天 |
| 安全日志 | 30 天 | 365 天 |
| 审计日志 | 30 天 | 730 天 |
| 系统日志 | 7 天 | 90 天 |

---

## 合规与审计

### 安全日志

敏感操作应记录到安全日志：

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "security",
  "action": "login",
  "user_id": "user_123",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "result": "success",
  "details": {
    "method": "password"
  }
}
```

### 需要记录的敏感操作

| 操作类型 | 说明 | 保留时间 |
|----------|------|----------|
| 用户登录/登出 | 认证事件 | 365 天 |
| 权限变更 | 角色/权限修改 | 730 天 |
| 数据导出 | 批量数据导出 | 365 天 |
| 配置变更 | 系统配置修改 | 730 天 |
| 删除操作 | 重要数据删除 | 730 天 |

### 日志脱敏

```bash
# 敏感字段脱敏脚本
#!/bin/bash
# mask.sh - 日志脱敏

cat /opt/topems/logs/access.log | \
  jq '{
    timestamp,
    method,
    path,
    status,
    ip: (.ip | sub("(?P<a>\\d+)\\.(?P<b>\\d+)\\.(?P<c>\\d+)"; "\(.a).xxx.xxx.\(.c)")),
    user_id: (if .user_id then "***" else null end)
  }' > /opt/topems/logs/masked_access.log
```

### 日志归档

```bash
# 归档旧日志
find /opt/topems/logs -name "*.log" -mtime +30 -exec gzip {} \;

# 移动到冷存储
find /opt/topems/logs -name "*.log.gz" -mtime +90 -exec mv {} /mnt/cold_storage/logs/ \;

# 验证归档完整性
zcat /mnt/cold_storage/logs/app_2024_01.gz | wc -l
```

---

## 故障排查示例

### 示例 1：排查 500 错误

```bash
# 1. 查找错误日志
grep -r "500" /opt/topems/logs/ | grep "2024-01-15"

# 2. 在 Loki 中查询
'{service="topems-portal"}' |= "500" | json

# 3. 查看错误详情
grep -A 5 "500" /opt/topems/logs/topems-portal.log | head -50
```

### 示例 2：排查响应慢

```bash
# 1. 查找慢请求（> 5秒）
grep -E "duration_ms.*[5-9][0-9]{3}" /opt/topems/logs/topems-portal.log

# 2. 统计 P95 响应时间
cat /opt/topems/logs/topems-portal.log | \
  jq -r '.duration_ms' | \
  awk '{sum+=$1; count++} END {print sum/count}' | \
  awk '{print $1/2}'

# 3. 查找最慢的接口
cat /opt/topems/logs/topems-portal.log | \
  jq -r 'select(.duration_ms > 5000) | .path' | \
  sort | uniq -c | sort -rn
```

### 示例 3：排查用户登录失败

```bash
# 1. 查找登录失败记录
grep -E "login.*fail" /opt/topems/logs/security.log

# 2. 统计失败次数
grep "login.*fail" /opt/topems/logs/security.log | \
  jq -r '.ip' | sort | uniq -c | sort -rn | head -10

# 3. 检查是否暴力破解
# 同一 IP 登录失败超过 10 次/分钟
grep "login.*fail" /opt/topems/logs/security.log | \
  jq -r '.timestamp[:16]' | \
  sort | uniq -c | sort -rn | head -10
```

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [监控告警运维指南](./monitoring-alerting.md)
- [故障排查指南](./troubleshooting.md)
