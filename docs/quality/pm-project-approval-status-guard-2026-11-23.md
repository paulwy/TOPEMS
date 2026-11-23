# B227 · pm.project_approvals.status 状态治理

日期：2026-11-23
表列：`pm.project_approvals.status`（varchar NOT NULL DEFAULT `'pending'`）
枚举：`svc/pm/src/modules/project_approval_status.rs` → `ProjectApprovalStatus`

## 发现的问题

1. **审批终审把项目写成非法状态**：终审通过时 `update_project_status(..., "approved")`，但 `pm.projects.status` 的 7 值集合（`draft/pending_approval/active/paused/completed/cancelled/rejected`）不含 `approved`，`ck_projects_status_standard` 会拒绝该 UPDATE；调用处 `let _ =` 吞错，项目永远停在 `pending_approval`。同时 `is_valid_project_transition` 的合法边是 `pending -> active`，本就应该置 `active`。
2. **提交/审批/驳回/取消四处裸字符串**：`'pending'`、`'approved'`、`'rejected'`、`'cancelled'` 分散在 INSERT、状态守卫、终审状态与驳回分支，没有类型约束。
3. **状态守卫拼字面量**：审批查询 `WHERE ... AND status = 'pending' ... FOR UPDATE`，未知/大小写变体不会命中，且无法复用值集。
4. **审批审计状态对也拼字面量**：`create_approval_and_log(..., "pending", "approved")` 与通过分支的 `"pending_approval","approved"`。
5. **无 DB CHECK**：任意值可落库。

## 改动

- 新增 `ProjectApprovalStatus`（4 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（pending→pending/approved/rejected/cancelled，终止态不可再流转）/ is_terminal / Display / FromStr` + 单测。
- 提交 INSERT 状态、审批 `FOR UPDATE` 守卫（改参数 `$2`）、驳回/取消分支、终审状态、两处审批审计状态对全部改绑枚举常量。
- **终审通过后的项目状态改为 `ProjectStatus::Active`**（此前写 `approved` 违反 `pm.projects` CHECK 且被吞错）；提交/驳回/取消分支的项目状态改用 `ProjectStatus::PendingApproval / Rejected / Draft`。
- 新增 `ck_project_approvals_status_standard`（4 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内造父项目 + 审批行验证：`bogus` 被拒（`violates check constraint`），`approved` 正常写入后回滚。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：493 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 395。
- 映射 278 → 279；inventory / queue 随之刷新。
