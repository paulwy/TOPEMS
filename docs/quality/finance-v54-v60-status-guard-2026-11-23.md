# B218 · 财务 v54/v55/v58/v60 状态列 DB 兜底证据（2026-11-23）

## 范围

四条状态列，代码侧已有唯一枚举、写入侧已绑定，但**没有 DB CHECK**，
外部脚本 / 数据导入 / 手工 SQL 仍可写任意字符串：

| 表.列 | 枚举 | 值集 | 本地行数 |
| --- | --- | --- | --- |
| `finance.finance_v54_review_workflows.status` | `ReviewWorkflowStatus`（`risk_v54.rs`） | pending / in_progress / completed / rejected | 0 |
| `finance.finance_v55_payment_results.status` | `PaymentStatus`（`settlement_v55.rs`） | pending / processing / completed / failed / reversed | 0 |
| `finance.finance_v58_pool_transfers.status` | `TransferStatus`（`treasury_v58.rs`） | pending / completed / failed | 0 |
| `finance.finance_v60_schedule_executions.status` | `ScheduleExecutionStatus`（`decision_v60.rs`） | pending / running / completed / failed / cancelled | 0 |

## 本批动作

- 四列各加 canonical CHECK（均 `NOT VALID`），约束名统一 `ck_<schema>_<table>_status_standard`。
- 四张表在 `status-code-inventory` / `status-db-check-mappings` 中补登记，
  让"枚举 → 列"的映射闭环，缺口队列同步收敛。
- 写入侧核对：四列当前写入分别为 `ReviewWorkflowStatus::{Pending,InProgress,Completed,Rejected}`、
  `PaymentStatus::{Completed,Reversed,Pending}`、`TransferStatus::Completed`、
  `ScheduleExecutionStatus::Completed`，全部落在约束值集内，且 DB 默认值（`pending`）
  也都在值集内，无 B210 那类默认值漂移。
- `advance_workflow` 的起始状态白名单已有 `from_str` 严格解析 + 终态保护（B5 已做），本批不再改动业务逻辑。

## 本地验证

- 四列约束应用后按表插入一条合法行再 `UPDATE status='bogus'`（事务内，测试后 `ROLLBACK`）：
  四条均被对应 `ck_*_status_standard` 拒绝；合法值 `pending` 可写。
- 四表存量 0 行，无需数据修复；`NOT VALID` 保证不阻塞已有生产数据。

## 遗留

- 四个枚举的 `as_str` / `from_str` 仍是模块私有（`fn` 而非 `pub const`），
  后续若要给这些模块加列表状态过滤，需先补 `DB_VALUES` / `normalize` / `parse_filter` 的公共 API（与 B208 起的口径一致）。
- 这些表都是 v5x 虚拟业务表，当前无对外列表过滤参数，故本批只做 DB 兜底，未新增 handler 校验。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
