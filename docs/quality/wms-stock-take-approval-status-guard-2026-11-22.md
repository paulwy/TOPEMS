# WMS 盘点审批状态治理（B125）

日期：2026-11-22
范围：`wms.stock_takes.approval_status`

## 结论

盘点单审批状态复用 `StockTakeApprovalStatus`，规范集合 `pending / approved / rejected`，默认 `pending`；候选补默认、非空与 `NOT VALID` CHECK。

本批修复了三个假成功与两个读侧缺口：

- 创建盘点单此前不写 `approval_status`，新单审批状态为 NULL；现在 INSERT 显式绑定默认 `pending`。
- 审批通过只校验主状态 `in_progress`，已 `approved` 的单还能反复调用并返回成功；现在预读严格解析审批状态，已通过直接 409，UPDATE 增加 `pending/rejected` 起始谓词。
- 审批驳回只校验主状态，已 `rejected` 或已 `approved` 的单都能再驳；现在只允许 `pending → rejected`，重复驳回 409。
- 驳回后主状态仍是 `in_progress`、审批状态为 `rejected`；审批通过允许从 `pending/rejected` 进入 `approved`，因此返工后可以重新审批，不会形成死锁。
- 盘点列表、计数、详情只过滤主状态与调整状态，非法审批状态的历史行仍会返回；现在补 `COALESCE(approval_status,'pending')` 规范集合过滤，兼容候选落地前的旧 NULL 行。

## DB 现状

本地 `topems` 与生产快照 `topems_prod_verify_20261106`：

- `wms.stock_takes` 0 行。
- `approval_status` nullable、无默认、无 CHECK。
- 候选：`docs/database/wms-stock-take-approval-status-check-candidates-2026-11-22.sql`，设置默认 `pending`、回填 NULL、补 `NOT NULL`，新增 `ck_stock_takes_approval_status_standard ... NOT VALID`。

## 代码改动

- `create_stock_take` INSERT 显式写 `approval_status=pending`，不再依赖列默认。
- `start_stock_take` 仍显式写 `pending`，与创建保持一致。
- `approve_stock_take`：
  - 预读同时读取 `status` 与 `approval_status`，两者都严格解析，非法值 409。
  - 已 `approved` 时直接 409，拒绝重复审批。
  - UPDATE 增加 `COALESCE(approval_status,'pending') = ANY(pending,rejected)` 谓词，0 行返回 409。
- `reject_stock_take`：
  - 预读同样严格解析 `status` 与 `approval_status`。
  - 仅 `pending` 允许驳回；已 `approved` 或已 `rejected` 均 409。
  - UPDATE 增加 `COALESCE(approval_status,'pending') = pending` 谓词，0 行返回 409。
- 盘点列表与 COUNT、详情补审批状态规范集合过滤。
- 前端新增 `StockTakeApprovalStatus` 联合类型，`StockTake.approval_status` 由 `string` 收敛为该三值联合（保持可选以兼容创建响应）。

## 验证

- WMS 测试 592 通过；clippy/fmt 通过；前端 typecheck 通过。
- 约束事务演练：缺省插入 `pending`；合法更新 `approved`；非法 `done` 23514；`NULL` 23502；ROLLBACK 后约束 0、0 行、列恢复 nullable 无默认。
- 盘点 202 个 Rust 枚举 / 190 值 / 151 不在 DB CHECK / 205 前端键，色板缺口 0；队列 138/151，resolved 106。

## 剩余风险

- 驳回后不会把主状态退回 `planned`，只把审批状态置 `rejected`；返工后需再次调用审批通过，已在本批允许。
- 审批状态没有审计历史表，只有 `log_approval_event`；重复审批被阻止，但看不到完整历史链。
- `wms.stock_take_items.quality_status` 仍是自由文本，未纳入本批。
