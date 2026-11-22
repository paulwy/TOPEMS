# WMS 出库单状态治理（B109）

日期：2026-11-22
范围：`wms.outbound_orders.status`

## 问题

出库单存在三套口径：

- 后端 FSM 与 `apps/web/src/types/wms.ts` 使用 `created / confirmed / picking / packing / shipping / completed / cancelled`；
- `apps/web/src/schemas/wms/outbound.ts` 使用 `pending / confirmed / picking / picked / packing / shipped / completed / cancelled`，默认 `pending`；
- 创建写死 `'created'`，确认只接受 `created`，发货写 `shipping`，完成只接受 `shipping`；
- 通用更新直接接受任意 `req.status`，可以绕过 FSM 把订单改成任意值；
- 删除没有状态限制，履约中的订单也能软删；
- 数据库列 `NOT NULL DEFAULT 'created'`，没有 CHECK。

本地 `wms.outbound_orders` 当前 0 行，没有存量迁移压力，但写入口和前端筛选彼此不兼容。

## 决策

- 规范集合采用后端 FSM 与前端类型已有口径：`created / confirmed / picking / packing / shipping / completed / cancelled`，默认 `created`。
- 旧前端值只读映射：`pending -> created`、`picked -> picking`、`shipped -> shipping`，不进入写入。
- `picked` 不作为独立状态：后端没有写入点，打包动作直接从 `picking` 进 `packing`。
- 允许删除的只有 `created / cancelled`；其它状态删除返回 404（不存在或不可删除）。

## 代码变更

新增 `svc/wms/src/modules/outbound_status.rs`：

- `OutboundStatus` 七值、`DB_VALUES`、`DEFAULT = Created`；
- `from_db_str` 严格解析，`from_read_str` 兼容旧值；
- 迁移矩阵：`created -> confirmed|cancelled`、`confirmed -> picking|cancelled`、`picking -> packing|cancelled`、`packing -> picking(驳回)|shipping(审批)|cancelled`、`shipping -> completed`；
- `DELETABLE = created/cancelled`；
- 2 个单测覆盖默认值、往返解析、旧值映射、迁移矩阵、终态和可删除性。

`svc/wms/src/shared/fsm.rs` 的 `OUTBOUND_ORDER` 改为引用同一组常量，删除第二份状态表；`outbound_order_can_transition` / `requires_approval` / `is_valid_outbound_order_status` 全部走枚举。

`svc/wms/src/modules/outbound_order.rs`：

- 列表 `status` 参数严格解析，`all`/空不过滤，未知 400；SELECT 与 COUNT 加 `status = ANY(canonical)` 和 `deleted_at IS NULL`；
- 详情加 `status = ANY($2::text[])`，集合外行 404；
- 创建不再写死 `'created'`，INSERT 绑定 `OutboundStatus::DEFAULT`；
- 通用更新：预读只取规范集合行；当前状态严格解析；`req.status` 只能等于当前状态，改态返回 400；UPDATE 加旧状态谓词，0 行 409；
- 确认：目标 `confirmed`，起始 `created`，0 行 409；
- 拣货：目标 `picking`，起始 `confirmed`，0 行 409；
- 打包：目标 `packing`，起始 `picking`，0 行 409；
- 发货：目标 `shipping`，起始 `packing`，0 行 409；
- 完成：目标 `completed`，起始 `shipping`，0 行 409；
- 审批通过：`packing -> shipping`，UPDATE 带 `status='packing'` 谓词，0 行 409；
- 审批驳回：`packing -> picking`，同样带起始态谓词，0 行 409；
- 删除：`status = ANY(created/cancelled)`，其它状态 0 行。

前端 `apps/web/src/schemas/wms/outbound.ts` 改成七值，默认 `created`，去掉 `pending/picked/shipped`；状态色板与筛选同步。`apps/web/src/utils/status.ts` 补 `picking/packing/shipping`。

## 验证

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：`561 passed`（B108 为 559）
- Web `typecheck`：通过
- Web `lint`：0 errors（156 warnings，存量）
- `dump-status-code-inventory.mjs --check --strict-palette`：`184` 个 Rust 枚举 / `199` 个前端状态键一致，色板缺口 `0`
- `status-db-check-queue.mjs --check`：`128` 枚举 / `145` 值，分桶一致

## 候选约束演练

候选文件：`docs/database/wms-outbound-status-check-candidates-2026-11-22.sql`
约束：`ck_outbound_orders_status_standard`，七值，`NOT VALID`。

本地事务内：

1. `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` 成功；
2. 用真实仓库插入 1 行 `created` 探针，成功；
3. 把探针改成 `bogus`，触发 `23514 ck_outbound_orders_status_standard`；
4. 事务回滚后约束计数 `0`、表行数 `0`。首次探针因漏 `organization_id` 被非空约束拦下，补列后重跑成功。

## 残留

- 候选 CHECK 尚未进入迁移、未在生产执行；生产加约束需要窗口，存量先预检再 `NOT VALID` 加列，核销后 `VALIDATE`。
- `picking_status / packing_status / shipping_status` 是明细执行态，本批未收口，仍为自由文本。
- 出库订单 0 行，没有任何真实流转数据可验证端到端动作；本批只验证约束和单元测试。
