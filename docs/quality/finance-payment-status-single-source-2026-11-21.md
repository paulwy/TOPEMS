# 付款单状态单一源（2026-11-21）

## 结论

`finance.core_finance_payments.status` 原本没有任何业务写入口：

- 建单依赖 DB 默认 `draft`，Rust 创建语句不写 `status`；
- `submit_payment` 只把凭证从 `Draft` 提交到 `Submitted`、创建工作流关联，付款单状态不动；
- `approve_payment` 审批凭证后只写 `approved_by`，付款单状态不动；
- `reject_payment` 拒绝凭证后不写付款单状态；
- `execute_payment` 只写实际付款日期、流水号、执行人，付款单状态不动。

结果付款单状态永远停在 `draft`，本地唯一历史行是手工写成的 `completed`。同时 API 对外状态取自凭证：

```rust
pub struct PaymentResponse {
    ...
    pub status: VoucherStatus,
}
```

前端付款页拿到的是 `draft/submitted/approved/posted...`，但表单选项是 `pending/processing/completed/failed/cancelled`，两边完全没有交集。

现统一付款单自身状态为六值：`draft / pending / processing / completed / failed / cancelled`。

## 状态机

- 创建：`draft`；
- 提交：`draft` → `pending`，同时提交凭证、创建工作流关联；
- 审批通过且工作流全部通过：`pending` → `processing`；
- 多级审批未完成：保持 `pending`；
- 驳回：`pending` → `failed`；
- 执行付款：`processing` → `completed`；
- 编辑 / 删除仅允许 `draft`；
- 未知值返回 400，不静默归一；兼容别名 `approved/posted` → `processing`、`rejected` → `failed`、`paid` → `completed`。

## 改动

- 新增 `svc/finance/src/modules/ap_payment_status.rs`：`PaymentStatus` 六值、`ALL`、`as_str`、`can_submit/approve/reject/execute`、`FromStr` 别名、`normalize_payment_status`、3 个单测。
- `models/mod.rs`：`Payment` 增加 `status: String`；`PaymentResponse.status` 从 `VoucherStatus` 改为 `String`，注释明确取付款单自身状态。
- `services/finance/payment.rs`：
  - 创建 INSERT 显式写入 `status='draft'`（参数 `$15`），不再依赖 DB 默认；
  - 6 处显式 SELECT 列表补 `status`，避免新增字段解码失败；
  - 列表/详情/更新响应状态统一取 `payment.status`，删除仅为透出凭证状态而做的 `get_voucher` 块；
  - 编辑/删除增加付款单 `draft` 校验；
  - 列表 `status` 过滤真正生效，并校验枚举；`supplier_id`、`start_date`、`end_date` 一并接线；
  - 导出收款单的 `status/start_date/end_date` 原本拼接了 `$2/$3/$4` 却从未 bind，必然查询失败；改为 `COALESCE` 静态 SQL 并绑定参数。
- `services/finance/payment_workflow.rs`：
  - submit/approve/reject/execute 各加起始状态校验；
  - 提交后 `SET status='pending' WHERE status='draft'`；
  - 审批完成 `SET approved_by=$1, status='processing' WHERE status='pending'`；
  - 驳回 `SET status='failed' WHERE status='pending'`；
  - 执行 `SET status='completed' WHERE status='processing'`；
  - 所有 UPDATE 检查 `rows_affected`，0 行返回 409 语义的“状态已变化”，不再假成功；
  - 修掉工作流调用失败的静默降级：创建工作流实例失败、审批/拒绝工作流失败原本会 `warn` 后继续提交/审批凭证，导致“流程没走却成功”；现直接返回错误，不推进付款单。
- 前端：
  - `schemas/finance/payment.ts` 状态选项补 `draft`，默认值改 `draft`，字段设为只读（状态只能由工作流推进，创建/编辑表单不可手改）；
  - `list.statusBadge` 补 `draft` 色与标签，筛选补 `draft`；
  - `api/finance/payment.ts` 增加 `PaymentStatus` 联合类型，`Payment.status` 不再裸 `string`；
  - 中英文 `finance.payment.k43` 补“草稿/Draft”。

## 验证

- `cargo test -p topems-finance --lib modules::ap_payment_status`：3 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- `pnpm --dir apps/web typecheck`：通过。
- `pnpm --dir apps/web exec vitest run src/components/finance src/schemas/finance`：3 文件 / 7 用例通过。
- `eslint apps/web/src/schemas/finance/payment.ts --quiet`：0 error。
- 本地库事务回滚演练：
  - `draft` 插入 1 行；
  - `draft → pending` 1 行；
  - `pending → processing` 1 行；
  - `processing → completed` 1 行；
  - 重复 `processing → completed` 0 行；
  - 已完成后 `pending → failed` 0 行。
- 列表/导出 SQL 以 NULL 与 `completed` 两组参数在本地库验证，计数与行返回正确。
- 未对现有 `completed` 历史行做数据修改。

## DB CHECK（待生产窗口）

`core_finance_payments.status` 为 `text NOT NULL DEFAULT 'draft'`，本地仅 1 行 `completed`，在候选集合内。生产需先盘点分布，再 `NOT VALID` + `VALIDATE`：

```sql
SELECT status, count(*) FROM finance.core_finance_payments GROUP BY 1 ORDER BY 2 DESC;

ALTER TABLE finance.core_finance_payments
  ADD CONSTRAINT core_finance_payments_status_check
  CHECK (status IN ('draft','pending','processing','completed','failed','cancelled')) NOT VALID;

ALTER TABLE finance.core_finance_payments
  VALIDATE CONSTRAINT core_finance_payments_status_check;
```

`core_finance_payment_workflow.status` 仍是无约束自由文本，本轮只固定写入 `pending` 与工作流实例回写值，未纳入同一集合；下一批单独收口。
