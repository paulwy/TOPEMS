# B199 请假申请状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/erp/src/modules/leave_request_status.rs`
- 枚举：`LeaveRequestStatus`
- 值集：`draft` / `pending` / `approved` / `rejected` / `cancelled`
- 默认：`draft`
- 落库列：`erp.leave_requests.status`（varchar NOT NULL，DB 默认 `draft`）

前端口径 `apps/web/src/schemas/hrm/leave.ts` 只暴露 `pending` / `approved` / `rejected` /
`cancelled`（下拉、`statusBadge.colorMap`、`labelMap`、筛选四处一致），与 ERP 端点一一对应。
`draft` 只存在于后端「创建 → 提交」之间，是内部态（internal_state），不进入前端下拉与筛选，
但必须能落库与回读，因此纳入枚举而非丢弃。

单测：5 值往返；`bogus` / `active` 拒绝；`canceled` 别名归一 `cancelled`；
`normalize` 对空串与未知值回落 `draft`；`parse_filter` 覆盖 `None` / 空串 / `ALL` / 合法值 / 非法值。

## 代码侧收敛

此前 `erp.leave_requests.status` 的所有写入都是 SQL 字符串字面量，状态流转没有任何枚举校验，
列表过滤还是原样透传：

| 位置 | 收敛前 | 收敛后 |
| --- | --- | --- |
| `create_leave_request` INSERT | `VALUES (..., $10, 'draft', $11, $12, $13)` | 状态改为 `$11` 参数，绑 `LeaveRequestStatus::DEFAULT` |
| `submit_leave_request` | `SET status = 'pending' ... AND status = 'draft'` | `SET status = $2 ... AND status = $5`，绑 `Pending` / `Draft` |
| `approve_leave_request` | `SET status = 'approved' ... AND status = 'pending'` | 绑 `Approved` / `Pending` |
| `reject_leave_request` | `SET status = 'rejected' ... AND status = 'pending'` | 绑 `Rejected` / `Pending` |
| `cancel_leave_request` | `SET status = 'cancelled' ... AND status IN ('draft', 'pending')` | 绑 `Cancelled` / `IN ($5, $6)` = `Draft` / `Pending` |
| `list_leave_requests` | `let status_filter = params.status.clone();` 原样绑定 | `parse_filter` 校验：非法值 400，`all` / 空串忽略 |

列表与 7 个详情/写操作的响应统一经 `normalize_leave`（`LeaveRequestStatus::normalize`）出口归一，
未知历史值回落 `draft`。

## 数据库约束

- 候选：`docs/database/leave-request-status-check-candidates-2026-11-23.sql`
- 约束：`ck_erp_leave_requests_status_standard`，`CHECK (status IN (...5 值...))`，`NOT VALID`
- 本地应用：`erp.leave_requests` 0 行；`convalidated=false`
- 探针：事务内插入 `status='bogus'` 被 `ck_erp_leave_requests_status_standard` 拒绝（DETAIL 报该约束名），事务回滚
- 默认值：DB 默认已是 `draft`，与枚举默认一致，本批无需 `ALTER COLUMN SET DEFAULT`，无历史值需回填

## 门禁

- `cargo clippy -p topems-erp --lib --tests -- -D warnings` 通过
- `cargo test -p topems-erp --lib`：883 passed
