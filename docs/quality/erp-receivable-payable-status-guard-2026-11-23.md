# ERP 应收/应付状态守卫（B212）

日期：2026-11-23
范围：`erp.receivables.status`、`erp.payables.status`

## 1. 问题

- `erp.receivables` 早已有 `ReceivableStatus`（pending/paid），但两处建单 INSERT 仍写 `'pending'` 字面量（销售订单、项目应收），枚举只覆盖核销段，值域权威只有一半。
- `erp.payables` 完全没有枚举：采购订单建单、入职福利计提两处 INSERT 写 `'pending'`，付款核销两处 UPDATE 写 `status = 'paid'` 与 `WHERE status = 'pending'`，自由串可一路写进库。
- 两列均为 `varchar(20) NOT NULL DEFAULT 'pending'`，此前无任何 CHECK。

## 2. 修复

新增 `svc/erp/src/modules/payable_status.rs`（`PayableStatus`：pending/paid，默认 pending；`DB_VALUES`/`DEFAULT`/`from_db_str`/`as_db_str`/`normalize`/`parse_filter` + 2 单测），并在 `event_handlers/mod.rs` 完成 9 处绑定：

| 位置 | 原写法 | 现写法 |
| --- | --- | --- |
| 销售订单建应收 | `VALUES (..., 'pending', ...)` | `$9` + `ReceivableStatus::DEFAULT` |
| 项目应收建单 | `VALUES (..., 'pending', ...)` | `$8` + `ReceivableStatus::DEFAULT` |
| 采购订单建应付 | `VALUES (..., 'pending', ...)` | `$9` + `PayableStatus::DEFAULT` |
| 入职福利计提应付 | `VALUES (..., 'pending', ...)` | `$7` + `PayableStatus::DEFAULT` |
| 付款核销（按供应商） | `SET status='paid' ... WHERE status='pending'` | `$5`/`$6` + `PayableStatus::Paid`/`Pending` |
| 付款核销（按金额 FIFO） | 同上 | `$4`/`$5` + `PayableStatus::Paid`/`Pending` |

状态流转不再依赖字符串字面量，改值只需改枚举。

## 3. 数据库约束

`docs/database/erp-receivable-payable-status-check-candidates-2026-11-23.sql`，两条均 `NOT VALID`，已应用到本地 `topems`：

- `ck_erp_receivables_status_standard`：`status IN ('pending','paid')`
- `ck_erp_payables_status_standard`：`status IN ('pending','paid')`

应用前存量：应收 5 行全 `pending`（在值域内），应付 0 行。

## 4. 负向验证

- 插入 `erp.payables.status='bogus'` → `violates check constraint ck_erp_payables_status_standard`，被拒。
- 存量行 `UPDATE ... SET status='bogus'` 同样被拒（NOT VALID 仍约束新写入）。

## 5. 门禁

- `cargo fmt --all` / `cargo clippy -p topems-erp --lib --tests -- -D warnings`：通过
- `cargo test -p topems-erp --lib`：907 passed
- `dump-status-checks --check`：404 条 CHECK / 5 ENUM / 320 无约束列，PASS
- `dump-status-code-inventory --check --strict-palette`：282 枚举 / 245 前端键，色板缺口 0，PASS
- `status-db-check-queue --check`：44 枚举 / 57 值，PASS
- `check-request-txn` / `check-scope-api` / `check-txn-write-non2xx` / `verify-glossary` / `check-i18n 7-in-1` / `apps/web typecheck`：全部通过

## 6. 遗留

- 两列 DB 默认值仍为 `'pending'`，与枚举 `DEFAULT` 一致，无需迁移；若将来值域改默认值需同步迁移。
- `finance.erp_payables` 是另一张表（`payment/payable.rs`、`aging.rs` 使用），不在本批范围。
