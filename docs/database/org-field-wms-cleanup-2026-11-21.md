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
