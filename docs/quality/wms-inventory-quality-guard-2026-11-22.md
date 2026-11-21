# WMS 库存质量状态治理（B108）

日期：2026-11-22
范围：`wms.inventory.quality_status`

## 问题

前端 `apps/web/src/schemas/wms/inventory.ts` 已按 `qualified / unqualified / pending` 三值展示、着色和筛选，后端却没有对应约束：

- 列表把 `quality_status` 以 `status` 暴露，并以任意字符串直接过滤；
- 详情按任意存量值原样返回；
- 创建硬编码 `'qualified'`；
- 更新接受任意 `req.status`，缺失时回退到非法值 `"normal"`；
- 数据库列 `NOT NULL DEFAULT 'qualified'`，但没有 CHECK。

结果是写入口可以写入前端不认识、数据库也不约束的质量状态，筛选会返回空集，列表展示落回默认色。

## 决策

- 规范集合采用现有前端口径：`qualified / unqualified / pending`，默认 `qualified`。
- 这是属性型状态，不是审批流转，不设 FSM 与终态；允许复检改判，但只能写规范集合内的值。
- 命名保持 `unqualified`，不为了和入库明细的 `rejected` 强行统一；两者分别对齐各自前端既有口径。

## 代码变更

新增 `svc/wms/src/modules/inventory_quality_status.rs`：

- `InventoryQualityStatus::{Qualified, Unqualified, Pending}`
- `DB_VALUES = ["qualified", "unqualified", "pending"]`
- `DEFAULT = Qualified`
- 严格 `from_db_str` / `as_db_str`，未知值报错
- 2 个单测覆盖默认值、往返解析和非法值

`svc/wms/src/modules/mod.rs` 注册 `pub mod inventory_quality_status;`。

`svc/wms/src/modules/inventory.rs` 收口四个入口：

1. 列表：`status` 参数严格解析；`all` 或空视为不过滤，未知值 400。SELECT 与 COUNT 都增加 `quality_status = ANY(DB_VALUES)` 和 `deleted_at IS NULL`。
2. 详情：查询增加 `quality_status = ANY($2::text[])`，集合外的行按 404 处理。
3. 创建：不再硬编码字符串，INSERT 绑定 `InventoryQualityStatus::DEFAULT`。
4. 更新：预读加 `quality_status = ANY($3::text[])`；读取旧值并严格解析，删除 `"normal"` 回退；未传 `status` 时保持旧值，传了则只接受三值；UPDATE 增加旧状态谓词 `quality_status = $15`，0 行回滚并返回 409。

前端补充色板 `unqualified: error`，清单口径保持不变。

## 本地验证

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：`559 passed`（B107 为 557）
- workspace `cargo fmt --all --check`、`cargo check --workspace --all-targets`、`cargo clippy --workspace --all-targets`：通过
- workspace `cargo nextest`：`22707 / 22708` 通过；唯一失败为 `topems-unified-core::master_closed_loop_e2e::master_routes_enforce_system_write_permission` 返回 500 而非 403，与本批 WMS 改动无关，待单独处理
- Web `typecheck`：通过
- Web `lint`：0 errors（156 warnings，存量）
- 顺带修复两条已过期门禁用例：`erpVoucherRouteContract` 指向 `components/finance/FinanceVoucherPage`；`database_config_default_values` 按 `DATABASE_URL` 实际值断言；`topems-rd` 项目仓储测试移除并行二进制互删表的全局清理
- `dump-status-code-inventory.mjs --check --strict-palette`：`183` 个 Rust 枚举 / `196` 个前端状态键一致，色板缺口 `0`
- `status-db-check-queue.mjs --check`：`127` 个枚举 / `142` 个值，分桶一致

## 候选约束演练

候选文件：`docs/database/wms-inventory-quality-check-candidates-2026-11-22.sql`
约束：`ck_inventory_quality_status_standard`，三值，`NOT VALID`。

本地 `wms.inventory` 共 74 行，全部 `qualified`。事务内：

1. `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` 成功；
2. 任取一行改为 `unqualified`，`UPDATE 1`；
3. 同一行改为 `bogus`，触发 `23514`，报 `ck_inventory_quality_status_standard`；
4. 事务回滚后约束计数 `0`，库存仍为 `74` 行全部 `qualified`。

## 残留语义

B108 只统一值域，不改变库存数量语义：

- `qualified → unqualified` 不会自动归零或扣减 `available_quantity`；
- `unqualified → qualified` 也不会自动恢复可用量；
- 若业务要求质量改判联动可用量，需要另立规则并补事务内数量调整。

候选 CHECK 尚未进入迁移、未在生产执行。生产加约束需要窗口，存量核销后再 `VALIDATE`。
