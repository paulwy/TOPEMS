# B200 请假记录状态收敛证据（2026-11-23）

## 唯一枚举（两列，同一文件）

`svc/hrm/src/modules/leave_status.rs`

| 枚举 | 落库列 | 值集 | 默认 |
| --- | --- | --- | --- |
| `LeaveRecordStatus` | `hrm.leave_records.status` | `pending` / `approved` / `rejected` / `cancelled` | `pending` |
| `LeaveApprovalStatus` | `hrm.leave_records.approval_status` | `pending` / `approved` / `rejected` | `pending` |

`status` 的四个值对齐前端 `apps/web/src/schemas/hrm/leave.ts` 的下拉、筛选、
`statusBadge.colorMap` 与 `labelMap`；其中 `cancelled` 前端可见但后端尚无写入口，按合法值保留。

单测：两组值往返；`bogus` / `draft` / `cancelled`（对 `approval_status`）拒绝；
`canceled` 别名归一 `cancelled`；`normalize` 空串与未知值回落默认；`parse_filter` 覆盖
`None` / 空串 / `ALL` / 合法值 / 非法值。

## 主要缺陷：两列一写一读，报表恒为 0

`hrm.leave_records` 同时有 `status` 与 `approval_status`：

- `status` 被创建、批准、拒绝三处写入；
- `approval_status` **全仓没有任何代码写入**，永远停在 DB 默认 `pending`；
- 但 `svc/hrm/src/modules/reports.rs:593` 的请假天数统计条件是
  `approval_status = 'approved'`。

结果是：请假被批准后，报表统计始终为 0。本批让批准 / 拒绝同时写入两列
（`status` → `approved`/`rejected`，`approval_status` → `approved`/`rejected`），
两列从此同口径流转，报表恢复可计数。

## 写入口与状态流转绑定

| 位置 | 收敛前 | 收敛后 |
| --- | --- | --- |
| `create_leave` | `VALUES (..., $7, 'pending', $8, $9, $10)` | 状态改 `$8`，绑 `LeaveRecordStatus::DEFAULT` |
| `update_leave` | `WHERE id = $7 AND status = 'pending'` | `status = $8`，绑 `Pending` |
| `delete_leave` | `WHERE id = $1 AND status = 'pending'` | `status = $2`，绑 `Pending` |
| `approve_leave` | `SET status = 'approved' ... WHERE status = 'pending'` | 绑 `Approved` / `Pending`，并新增 `approval_status = $6` 绑 `LeaveApprovalStatus::Approved` |
| `reject_leave` | `SET status = 'rejected' ... WHERE status = 'pending'` | 绑 `Rejected` / `Pending`，并新增 `approval_status = $7` 绑 `LeaveApprovalStatus::Rejected` |
| `list_leaves` | `let status_filter = params.status;` 原样绑定 | `parse_filter` 校验，非法 400，`all` / 空串忽略 |

列表 `items` 与 5 个单条响应出口统一经 `normalize_leave`（`LeaveRecordStatus::normalize`）归一。

## 数据库约束

- 候选：`docs/database/hrm-leave-record-status-check-candidates-2026-11-23.sql`
- `ck_hrm_leave_records_status_standard`：`CHECK (status IN (4 值))`，`NOT VALID`
- `ck_hrm_leave_records_approval_status_standard`：`CHECK (approval_status IN (3 值))`，`NOT VALID`
- 本地应用：`hrm.leave_records` 0 行，两条约束均 `convalidated=false`
- 探针：分别以 `status='bogus'` 与 `approval_status='bogus'` 事务内插入，均被对应约束拒绝，事务回滚
- 默认值：两列 DB 默认都已是 `pending`，与枚举默认一致，无需变更默认、无需回填

## 门禁

- `cargo clippy -p topems-hrm --lib --tests -- -D warnings` 通过
- `cargo test -p topems-hrm --lib`：285 passed
