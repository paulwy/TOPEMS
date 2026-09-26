# 缓存命中率监控与 Prometheus 指标集成指南

**日期**: 2026-09-11
**版本**: v1.0
**适用范围**: TOPEMS 所有服务的本地内存缓存（dict_cache、employee_cache、supplier_cache 等）

---

## 1. 概述

本文档描述 TOPEMS 系统中缓存命中率监控的实现方案，包括 Prometheus 指标定义、指标记录方式、Grafana 仪表盘配置，以及各服务的集成指南。

### 1.1 目标

- 实时监控各服务、各实体的缓存命中率
- 识别缓存效果不佳的接口，优化缓存策略
- 监控缓存条目数、淘汰情况，评估缓存容量配置
- 为容量规划和性能优化提供数据支撑

### 1.2 监控范围

| 指标类型 | 说明 |
|---------|------|
| 缓存命中数 | 按 service、entity、operation 分类 |
| 缓存未命中数 | 按 service、entity、operation 分类 |
| 缓存写入数 | 按 service、entity、operation 分类 |
| 缓存失效数 | 按 service、entity、operation 分类 |
| 缓存条目数 | 按 service、entity 分类（Gauge） |

---

## 2. Prometheus 指标定义

所有缓存指标定义在 `lib/shared-core/src/metrics.rs` 中，使用 `LazyLock` 延迟初始化。

### 2.1 指标列表

| 指标名 | 类型 | 标签 | 说明 |
|--------|------|------|------|
| `topems_cache_hits_total` | CounterVec | service, entity, operation | 缓存命中总数 |
| `topems_cache_misses_total` | CounterVec | service, entity, operation | 缓存未命中总数 |
| `topems_cache_sets_total` | CounterVec | service, entity, operation | 缓存写入总数 |
| `topems_cache_removals_total` | CounterVec | service, entity, operation | 缓存失效总数 |
| `topems_cache_entries` | GaugeVec | service, entity | 当前缓存条目数 |

### 2.2 标签定义

- **service**: 服务名（mes、tms、wms、erp、scm、hrm、srm、qms、pdm 等）
- **entity**: 实体名（process_route、capacity、driver、vehicle、warehouse、dict_type、supplier、employee、quality_standard、material 等）
- **operation**: 操作类型（get、list、aggregate、dashboard、search、dict 等）

### 2.3 指标初始化

在 `lib/shared-core/src/metrics.rs` 的 `init_metrics()` 函数中初始化所有缓存指标：

```rust
pub fn init_metrics() {
    // ... 其他指标 ...
    LazyLock::force(&CACHE_HITS_TOTAL);
    LazyLock::force(&CACHE_MISSES_TOTAL);
    LazyLock::force(&CACHE_SETS_TOTAL);
    LazyLock::force(&CACHE_REMOVALS_TOTAL);
    LazyLock::force(&CACHE_ENTRIES);
}
```

各服务在启动时调用 `topems_shared_core::metrics::init_metrics()` 完成指标注册。

---

## 3. 指标记录 API

所有指标记录函数定义在 `lib/shared-core/src/cache.rs` 中。

### 3.1 函数列表

| 函数名 | 说明 | 参数 |
|--------|------|------|
| `record_cache_hit(service, entity, operation)` | 记录缓存命中 | service: &str, entity: &str, operation: &str |
| `record_cache_miss(service, entity, operation)` | 记录缓存未命中 | 同上 |
| `record_cache_set(service, entity, operation)` | 记录缓存写入 | 同上 |
| `record_cache_remove(service, entity, operation)` | 记录缓存失效 | 同上 |
| `update_cache_entries(service, entity, count)` | 更新缓存条目数 | service: &str, entity: &str, count: i64 |
| `cache_hit_rate(service, entity, operation)` | 计算缓存命中率 | 同上，返回 f64（0.0 ~ 1.0） |

### 3.2 使用示例

```rust
use topems_shared_core::cache::{
    record_cache_hit, record_cache_miss, record_cache_set,
};

pub async fn list_process_routes(...) -> Json<ApiResponse<Value>> {
    let cache_key = format!("mes:process_route:list:{}:page:{}", tenant_id, page);

    // 检查缓存
    if let Some(cached) = state.dict_cache.get(&cache_key) {
        record_cache_hit("mes", "process_route", "list");
        return Json(ApiResponse::success(cached, "成功"));
    }

    // 缓存未命中
    record_cache_miss("mes", "process_route", "list");

    // 查询数据库...
    let data = query_database().await?;

    // 写入缓存
    state.dict_cache.set(cache_key, data.clone());
    record_cache_set("mes", "process_route", "list");

    Json(ApiResponse::success(data, "成功"))
}
```

---

## 4. 各服务集成指南

### 4.1 已集成服务

| 服务 | 实体 | 操作 | 状态 |
|------|------|------|------|
| MES | process_route | list | ✅ 已集成 |
| MES | capacity | list | ⏳ 待集成 |
| TMS | driver | list | ⏳ 待集成 |
| TMS | vehicle | list | ⏳ 待集成 |
| TMS | carrier | list | ⏳ 待集成 |
| ERP | dict_type | dict | ⏳ 待集成 |
| SCM | supplier | get/list | ⏳ 待集成 |
| HRM | employee | get | ⏳ 待集成 |
| SRM | supplier | get/list | ⏳ 待集成 |
| QMS | quality_standard | list | ⏳ 待集成 |
| PDM | material | list | ⏳ 待集成 |

### 4.2 集成步骤

1. **导入指标记录函数**：
   ```rust
   use topems_shared_core::cache::{
       record_cache_hit, record_cache_miss, record_cache_set, record_cache_remove,
   };
   ```

2. **在缓存命中时记录**：
   ```rust
   if let Some(cached) = state.dict_cache.get(&cache_key) {
       record_cache_hit("service", "entity", "operation");
       return Json(ApiResponse::success(cached, "成功"));
   }
   ```

3. **在缓存未命中时记录**（在缓存检查之后、数据库查询之前）：
   ```rust
   record_cache_miss("service", "entity", "operation");
   ```

4. **在缓存写入时记录**：
   ```rust
   state.dict_cache.set(cache_key, data.clone());
   record_cache_set("service", "entity", "operation");
   ```

5. **在缓存失效时记录**（创建/更新/删除操作中）：
   ```rust
   state.dict_cache.clear();
   record_cache_remove("service", "entity", "operation");
   ```

### 4.3 验证集成

启动服务后，访问 Prometheus metrics 端点（通常是 `/metrics`），检查缓存指标是否出现：

```bash
curl http://localhost:8080/metrics | grep topems_cache
```

预期输出：
```
topems_cache_hits_total{service="mes",entity="process_route",operation="list"} 42
topems_cache_misses_total{service="mes",entity="process_route",operation="list"} 10
topems_cache_sets_total{service="mes",entity="process_route",operation="list"} 10
topems_cache_entries{service="mes",entity="process_route"} 5
```

---

## 5. Grafana 仪表盘配置

### 5.1 核心面板

#### 面板 1：缓存命中率（按服务）

**PromQL**:
```promql
sum(rate(topems_cache_hits_total[5m])) by (service) / 
(sum(rate(topems_cache_hits_total[5m])) by (service) + sum(rate(topems_cache_misses_total[5m])) by (service))
```

**可视化**: 仪表盘（Gauge），阈值：
- 绿色: > 80%
- 黄色: 60% ~ 80%
- 红色: < 60%

#### 面板 2：缓存命中/未命中趋势

**PromQL**:
```promql
sum(rate(topems_cache_hits_total[5m])) by (service, entity)
sum(rate(topems_cache_misses_total[5m])) by (service, entity)
```

**可视化**: 多系列折线图，时间范围 1 小时

#### 面板 3：缓存条目数（按服务）

**PromQL**:
```promql
topems_cache_entries
```

**可视化**: 柱状图，按 service、entity 分组

#### 面板 4：缓存写入/失效速率

**PromQL**:
```promql
sum(rate(topems_cache_sets_total[5m])) by (service, entity)
sum(rate(topems_cache_removals_total[5m])) by (service, entity)
```

**可视化**: 多系列折线图

#### 面板 5：低命中率实体 Top 10

**PromQL**:
```promql
bottomk(10, 
  sum(rate(topems_cache_hits_total[5m])) by (service, entity) / 
  (sum(rate(topems_cache_hits_total[5m])) by (service, entity) + sum(rate(topems_cache_misses_total[5m])) by (service, entity))
)
```

**可视化**: 表格，显示命中率最低的 10 个实体

### 5.2 告警规则

#### 告警 1：缓存命中率过低

```yaml
alert: CacheHitRateLow
expr: |
  sum(rate(topems_cache_hits_total[10m])) by (service, entity) / 
  (sum(rate(topems_cache_hits_total[10m])) by (service, entity) + sum(rate(topems_cache_misses_total[10m])) by (service, entity))
  < 0.5
for: 15m
labels:
  severity: warning
annotations:
  summary: "缓存命中率过低"
  description: "服务 {{ $labels.service }} 的 {{ $labels.entity }} 缓存命中率低于 50%，当前值 {{ $value | humanizePercentage }}"
```

#### 告警 2：缓存失效率异常

```yaml
alert: CacheRemovalRateHigh
expr: sum(rate(topems_cache_removals_total[5m])) by (service, entity) > 100
for: 10m
labels:
  severity: warning
annotations:
  summary: "缓存失效率异常"
  description: "服务 {{ $labels.service }} 的 {{ $labels.entity }} 缓存失效率超过 100/s，当前值 {{ $value | humanize }}/s"
```

---

## 6. 缓存优化建议

### 6.1 命中率低的常见原因

| 原因 | 解决方案 |
|------|---------|
| TTL 过短 | 增加 TTL（如从 60s 增加到 600s） |
| 查询参数多样化 | 减少缓存 Key 的参数维度，或使用更粗粒度的缓存 |
| 数据更新频繁 | 评估是否需要缓存，或使用事件驱动的缓存失效 |
| 缓存容量不足 | 增加缓存容量，或使用 LRU 淘汰策略 |
| 首次访问未预热 | 实现缓存预热机制，服务启动时加载常用数据 |

### 6.2 优化流程

1. 通过 Grafana 仪表盘识别命中率低的实体
2. 分析该实体的访问模式（查询频率、参数分布、更新频率）
3. 调整缓存策略（TTL、容量、Key 设计）
4. 观察调整后的命中率变化
5. 持续迭代优化

---

## 7. 附录

### 7.1 相关文件

- 指标定义: `lib/shared-core/src/metrics.rs`
- 指标记录函数: `lib/shared-core/src/cache.rs`
- 缓存实现: `lib/shared-core/src/cache.rs`（基于 moka）
- MES 集成示例: `svc/mes/src/modules/process_route.rs`

### 7.2 相关文档

- 缓存深化优化计划: `docs/reports/archive/cache-deep-optimization-plan-2026-09-11.md`
- 缓存 Key 命名规范: `docs/developer/standards/cache-key-naming-standard.md`
- 生产环境配置实施指南: `docs/admin/production-environment-setup-guide-2026-09-11.md`

### 7.3 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-09-11 | 初始版本，定义缓存指标和监控方案 |

---

**文档结束**
