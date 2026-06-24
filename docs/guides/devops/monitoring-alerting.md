# TOPEMS 监控告警运维指南

## 目录

- [监控架构](#监控架构)
- [组件说明](#组件说明)
- [部署配置](#部署配置)
- [告警规则](#告警规则)
- [告警通知](#告警通知)
- [Grafana 仪表板](#grafana-仪表板)
- [日常运维](#日常运维)

---

## 监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         TOPEMS 监控系统                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  Services    │────▶│  Prometheus  │────▶│   Grafana    │    │
│  │  (metrics)   │     │  (scrape)    │     │  (dashboard) │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                    ▲              │
│                              ▼                    │              │
│  ┌──────────────┐     ┌──────────────┐            │              │
│  │   Loki       │◀────│   Promtail   │            │              │
│  │  (logs)      │     │  (collect)   │            │              │
│  └──────────────┘     └──────────────┘            │              │
│                              │                    │              │
│                              ▼                    │              │
│                      ┌──────────────┐            │              │
│                      │ Alertmanager │────────────┘              │
│                      │  (notify)    │                           │
│                      └──────────────┘                           │
│                              │                                  │
│                              ▼                                  │
│                      ┌──────────────┐                           │
│                      │  Email/Slack │                           │
│                      │  / Webhook    │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### 组件端口

| 组件 | 端口 | 说明 |
|------|------|------|
| Prometheus | 9090 | 指标收集与查询 |
| Grafana | 3000 | 可视化仪表板 |
| Loki | 3100 | 日志聚合 |
| AlertManager | 9093 | 告警管理 |

---

## 组件说明

### Prometheus

指标收集系统，负责从各服务抓取指标数据。

**配置文件**: `deploy/monitoring/prometheus/prometheus.yml`

**关键配置**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
```

### Grafana

可视化监控平台，提供仪表板和告警功能。

**配置文件**: `deploy/monitoring/grafana/grafana.ini`

**默认账号**: admin / admin

### Loki

日志聚合系统，与 Prometheus 和 Grafana 集成。

**配置文件**: `deploy/monitoring/loki/loki-config.yml`

### AlertManager

告警处理系统，负责去重、分组和通知。

**配置文件**: `deploy/monitoring/alertmanager/alertmanager.yml`

### Promtail

日志收集代理，将日志发送到 Loki。

**配置文件**: `deploy/monitoring/loki/promtail-config.yml`

---

## 部署配置

### Docker Compose 部署

```bash
cd /opt/topems/deploy/monitoring
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f prometheus
```

### 验证部署

```bash
# Prometheus 健康检查
curl http://localhost:9090/-/healthy

# Grafana 健康检查
curl http://localhost:3000/api/health

# Loki 健康检查
curl http://localhost:3100/ready
```

### Kubernetes 部署

```bash
# 部署监控组件
kubectl apply -f deploy/k8s/monitoring/

# 查看 Pod 状态
kubectl get pods -n topems-monitoring
```

---

## 告警规则

### Prometheus 告警规则

**配置文件**: `deploy/monitoring/prometheus/alerts.yml`

#### 服务健康告警

```yaml
groups:
  - name: topems_services
    rules:
      # 服务实例宕机
      - alert: ServiceDown
        expr: up{job=~"topems-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务实例宕机"
          description: "{{ $labels.job }} 实例 {{ $labels.instance }} 已宕机超过 1 分钟"

      # 服务响应延迟
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "服务响应延迟"
          description: "{{ $labels.job }} P95 响应时间超过 5 秒"
```

#### 资源使用告警

```yaml
      # CPU 使用率高
      - alert: HighCPUUsage
        expr: 100 * (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "{{ $labels.instance }} CPU 使用率超过 80%"

      # 内存使用率高
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "{{ $labels.instance }} 内存使用率超过 85%"

      # 磁盘空间不足
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "磁盘空间不足"
          description: "{{ $labels.instance }} 根分区剩余空间低于 15%"
```

#### 数据库告警

```yaml
      # 数据库连接数过高
      - alert: DatabaseConnectionsHigh
        expr: sum(pg_stat_activity_count) > pg_settings_max_connections * 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "数据库连接数过高"
          description: "数据库连接数达到最大连接的 80%"

      # 数据库慢查询
      - alert: DatabaseSlowQueries
        expr: sum(rate(pg_stat_statements_mean_exec_time[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "数据库存在慢查询"
          description: "数据库平均查询时间超过 1 秒"
```

### 告警规则配置

```bash
# 验证告警规则语法
docker exec topems-prometheus promtool check rules /etc/prometheus/alerts.yml

# 热更新告警规则
curl -X POST http://localhost:9090/-/reload
```

---

## 告警通知

### AlertManager 配置

**配置文件**: `deploy/monitoring/alertmanager/alertmanager.yml`

```yaml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@topems.com'
  smtp_auth_username: 'alertmanager@topems.com'
  smtp_auth_password: 'your_password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-receiver'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'ops@topems.com'
        send_resolved: true

  - name: 'critical-receiver'
    email_configs:
      - to: 'critical@topems.com'
        send_resolved: true
    webhook_configs:
      - url: 'http://localhost:5000/webhook'

  - name: 'warning-receiver'
    email_configs:
      - to: 'warning@topems.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

### 通知渠道配置

#### 邮件通知

```yaml
email_configs:
  - to: 'ops@example.com'
    headers:
      subject: 'TOPEMS 告警: {{ .GroupLabels.alertname }}'
    send_resolved: true
```

#### Slack 通知

```yaml
route:
  receiver: 'slack-receiver'

receivers:
  - name: 'slack-receiver'
    slack_configs:
      - channel: '#topems-alerts'
        api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'
        send_resolved: true
        title: 'TOPEMS 告警'
        text: |
          {{ range .Alerts }}
          *告警名称*: {{ .Labels.alertname }}
          *严重程度*: {{ .Labels.severity }}
          *描述*: {{ .Annotations.description }}
          {{ end }}
```

#### Webhook 通知

```yaml
webhook_configs:
  - url: 'http://your-webhook-endpoint/alert'
    send_resolved: true
```

### 测试告警

```bash
# 使用 promtool 测试告警规则
docker exec topems-prometheus promtool test rules /etc/prometheus/alerts.yml

# 发送测试告警到 AlertManager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "instance": "test-instance"
      },
      "annotations": {
        "summary": "测试告警",
        "description": "这是一条测试告警"
      }
    }
  ]'
```

---

## Grafana 仪表板

### 导入仪表板

**配置文件**: `deploy/monitoring/grafana/provisioning/dashboards/dashboards.yml`

预置仪表板: `deploy/monitoring/grafana/dashboards/topems-overview.json`

### 仪表板列表

| 仪表板 | 说明 |
|--------|------|
| TOPEMS Overview | 系统整体概览 |
| Service Metrics | 各服务详细指标 |
| Database Metrics | 数据库监控 |
| Infrastructure | 基础设施监控 |

### 创建自定义仪表板

1. 登录 Grafana (http://localhost:3000)
2. 点击 "+" -> "Import"
3. 选择预置 JSON 或手动创建

### 常用 PromQL 查询

```promql
# 服务可用率
100 * (1 - count(up{job=~"topems-.*"} == 0) / count(up{job=~"topems-.*"}))

# 请求速率
rate(http_requests_total[5m])

# P99 响应时间
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
rate(http_requests_total{status=~"5.."}[5m])

# CPU 使用率
100 * (1 - avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])))
```

---

## 日常运维

### 每日检查清单

- [ ] 检查 Prometheus 告警状态
- [ ] 查看 Grafana 仪表板异常
- [ ] 检查 AlertManager 告警历史
- [ ] 验证日志采集是否正常
- [ ] 检查磁盘空间（Prometheus/Loki 数据）

### 容量规划

```bash
# Prometheus 存储估算
# 规则：每秒抓取指标数 × 保留时间 × 采样间隔

# 示例：100 服务，每服务 100 指标，15s 间隔，保留 15 天
# 存储需求 ≈ 100 × 100 × 100/15 × 86400 × 15 × 8 bytes ≈ 7GB

# Loki 存储估算
# 规则：日志速率 × 保留时间 × 压缩率

# 示例：1MB/s 日志，保留 15 天，压缩后 10%
# 存储需求 ≈ 1 × 86400 × 15 × 0.1 ≈ 130GB
```

### 数据保留配置

```yaml
# prometheus.yml
storage:
  tsdb:
    retention.time: 15d
    retention.size: 50GB
```

```yaml
# loki-config.yml
limits_config:
  retention_period: 15d
```

### 性能调优

```bash
# Prometheus 调优参数
# --storage.tsdb.path: 数据存储路径
# --storage.tsdb.min-block-duration: 最小块大小（推荐 2h）
# --storage.tsdb.max-block-duration: 最大块大小（推荐 2h）

# 启动示例
prometheus \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.min-block-duration=2h \
  --storage.tsdb.max-block-duration=2h \
  --storage.tsdb.retention.time=15d
```

### 备份配置

```bash
# 备份 Prometheus 数据
tar -czf prometheus_backup_$(date +%Y%m%d).tar.gz /var/lib/prometheus

# 备份 Grafana 配置
cp -r /var/lib/grafana/dashboards.yaml /backup/
cp -r /var/lib/grafana/provisioning/ /backup/

# 备份 AlertManager 配置
cp /etc/alertmanager/alertmanager.yml /backup/
```

### 故障处理

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| Prometheus 无法抓取指标 | 网络问题、目标服务宕机 | 检查网络连通性和服务健康状态 |
| Grafana 仪表板无数据 | 数据源配置错误、时间范围问题 | 检查数据源配置和时间筛选 |
| AlertManager 不发送通知 | 通知渠道配置错误 | 检查 smtp/webhook 配置 |
| Loki 查询超时 | 数据量过大、查询范围过广 | 优化查询或增加资源 |

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [数据库维护指南](./database-maintenance.md)
- [日志管理指南](./logging-guide.md)
- [故障排查指南](./troubleshooting.md)
