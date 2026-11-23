# B211 · ERP 对账单 / 财务付款单状态护栏证据（2026-11-23）

## 范围

- 表：`erp.fin_reconciliations`（`status` varchar(20) NOT NULL DEFAULT `pending`，本地 0 行）
  `finance.core_finance_payments`（`status` text NOT NULL DEFAULT `draft`，本地 1 行 `completed`）
- 代码：`svc/erp/src/event_handlers/mod.rs`（对账单三个事件消费者）、
  `svc/finance/src/services/finance/payment.rs` + `payment_workflow.rs`（付款单写入）
- 枚举：`svc/erp/src/modules/fin_reconciliation_status.rs`（新增）；
  `svc/finance/src/modules/ap_payment_status.rs`（复用，B8 已建）

## 值集

- `FinReconciliationStatus = { pending, draft, matched, approved }`，默认 `pending`；
  审批只允许从 `pending`/`draft` 流转（`APPROVABLE`）。
- `PaymentStatus = { draft, pending, processing, completed, failed, cancelled }`，默认 `draft`。

## 修掉的缺陷

1. **对账单两条事件入口直接写载荷自由串**：`ReconciliationCreated` 把 `payload.status` 绑进
   `INSERT`，`ReconciliationUpdated` 把 `payload.status` 绑进 `UPDATE`。生产方在 `finance`
   侧写的是字面量，但事件可以重放、可被其它发布方伪造，消费者此前完全不校验。
   现两条入口都先 `from_db_str` 严格解析，未知值直接 `ValidationFailed`（进失败分支，不落库）。
2. **审批状态机是 SQL 字面量**：`SET status='approved' WHERE status IN ('pending','draft')`，
   现改为参数绑定 + `APPROVABLE` 常量，流转白名单只有一个来源。
3. **两个列都没有 DB 约束**：`erp.fin_reconciliations.status` 与 `finance.core_finance_payments.status`
   可被外部脚本/导入/手工 SQL 写任意字符串，现各加 canonical CHECK 兜底。

## 本地验证

```sql
ALTER TABLE erp.fin_reconciliations ADD CONSTRAINT ck_erp_fin_reconciliations_status_standard
  CHECK (status IN ('pending','draft','matched','approved')) NOT VALID;
ALTER TABLE finance.core_finance_payments ADD CONSTRAINT ck_finance_core_finance_payments_status_standard
  CHECK (status IN ('draft','pending','processing','completed','failed','cancelled')) NOT VALID;
```

- 两条均成功，`convalidated = f`；付款单存量 1 行 `completed` 在值域内。
- 负向验证：`fin_reconciliations.status='bogus'` 插入被拒；`core_finance_payments` 存量行
  `UPDATE status='bogus'` 被拒，均回滚。
- 备注：付款单读取侧的历史别名（`approved`/`posted`→`processing`、`rejected`→`failed`、
  `paid`→`completed`）仍保留在 `FromStr` 里，写入侧全部绑 canonical，故约束按 canonical 收紧。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 门禁

- `cargo fmt --all`、`cargo clippy -p topems-erp --lib --tests -- -D warnings`、`cargo test -p topems-erp --lib`（905 passed）
- `dump-status-checks.mjs --check`、`dump-status-code-inventory.mjs --check --strict-palette`、`status-db-check-queue.mjs --check`
- `check-request-txn.mjs`、`check-scope-api.mjs`、`check-txn-write-non2xx.py --changed-only`
- `verify-glossary.cjs --strict`、`check-i18n.cjs --mode=quality --strict`、`apps/web npm run typecheck`

刷新后计数：catalog **402/5/321**、盘点 **281/236/57/245**、队列 **44/57 全 internal**，
前端键不在 DB CHECK **66**，色板缺口 0。
