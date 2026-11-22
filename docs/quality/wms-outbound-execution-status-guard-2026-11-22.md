# WMS 出库执行阶段状态治理（B123）

日期：2026-11-22
范围：`wms.outbound_orders.picking_status / packing_status / shipping_status`

## 结论

三个执行态列统一为 `pending / in_progress / completed`，默认 `pending`，唯一值源为 `OutboundExecutionStatus`。创建、列表、详情、通用更新、确认、拣货、打包、审批通过、驳回、发货、完成全部接入同一套状态与谓词；写入口补租户、软删、规范集合与起始态校验，0 行统一 409。

本批同时修复了四类流程缺陷：审批通过只改主状态、不落打包完成与发货开始；审批驳回不回退阶段状态；发货允许从 `created / confirmed / picking` 跳过拣货和打包；已审批的 `shipping` 反而不能走真实发货。修复后发货必须以审批通过为前置，完成必须处于发货中，审批驳回可回到拣货返工并由打包接口重新进入。

## DB 现状

本地 `topems` 与生产快照 `topems_prod_verify_20261106`：

- `wms.outbound_orders` 0 行，`wms.outbound_order_items` 0 行。
- 三列均 nullable、无默认、无 CHECK；`wms.outbound_orders` 上无任何 CHECK 约束。
- 明细表只有 `picking_status / packing_status` 两列，均 nullable、无默认、无 CHECK，且代码无任何写入点。

候选：`docs/database/wms-outbound-execution-status-check-candidates-2026-11-22.sql`。设置默认 `pending`、补 `NOT NULL`，并新增三个 `NOT VALID` 约束：

- `ck_outbound_orders_picking_status_standard`
- `ck_outbound_orders_packing_status_standard`
- `ck_outbound_orders_shipping_status_standard`

## 代码改动

### 唯一状态源

新增 `svc/wms/src/modules/outbound_execution_status.rs`：

- `OutboundExecutionStatus::{Pending, InProgress, Completed}`
- `DB_VALUES = ["pending", "in_progress", "completed"]`
- `DEFAULT = Pending`
- 迁移矩阵：`pending → in_progress`、`in_progress → completed | pending`、`completed → in_progress`；禁止 `completed → pending`
- 2 个单测：值往返与迁移矩阵

### 写入

- 创建：INSERT 不再漏写三列，统一绑定 `DEFAULT`；模型字段由 `Option<String>` 改为必填 `String`。
- 确认：补租户、软删与三列 `pending` 谓词，避免非初始态被确认。
- 拣货：补租户、软删与 `confirmed + picking_status=pending` 谓词，写入 `picking_status=in_progress`。
- 打包：补租户、软删，要求 `picking_status=in_progress`、`packing_status=pending`、`shipping_status=pending`；同一条 UPDATE 内完成拣货并开始打包。
- 审批通过：从 `packing` 进入 `shipping` 时同步写 `packing_status=completed`、`packing_end_time`、`shipping_status=in_progress`；要求拣货已完成、打包进行中。
- 审批驳回：从 `packing` 回到 `picking` 时同步重置 `picking_status=in_progress`、`packing_status=pending`、`shipping_status=pending`，并清空 `packing_end_time`，不再留下“拣货完成、打包进行中”的错乱。
- 发货：只允许 `shipping`（即审批通过后），要求拣货、打包均完成且发货进行中；禁止从 `created / confirmed / picking / packing` 直接发货伪造阶段完成。发货保持 `shipping` 且可继续分批写入实发明细。
- 完成：补租户、软删与 `shipping + shipping_status=in_progress` 谓词，置 `shipping_status=completed`。
- 通用 PUT：预读与 UPDATE 都补租户与规范集合，仍禁止直接改主状态。

### 读取

10 处 `SELECT / RETURNING` 都补齐三个执行态字段。此前模型字段带 `#[sqlx(default)]`，所有查询又不选这三列，导致即使表中已写入，API 也永远返回 null。

列表、计数、详情、通用更新的预读都补三列规范集合过滤；列表、详情、计数同时补租户与软删。非法历史值不会进入响应或后续写入。

### 前端

`apps/web/src/api/wms/types.ts` 的 `OutboundOrder` 三个字段从 `?: string` 收敛为必填 `'pending' | 'in_progress' | 'completed'`。

## 验证

- `cargo fmt --all`
- `cargo clippy -p topems-wms --all-targets -- -D warnings`
- `cargo test -p topems-wms --lib`：590 passed
- `apps/web pnpm run typecheck`：通过
- 约束事务演练：缺省插入得 `pending/pending/pending`；合法更新 `in_progress/completed` 成功；`done` 触发 23514；`NULL` 触发 23502；ROLLBACK 后约束 0、演练单 0、三列恢复 nullable 且无默认。
- 流程事务演练：`confirmed → picking(in_progress) → packing(picking completed, packing in_progress) → 驳回(picking in_progress, packing pending) → 重新打包 → 审批(shipping in_progress) → 发货(packing completed, shipping in_progress) → 完成(completed)`，每一步均 1 行；最终 `completed/completed/completed`，ROLLBACK 后 0 行。

## 剩余风险

- `wms.outbound_order_items.picking_status / packing_status` 仍是自由文本且无写入点。是否把明细阶段并入出库执行态，需要业务确认“按明细拣货/打包”的粒度后再单独批次处理。
- 发货已强制要求审批通过，但 `start_outbound_approval` 只写审计事件、不改变状态；审批通过与驳回依赖 `packing` 当前态。若未来需要多级审批或审批中锁定，需要增加持久化审批态。
- `complete_outbound_order` 本身不扣库存，库存扣减仍只在 `ship_outbound_order`；当前已通过状态前置保证“先发货、后完成”，但若存在不经 `ship` 的历史数据，仍需单独核对。
