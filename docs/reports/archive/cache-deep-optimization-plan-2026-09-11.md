# TOPEMS 缓存深化优化建议

**日期**：2026-09-11
**版本**：v1.0
**范围**：全服务缓存深化优化（失效机制、监控、最佳实践）

---

## 一、现有缓存使用情况总结

### 1.1 已有缓存的服务

| 服务 | 缓存名 | 类型 | TTL | 用途 |
|------|--------|------|-----|------|
| WMS | warehouse_cache | InMemoryCache<Value> | 300s | 仓库数据 |
| WMS | inventory_cache | InMemoryCache<Value> | 120s | 库存数据 |
| WMS | dict_cache | InMemoryCache<Value> | 600s | 字典数据 |
| CRM | customer_cache | InMemoryCache<Customer> | 3600s | 客户数据 |
| CRM | dashboard_cache | InMemoryCache<Value> | 300s | Dashboard 统计 |
| ERP | dict_cache | InMemoryCache<Value> | 600s | 字典数据 |
| LIMS | instrument_cache | InMemoryCache<Value> | 1800s | 仪器数据 |
| SCM | supplier_cache | InMemoryCache<Value> | - | 供应商数据 |
| SCM | purchase_cache | InMemoryCache<Value> | - | 采购数据 |
| SCM | dict_cache | InMemoryCache<String> | - | 字典数据 |
| SCM | cache | Option<RedisCacheService> | - | Redis 分布式缓存 |
| MES | dict_cache | InMemoryCache<Value> | 600s | 字典数据（本次新增） |

### 1.2 缓存实现最佳实践（WMS 模式）

**缓存 Key 设计**：
```rust
// 单条数据缓存：包含 tenant_id 和 id
fn warehouse_cache_key(tenant_id: Uuid, id: Uuid) -> String {
    format!("warehouse:{}:{}", tenant_id, id)
}

// 列表缓存：包含 tenant_id、分页参数和过滤条件
fn warehouse_list_cache_key(
    tenant_id: Uuid,
    page: i32,
    page_size: i32,
    search: &Option<String>,
    status: &Option<String>,
) -> String {
    format!("warehouse:list:{}:{}:{}:{}:{}", 
        tenant_id, page, page_size, 
        search.as_deref().unwrap_or(""), 
        status.as_deref().unwrap_or(""))
}
```

**缓存读取模式**：
```rust
let cache_key = warehouse_cache_key(tenant_id, id);
if let Some(cached) = state.warehouse_cache.get(&cache_key) {
    tracing::debug!("📋 仓库缓存命中: {}", cache_key);
    return Json(ApiResponse::success(cached, "获取成功"));
}

// 未命中，查询数据库
let warehouse = query_warehouse_from_db(&state.pool, tenant_id, id).await?;

// 写入缓存
state.warehouse_cache.set(cache_key, warehouse.clone());
```

**缓存失效模式**：
```rust
// 创建/更新/删除时，清除相关缓存
state.warehouse_cache.remove(&cache_key);
state.warehouse_cache.clear(); // 清除列表缓存（或精确失效）
tracing::debug!("🗑️ 仓库缓存已失效: {}", cache_key);
```

---

## 二、基于事件的缓存失效机制

### 2.1 当前问题

当前缓存失效主要采用**主动清除**模式（数据变更时手动调用 `cache.remove()` 或 `cache.clear()`），存在以下问题：

1. **遗漏风险**：新增数据变更路径时容易忘记清除缓存
2. **跨服务失效**：一个服务的数据变更无法自动失效其他服务的缓存
3. **批量失效困难**：批量数据变更时需要循环清除缓存
4. **缺乏统一机制**：每个服务自行实现，模式不统一

### 2.2 解决方案：基于事件的缓存失效

利用项目已有的 `EventPublisher` 事件发布机制，实现统一的缓存失效：

#### 2.2.1 定义缓存失效事件

```rust
// lib/shared-event/src/cache_invalidation.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheInvalidationEvent {
    pub service: String,        // 服务名（如 "wms", "crm"）
    pub entity_type: String,    // 实体类型（如 "warehouse", "customer"）
    pub entity_id: Option<Uuid>, // 实体 ID（None 表示该类型全部失效）
    pub tenant_id: Option<Uuid>, // 租户 ID（None 表示全局失效）
    pub operation: CacheOperation, // 操作类型
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CacheOperation {
    Create,
    Update,
    Delete,
    BulkUpdate,
}

impl CacheInvalidationEvent {
    pub fn new(service: &str, entity_type: &str, operation: CacheOperation) -> Self {
        Self {
            service: service.to_string(),
            entity_type: entity_type.to_string(),
            entity_id: None,
            tenant_id: None,
            operation,
        }
    }

    pub fn with_entity_id(mut self, id: Uuid) -> Self {
        self.entity_id = Some(id);
        self
    }

    pub fn with_tenant_id(mut self, tenant_id: Uuid) -> Self {
        self.tenant_id = Some(tenant_id);
        self
    }
}
```

#### 2.2.2 发布缓存失效事件

```rust
// 在数据变更时发布事件
use topems_shared_event::cache_invalidation::{CacheInvalidationEvent, CacheOperation};

async fn update_warehouse(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    // ... 更新数据库 ...

    // 发布缓存失效事件
    if let Some(publisher) = &state.event_publisher {
        let event = CacheInvalidationEvent::new("wms", "warehouse", CacheOperation::Update)
            .with_entity_id(id)
            .with_tenant_id(tenant_id);
        publisher.publish("cache.invalidation", &event).await.ok();
    }

    // 同时主动清除本地缓存（双重保险）
    state.warehouse_cache.remove(&cache_key);
}
```

#### 2.2.3 订阅缓存失效事件

```rust
// 在服务启动时订阅缓存失效事件
use topems_shared_event::cache_invalidation::CacheInvalidationEvent;

async fn subscribe_cache_invalidation(state: AppState) {
    if let Some(publisher) = &state.event_publisher {
        let mut rx = publisher.subscribe::<CacheInvalidationEvent>("cache.invalidation");
        let state = state.clone();

        tokio::spawn(async move {
            while let Ok(event) = rx.recv().await {
                handle_cache_invalidation(&state, event).await;
            }
        });
    }
}

async fn handle_cache_invalidation(state: &AppState, event: CacheInvalidationEvent) {
    // 只处理本服务相关的事件
    if event.service != "wms" {
        return;
    }

    match event.entity_type.as_str() {
        "warehouse" => {
            if let (Some(tenant_id), Some(entity_id)) = (event.tenant_id, event.entity_id) {
                let key = format!("warehouse:{}:{}", tenant_id, entity_id);
                state.warehouse_cache.remove(&key);
            } else {
                // 全局失效
                state.warehouse_cache.clear();
            }
        }
        "inventory" => {
            state.inventory_cache.clear();
        }
        _ => {}
    }

    tracing::info!("🗑️ 缓存失效事件处理: {:?}", event);
}
```

### 2.3 缓存失效策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 主动清除（当前） | 简单直接，实时性高 | 容易遗漏，跨服务失效困难 | 单服务内数据变更 |
| TTL 过期 | 无需主动管理，自动失效 | 数据变更后仍有一段时间不一致 | 读多写少，允许短暂不一致 |
| 事件驱动（建议） | 统一机制，跨服务失效，实时性高 | 实现复杂，依赖事件系统 | 多服务共享数据，要求强一致性 |
| 混合模式（推荐） | 兼顾实时性和可靠性 | 实现稍复杂 | 生产环境推荐 |

**推荐方案**：主动清除 + TTL 过期 + 事件驱动（三重保险）
1. 数据变更时主动清除本地缓存
2. 发布缓存失效事件，通知其他服务
3. 设置合理的 TTL，作为最终兜底

---

## 三、缓存命中率监控

### 3.1 当前问题

当前缓存使用 `tracing::debug!` 记录缓存命中日志，但缺乏：
1. **统一的指标收集**：无法统计缓存命中率
2. **可视化监控**：无法在 Grafana 中查看缓存性能
3. **告警机制**：缓存命中率过低时无法及时告警

### 3.2 解决方案：缓存命中率监控指标

#### 3.2.1 定义缓存指标结构体

```rust
// lib/shared-core/src/cache_metrics.rs
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

#[derive(Debug, Default)]
pub struct CacheMetrics {
    hits: AtomicU64,
    misses: AtomicU64,
    evictions: AtomicU64,
    size: AtomicU64,
}

impl CacheMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_hit(&self) {
        self.hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_miss(&self) {
        self.misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_eviction(&self) {
        self.evictions.fetch_add(1, Ordering::Relaxed);
    }

    pub fn set_size(&self, size: u64) {
        self.size.store(size, Ordering::Relaxed);
    }

    pub fn hits(&self) -> u64 {
        self.hits.load(Ordering::Relaxed)
    }

    pub fn misses(&self) -> u64 {
        self.misses.load(Ordering::Relaxed)
    }

    pub fn total_requests(&self) -> u64 {
        self.hits() + self.misses()
    }

    pub fn hit_rate(&self) -> f64 {
        let total = self.total_requests();
        if total == 0 {
            0.0
        } else {
            self.hits() as f64 / total as f64
        }
    }

    pub fn evictions(&self) -> u64 {
        self.evictions.load(Ordering::Relaxed)
    }

    pub fn size(&self) -> u64 {
        self.size.load(Ordering::Relaxed)
    }

    pub fn reset(&self) {
        self.hits.store(0, Ordering::Relaxed);
        self.misses.store(0, Ordering::Relaxed);
        self.evictions.store(0, Ordering::Relaxed);
    }
}

pub type SharedCacheMetrics = Arc<CacheMetrics>;
```

#### 3.2.2 集成到缓存读取

```rust
// 带指标的缓存读取辅助函数
pub async fn cached_get<T, F, Fut>(
    cache: &InMemoryCache<T>,
    metrics: &CacheMetrics,
    key: &str,
    loader: F,
) -> Result<T, Error>
where
    T: Clone + Send + Sync + 'static,
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, Error>>,
{
    if let Some(cached) = cache.get(key) {
        metrics.record_hit();
        return Ok(cached);
    }

    metrics.record_miss();
    let value = loader().await?;
    cache.set(key.to_string(), value.clone());
    Ok(value)
}
```

#### 3.2.3 暴露 Prometheus 指标

```rust
// 在 /metrics 端点中添加缓存指标
use prometheus::{Counter, Gauge, Registry, Opts};

pub struct CachePrometheusMetrics {
    pub hits: Counter,
    pub misses: Counter,
    pub hit_rate: Gauge,
    pub size: Gauge,
}

impl CachePrometheusMetrics {
    pub fn new(registry: &Registry, service: &str, cache_name: &str) -> Self {
        let hits = Counter::with_opts(Opts::new(
            format!("{}_cache_hits_total", service),
            format!("{} {} cache hits", service, cache_name),
        ).const_label("cache", cache_name)).unwrap();

        let misses = Counter::with_opts(Opts::new(
            format!("{}_cache_misses_total", service),
            format!("{} {} cache misses", service, cache_name),
        ).const_label("cache", cache_name)).unwrap();

        let hit_rate = Gauge::with_opts(Opts::new(
            format!("{}_cache_hit_rate", service),
            format!("{} {} cache hit rate", service, cache_name),
        ).const_label("cache", cache_name)).unwrap();

        let size = Gauge::with_opts(Opts::new(
            format!("{}_cache_size", service),
            format!("{} {} cache size", service, cache_name),
        ).const_label("cache", cache_name)).unwrap();

        registry.register(Box::new(hits.clone())).unwrap();
        registry.register(Box::new(misses.clone())).unwrap();
        registry.register(Box::new(hit_rate.clone())).unwrap();
        registry.register(Box::new(size.clone())).unwrap();

        Self { hits, misses, hit_rate, size }
    }

    pub fn record_hit(&self) {
        self.hits.inc();
        self.update_hit_rate();
    }

    pub fn record_miss(&self) {
        self.misses.inc();
        self.update_hit_rate();
    }

    fn update_hit_rate(&self) {
        let total = self.hits.get() + self.misses.get();
        if total > 0 {
            self.hit_rate.set(self.hits.get() as f64 / total as f64);
        }
    }

    pub fn set_size(&self, size: f64) {
        self.size.set(size);
    }
}
```

### 3.3 缓存监控仪表盘建议

**Grafana 仪表盘面板**：

| 面板 | 指标 | 图表类型 | 告警阈值 |
|------|------|----------|----------|
| 缓存命中率 | cache_hit_rate | 仪表盘 | < 80% 告警 |
| 缓存请求量 | cache_hits_total + cache_misses_total | 折线图 | - |
| 缓存命中/未命中 | cache_hits_total, cache_misses_total | 堆叠柱状图 | - |
| 缓存大小 | cache_size | 面积图 | > 容量 80% 告警 |
| 缓存淘汰数 | cache_evictions_total | 折线图 | 突增告警 |
| 各缓存命中率对比 | cache_hit_rate by cache_name | 横向柱状图 | - |

**关键指标定义**：
- **缓存命中率** = 命中次数 / (命中次数 + 未命中次数)
- **目标命中率**：字典数据 > 95%，业务数据 > 70%，统计数据 > 50%
- **告警阈值**：整体命中率 < 80% 持续 5 分钟

---

## 四、后续优化建议

### 4.1 短期优化（1-2 周）

1. **MES 缓存应用**：在 MES 服务的字典查询（工艺路线、工作中心、物料分类）中应用 dict_cache
2. **TMS 缓存添加**：在 TMS 服务中添加字典缓存（运输方式、车辆类型、司机信息）
3. **缓存 Key 规范化**：统一所有服务的缓存 Key 命名规范（`service:entity:tenant_id:id`）
4. **缓存日志增强**：在缓存命中/未命中时添加结构化日志，便于调试

### 4.2 中期优化（2-4 周）

1. **事件驱动缓存失效**：实现基于 EventPublisher 的缓存失效机制，支持跨服务失效
2. **缓存命中率监控**：集成 Prometheus 指标，添加 Grafana 监控仪表盘
3. **缓存预热**：服务启动时预热常用字典数据，避免首次请求缓存未命中
4. **多级缓存**：实现本地缓存 + Redis 分布式缓存的多级缓存架构

### 4.3 长期优化（1-2 月）

1. **缓存自动调优**：根据访问模式自动调整 TTL 和容量
2. **缓存穿透防护**：使用布隆过滤器防止缓存穿透
3. **缓存雪崩防护**：使用随机 TTL 和熔断机制防止缓存雪崩
4. **缓存降级策略**：缓存不可用时的降级方案（直接查询数据库或返回默认值）

---

## 五、总结

### 5.1 本次完成的工作

1. **现有缓存分析**：梳理了 6 个服务的 11 个缓存实例，总结了 WMS 缓存最佳实践
2. **MES 缓存添加**：在 MES 服务的 AppState 中添加了 dict_cache 字段（TTL 10 分钟）
3. **SCM 缓存确认**：确认 SCM 服务已有完整缓存实现（supplier/purchase/dict/Redis）
4. **缓存失效机制设计**：提出基于事件的缓存失效方案，包含完整代码示例
5. **缓存监控设计**：提出缓存命中率监控方案，包含 Prometheus 指标和 Grafana 仪表盘建议

### 5.2 缓存优化预期收益

| 优化项 | 预期收益 | 实施难度 |
|--------|---------|----------|
| MES 字典缓存 | 减少 50% 字典查询数据库压力 | 低 |
| 事件驱动失效 | 提高数据一致性，减少缓存不一致问题 | 中 |
| 缓存命中率监控 | 及时发现缓存性能问题，优化缓存策略 | 中 |
| 多级缓存 | 提高缓存可靠性，支持分布式部署 | 高 |

### 5.3 推荐实施顺序

1. **第一优先级**：MES 缓存应用（简单，收益明显）
2. **第二优先级**：缓存命中率监控（可观测性基础，便于后续优化）
3. **第三优先级**：事件驱动缓存失效（提高数据一致性）
4. **第四优先级**：多级缓存和自动调优（高级优化，长期收益）

---

**文档生成时间**：2026-09-11
**适用版本**：TOPEMS v1.0
**缓存库**：moka v0.12（本地缓存）、redis v0.24（分布式缓存）
