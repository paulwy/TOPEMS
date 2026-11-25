# B283 Finance 对账会话状态守卫（2026-11-25）

## 结论

`finance.core_finance_reconciliation_sessions.status` 是原生枚举 `reconciliation_status`（pending/processing/completed/cancelled），值域由 DB 锁定，但写入口存在三类问题：

1. `get_session` 的 SELECT 语句漏写 `SELECT`，所有依赖它的导入明细、自动匹配、完成会话接口都会在运行时 SQL 语法错误返回 500。
2. `set_session_status` 与 `complete_session` 都直接覆盖状态，没有来源态条件；automatch 只拦截 completed，不拦截 cancelled；completed 可重复写 `completed_at`。
3. 缺失会话时 `fetch_one` 统一映射为数据库错误，接口返回 500 而不是 404。

本批修复读取语法，并补齐 pending ↔ processing ↔ completed/cancelled 的状态机与并发谓词。

## 状态机

唯一源：`svc/finance/src/models/mod.rs::ReconciliationStatus`。

- `pending ↔ processing`：自动匹配开始置 processing、结束后回 pending。
- `pending / processing → completed | cancelled`。
- `completed / cancelled` 为终态，同态幂等。
- 导入明细、自动匹配在终态会话上直接返回 400。

## 代码改动

- `ReconciliationStatus` 新增 `can_transition_to`、`is_terminal`、`allowed_from`，并补状态机单测。
- `get_session` 补 `SELECT`，改 `fetch_optional`，缺失会话返回 `DatabaseRecordNotFound`（404）。
- `import_items` / `auto_match` 从“仅拦截 completed”改为“拦截全部终态”。
- `set_session_status` 的 UPDATE 增加 `status::text = ANY($4::text[])` 来源态谓词；0 行受影响返回 400 冲突。
- `complete_session` 先读当前态并校验；已 completed 直接返回原记录，不重复覆盖 `completed_at`；UPDATE 增加 `status IN ('pending','processing')`，0 行返回 400 冲突。
- 原生枚举列比较必须显式 `status::text`，否则 PostgreSQL 报 `operator does not exist: reconciliation_status = text`。

## 数据库

无 DDL。`status` 已是 `reconciliation_status NOT NULL DEFAULT 'pending'`，值域由原生枚举锁定。

## 本地验证

- `EXPLAIN` 校验修复后的 SELECT 与两条 UPDATE 谓词均通过。
- `cargo check -p topems-finance` 通过。
- `test_reconciliation_enums` 通过，覆盖合法/非法流转与终态判定。
- 状态盘点不变（322 枚举），无迁移文件，checksums/manifest 不变。

## 残留

- 该表当前 0 行，状态机尚未在真实存量会话上回放。
- 当前没有独立 cancel 接口，`cancelled` 只能由内部调用写入；后续如开放取消入口，应复用 `can_transition_to`。
