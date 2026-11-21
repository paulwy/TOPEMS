# B55 · crm.customers 审批状态单一源（2026-11-21）

## 现状（改动前）
- `crm.customers.approval_status`：本地 301 行全部 `none`；列非空，DB 默认 `'none'`，无 CHECK。
- 启动/通过/驳回三个接口都把状态字面量写进 SQL，且 UPDATE 结果被 `let _ =` 丢弃：更新失败仍提交事务并返回成功。
- 启动审批不检查当前态，已 `approved` 的客户可再次进入 `pending`；通过/驳回也不要求 `pending`，可对 `none` 直接通过或重复通过。
- 客户模型 `approval_status: String`，返回层没有严格解析，历史脏值会原样透出。

## 改动
1. 新增 `svc/crm/src/modules/customer_approval_status.rs`：`CustomerApprovalStatus`（none/pending/approved/rejected，DEFAULT none；启动只允许 none/rejected，通过/驳回只允许 pending），附 2 单测。
2. `customer.rs`：
   - 启动审批前严格解析当前态，非 none/rejected 返回 409；UPDATE 绑定枚举并带起始态谓词，执行错误返回 500，0 行返回 409。
   - 通过/驳回要求当前态为 pending，UPDATE 同样绑定枚举、带 `pending` 谓词，0 行 409。
   - 三处更新不再忽略数据库错误，响应 `approval_status` 引用枚举值。
3. 候选 DDL `docs/database/crm-customer-approval-status-check-candidates-2026-11-21.sql`：四值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-crm`、`cargo clippy -p topems-crm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-crm --lib customer_approval_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 301 行 none）：none→pending `UPDATE 1`；pending→approved `UPDATE 1`；approved→pending 带起始态谓词 `UPDATE 0`；`waiting` → 23514。

## 残留
- 启动审批的 workflow 实例在状态 UPDATE 之前 `tokio::spawn`，若后续 UPDATE 失败会留下孤儿流程实例；需要把流程启动移到更新成功之后或补补偿。
- 审批接口没有校验 `reason` 必填（驳回不填 reason 也成功），也未把 reason 落库，只写审计。
- 客户模型仍是 `String`；本轮只收敛写入口和流转，读取层遇到历史枚举外值仍会原样透出。
- `crm.contacts.approval_status` 是同构自由文本，下一批单独处理。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
