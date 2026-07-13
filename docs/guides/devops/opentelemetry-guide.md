# TOPEMS OpenTelemetry 分布式追踪指南

## 目录

- [概述](#概述)
- [配置说明](#配置说明)
- [宏代码使用](#宏代码使用)
- [关键优化点](#关键优化点)
- [排查步骤](#排查步骤)
- [验证方法](#验证方法)
- [注意事项](#注意事项)

---

## 概述

TOPEMS 使用 OpenTelemetry 实现分布式追踪，支持跨服务的请求链路追踪、性能监控和错误诊断。

**核心组件**:
- `lib/src/telemetry/` - OpenTelemetry 集成模块
- `lib/src/telemetry/macros.rs` - 简化初始化的宏定义
- `lib/src/telemetry/middleware.rs` - Axum 中间件实现

**支持的导出器**:
- `stdout` - 控制台输出（开发/测试环境）
- `otlp` - OTLP 协议输出（生产环境）

---

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OTEL_ENABLED` | `false` | 是否启用 OpenTelemetry |
| `OTEL_EXPORTER` | `stdout` | 导出器类型：`stdout` 或 `otlp` |
| `OTEL_SERVICE_NAME` | - | 服务名称（由宏自动设置） |
| `OTEL_SERVICE_VERSION` | `0.1.0` | 服务版本 |
| `OTEL_RESOURCE_ATTRIBUTES` | - | 自定义资源属性 |

### 示例配置

```bash
# .env 文件配置
OTEL_ENABLED=true
OTEL_EXPORTER=stdout
RUST_LOG=info
```

---

## 宏代码使用

### 1. 初始化追踪

```rust
use topems_shared::init_service_telemetry;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _telemetry_guard = init_service_telemetry!("topems-user-service");
    
    // ... 服务初始化逻辑 ...
}
```

### 2. 添加中间件

```rust
use topems_shared::TelemetryExt;

let app = Router::new()
    .route("/api/users/v1/users", get(list_users))
    .with_telemetry()
    .layer(cors)
    .layer(prometheus_layer);
```

### 3. 自定义追踪 Span

```rust
use topems_shared::{trace_function, trace_span};

async fn process_order(order_id: &str) {
    let _span = trace_function!("process_order").enter();
    
    // ... 业务逻辑 ...
    
    {
        let _sub_span = trace_span!("validate_order").enter();
        // ... 验证逻辑 ...
    }
}
```

### 宏定义说明

| 宏名称 | 用途 | 参数 |
|--------|------|------|
| `init_service_telemetry!` | 初始化 OpenTelemetry | `service_name: &str` |
| `with_telemetry!` | 添加追踪中间件 | `router: Router` |
| `trace_request!` | 创建 HTTP 请求 Span | `method: &str`, `path: &str` |
| `trace_function!` | 创建函数级 Span | `name: &str` |
| `trace_span!` | 创建通用 Span | `name: &str` |

---

## 关键优化点

### 1. HeaderMapExtractor::keys() 优化

**问题**: 每次请求都会收集所有 header 键到 `Vec<&str>`，但 W3C TraceContext propagator 只需查找 `traceparent` 和 `baggage` 两个键。

**优化**: 返回空 `Vec`，避免每请求分配内存。

```rust
struct HeaderMapExtractor<'a>(&'a HeaderMap);

impl<'a> Extractor for HeaderMapExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        Vec::new()
    }
}
```

**注意**: 如果未来切换到依赖 `keys()` 迭代的 propagator（如 Jaeger），需要改为返回实际的 header 键列表。

### 2. Trace ID 获取优化

**问题**: 原实现调用 `Context::current()` 获取 trace_id，造成重复查询。

**优化**: 直接从已进入的 span 获取 `span_context`。

```rust
let ctx = span.context();
let span_ref = ctx.span();
let span_context = span_ref.span_context();
if span_context.is_valid() {
    // 使用 span_context.trace_id()
}
```

### 3. Span Name 延迟格式化

**问题**: `%format!("{} {}", method, path)` 每次请求都进行格式化并分配 String。

**优化**: 使用 `tracing::field::display()` 延迟格式化，仅在实际记录时才执行。

```rust
let span = info_span!(
    "http_request",
    otel.name = tracing::field::display(format!("{} {}", method, path)),
    http.method = %method,
    http.route = %path,
);
```

### 4. 重复初始化保护

**问题**: 若 `init_telemetry` 被多次调用，旧 provider 会被覆盖而未执行 shutdown，导致缓冲区中的 span 丢失。

**优化**: 在设置新 provider 前先 shutdown 旧 provider。

```rust
let mut provider_guard = TRACER_PROVIDER.lock().unwrap();
if let Some(old_provider) = provider_guard.take() {
    let _ = old_provider.shutdown();
}
*provider_guard = Some(tracer_provider);
```

---

## 排查步骤

### 1. 检查 OpenTelemetry 是否启用

```bash
# 检查环境变量
echo $OTEL_ENABLED

# 检查服务启动日志
# 应包含: "✅ OpenTelemetry initialized (exporter: Stdout)"
```

### 2. 验证 Span 数据输出

```bash
# 发送测试请求
curl http://localhost:8060/

# 检查响应头中是否包含 x-trace-id
# x-trace-id: b6506a75a5b75341df235435dd4f460a
```

### 3. 验证分布式追踪链路

```bash
# 发送带 traceparent 的请求
curl http://localhost:8060/api/users/v1/users \
  -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

# 检查返回的 x-trace-id 是否与传入的一致
# 检查日志中的 ParentSpanId 是否正确设置
```

### 4. 检查 Span 属性完整性

Span 应包含以下属性：

| 属性 | 说明 |
|------|------|
| `http.method` | HTTP 方法 |
| `http.route` | 请求路径 |
| `http.target` | 请求目标 |
| `http.scheme` | 协议 |
| `http.host` | 主机名 |
| `http.status_code` | 响应状态码 |
| `duration_ms` | 请求耗时 |

### 5. 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 无 Span 输出 | `OTEL_ENABLED` 未设置为 `true` | 设置环境变量 |
| Trace ID 不一致 | 中间件未正确配置 | 检查 `with_telemetry()` 调用 |
| ParentSpanId 为 None | traceparent 头格式错误 | 检查 traceparent 格式 |
| Span 属性缺失 | 中间件未正确记录属性 | 检查 middleware.rs |
| 编译错误 | 依赖版本不匹配 | 检查 Cargo.toml 版本 |

---

## 验证方法

### 1. 启动服务并验证

```bash
# 启动服务
cd svc/user-service
cargo run

# 发送测试请求
curl http://localhost:8060/

# 预期输出:
# Span #0
#   TraceId      : xxx
#   SpanId       : xxx
#   ParentSpanId : None (root span)
#   Attributes:
#     -> http.method: GET
#     -> http.route: /
```

### 2. 验证分布式追踪链路

```bash
# 发送带 traceparent 的请求
curl http://localhost:8060/api/users/v1/users \
  -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

# 预期输出:
# Span #0
#   TraceId      : 0af7651916cd43dd8448eb211c80319c
#   ParentSpanId : b7ad6b7169203331
```

### 3. 性能测试

```bash
# 使用 wrk 进行压测
wrk -t4 -c100 -d30s http://localhost:8060/

# 检查 CPU 和内存使用
# 优化后应无明显性能下降
```

---

## 注意事项

### 1. global::set_tracer_provider() 未调用

当前实现未调用 `opentelemetry::global::set_tracer_provider()`，因为该函数会消费 provider 的所有权，与 `Mutex` 中存储 provider 以便后续 shutdown 冲突。

**影响**: 不支持通过 `opentelemetry::global::tracer()` API 获取 tracer。

**解决方案**: 如果需要使用 `global::tracer()`，请在初始化后手动调用 `global::set_tracer_provider()`，但这会导致 `TelemetryGuard` 的 shutdown 功能失效。

### 2. Box::leak 使用

`service_name` 通过 `Box::leak` 转为 `'static` 生命周期，这是有意为之的，因为每个服务仅调用一次 `init_telemetry`，内存泄漏可忽略。

### 3. 导出器选择

- **开发环境**: 使用 `stdout` 导出器，方便调试
- **生产环境**: 使用 `otlp` 导出器，发送到 Jaeger/Zipkin/OpenTelemetry Collector

### 4. 性能影响

OpenTelemetry 追踪会带来一定的性能开销，建议：
- 在生产环境中适当降低采样率
- 使用异步批处理导出器
- 避免在高频代码路径中创建过多 Span

---

## 相关文档

- [监控告警指南](./monitoring-alerting.md)
- [日志管理指南](./logging-guide.md)
- [故障排查指南](./troubleshooting.md)