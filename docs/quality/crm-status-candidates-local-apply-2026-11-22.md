# CRM B134～B138 状态候选本地应用记录

日期：2026-11-22

## 应用范围
- 环境：本地 `postgresql:///topems?host=/tmp`
- 方式：单事务顺序执行 4 份候选 DDL，并在提交前校验四张表无 NULL / 越界状态；校验通过后 `COMMIT`
- 应用候选：
  1. `docs/database/crm-customer-order-status-check-candidates-2026-11-22.sql`
  2. `docs/database/crm-master-data-ref-status-check-candidates-2026-11-22.sql`
  3. `docs/database/crm-sales-order-status-check-candidates-2026-11-22.sql`
  4. `docs/database/crm-billing-status-check-candidates-2026-11-22.sql`
- B137 无独立候选，复用 B132 交互状态候选；本批未应用 B132 候选。

## 应用结果
| 表 | 约束 | 状态 |
|---|---|---|
| `crm.customer_orders` | `ck_customer_orders_status_standard` 六值 | `NOT VALID` 已建 |
| `crm.crm_master_data_refs` | `ck_crm_master_data_refs_status_standard` 三值 | `NOT VALID` 已建 |
| `crm.sales_orders` | `ck_sales_orders_status_standard` 六值 | `NOT VALID` 已建 |
| `crm.billing_records` | `ck_billing_records_status_standard` 四值 | 旧错误约束已替换，`NOT VALID` 已建 |

- 四列均 `NOT NULL`，默认分别为 `draft / active / pending / pending`。
- 本地行数不变：`customer_orders=16`、`crm_master_data_refs=832`、`sales_orders=0`、`billing_records=0`。
- B138 专项验证：事务内插入 `pending` 账单，改为 `overdue`、再改为 `cancelled`，两次均成功，随后 `ROLLBACK`；旧错误 CHECK 不再拦截这两个真实状态。

## 未应用范围
- `topems_prod_verify_20261106` 生产快照保持只读基线，未修改。
- 实际生产环境未应用；需通过正式发布窗口执行同一组候选，并在窗口内逐条 `VALIDATE CONSTRAINT`。
