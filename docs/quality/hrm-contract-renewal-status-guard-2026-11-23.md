# HRM 合同续签状态守卫（B214）

日期：2026-11-23
范围：`hrm.contract_renewals.status`

## 1. 问题

续签状态列是 `varchar NOT NULL DEFAULT 'pending'`，所有写入都是字面量、所有判断都是字符串比较：

- 创建写 `'pending'`，审批 `SET status='approved'`、驳回 `SET status='rejected'`、执行 `SET status='executed'`；
- 更新与取消用 `WHERE status = 'pending'` 守卫，执行前置用 `if renewal.status != "approved"` 直接比字符串；
- 列表 `status` 参数原样绑定主查询与 COUNT，非法值静默返回空列表。

## 2. 修复

新增 `svc/hrm/src/modules/contract_renewal_status.rs`（`ContractRenewalStatus`：pending/approved/rejected/executed，默认 pending；`DB_VALUES`/`from_db_str`/`as_db_str`/`normalize`/`parse_filter`/`Display`/`FromStr` + 2 单测）。

`contract.rs` 接线 12 处：

| 位置 | 原写法 | 现写法 |
| --- | --- | --- |
| 创建续签 | `VALUES (..., 'pending', ...)` | `$11` + `Pending` |
| 更新续签 | `WHERE id = $1 AND status = 'pending'` | `$8` + `Pending` |
| 取消续签 | `... AND status = 'pending'` | `$2` + `Pending` |
| 审批 | `SET status='approved' ... WHERE status='pending'` | `$3`/`$4` + `Approved`/`Pending` |
| 驳回 | `SET status='rejected' ... WHERE status='pending'` | `$4`/`$5` + `Rejected`/`Pending` |
| 执行前置 | `renewal.status != "approved"` | `from_db_str(...) != Some(Approved)` |
| 执行落库 | `SET status='executed'` | `$3` + `Executed` |
| 列表过滤 | `params.status.clone()` 裸绑 | handler `parse_filter`，非法值 400；空串/`all` 归一不过滤 |

## 3. 数据库约束

`docs/database/hrm-contract-renewal-status-check-candidates-2026-11-23.sql`，`NOT VALID`，已应用到本地 `topems`（0 行）：`ck_hrm_contract_renewals_status_standard`。

## 4. 负向验证

插入 `status='bogus'` → `violates check constraint ck_hrm_contract_renewals_status_standard`，被拒。

## 5. 门禁

- `cargo fmt --all` / `cargo clippy -p topems-hrm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-hrm --lib`：**304 passed**（+2）
- `dump-status-checks --check`：407 条 CHECK / 5 ENUM / 319 无约束列，PASS
- `dump-status-code-inventory --check --strict-palette`：285 枚举 / 245 前端键，色板缺口 0，PASS
- `status-db-check-queue --check`：44 枚举 / 57 值，PASS
- `check-request-txn` / `check-scope-api` / `check-txn-write-non2xx` / `verify-glossary` / `check-i18n 7-in-1` / `apps/web typecheck`：通过

## 6. 遗留

- 执行续签时同时把 `hrm.contracts.status` 写 `'active'`、`hrm.contracts` 列表也裸绑 `status` 过滤——合同状态列是独立的一列（值集与续签无关），未纳入本批，留后续批次。
- 执行成功后 `contract_renewals` 状态更新用的是忽略返回值的 `let _ = sqlx::query(...)`，若更新失败不会回滚合同更新。本批只收敛状态值，不改事务语义；该问题已记录，建议后续专项把它改为可失败路径。
