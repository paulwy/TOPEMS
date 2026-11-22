# B128 · CRM 客户审批状态收口

日期：2026-11-22

## 目标
`crm.customers.approval_status` 统一到 `CustomerApprovalStatus` 四值（`none/pending/approved/rejected`），读侧过滤规范集合，写侧补齐软删守卫，保持 `none/rejected → pending → approved|rejected` 流转。

## 数据现状
- 本地 `crm.customers` 301 行，全部 `none`。
- 列 `NOT NULL DEFAULT 'none'`，无 CHECK。
- 生产快照同结构，审批状态分布无异常值。

## 代码修复（svc/crm/src/modules/customer.rs）
1. 客户列表与 COUNT 增加 `approval_status = ANY(DB_VALUES)`；搜索分支同样增加该谓词。过滤条件与分页、语言无关，属于恒定规范集合，缓存键无需额外拼装。
2. `update_customer` 预读与 UPDATE 均补 `deleted_at IS NULL`，软删客户不可被改写。
3. 启动审批、审批通过、审批驳回三条流：预读补 `deleted_at IS NULL`；UPDATE 补 `deleted_at IS NULL`，避免软删行被流转。
4. 客户名称辅助查询补 `deleted_at IS NULL`。
5. `get_customer` 原有软删条件保持不变。

审批流转语义：
- 启动：`start_from = [None, Rejected]`，非法当前态 409，并发 0 行 409。
- 通过/驳回：`decide_from = [Pending]`，非法当前态 409，并发 0 行 409。

## 候选约束
`docs/database/crm-customer-approval-status-check-candidates-2026-11-21.sql`
- `customers_approval_status_check CHECK (approval_status IN ('none','pending','approved','rejected')) NOT VALID`。
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 缺省/现状：301 行 `none`。
- `none → pending`：1 行成功。
- `none → pending → approved`：301 行全部成功。
- 非法 `waiting`：23514，被 `customers_approval_status_check` 拦下。
- ROLLBACK 后：约束 0、行数 301、全部 `none`，列保持 `NOT NULL DEFAULT 'none'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：505 passed
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
