# B217 · 付款单工作流 / 明细核销状态护栏证据（2026-11-23）

## 范围

- 表：`finance.core_finance_payment_workflow.status`（text NULL DEFAULT `pending`，本地 0 行）、
  `finance.core_finance_payment_items.write_off_status`（text NULL DEFAULT `pending`，本地 0 行）
- 代码：`svc/finance/src/services/finance/payment_workflow.rs`（建关联 / 审批 / 驳回 / 核销）
- 枚举：`svc/finance/src/modules/payment_workflow_status.rs`（新增）、
  `svc/finance/src/modules/payment_item_write_off_status.rs`（B9 已建，本次只补约束）

## 值集

- `PaymentWorkflowStatus = { pending, running, approved, rejected, cancelled, suspended, completed, error }`，
  默认 `pending`（与 DB 默认一致）。值集镜像
  `svc/unified-core/src/modules/flow/workflow_instance_status.rs::WorkflowInstanceStatus::DB_VALUES`，
  Finance 不依赖 unified-core crate，两边新增状态必须同步。
- `PaymentItemWriteOffStatus = { pending, completed }`，NULL 视为 `pending`。

## 修掉的缺陷

1. **外部引擎状态原样入库**：审批 / 驳回成功后把 `instance.status`（来自工作流引擎响应）
   直接 `.bind()` 进 `UPDATE finance.core_finance_payment_workflow SET status = $2`。
   上游任何拼写差异、新增状态或空串都会静默落库，前端按固定值渲染就会漏。
   现在两条路径都先 `PaymentWorkflowStatus::from_db_str` 严格解析，未知值返回
   `ValidationFailed`（整笔审批事务回滚，工作流侧已发生的动作由上层补偿），只写规范值。
2. **审批判定用裸字符串比较**：`if instance.status == "approved"` → 与枚举 `Approved` 比较，
   且复用同一份解析结果，避免"判定通过但写入另一个串"的分裂。
3. **建关联写死 `'pending'` 字面量**：改绑 `PaymentWorkflowStatus::DEFAULT.as_str()`。
4. **两列都没有 DB 约束**：新增
   `ck_core_finance_payment_workflow_status_standard`、
   `ck_core_finance_payment_items_write_off_status_standard`（均 `NOT VALID`），
   挡住外部脚本 / 导入 / 手工 SQL 的自由串。

## 本地验证

- 约束应用（`postgresql:///topems?host=/tmp`）：
  - `INSERT ... status='bogus'` 被 `ck_core_finance_payment_workflow_status_standard` 拒绝。
  - `INSERT ... write_off_status='bogus'` 被 `ck_core_finance_payment_items_write_off_status_standard` 拒绝。
  - 两表存量 0 行，无需数据修复。
- 单测（`payment_workflow_status`）：
  - 8 个 `DB_VALUES` 往返一致；`DEFAULT == Pending`；
  - 别名 `in_progress → running`、`failed → error`；`approve` / 空串 / `APPROVED` 均被拒；
  - `parse_filter`：`None` / 空串 / `ALL` → `Ok(None)`，`" approved "` → `Ok(Some(Approved))`，`bogus` → `Err`。

## 遗留

- `PaymentWorkflowStatus` 是镜像枚举，unified-core 侧 `WorkflowInstanceStatus` 变更时需同步（已在模块头注释标明）。
- 工作流实例创建失败时不会写关联行，`status` 只由审批 / 驳回两条路径与建关联默认值产生，暂无列表接口按状态过滤，故本批未改 handler。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
