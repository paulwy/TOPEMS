# B274 费用报销状态值域与写入口守卫（2026-11-25）

## 结论

`finance.expenses.status` 代码侧已有 `ExpenseStatus` 五态，但列可空、CHECK 带 `status IS NULL` 豁免，`update_expense` 也直接接收任意规范值并覆盖写入。本批补齐迁移与写入口状态机，并把更新接口改成真正的部分更新，避免省略字段被写成 NULL。

## 根因与影响

- 列 `status` 可空、默认 `draft`，约束为 `CHECK (status IS NULL OR status IN (...))`；`update_expense` 在请求未带 `status` 时绑定 `NULL`，因此一次普通编辑就可能把状态清空。
- `update_expense` 用 `fetch_one`，ID 不存在时返回 500 而不是 404。
- 更新 SQL 对所有字段直接赋值，未传字段会被写成 NULL；`applicant_name` 是 NOT NULL，省略即触发 500。
- `create_expense` 接受 `approved/rejected/paid` 作为创建态，可绕过提交与审批链路。
- 更新请求可直接把 `paid` 回退到 `draft` 或跳步到 `paid`，没有来源态校验。

## 代码处置

`svc/finance/src/modules/expense_status.rs`：

- 新增 `ExpenseStatus::can_transition_to`：
  - `draft → submitted`
  - `submitted → approved / rejected / draft`
  - `approved → paid`
  - `rejected → draft`
  - `paid` 终态；同态幂等。
- 新增 11 条迁移矩阵断言。

`svc/finance/src/modules/operational.rs`：

- `create_expense` 仅允许 `draft/submitted`，其它状态 400。
- `update_expense` 先按 `id + deleted_at IS NULL` 读当前状态：不存在 404，非法库值 409。
- 请求状态经 `normalize_expense` 后调用 `can_transition_to`，非法流转 400。
- UPDATE 全部字段改 `COALESCE` 保留未传值；`status` 同样 `COALESCE($9, status)`。
- `approved_at` 在转 `approved` 时取 `COALESCE(请求值, 原值, NOW())`，离开审批态清空；`reimbursed_at` 在 `paid` 时补写，离开付款态清空。
- UPDATE 增加 `AND status = 当前态` 防并发交错；`fetch_one` 改 `fetch_optional`，状态已被并发改变返回 409。
- `receipt_count` 未传时保留原值，不再强制归零。

## 迁移

`database/migrations/20261125004000_finance_expense_status_standard.sql`：

1. 默认值固定 `draft`。
2. `UPDATE ... SET status='draft' WHERE status IS NULL`。
3. `SET NOT NULL`。
4. `DROP/ADD ck_expenses_status_standard`，精确五态，`NOT VALID` 后立即 `VALIDATE`。
5. 回滚 `database/rollback/20261125004000_finance_expense_status_standard.rollback.sql` 恢复可空与旧 CHECK。

## 验证

| 验证项 | 结果 |
| --- | --- |
| 本地应用 | `is_nullable=NO`、默认 `draft`、约束 `convalidated=t` |
| 幂等复跑 | 第二次应用成功，`UPDATE 0` |
| 约束探针 | `bogus` 被 23514 拒绝；`NULL` 被 23502 拒绝；`submitted` 可写 |
| 回滚/重放 | 克隆表回滚后 `is_nullable=YES`、NULL 可写；重放迁移后回填为 `draft`、`is_nullable=NO` |
| finance 测试 | 1135 passed，0 failed；新增矩阵测试 1 条 |
| clippy | `cargo clippy -p topems-finance --all-targets -- -D warnings` 通过 |
| 迁移校验 | 875 文件，`Checksum errors 0`、`Schema drift 0`、`Errors 0` |
