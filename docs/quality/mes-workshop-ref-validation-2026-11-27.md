# MES 写路径：车间引用同租户校验（B354）

- 日期：2026-11-27
- 范围：`svc/mes/src/shared/workshop_ref.rs`（新增）、`svc/mes/src/modules/work_station.rs`、`svc/mes/src/modules/production_order.rs`
- DB 约束：由并行批次 `20261127150000`（产线）与 `20261127170000`（工位/工单）提供复合外键；本批只补写路径的可读校验

## 为什么只做写路径

MES 里以 `workshop_id` 指向 `mes.workshops` 的表已全部换成 `(workshop_id, tenant_id) → workshops(id, tenant_id)` 复合外键。但 DB 约束报错是 `23503` 外键违例，前端/调用方拿到的是 500「创建失败」，且错误信息里没有“跨租户”这层语义。此前 B353/B354 尝试补迁移时，`origin/main` 上的并行批次在分钟级就落了同版本迁移（160000 甚至被记成 orphan 后由 170000 承接），迁移侧已无空间，写路径校验则是唯一没人做的部分。

## 数据事实（本机 2026-11-27）

- `mes.work_stations` 79 行、`mes.production_orders` 134 行，`workshop_id` 非空行均为 0 —— 校验不会改变任何已有行为。
- `mes.workshops` 现有 0 行，`workshop_exists_in_tenant` 对任意 `workshop_id` 都返回 false（跨租户/不存在同一条错误信息，不泄露他租户车间是否存在）。

## 改动

新增 `shared/workshop_ref.rs`：

```rust
pub async fn workshop_exists_in_tenant(executor, workshop_id, tenant_id) -> Result<bool, sqlx::Error>
// SELECT EXISTS(... WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL)
```

与 `basics.rs` 里产线的 `workshop_exists_in_tenant` 同源口径；`shared/mod.rs` 注册模块。

接入 5 个写路径，全部在写 SQL 之前：

| 入口 | 校验点 |
| --- | --- |
| `create_work_station` | `workshop_id` 为 Some 时校验同租户且未软删 |
| `update_work_station` | 换绑车间同样校验 |
| `create_production_order` | 同上；`tenant_opt = None` 且带 `workshop_id` → 400「缺少租户上下文，无法绑定车间」 |
| `create_order_from_erp` | 同上（服务身份从 ERP 建单也走同一条） |
| `update_production_order` | 换绑车间校验 |

失败返回 400「车间不存在或不属于当前租户」，不再落到外键 500；数据库错误仍返回 500 并打日志。

## 验证

| 项 | 结果 |
| --- | --- |
| `cargo fmt -p topems-mes` | 无额外改动 |
| `cargo check -p topems-mes` | 通过（6m14s，含等构建锁） |
| `cargo clippy -p topems-mes --all-targets -- -D warnings` | 通过（39.5s，0 warning） |
| `cargo test -p topems-mes --lib` | 432 passed / 0 failed |
| 行为核对 | 写路径在校验后才进入 INSERT/UPDATE；校验查询与写查询共用同一 `scope`（同一 RLS 事务，租户 GUC 一致） |

## 剩余

- `workshop_exists_in_tenant` 现在有两份（`basics.rs` 私有 + `shared` 公共），可后续把产线那处也切到公共实现。
- `mes.equipment` 等其它车间引用表未核；本机 `equipment` 11 行，需确认是否也带 `workshop_id`。
- `production_processes` 10 行 `tenant_id` 全 NULL、`production_orders` 5 行 NULL 租户：历史数据归属需业务确认。
- `equipment_no` / `order_no` / `process_code` / `station_no` 的租户内唯一仍未收口；本机存在同租户重复（equipment 9 条、stations 76 条按 `(tenant_id, no)`），需先清理。
