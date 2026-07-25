# TOPEMS-MONITOR 系统监控服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8000`（unified-core 统一核心服务）

---

> **API 路径**: `/api/core/monitor/`

## 目录

1. [服务概述](#1-服务概述)
2. [健康检查 API](#2-健康检查-api)
3. [指标 API](#3-指标-api)
4. [告警 API](#4-告警-api)
5. [服务监控 API](#5-服务监控-api)
6. [性能监控 API](#6-性能监控-api)
7. [日志查询 API](#7-日志查询-api)
8. [健康检查 API](#8-健康检查-api)

---

## 1. 服务概述

TOPEMS-MONITOR 是系统监控服务（已合并到 unified-core），提供健康检查、指标采集、告警管理、性能监控等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 健康检查 API

### 2.1 基础健康检查

```
GET /health
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "status": "healthy",
    "service": "topems-monitor",
    "version": "1.0.0",
    "timestamp": 1723584000
  }
}
```

### 2.2 详细健康检查

```
GET /health/details
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "service_name": "topems-monitor",
    "status": "healthy",
    "uptime": "2 hours 30 minutes",
    "dependencies": [
      { "name": "database", "status": "healthy" },
      { "name": "redis", "status": "healthy" }
    ]
  }
}
```

### 2.3 检查所有服务

```
GET /api/core/monitor/health/all
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    { "service": "topems-iam", "status": "healthy", "response_time": 15 },
    { "service": "topems-erp", "status": "healthy", "response_time": 25 },
    { "service": "topems-mes", "status": "degraded", "response_time": 200 }
  ]
}
```

---

## 3. 指标 API

### 3.1 获取系统指标

```
GET /api/core/monitor/metrics/system
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "cpu": { "usage": 45, "cores": 8 },
    "memory": { "usage": 60, "total": 16, "used": 9.6 },
    "disk": { "usage": 70, "total": 500, "used": 350 },
    "network": { "incoming": 100, "outgoing": 50 }
  }
}
```

### 3.2 获取 API 指标

```
GET /api/core/monitor/metrics/api?service=erp&period=24h
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "service": "erp",
    "period": "24h",
    "total_requests": 10000,
    "success_rate": 99.5,
    "avg_response_time": 50,
    "p95_response_time": 150,
    "error_count": 50
  }
}
```

### 3.3 获取数据库指标

```
GET /api/core/monitor/metrics/database
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "connections": 50,
    "max_connections": 100,
    "active_transactions": 10,
    "slow_queries": 5,
    "query_per_second": 100
  }
}
```

### 3.4 获取指标趋势

```
GET /api/core/monitor/metrics/trend?metric=cpu&start_time=2026-08-14T00:00:00Z&end_time=2026-08-14T12:00:00Z
```

---

## 4. 告警 API

### 4.1 获取告警列表

```
GET /api/core/monitor/alerts?page=1&page_size=20&status=active&severity=critical
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| status | string | 否 | 状态（active/resolved/silenced） |
| severity | string | 否 | 级别（critical/warning/info） |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "service": "topems-mes",
        "metric": "response_time",
        "severity": "critical",
        "message": "响应时间超过200ms",
        "value": 250,
        "threshold": 200,
        "status": "active",
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "total": 10
  }
}
```

### 4.2 获取告警详情

```
GET /api/core/monitor/alerts/{id}
```

### 4.3 确认告警

```
POST /api/core/monitor/alerts/{id}/acknowledge
```

**请求体**：

```json
{
  "acknowledged_by": "uuid",
  "comment": "已收到，正在处理"
}
```

### 4.4 解决告警

```
POST /api/core/monitor/alerts/{id}/resolve
```

**请求体**：

```json
{
  "resolved_by": "uuid",
  "resolution": "问题已修复"
}
```

### 4.5 获取告警规则

```
GET /api/core/monitor/alerts/rules
```

### 4.6 创建告警规则

```
POST /api/core/monitor/alerts/rules
```

**请求体**：

```json
{
  "name": "API响应时间告警",
  "service": "erp",
  "metric": "response_time",
  "condition": ">",
  "threshold": 200,
  "severity": "critical",
  "notification_channels": ["email", "webhook"],
  "enabled": true
}
```

---

## 5. 服务监控 API

### 5.1 获取服务列表

```
GET /api/core/monitor/services?page=1&page_size=20&status=healthy
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "topems-iam",
        "port": 8000,
        "status": "healthy",
        "response_time": 15,
        "uptime": "99.9%",
        "last_check": "2026-08-14T10:30:00Z"
      }
    ],
    "total": 27
  }
}
```

### 5.2 获取服务详情

```
GET /api/core/monitor/services/{name}
```

### 5.3 手动检查服务

```
POST /api/core/monitor/services/{name}/check
```

---

## 6. 性能监控 API

### 6.1 获取性能概览

```
GET /api/core/monitor/performance/overview
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "throughput": 1000,
    "latency": { "avg": 50, "p95": 150, "p99": 300 },
    "error_rate": 0.5,
    "uptime": "99.9%"
  }
}
```

### 6.2 获取慢查询

```
GET /api/core/monitor/performance/slow-queries?page=1&page_size=20
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "query": "SELECT * FROM ...",
        "duration": 500,
        "frequency": 100,
        "last_seen": "2026-08-14T10:30:00Z"
      }
    ],
    "total": 50
  }
}
```

---

## 7. 日志查询 API

### 7.1 查询日志

```
GET /api/core/monitor/logs?page=1&page_size=100&service=erp&level=error&start_time=2026-08-14T00:00:00Z
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "timestamp": "2026-08-14T10:30:00Z",
        "service": "erp",
        "level": "error",
        "message": "数据库连接失败",
        "stack_trace": "..."
      }
    ],
    "total": 100
  }
}
```

### 7.2 搜索日志

```
POST /api/core/monitor/logs/search
```

**请求体**：

```json
{
  "query": "ERROR",
  "service": "erp",
  "start_time": "2026-08-14T00:00:00Z",
  "end_time": "2026-08-14T12:00:00Z"
}
```

---

## 8. 健康检查 API

### 8.1 基础健康检查

```
GET /health
```

---

**版本**: 2.0.0
**最后更新**: 2026-08-14