# 多级缓存监控指南

**日期**：2026-09-11
**适用对象**：TOPEMS 项目所有使用 AsyncL2Cache 的服务
**监控系统**：Prometheus + Grafana

## 一、概述

本文档介绍 TOPEMS 项目中多级缓存（AsyncL2Cache）的监控指标定义、使用方法和集成指南。

多级缓存架构：
- **L1 (Hot Cache)**：moka 进程内缓存，超低延迟，LRU 淘汰，TTL 过期
- **L2 (Warm Cache)**：Redis 分布式缓存，跨实例共享

## 二、监控指标定义

### 2.1 L1 缓存指标

| 指标名 | 类型 | 标签 | 说明 |
|--------|------|------|------|
| `topems_l1_cache_hits_total` | Counter | service, entity, operation | L1 缓存命中总数 |
| `topems_l1_cache_misses_total` | Counter | service, entity, operation | L1 缓存未命中总数 |
| `topems_l1_cache_entries` | Gauge | service, entity | L1 缓存当前条目数 |

### 2.2 L2 缓存指标

| 指标名 | 类型 | 标签 | 说明 |
|--------|------|------|------|
| `topems_l2_cache_hits_total` | Counter | service, entity, operation | L2 缓存命中总数 |
| `topems_l2_cache_misses_total` | Counter | service, entity, operation | L2 缓存未命中总数 |
| `topems_l2_cache_sets_total` | Counter | service, entity, operation | L2 缓存写入总数 |
| `topems_l2_cache_removals_total` | Counter | service, entity, operation | L2 缓存失效总数 |
| `topems_l2_cache_connected` | Gauge | service | L2 缓存连接状态（1=已连接，0=未连接） |

### 2.3 通用缓存指标（兼容旧版）

| 指标名 | 类型 | 标签 | 说明 |
|--------|------|------|------|
| `topems_cache_hits_total` | Counter | service, entity, operation | 缓存命中总数（不区分 L1/L2） |
| `topems_cache_misses_total` | Counter | service, entity, operation | 缓存未命中总数（不区分 L1/L2） |
| `topems_cache_sets_total` | Counter | service, entity, operation | 缓存写入总数 |
| `topems_cache_removals_total` | Counter | service, entity, operation | 缓存失效总数 |
| `topems_cache_entries` | Gauge | service, entity | 缓存当前条目数 |

## 三、指标记录函数

### 3.1 L1 缓存指标记录函数

```rust
use topems_shared_core::l2_cache::{
    record_l1_cache_hit,
    record_l1_cache_miss,
    update_l1_cache_entries,
    l1_cache_hit_rate,
};

// 记录 L1 命中
record_l1_cache_hit("mes", "process_route", "list");

// 记录 L1 未命中
record_l1_cache_miss("mes", "process_route", "list");

// 更新 L1 条目数
update_l1_cache_entries("mes", "process_route", cache.l1_len() as i64);

// 计算 L1 命中率
let rate = l1_cache_hit_rate("mes", "process_route", "list");
```

### 3.2 L2 缓存指标记录函数

```rust
use topems_shared_core::l2_cache::{
    record_l2_cache_hit,
    record_l2_cache_miss,
    record_l2_cache_set,
    record_l2_cache_remove,
    set_l2_cache_connected,
    l2_cache_hit_rate,
};

// 记录 L2 命中
record_l2_cache_hit("mes", "process_route", "list");

// 记录 L2 未命中
record_l2_cache_miss("mes", "process_route", "list");

// 记录 L2 写入
record_l2_cache_set("mes", "process_route", "list");

// 记录 L2 失效
record_l2_cache_remove("mes", "process_route", "list");

// 设置 L2 连接状态
set_l2_cache_connected("mes", cache.has_l2());

// 计算 L2 命中率
let rate = l2_cache_hit_rate("mes", "process_route", "list");
```

## 四、各服务集成指南

### 4.0 AsyncL2Cache 内部集成指标（推荐）

AsyncL2Cache 已内置指标记录功能，只需在创建缓存时通过 `with_metrics()` 方法启用，即可自动记录 L1/L2 缓存命中/未命中/写入/失效指标和 L2 连接状态指标，无需在调用方手动记录。

**启用方法**：

```rust
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};

// 创建配置并启用监控指标
let config = L2CacheConfig::default()
    .with_metrics("mes", "process_route");  // service=mes, entity=process_route

// 创建缓存（带 L2）
let cache = AsyncL2Cache::try_new(config, Some("redis://localhost:6379")).await
    .unwrap_or_else(|(cache, warn)| {
        tracing::warn!("{}", warn);
        cache
    });

// 之后调用 cache.get()/set()/remove() 会自动记录指标
```

**自动记录的指标**：

| 操作 | 自动记录的指标 |
|------|---------------|
| `get()` L1 命中 | `topems_l1_cache_hits_total{service,entity,operation="get"}` |
| `get()` L1 未命中 | `topems_l1_cache_misses_total{service,entity,operation="get"}` |
| `get()` L2 命中 | `topems_l2_cache_hits_total{service,entity,operation="get"}` |
| `get()` L2 未命中 | `topems_l2_cache_misses_total{service,entity,operation="get"}` |
| `set()` L2 写入 | `topems_l2_cache_sets_total{service,entity,operation="set"}` |
| `remove()` L2 失效 | `topems_l2_cache_removals_total{service,entity,operation="remove"}` |
| `try_new()` 成功 | `topems_l2_cache_connected{service}=1` |
| `try_new()` 降级 | `topems_l2_cache_connected{service}=0` |
| `new_l1_only()` | `topems_l2_cache_connected{service}=0` |

**注意事项**：
- `with_metrics()` 需要同时设置 `service` 和 `entity`，只有一个设置时不会启用指标记录
- 指标记录是可选的，不设置 `with_metrics()` 时不会记录任何指标
- 内部集成指标与手动记录指标可以共存，但建议选择一种方式，避免重复记录

### 4.1 集成步骤（手动记录，不推荐）

> **注意**：推荐使用 4.0 节的 AsyncL2Cache 内部集成指标，无需手动记录。以下手动记录方式仅用于兼容旧代码或特殊场景。

1. **导入指标记录函数**
   ```rust
   use topems_shared_core::l2_cache::{
       record_l1_cache_hit, record_l1_cache_miss,
       record_l2_cache_hit, record_l2_cache_miss,
       record_l2_cache_set, record_l2_cache_remove,
       update_l1_cache_entries, set_l2_cache_connected,
   };
   ```

2. **在缓存查询中记录指标**
   ```rust
   // 先查 L1
   if let Some(v) = cache.get(key).await {
       record_l1_cache_hit("mes", "process_route", "list");
       return Ok(v);
   }
   record_l1_cache_miss("mes", "process_route", "list");
   
   // L1 miss，查 L2（AsyncL2Cache 内部会自动处理）
   // 如果 L2 命中，AsyncL2Cache 会回填 L1
   // 注意：如果使用了 AsyncL2Cache 内部集成指标，无需在此手动记录
   ```

3. **在缓存写入中记录指标**
   ```rust
   cache.set(key, value).await;
   record_l2_cache_set("mes", "process_route", "list");
   ```

4. **在缓存删除中记录指标**
   ```rust
   cache.remove(key).await;
   record_l2_cache_remove("mes", "process_route", "list");
   ```

5. **在服务启动时设置 L2 连接状态**
   ```rust
   set_l2_cache_connected("mes", cache.has_l2());
   ```

6. **定期更新 L1 条目数**（可选，建议在定时任务中更新）
   ```rust
   update_l1_cache_entries("mes", "process_route", cache.l1_len() as i64);
   ```

### 4.2 集成示例（MES 服务）

```rust
// MES 服务 process_route 列表查询
pub async fn list_process_routes(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<Vec<ProcessRoute>>, AppError> {
    let cache_key = format!("mes:process_route:list:{}", claims.tenant_id);
    
    // 查缓存
    if let Some(data) = state.dict_cache.get(&cache_key).await {
        record_l1_cache_hit("mes", "process_route", "list");
        // 注意：这里无法区分是 L1 命中还是 L2 命中
        // AsyncL2Cache.get() 内部会先查 L1，miss 再查 L2
        // 如果需要精确区分，需要修改 AsyncL2Cache 内部实现
        return Ok(Json(data));
    }
    record_l1_cache_miss("mes", "process_route", "list");
    
    // 回源查询数据库
    let routes = sqlx::query_as::<_, ProcessRoute>(...)
        .fetch_all(&state.pool)
        .await?;
    
    // 写入缓存
    state.dict_cache.set(cache_key, routes.clone()).await;
    record_l2_cache_set("mes", "process_route", "list");
    
    Ok(Json(routes))
}
```

## 五、Grafana 仪表盘配置

### 5.1 缓存命中率面板

**PromQL 查询**：

```promql
# L1 命中率（按服务）
sum(rate(topems_l1_cache_hits_total[5m])) by (service) 
/ 
(sum(rate(topems_l1_cache_hits_total[5m])) by (service) + sum(rate(topems_l1_cache_misses_total[5m])) by (service))

# L2 命中率（按服务）
sum(rate(topems_l2_cache_hits_total[5m])) by (service) 
/ 
(sum(rate(topems_l2_cache_hits_total[5m])) by (service) + sum(rate(topems_l2_cache_misses_total[5m])) by (service))

# 总体命中率（按服务）
sum(rate(topems_cache_hits_total[5m])) by (service) 
/ 
(sum(rate(topems_cache_hits_total[5m])) by (service) + sum(rate(topems_cache_misses_total[5m])) by (service))
```

### 5.2 缓存请求量面板

**PromQL 查询**：

```promql
# L1 请求量（按服务）
sum(rate(topems_l1_cache_hits_total[5m]) + rate(topems_l1_cache_misses_total[5m])) by (service)

# L2 请求量（按服务）
sum(rate(topems_l2_cache_hits_total[5m]) + rate(topems_l2_cache_misses_total[5m])) by (service)

# L2 写入量（按服务）
sum(rate(topems_l2_cache_sets_total[5m])) by (service)

# L2 失效量（按服务）
sum(rate(topems_l2_cache_removals_total[5m])) by (service)
```

### 5.3 缓存条目数面板

**PromQL 查询**：

```promql
# L1 条目数（按服务）
sum(topems_l1_cache_entries) by (service)

# 总条目数（按服务）
sum(topems_cache_entries) by (service)
```

### 5.4 Redis 连接状态面板

**PromQL 查询**：

```promql
# L2 连接状态（按服务）
topems_l2_cache_connected
```

### 5.5 告警规则

```yaml
# L1 命中率过低告警
- alert: L1CacheHitRateLow
  expr: |
    sum(rate(topems_l1_cache_hits_total[5m])) by (service) 
    / 
    (sum(rate(topems_l1_cache_hits_total[5m])) by (service) + sum(rate(topems_l1_cache_misses_total[5m])) by (service))
    < 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "L1 缓存命中率过低"
    description: "服务 {{ $labels.service }} 的 L1 缓存命中率低于 50%，当前值 {{ $value | humanizePercentage }}"

# L2 连接断开告警
- alert: L2CacheDisconnected
  expr: topems_l2_cache_connected == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "L2 缓存连接断开"
    description: "服务 {{ $labels.service }} 的 L2 缓存（Redis）连接已断开"

# L2 错误率过高告警
- alert: L2CacheErrorRateHigh
  expr: |
    sum(rate(topems_l2_cache_misses_total[5m])) by (service) 
    / 
    (sum(rate(topems_l2_cache_hits_total[5m])) by (service) + sum(rate(topems_l2_cache_misses_total[5m])) by (service))
    > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "L2 缓存未命中率过高"
    description: "服务 {{ $labels.service }} 的 L2 缓存未命中率超过 80%，当前值 {{ $value | humanizePercentage }}"
```

## 六、最佳实践

### 6.1 指标标签规范

- **service**：服务名称，如 `mes`、`tms`、`erp`、`wms` 等
- **entity**：缓存实体名称，如 `process_route`、`driver`、`supplier` 等
- **operation**：操作类型，如 `list`、`get`、`search` 等

### 6.2 指标记录时机

- **L1 命中**：在 `cache.get()` 返回 Some 时记录
- **L1 未命中**：在 `cache.get()` 返回 None 时记录
- **L2 写入**：在 `cache.set()` 后记录
- **L2 失效**：在 `cache.remove()` 后记录
- **L2 连接状态**：在服务启动时和 Redis 连接状态变化时记录
- **L1 条目数**：定期更新（建议每 30 秒或 1 分钟）

### 6.3 注意事项

1. **AsyncL2Cache 内部不记录指标**：当前 AsyncL2Cache 的 get/set/remove 方法内部不记录指标，需要在调用方记录
2. **无法精确区分 L1/L2 命中**：AsyncL2Cache.get() 内部会先查 L1，miss 再查 L2，调用方无法精确区分是 L1 命中还是 L2 命中
3. **性能影响**：指标记录本身有轻微性能影响，但可以忽略不计
4. **高基数问题**：避免使用高基数标签（如 tenant_id、user_id），以免导致 Prometheus 性能问题

## 七、后续优化计划

1. **AsyncL2Cache 内部集成指标**：修改 AsyncL2Cache 内部实现，自动记录 L1/L2 命中/未命中指标
2. **缓存延迟指标**：添加缓存查询延迟指标（Histogram）
3. **缓存大小指标**：添加缓存内存使用量指标
4. **自动仪表盘**：提供预配置的 Grafana 仪表盘 JSON

## 八、附录

### 8.1 相关文件

- 指标定义：`lib/shared-core/src/metrics.rs`
- 指标记录函数：`lib/shared-core/src/l2_cache.rs`
- 缓存实现：`lib/shared-core/src/l2_cache.rs`
- 旧版缓存指标：`lib/shared-core/src/cache.rs`

### 8.2 测试命令

```bash
# 运行所有 l2_cache 测试
cargo test -p topems-shared-core --lib l2_cache::tests

# 运行需要 Redis 的测试
cargo test -p topems-shared-core --lib l2_cache::tests -- --ignored
```
