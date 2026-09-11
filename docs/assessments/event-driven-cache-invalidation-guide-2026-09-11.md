# 事件驱动缓存失效机制设计与实现指南

**日期**: 2026-09-11
**版本**: v1.0
**适用范围**: TOPEMS 所有服务的本地内存缓存一致性保障

---

## 1. 概述

### 1.1 背景

TOPEMS 系统采用多服务架构，每个服务维护自己的本地内存缓存（基于 moka 的 InMemoryCache）。当主数据（如字典、供应商、物料、员工等）在一个服务中发生变更时，其他服务的本地缓存可能仍然持有旧数据，导致数据不一致。

### 1.2 目标

通过事件驱动的缓存失效机制，实现跨服务的缓存一致性：
- 当主数据变更时，变更服务发布缓存失效事件
- 其他服务订阅缓存失效事件，自动失效相关本地缓存
- 支持三种失效级别：精确键、前缀匹配、全部清空
- 自动过滤自身发起的事件，避免重复处理

### 1.3 架构

```
┌─────────────┐     发布事件      ┌─────────────┐
│  服务 A      │ ────────────────> │  Redis      │
│ (主数据变更) │   CacheInvalidated │  Event Bus  │
└─────────────┘                     └──────┬──────┘
                                             │ 订阅事件
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                        ┌─────────┐   ┌─────────┐   ┌─────────┐
                        │ 服务 B  │   │ 服务 C  │   │ 服务 D  │
                        │(失效缓存)│   │(失效缓存)│   │(失效缓存)│
                        └─────────┘   └─────────┘   └─────────┘
```

---

## 2. 核心组件

### 2.1 缓存失效事件类型

事件类型：`EventType::CacheInvalidated`

事件 Payload：`CacheInvalidatedPayload`（定义在 `lib/shared-event/src/event/event_types.rs`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `source_service` | String | 发起失效的服务名称（如 "erp", "hrm"） |
| `source_instance` | String | 实例标识（hostname:pid），避免自身重复处理 |
| `cache_key_pattern` | String | 缓存键前缀，支持批量失效（如 "erp:dict:*"） |
| `invalidation_level` | String | 失效级别：specific / pattern / all |
| `reason` | Option<String> | 失效原因（如 "record_updated", "manual_flush"） |
| `invalidated_at` | DateTime<Utc> | 失效发生时间 |

### 2.2 失效级别

| 级别 | 说明 | 示例 |
|------|------|------|
| `specific` | 精确失效指定的缓存键 | `cache_key_pattern = "erp:dict:dict:tenant_123:all"` |
| `pattern` | 通配符匹配失效（前缀匹配） | `cache_key_pattern = "erp:dict:*"` |
| `all` | 清空整个缓存 | `cache_key_pattern = "*"` |

### 2.3 事件发布器

在 `EventPublisher` 中添加了 `publish_cache_invalidated` 方法（定义在 `lib/shared-event/src/event/publisher.rs`）：

```rust
pub async fn publish_cache_invalidated(
    &self,
    cache_key_pattern: &str,
    invalidation_level: &str,
    reason: Option<&str>,
) -> EventResult<()>
```

**使用示例**：

```rust
// 当字典类型更新时，发布缓存失效事件
event_publisher
    .publish_cache_invalidated("erp:dict:*", "pattern", Some("dict_type_updated"))
    .await?;
```

### 2.4 缓存失效监听器

在 `lib/shared-core/src/cache.rs` 中实现了以下核心组件：

#### 2.4.1 `CacheInvalidationHandler` trait

各服务实现此 trait，注册到 `CacheInvalidationListener` 中：

```rust
pub trait CacheInvalidationHandler: Send + Sync {
    fn name(&self) -> &str;
    fn handle_invalidation(&self, event: &CacheInvalidationEvent);
}
```

#### 2.4.2 `CacheInvalidationListener`

管理多个缓存失效处理器，接收缓存失效事件并分发：

```rust
pub struct CacheInvalidationListener {
    service_name: String,
    instance_id: String,
    handlers: Vec<Box<dyn CacheInvalidationHandler>>,
}
```

**主要方法**：
- `new(service_name)`: 创建新的监听器
- `register_handler(handler)`: 注册缓存失效处理器
- `dispatch_invalidation(event)`: 分发缓存失效事件（自动过滤自身发起的事件）

#### 2.4.3 `InMemoryCacheInvalidationHandler<T>`

通用的 InMemoryCache 失效处理器，用于失效基于 InMemoryCache 的本地缓存：

```rust
pub struct InMemoryCacheInvalidationHandler<T: Clone + Send + Sync + 'static> {
    name: String,
    cache: Arc<InMemoryCache<T>>,
    key_prefix: String,
}
```

---

## 3. 各服务集成指南

### 3.1 集成步骤

#### 步骤 1：创建缓存失效监听器

在服务启动时创建 `CacheInvalidationListener`：

```rust
use topems_shared_core::cache::CacheInvalidationListener;

let cache_invalidation_listener = Arc::new(CacheInvalidationListener::new("erp"));
```

#### 步骤 2：注册缓存失效处理器

为每个需要失效的缓存注册处理器：

```rust
use topems_shared_core::cache::InMemoryCacheInvalidationHandler;

// 为 dict_cache 注册处理器
let dict_cache_handler = InMemoryCacheInvalidationHandler::new(
    "erp_dict_cache",
    state.dict_cache.clone(),
    "erp:dict:",
);
cache_invalidation_listener.register_handler(dict_cache_handler);
```

#### 步骤 3：订阅缓存失效事件

使用 `EventSubscriber` 订阅 `CacheInvalidated` 事件，在回调中调用 `dispatch_invalidation`：

```rust
use topems_shared_event::event::{EventSubscriber, EventType};
use topems_shared_core::cache::CacheInvalidationEvent;

let listener = cache_invalidation_listener.clone();
let subscriber = EventSubscriber::new("erp")?
    .subscribe(vec![EventType::CacheInvalidated], move |event| {
        let listener = listener.clone();
        async move {
            if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                let invalidation_event = CacheInvalidationEvent {
                    source_service: payload.source_service,
                    source_instance: payload.source_instance,
                    cache_key_pattern: payload.cache_key_pattern,
                    invalidation_level: InvalidationLevel::from_str(&payload.invalidation_level),
                    reason: payload.reason,
                };
                listener.dispatch_invalidation(&invalidation_event);
            }
        }
    });

// 启动订阅（在后台任务中运行）
tokio::spawn(async move {
    subscriber.start().await;
});
```

#### 步骤 4：在主数据变更时发布缓存失效事件

在创建/更新/删除主数据时，发布缓存失效事件：

```rust
// 更新字典类型后，发布缓存失效事件
state.event_publisher
    .publish_cache_invalidated("erp:dict:*", "pattern", Some("dict_type_updated"))
    .await?;
```

### 3.2 各服务缓存键前缀参考

| 服务 | 缓存 | 键前缀 | 实体 |
|------|------|--------|------|
| MES | dict_cache | `mes:process_route:`, `mes:capacity:` | process_route, capacity |
| TMS | dict_cache | `tms:driver:`, `tms:vehicle:`, `tms:carrier:` | driver, vehicle, carrier |
| ERP | dict_cache | `erp:dict_type:` | dict_type |
| SCM | supplier_cache | `scm:supplier:` | supplier |
| HRM | employee_cache | `hrm:employee:` | employee |
| SRM | supplier_cache | `srm:supplier:` | supplier |
| QMS | dict_cache | `qms:quality_standard:` | quality_standard |
| PDM | dict_cache | `pdm:material:` | material |

---

## 4. 最佳实践

### 4.1 失效策略选择

| 场景 | 推荐失效级别 | 说明 |
|------|-------------|------|
| 单条记录更新 | `pattern` | 失效该实体的所有缓存（因为列表缓存包含多条记录） |
| 批量更新 | `pattern` 或 `all` | 根据影响范围选择 |
| 配置变更 | `all` | 清空整个缓存，确保所有配置生效 |
| 精确已知缓存键 | `specific` | 只失效指定的缓存键 |

### 4.2 避免缓存雪崩

- **随机化 TTL**：为不同缓存键设置略有差异的 TTL，避免大量缓存同时过期
- **缓存预热**：服务启动时预热常用数据，减少首次查询延迟
- **降级策略**：当缓存失效事件处理失败时，记录日志并继续，不阻塞主流程

### 4.3 监控与告警

- 监控缓存命中率（通过 Prometheus 指标 `topems_cache_hits_total` / `topems_cache_misses_total`）
- 监控缓存失效事件处理延迟
- 当缓存命中率持续低于阈值时触发告警

---

## 5. 相关文件

| 文件 | 说明 |
|------|------|
| `lib/shared-event/src/event/event_types.rs` | CacheInvalidatedPayload 定义 |
| `lib/shared-event/src/event/publisher.rs` | EventPublisher::publish_cache_invalidated 方法 |
| `lib/shared-event/src/event/subscriber.rs` | EventSubscriber 事件订阅器 |
| `lib/shared-core/src/cache.rs` | CacheInvalidationListener、CacheInvalidationHandler、InMemoryCacheInvalidationHandler |
| `docs/assessments/cache-deep-optimization-plan-2026-09-11.md` | 缓存深化优化计划 |
| `docs/assessments/cache-key-naming-standard-2026-09-11.md` | 缓存 Key 命名规范 |
| `docs/assessments/cache-monitoring-prometheus-guide-2026-09-11.md` | 缓存命中率监控指南 |

---

## 6. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-09-11 | 初始版本，定义事件驱动缓存失效机制的核心组件和集成指南 |

---

**文档结束**
