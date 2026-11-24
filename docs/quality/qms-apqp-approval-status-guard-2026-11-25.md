# B281 QMS APQP 审批状态值域与处理入口守卫（2026-11-25）

## 问题

`qms.qa_apqp_approvals.status` 只有 `pending / approved / rejected` 三种业务取值，但：

- 列可空、默认 `pending`、无 CHECK；
- 创建写字符串 `'pending'`；
- `POST /apqp/approvals/{id}/process` 直接 `SET status = approved|rejected`，没有 `AND status='pending'`，已通过/已拒绝的审批可被反复覆盖；
- 拒绝时也写 `approved_at = NOW()`，语义错误；
- 当前表 0 行，无脏数据。

## 处置

### 1. 新增唯一值源

`svc/qms/src/modules/apqp_approval_status.rs`：

- `ApqpApprovalStatus`：`Pending / Approved / Rejected`，默认 `Pending`；
- `DB_VALUES`、`as_db_str`、`from_db_str`；
- `can_transition_to`：`pending → approved / rejected`，审批结果终态，同态幂等；
- 2 条单测覆盖值域往返与迁移矩阵。

### 2. 写入口守卫

`svc/qms/src/modules/apqp.rs`：

- 创建审批改为绑定 `ApqpApprovalStatus::DEFAULT.as_db_str()`，不再硬编码 `'pending'`；
- `process_apqp_approval`：
  - 目标态改由枚举 `Approved / Rejected` 产生；
  - UPDATE 增加 `AND status = 'pending'`，只允许处理待审批记录；
  - `fetch_one` 改 `fetch_optional`，空行返回 409「不存在或已被处理」；
  - `approved_at = CASE WHEN $2='approved' THEN NOW() ELSE NULL END`，拒绝时清空审批时间。

## 数据库迁移

`database/migrations/20261125010000_qms_apqp_approval_status_standard.sql`：

1. `status` 默认固定 `pending`；
2. `NULL → pending`；
3. `SET NOT NULL`；
4. 新增 `ck_qa_apqp_approvals_status_standard CHECK (status IN ('pending','approved','rejected')) NOT VALID`；
5. `VALIDATE CONSTRAINT`。

回滚 `database/rollback/20261125010000_qms_apqp_approval_status_standard.rollback.sql`：删除 CHECK，恢复可空。

## 验证

- `cargo test -p topems-qms`：268 + 230 + 12 + 13 + 13 全通过（含新增 2 条）；
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：通过；
- 本地 `topems` 应用迁移后：
  - `is_nullable=NO`，默认 `'pending'::character varying`；
  - CHECK `convalidated=t`；
- 回滚：`is_nullable=YES`、CHECK 计数 0；重放恢复 `NO` + 已 VALIDATE；
- 真实表探针（事务内 `session_replication_role=replica` 绕 FK，随后 ROLLBACK）：
  - `status='bogus'` → `23514` 被 CHECK 拒绝；
  - `status=NULL` → `23502` 被 NOT NULL 拒绝；
  - 省略 status → 默认 `pending`；
- 状态门禁：`dump-status-code-inventory --check --strict-palette` 322 枚举 PASS；其余状态门禁 PASS。

## 备注

前端 mock 中曾有 `draft` 展示态，但后端从未创建该状态，数据库当前 0 行；本批按真实写入面收敛为三态。
