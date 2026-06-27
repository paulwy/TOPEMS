# 健康检查和监控系统使用指南

> 文档版本: v2.0
> 创建日期: 2026-06-08
> 最后更新: 2026-06-09

## 概述

TOPEMS 提供了标准化的健康检查和 Prometheus 监控系统，包括：
- **健康检查端点**：监控服务运行状态
- **Prometheus 监控**：收集和展示服务指标
- **Alertmanager 告警**：自动监控和告警

## 统一端点规范

所有 TOPEMS 服务都遵循以下标准化端点：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/health` | GET | 基础健康检查，返回服务状态 |
| `/api/v1/health/detailed` | GET | 详细健康检查，包含依赖状态、运行时间 |
| `/metrics` | GET | Prometheus 格式监控指标 |
| `/api/v1/info` | GET | API 信息（自动注册） |

## 快速开始

### 1. 服务健康检查

#### 基础健康检查

```bash
curl http://localhost:<port>/health
```

响应示例：
```json
{
  "success": true,
  "data": {
    "service_name": "topems-iam",
    "status": "Healthy",
    "message": "topems-iam is running",
    "timestamp": "2026-06-09T12:34:56Z",
    "uptime": "2h 15m 30s"
  }
}
```

#### 详细健康检查

```bash
curl http://localhost:<port>/api/v1/health/detailed
```

响应示例：
```json
{
  "success": true,
  "data": {
    "service_name": "topems-iam",
    "status": "Healthy",
    "message": "健康检查完成",
    "timestamp": "2026-06-09T12:34:56Z",
    "uptime": 8130,
    "dependencies": [
      {
        "name": "database",
        "status": "healthy",
        "message": "PostgreSQL 数据库连接正常"
      }
    ],
    "response_time_ms": null,
    "last_check": "2026-06-09T12:34:56Z"
  }
}
```

### 2. Prometheus 指标

#### 查看指标

```bash
curl http://localhost:<port>/metrics
```

#### Prometheus 指标说明

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `topems_<service>_requests_total` | Counter | 服务接收的请求总数 |
| `topems_<service>_errors_total` | Counter | 服务发生的错误总数 |
| `topems_<service>_response_time_seconds` | Histogram | 请求响应时间分布 |
| `topems_<service>_uptime_seconds` | Gauge | 服务运行时间（秒） |
| `topems_<service>_service_start_time_seconds` | Gauge | 服务启动时间戳 |

### 3. Prometheus 监控配置

配置文件位于：`<项目目录>/monitoring/prometheus/prometheus.yml`

#### 使用 Docker 启动

```bash
cd <项目目录>/monitoring
docker-compose up -d
```

#### 不使用 Docker 启动

```bash
# 安装 Prometheus（macOS）
brew install prometheus

# 启动 Prometheus
prometheus --config.file=<项目目录>/monitoring/prometheus/prometheus.yml --web.listen-address=":9090"
```

#### 访问 Prometheus

- Web UI: http://localhost:9090
- Targets: http://localhost:9090/targets
- Graph: http://localhost:9090/graph

### 4. Grafana 配置

#### 安装 Grafana

```bash
# macOS
brew install grafana

# 启动 Grafana
brew services start grafana
```

#### 配置数据源

1. 访问 http://localhost:3000
2. 登录（默认: admin/admin）
3. 进入 **Configuration > Data Sources**
4. 添加 **Prometheus** 数据源
5. URL: `http://localhost:9090`

### 5. Alertmanager 告警

配置文件位于：`<项目目录>/monitoring/prometheus/rules/topems-alerts.yml`

#### 告警规则

| 告警名称 | 说明 | 严重程度 |
|---------|------|---------|
| `ServiceDown` | 服务不可用 | Critical |
| `HighErrorRate` | 错误率超过 10% | Warning |
| `HighLatency` | 95% 响应时间超过 1 秒 | Warning |
| `DatabaseConnectionError` | 数据库连接失败 | Critical |
| `IAMServiceDown` | IAM 服务不可用 | Critical |
| `DocServiceDown` | 文档服务不可用 | Critical |
| `FlowServiceDown` | 工作流服务不可用 | Critical |

## 代码实现

### 基础使用

```rust
use topems_shared::{
    ServiceHealth, SimpleHealthConfig, simple_health_check
};

// 在应用状态中添加健康配置
#[derive(Clone)]
struct AppState {
    pool: PgPool,
    health_config: SimpleHealthConfig,
}

// 创建健康检查配置
let health_config = SimpleHealthConfig::new("my-service-name")
    .with_db(pool.clone());

// 创建健康检查处理函数
async fn health_check(State(app_state): State<AppState>) -> ServiceHealth {
    simple_health_check(&app_state.health_config).await
}

// 添加路由
let public_routes = Router::new()
    .route("/health", get(health_check))
    .route("/api/v1/health/detailed", get(health_check_detailed))
    .route("/metrics", get(metrics_handler));
```

### Prometheus 监控集成

```rust
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Gauge, default_registry};

// 初始化 Prometheus
let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

// 自定义指标
let uptime_gauge = Gauge::new(
    "my_service_uptime_seconds",
    "Service uptime in seconds",
).unwrap();
default_registry().register(Box::new(uptime_gauge.clone())).unwrap();

// 添加到路由
let app = Router::new()
    .route("/metrics", get(move || async move { metric_handle.render() }))
    .layer(prometheus_layer);
```

## 已实现的服务

### 平台服务
- ✅ topems-iam（身份认证服务）
- ✅ topems-doc（文档管理服务）
- ✅ topems-flow（工作流引擎服务）

### 业务服务
- ✅ topems-scm（供应链管理）
- ✅ topems-srm（供应商关系管理）
- ✅ topems-portal（统一门户）
- ✅ topems-im、topems-pdm、topems-mail
- ✅ topems-gis、topems-lims、topems-erp、topems-bi、topems-ai
- ✅ topems-wms、topems-qms、topems-mes、topems-crm、topems-ehs
- ✅ topems-hrm、topems-pm、topems-rs、topems-mobile、topems-integration
- ✅ topems-notification、report-service、notification-service、example-service

## 服务端口映射

| 服务 | 端口 | 监控端点 |
|------|------|---------|
| topems-iam | 8000 | /health, /metrics |
| topems-doc | 8001 | /health, /metrics |
| topems-flow | 8002 | /health, /metrics |
| topems-scm | 8040 | /health, /metrics |
| topems-srm | 8041 | /health, /metrics |
| topems-portal | 8005 | /health, /metrics |

## 下一步

- 为其他服务添加详细的依赖检查
- 配置 Grafana 仪表板
- 设置告警通知渠道（Email、Slack 等）
- 集成外部监控系统
