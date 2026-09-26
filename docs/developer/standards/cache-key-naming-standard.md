# TOPEMS 缓存 Key 命名规范

**版本**: v1.0
**日期**: 2026-09-11
**状态**: 已实施（MES/TMS），其他服务待迁移

---

## 1. 背景与目标

### 1.1 现状问题

通过全仓扫描，发现各服务缓存 Key 命名方式不统一，存在以下问题：

| 服务 | 现有命名方式 | 问题 |
|------|------------|------|
| WMS | `warehouse:{tenant_id}:{id}` | 缺少服务前缀 `wms:` |
| MES | `mes:process_routes:{tenant_id}:{page}:...` | 实体名使用复数，列表无 `list` 标识 |
| TMS | `tms:drivers:{tenant_id}:{page}:...` | 实体名使用复数，列表无 `list` 标识 |
| ERP | `all_dict_types` | **缺少服务前缀和 tenant_id（多租户隔离风险）** |
| SCM | `supplier:{id}` | **缺少服务前缀和 tenant_id（多租户隔离风险）** |
| EHS | `hazard:{tenant_id}:{id}` | 缺少服务前缀 `ehs:` |
| Search | `build_cache_key(query, modules, page, page_size)` | 使用函数构建，无统一前缀 |

### 1.2 规范目标

1. **统一命名**：所有服务缓存 Key 遵循统一的命名规范
2. **多租户隔离**：所有缓存 Key 必须包含 `tenant_id`，确保不同租户数据隔离
3. **可识别性**：从缓存 Key 可以快速识别服务、实体、操作类型
4. **可扩展性**：支持单条记录、列表查询、聚合数据等多种缓存场景
5. **可维护性**：便于缓存失效、监控和调试

---

## 2. 统一命名规范

### 2.1 基本格式

```
{service}:{entity}:{operation}:{tenant_id}:{params}
```

### 2.2 各段说明

| 段 | 说明 | 示例 | 约束 |
|----|------|------|------|
| `service` | 服务名（小写） | `wms`, `mes`, `tms`, `crm`, `erp`, `scm`, `ehs`, `lims`, `hrm`, `srm`, `pdm`, `qms`, `bi`, `ai` | 必须与服务目录名一致 |
| `entity` | 实体名（单数，小写，下划线分隔） | `warehouse`, `process_route`, `driver`, `customer`, `dict_type`, `supplier`, `hazard` | 使用单数形式，不用复数 |
| `operation` | 操作类型 | `get`, `list`, `aggregate`, `dashboard`, `search` | 见 2.3 节 |
| `tenant_id` | 租户 ID | `550e8400-e29b-41d4-a716-446655440000` | **必须包含**，多租户隔离的关键 |
| `params` | 查询参数（可选） | `page:1:pagesize:20:status:active:search:abc` | 见 2.4 节 |

### 2.3 操作类型定义

| 操作类型 | 说明 | 适用场景 | 示例 |
|---------|------|---------|------|
| `get` | 单条记录查询 | 根据 ID 获取单条记录 | `wms:warehouse:get:{tenant_id}:{id}` |
| `list` | 列表查询 | 分页列表、筛选列表 | `wms:warehouse:list:{tenant_id}:page:1:pagesize:20:status:active` |
| `aggregate` | 聚合查询 | 统计、汇总数据 | `wms:inventory:aggregate:{tenant_id}:by_warehouse` |
| `dashboard` | 仪表盘数据 | 仪表盘统计、图表数据 | `mes:dashboard:aggregate:{tenant_id}:overview` |
| `search` | 搜索结果 | 全文搜索、模糊搜索 | `search:result:search:{tenant_id}:query:abc:modules:user,doc` |
| `dict` | 字典数据 | 字典类型、字典项 | `erp:dict:dict:{tenant_id}:all_types` |

### 2.4 查询参数格式

列表查询的参数部分使用 `key:value` 格式，多个参数用 `:` 分隔：

```
page:{page}:pagesize:{pagesize}:{param1}:{value1}:{param2}:{value2}
```

**参数排序规则**：
1. `page` 和 `pagesize` 始终放在最前面
2. 其他参数按字母顺序排列
3. 可选参数为空时使用 `none` 占位

**示例**：
```
wms:warehouse:list:{tenant_id}:page:1:pagesize:20:search:none:status:active
```

---

## 3. 各场景缓存 Key 示例

### 3.1 单条记录查询

```
# WMS 仓库详情
wms:warehouse:get:{tenant_id}:{warehouse_id}

# MES 工艺路线详情
mes:process_route:get:{tenant_id}:{route_id}

# TMS 司机详情
tms:driver:get:{tenant_id}:{driver_id}

# CRM 客户详情
crm:customer:get:{tenant_id}:{customer_id}

# SCM 供应商详情
scm:supplier:get:{tenant_id}:{supplier_id}

# EHS 危险源详情
ehs:hazard:get:{tenant_id}:{hazard_id}
```

### 3.2 列表查询

```
# WMS 仓库列表
wms:warehouse:list:{tenant_id}:page:1:pagesize:20:search:none:status:active

# MES 工艺路线列表
mes:process_route:list:{tenant_id}:page:1:pagesize:10:search:none:status:all

# MES 产能列表
mes:capacity:list:{tenant_id}:page:1:pagesize:20:search:none:status:all:work_center_id:none

# TMS 司机列表
tms:driver:list:{tenant_id}:page:1:pagesize:20:search:none:status:all

# TMS 车辆列表
tms:vehicle:list:{tenant_id}:page:1:pagesize:20:search:none:status:all

# TMS 承运商列表
tms:carrier:list:{tenant_id}:page:1:pagesize:20:search:none:status:all

# SCM 供应商列表
scm:supplier:list:{tenant_id}:page:1:pagesize:20:search:none:status:all
```

### 3.3 聚合/仪表盘查询

```
# WMS 库存汇总
wms:inventory:aggregate:{tenant_id}:by_warehouse

# MES 生产统计
mes:production:aggregate:{tenant_id}:daily

# TMS 运输统计
tms:shipment:aggregate:{tenant_id}:monthly

# CRM 销售仪表盘
crm:dashboard:aggregate:{tenant_id}:sales_overview

# BI 报表数据
bi:report:aggregate:{tenant_id}:sales_by_region
```

### 3.4 字典数据

```
# ERP 所有字典类型
erp:dict_type:dict:{tenant_id}:all

# ERP 指定字典类型的字典项
erp:dict_item:dict:{tenant_id}:type:{dict_type_code}

# MES 工艺路线字典
mes:process_route:dict:{tenant_id}:all_active
```

### 3.5 搜索结果

```
# 全文搜索结果
search:result:search:{tenant_id}:query:{query_hash}:modules:{modules}:page:{page}:pagesize:{pagesize}
```

---

## 4. 缓存失效规范

### 4.1 单条记录失效

创建/更新/删除单条记录时，失效对应的 `get` 缓存：

```rust
// 失效单条记录缓存
state.warehouse_cache.remove(&format!("wms:warehouse:get:{}:{}", tenant_id, id));
```

### 4.2 列表缓存失效

创建/更新/删除记录时，由于列表缓存包含多种参数组合，无法精确失效所有相关列表缓存。采用以下策略：

1. **TTL 自动过期**：依赖 TTL 自动失效（字典数据 600 秒，业务数据 120-300 秒）
2. **版本号机制**（推荐）：为每个实体维护一个版本号，缓存 Key 包含版本号，更新时递增版本号使所有旧缓存失效
3. **模糊清除**（仅本地缓存）：使用 `cache.clear()` 清除该实体的所有缓存（不推荐，影响范围大）

### 4.3 版本号机制示例

```rust
// AppState 中添加版本号
pub struct AppState {
    pub warehouse_cache_version: Arc<AtomicU64>,
}

// 构建缓存 Key 时包含版本号
let version = state.warehouse_cache_version.load(Ordering::Relaxed);
let cache_key = format!("wms:warehouse:list:{}:{}:v{}", tenant_id, params, version);

// 更新记录时递增版本号
state.warehouse_cache_version.fetch_add(1, Ordering::Relaxed);
```

---

## 5. 实施计划

### 5.1 已完成（v1.0）

| 服务 | 状态 | 说明 |
|------|------|------|
| MES | ✅ 已实施 | 工艺路线列表、产能列表已使用新规范 |
| TMS | ✅ 已实施 | 司机列表、车辆列表、承运商列表已使用新规范 |

### 5.2 待迁移（v1.1 - v1.3）

| 优先级 | 服务 | 问题 | 计划版本 |
|--------|------|------|---------|
| P0 | ERP | `all_dict_types` 缺少 tenant_id（多租户隔离风险） | v1.1 |
| P0 | SCM | `supplier:{id}` 缺少 tenant_id（多租户隔离风险） | v1.1 |
| P1 | WMS | `warehouse:{tenant_id}:{id}` 缺少服务前缀 | v1.2 |
| P1 | EHS | `hazard:{tenant_id}:{id}` 缺少服务前缀 | v1.2 |
| P2 | Search | 函数构建，无统一前缀 | v1.3 |
| P2 | 其他服务 | 待添加缓存时遵循新规范 | 持续 |

### 5.3 迁移注意事项

1. **缓存预热**：迁移后旧缓存 Key 失效，需要重新预热热点数据
2. **监控告警**：迁移期间关注缓存命中率变化，设置告警阈值
3. **灰度发布**：建议按服务逐步迁移，避免一次性迁移导致缓存雪崩
4. **回滚方案**：保留旧缓存 Key 的读取逻辑，支持快速回滚

---

## 6. 缓存监控指标

### 6.1 Prometheus 指标（待实施）

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `cache_hits_total` | Counter | 缓存命中总数（按 service、entity、operation 标签） |
| `cache_misses_total` | Counter | 缓存未命中总数（按 service、entity、operation 标签） |
| `cache_hit_rate` | Gauge | 缓存命中率（按 service、entity 标签） |
| `cache_entries` | Gauge | 缓存条目数（按 service、cache_name 标签） |
| `cache_evictions_total` | Counter | 缓存淘汰总数（按 service、cache_name 标签） |

### 6.2 告警规则（待实施）

| 告警名称 | 条件 | 严重级别 |
|---------|------|---------|
| 缓存命中率过低 | `cache_hit_rate{service="wms"} < 0.5` 持续 5 分钟 | Warning |
| 缓存未命中激增 | `rate(cache_misses_total[5m]) > 100` | Warning |
| 缓存内存过高 | `cache_entries > 100000` | Warning |

---

## 7. 附录

### 7.1 缓存 TTL 参考值

| 数据类型 | TTL | 说明 |
|---------|-----|------|
| 字典数据 | 600 秒（10 分钟） | 变更频率低，可接受短暂不一致 |
| 基础资料 | 300 秒（5 分钟） | 仓库、供应商、客户等 |
| 业务单据 | 120 秒（2 分钟） | 订单、入库单、出库单等 |
| 实时数据 | 30-60 秒 | 库存、产能、运输状态等 |
| 聚合统计 | 300 秒（5 分钟） | 仪表盘、报表数据 |

### 7.2 缓存容量参考值

| 缓存类型 | 容量上限 | 淘汰策略 |
|---------|---------|---------|
| 字典缓存 | 10000 条 | LRU |
| 单条记录缓存 | 50000 条 | LRU |
| 列表缓存 | 20000 条 | LRU |
| 聚合缓存 | 5000 条 | LRU |

---

## 8. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-09-11 | 初始版本，制定统一命名规范，MES/TMS 已实施 | TOPEMS Team |

---

**文档结束**
