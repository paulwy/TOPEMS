# W5-C 第二批：WMS `audit_logs` / `inbound_orders` 删除 `organization_id`

日期：2026-11-21
迁移：`database/migrations/20261121235900_w5c_wms_audit_inbound_drop_organization_id.sql`
回滚：`database/rollback/20261121235900_w5c_wms_audit_inbound_drop_organization_id.rollback.sql`
代码：`svc/wms/src/modules/inbound_order.rs`、`svc/wms/tests/inbound_order_e2e.rs`
状态：scratch 库正向/回滚通过；生产窗口未执行。

## 1. 为什么只选两张表

WMS 内部 `organization_id` 语义相反，不能按模块统一处理。本地 `topems` 实测：

| 表 | 行数 | `organization_id <> tenant_id` | `organization_id <> org_id` | 处理 |
| --- | --- | --- | --- | --- |
| `wms.audit_logs` | 7243 | 6403 | 0 | 等于 `org_id`，删 `organization_id` |
| `wms.inbound_orders` | 18 | 0 | 16 | 等于 `tenant_id`，删 `organization_id` |
| `wms.inventory` | 74 | 74 | 4 | 业务组织值，保留 |
| `wms.locations` | 10 | 10 | 10 | 业务组织值，保留 |
| `wms.warehouses` | 29 | 29 | 29 | 业务组织值，保留 |

## 2. 迁移守卫

同一事务内先校验：

- `wms.audit_logs`：`organization_id IS DISTINCT FROM org_id` 必须为 0；
- `wms.inbound_orders`：`organization_id IS DISTINCT FROM tenant_id` 必须为 0。

任一非 0 即 `RAISE EXCEPTION`，整条迁移回滚。两条 `DROP COLUMN` 均带
`destructive-gate` 标记，ticket `W5C-ORG-WMS-20261121`，备份为窗口前
`pg_dump -t wms.audit_logs -t wms.inbound_orders`。

## 3. 代码改动

`inbound_order.rs` 的 8 处 SELECT/RETURNING：

- `organization_id AS tenant_id` → `tenant_id AS tenant_id`；
- 末尾 `organization_id` → `tenant_id AS organization_id`，保留 API 字段名，
  不改前端契约。

创建订单：

- 去掉 INSERT 列 `organization_id`；
- `VALUES ($1, $12, $2, ...)` → `VALUES ($1, $2, ...)`；
- 去掉重复的第二个 `.bind(tenant_id)`。

`inbound_order_e2e.rs` 的夹具插入改 `org_id + tenant_id`，不再写
`organization_id`。

`wms.inventory`、`wms.inbound_order_items` 的 `organization_id` 未改：前者是
库存业务组织键，后者属于下一批待定表。

## 4. 验证

- scratch 库（`topems_test_full` 克隆）正向：守卫通过，两条 `ALTER TABLE` 执行，
  `information_schema` 中两表 `organization_id` 为 0；
- 回滚：两条 `ADD COLUMN` + 按 `org_id`/`tenant_id` 派生 `UPDATE`，列恢复
  `NOT NULL`；
- `SQLX_OFFLINE=true cargo check -p topems-wms` 通过；
- `cargo test -p topems-wms --lib`：541 passed，0 failed。

## 5. 未完成

- 迁移未在生产窗口执行，生产列数未变化；
- `inventory`/`locations`/`warehouses` 的 `organization_id` 是业务组织值，
  需先纠正 `org_id` 与 `organization_id` 的角色，再决定是否合并；
- `inbound_order_items`、`outbound_orders`、`stock_takes` 等表仍未处理。

## 6. 先修创建路径：`org_id` 无绑定（2026-11-21 补）

排查 `outbound_orders` 删列可行性时发现：canonical 中 `wms.outbound_orders.org_id`
与 `wms.outbound_order_items.org_id` 都是 `NOT NULL` 且无默认值，但两条创建语句
只写 `organization_id`/`tenant_id`，未写 `org_id`。空表不是“没人用”，而是创建
必然 `23502`。在删 `organization_id` 之前先修掉这个前置缺陷。

改动：

- `create_outbound_order`：要求 `warehouse_id`，先经 `Db::scope_with` 复用请求事务，按
  `id + tenant_id + deleted_at IS NULL` 取仓库 `org_id`，再写入订单 `org_id`；
  仓库不存在返回 409；`organization_id` 仍写租户值，列表查询与 API 形状不变。
- `create_outbound_order_item`：同样经 `Db::scope_with`，按 `order_id + tenant_id` 取出订单 `org_id`，
  写入明细；订单不存在返回 409。
- `svc/wms/tests/outbound_order_e2e.rs`：补 `org_id`/`tenant_id`/`order_type`/
  `order_date` 与最小 `wms.warehouses` 表，新增创建用例，断言订单 `org_id`
  来自仓库、`tenant_id`/`organization_id` 来自 claims。

验证：`cargo fmt -p topems-wms -- --check` 通过；`cargo clippy -p topems-wms
--all-targets --features db-tests -- -D warnings` 通过；`cargo test -p topems-wms
--lib` 541 passed；`cargo test -p topems-wms --features db-tests --test
outbound_order_e2e` 4 passed（含新增创建用例）。

本批不改 DDL、不删 `organization_id`：生产存量是否 `organization_id = tenant_id`
仍未知，删列迁移必须等生产只读核对后再执行。

## 7. 同型修复：`wave_picks` 创建（2026-11-21 补）

`wms.wave_picks.org_id` 同样是 `NOT NULL` 无默认值，`create_wave_pick` 只写
`organization_id`/`tenant_id`，创建必然 23502；现有 e2e 只覆盖列表，未暴露。

改动：`create_wave_pick` 先经 `Db::scope_with` 按 `warehouse_id + tenant_id` 取仓库
`org_id`，仓库不存在返回 409，再写入 `org_id`；`organization_id` 仍写租户值。
`svc/wms/tests/wave_pick_e2e.rs` 补 `organization_id` 与最小仓库表，新增创建用例。

`wave_pick_items` 没有服务端创建入口（只有列表与状态更新），其 `org_id` 由上游
写入，本批不动。

验证：`cargo fmt`、`clippy -D warnings`、541 个 lib 测试、4 个 wave e2e 通过；
`request-txn` 保持 `1655` 基线。

## 8. 同型修复：`cycle_count_configs` 创建（2026-11-21 补）

`wms.cycle_count_configs.org_id` 同样 `NOT NULL` 无默认值，创建语句未写；配置表
本地 0 行，创建必然 23502。

改动：`create_cycle_count_config` 经 `Db::scope_with` 按 `warehouse_id + tenant_id`
取仓库 `org_id`，仓库不存在返回 409；`organization_id` 保持租户值。
`svc/wms/tests/cycle_count_e2e.rs` 补最小仓库表与创建用例。

验证：`cargo fmt`、`clippy -D warnings`、541 个 lib 测试、4 个 cycle e2e 通过；
`request-txn` 保持 `1655` 基线。

## 9. 语义修正：`labor_shifts` 的 `organization_id` / `org_id`（2026-11-21 补）

原实现把两列都写成 `claims.sub`（用户 ID），既不是租户也不是组织。现改为：

- `organization_id` = `tenant_id`（废弃列仍是租户别名）；
- `org_id`：有 `warehouse_id` 时取仓库 `org_id`，无仓库时回落 `tenant_id`；
- 指定仓库不存在返回 409。

`svc/wms/tests/labor_e2e.rs` 增加无仓库回落断言与指定仓库派生断言；该表本地 0 行，
无历史数据需要回填。

验证：`cargo fmt`、`clippy -D warnings`、541 个 lib 测试、5 个 labor e2e 通过；
`request-txn` 保持 `1655` 基线。
