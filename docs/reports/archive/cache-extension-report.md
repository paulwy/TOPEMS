# 缓存扩展实施报告

## 概述

将 WMS、EHS、LIMS、CRM 四个服务的缓存从简单的同步 `InMemoryCache` 升级为异步 `AsyncL2Cache` 多级缓存（L1: moka 进程内 + L2: Redis 分布式），启用事件驱动的缓存失效机制和 Prometheus 监控指标。

**实施时间**：2026-09-11
**编译状态**：`cargo check --workspace` 通过，无错误
**提交记录**：4 个 commit（含统一入口 server 模块修复）

---

## 一、各服务缓存扩展详情

### 1. WMS 服务

**变更文件**：
- `svc/wms/src/main.rs` — 缓存初始化、预热、事件订阅
- `svc/wms/src/modules/mod.rs` — ApiState 类型升级
- `svc/wms/src/modules/warehouse.rs` — 缓存读写异步化 + 失效事件发布
- `svc/wms/src/shared/cache.rs` — 清理无用 re-export

**缓存配置**：

| 缓存名 | 类型 | instance_prefix | metrics (service/entity) |
|--------|------|-----------------|--------------------------|
| warehouse_cache | `AsyncL2Cache<serde_json::Value>` | wms | wms/warehouse |
| inventory_cache | `AsyncL2Cache<serde_json::Value>` | wms | wms/inventory |
| dict_cache | `AsyncL2Cache<String>` | wms | wms/dict |

**关键变更**：
- 三个缓存均通过 `AsyncL2Cache::try_new(config, redis_url)` 初始化，Redis 不可用时自动降级纯 L1
- `warehouse.rs` 中所有 `.get()`/`.set()`/`.remove()` 改为 `.await`，`.clear()` 改为 `.clear_l1()`
- 仓库创建/更新/删除时发布 `publish_cache_invalidated("wms:warehouse:{id}", "specific", ...)`
- 注册 `wms-cache-invalidation` 事件订阅者，监听 3 个前缀的失效事件
- 服务启动时异步预热仓库列表第一页数据

---

### 2. EHS 服务

**变更文件**：
- `svc/ehs/src/main.rs` — 缓存初始化、事件订阅
- `svc/ehs/src/shared/mod.rs` — AppState 类型升级
- `svc/ehs/src/modules/hazard.rs` — 缓存读写异步化 + 失效事件发布
- `svc/ehs/src/shared/cache.rs` — 清理无用 re-export

**缓存配置**：

| 缓存名 | 类型 | instance_prefix | metrics (service/entity) |
|--------|------|-----------------|--------------------------|
| hazard_cache | `AsyncL2Cache<serde_json::Value>` | ehs | ehs/hazard |
| training_cache | `AsyncL2Cache<serde_json::Value>` | ehs | ehs/training |
| dict_cache | `AsyncL2Cache<String>` | ehs | ehs/dict |

**关键变更**：
- 三个缓存升级为 AsyncL2Cache，Redis 降级处理
- `hazard.rs` 中 `list_hazards`/`get_hazard` 缓存读取异步化
- 隐患创建/更新/删除时发布失效事件
- 注册 `ehs-cache-invalidation` 事件订阅者

---

### 3. LIMS 服务

**变更文件**：
- `svc/lims/src/main.rs` — 5 个缓存初始化、预热、事件订阅
- `svc/lims/src/shared/mod.rs` — AppState 新增 3 字段 + 升级 2 字段
- `svc/lims/src/modules/test_method.rs` — 缓存异步化 + TestMethod 补 Deserialize
- `svc/lims/src/modules/sample.rs` — 新增 sample_cache 读写 + 失效事件
- `svc/lims/src/modules/inspection_task.rs` — 新增 task_cache 读写 + 失效事件

**缓存配置**：

| 缓存名 | 类型 | instance_prefix | metrics (service/entity) | 状态 |
|--------|------|-----------------|--------------------------|------|
| sample_cache | `AsyncL2Cache<serde_json::Value>` | lims | lims/sample | 新增 |
| task_cache | `AsyncL2Cache<serde_json::Value>` | lims | lims/task | 新增 |
| dict_cache | `AsyncL2Cache<String>` | lims | lims/dict | 新增 |
| test_method_cache | `AsyncL2Cache<TestMethod>` | lims | lims/test_method | 升级 |
| instrument_cache | `AsyncL2Cache<serde_json::Value>` | lims | lims/instrument | 升级 |

**关键变更**：
- 新增 `make_l2_config()` 和 `init_cache()` 辅助函数简化 5 个缓存初始化
- `TestMethod` 和 `InspectionTask` 结构体补充 `Deserialize` derive 以支持 L2 JSON 反序列化
- `sample.rs`：`get_sample`/`list_samples` 走 cache-aside 模式；登记/更新/删除时发布 specific + pattern 失效事件
- `inspection_task.rs`：`get_task`/`list_tasks` 走 cache-aside；创建/更新/删除/提交结果时失效缓存
- 缓存 key 均包含 tenant_id，格式：`lims:sample:{tenant_id}:{id}`
- 服务启动时异步预热样品列表和任务列表各 10 条
- 注册 `lims-cache-invalidation` 事件订阅者，5 个 handler

---

### 4. CRM 服务

**变更文件**：
- `svc/crm/src/main.rs` — 缓存初始化、预热、事件订阅
- `svc/crm/src/modules/mod.rs` — ApiState 新增 opportunity_cache/dict_cache + 类型升级
- `svc/crm/src/modules/customer.rs` — 新增 customer_cache 读写 + 失效事件
- `svc/crm/src/modules/opportunity.rs` — 新增 opportunity_cache 读写 + 失效事件

**缓存配置**：

| 缓存名 | 类型 | instance_prefix | metrics (service/entity) | 状态 |
|--------|------|-----------------|--------------------------|------|
| customer_cache | `AsyncL2Cache<serde_json::Value>` | crm | crm/customer | 升级 |
| opportunity_cache | `AsyncL2Cache<serde_json::Value>` | crm | crm/opportunity | 新增 |
| dict_cache | `AsyncL2Cache<String>` | crm | crm/dict | 新增 |
| dashboard_cache | `AsyncL2Cache<serde_json::Value>` | crm | crm/dashboard | 升级 |

**关键变更**：
- `customer_cache` 采用 `serde_json::Value` 类型（同时支持详情和列表缓存、预热）
- `customer.rs`：`get_customer`/`list_customers` cache-aside；创建/更新/删除/批量删除时发布 pattern 失效事件
- `opportunity.rs`：`get_opportunity`/`list_opportunities` cache-aside；创建/更新/删除/批量删除/推进/回退时发布失效事件
- 列表缓存 key 包含 page/size/search/stage/customer 等查询维度
- 服务启动时异步预热客户列表默认页（page=1/size=25）
- 注册 `crm-cache-invalidation` 事件订阅者

---

### 5. 统一入口 Server 模块

**变更文件**：
- `svc/server/src/modules/wms_real_module.rs`
- `svc/server/src/modules/ehs_real_module.rs`
- `svc/server/src/modules/lims_real_module.rs`
- `svc/server/src/modules/crm_real_module.rs`

**变更内容**：
- 4 个 real_module 的缓存初始化从 `InMemoryCache::new(ttl)` 改为 `AsyncL2Cache::new_l1_only(config)`
- 与各服务独立部署的 `main.rs` 保持类型一致
- LIMS real_module 新增 sample_cache/task_cache/dict_cache 三个字段
- CRM real_module 新增 opportunity_cache/dict_cache 两个字段
- 清理未使用的 `shared::InMemoryCache` 导入

---

## 二、统一缓存架构

### 缓存层级

```
请求 → L1 (moka 进程内, TTL=60s, 容量10000)
         ↓ miss
       L2 (Redis 分布式, TTL=600s)
         ↓ miss
       数据库回源 → 回填 L1 + L2
```

### 缓存失效机制

```
数据变更 → 本地 cache.remove(key)
         → event_publisher.publish_cache_invalidated(key, "specific", reason)
         → RabbitMQ Fanout 广播
         → 各实例 CacheInvalidationListener 接收
         → AsyncL2CacheInvalidationHandler 分发
         → 对应缓存 remove/clear_l1
```

### 监控指标

通过 `with_metrics(service, entity)` 启用以下 Prometheus 指标：
- `l1_cache_hits_total` / `l1_cache_misses_total` — L1 命中/未命中
- `l2_cache_hits_total` / `l2_cache_misses_total` — L2 命中/未命中
- `l2_cache_sets_total` — L2 写入次数
- `l2_cache_removals_total` — L2 失效次数
- `l1_cache_entries` — L1 当前条目数
- `l2_cache_connected` — L2 连接状态 (0/1)

---

## 三、提交记录

| Commit | 说明 |
|--------|------|
| `c1064e5d8` | perf(cache): 其他服务多级缓存扩展 - WMS/EHS/LIMS/CRM 升级为 AsyncL2Cache |
| `b710b3885` | feat(metrics): 添加缓存查询延迟指标（Histogram） |
| `e6fab707d` | feat(grafana): 添加缓存性能监控仪表盘 |
| `ffdc77a49` | fix(cache): 统一入口 server 模块同步升级为 AsyncL2Cache |

---

## 四、验证结果

- ✅ `cargo check --workspace` 全工作区编译通过，无错误
- ✅ `cargo fmt` 格式检查通过
- ✅ `cargo clippy` 检查通过
- ✅ Pre-commit 钩子全部通过（i18n、API 边界、权限矩阵、AXUM 层序等 16 项）
- ✅ Pre-push 钩子全部通过
- ✅ 代码已推送至 `origin/main`

---

## 五、注意事项

1. **Redis 降级**：所有服务在 `REDIS_URL` 未配置或 Redis 不可达时自动降级为纯 L1 模式，不影响服务启动
2. **多租户隔离**：所有缓存 key 均包含 `tenant_id`，确保租户间数据隔离
3. **统一入口模式**：`svc/server` 中的 real_module 使用 `AsyncL2Cache::new_l1_only()`（纯 L1），因为统一入口进程内共享无需 Redis L2
4. **EHS 预热**：隐患列表当前为桩数据，预热未接入真实查询，后续可补充
5. **CRM customer_cache 类型**：采用 `serde_json::Value` 而非 `Customer` 结构体，以同时支持详情和列表缓存
