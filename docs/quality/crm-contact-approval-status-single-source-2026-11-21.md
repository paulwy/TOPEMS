# B56 · crm.contacts 审批状态单一源（2026-11-21）

## 现状（改动前）
- `crm.contacts.approval_status`：本地 6 行全部 `none`；列非空，DB 默认 `'none'`，无 CHECK。
- 启动/通过/驳回三个接口写状态字面量，UPDATE 结果被 `let _ =` 丢弃，失败仍提交并返回成功。
- 启动不检查当前态，已通过的联系人可重新进入 `pending`；通过/驳回不要求 `pending`，可对 `none` 直接通过或重复通过。
- 联系人模型 `approval_status: String`，读取层没有严格解析。

## 改动
1. 新增 `svc/crm/src/modules/contact_approval_status.rs`：`ContactApprovalStatus`（none/pending/approved/rejected，DEFAULT none；启动只允许 none/rejected，通过/驳回只允许 pending），附 2 单测。
2. `contact.rs`：
   - 启动审批前严格解析当前态，非 none/rejected 返回 409；UPDATE 绑定枚举并带起始态谓词，错误 500、0 行 409。
   - 通过/驳回要求 pending，UPDATE 绑定枚举并带 `pending` 谓词，错误 500、0 行 409。
   - 三处更新不再忽略数据库错误，响应 `approval_status` 引用枚举值。
3. 候选 DDL `docs/database/crm-contact-approval-status-check-candidates-2026-11-21.sql`：四值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-crm`、`cargo clippy -p topems-crm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-crm --lib contact_approval_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 6 行 none）：none→pending `UPDATE 1`；pending→approved `UPDATE 1`；approved→pending 带起始态谓词 `UPDATE 0`；`waiting` → 23514。

## 残留
- 启动审批的 workflow 实例仍在状态 UPDATE 之前 `tokio::spawn`，失败时会产生孤儿实例。
- 驳回不校验 `reason` 必填，reason 只进审计不落库。
- 联系人创建仍写死 `status='active'` 与 `approval_status='none'`，其中 `status` 未纳入本轮枚举。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
