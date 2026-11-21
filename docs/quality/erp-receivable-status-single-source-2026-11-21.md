# B30 · erp.receivables 状态单一源（2026-11-21）

## 现状
`erp.receivables` 只有事件消费者在写（`svc/erp/src/event_handlers/mod.rs`）：

- 销售订单创建 → 插入应收，SQL 写死 `'pending'`；
- 项目结算 → 插入应收，同样写死 `'pending'`；
- 收款核销 → 三条匹配分支（按 customer_name / customer_id / 最早金额）更新 `status = 'paid'`，WHERE 里写死 `status = 'pending'`。

问题：字面量分散在四条 SQL、无枚举、无 CHECK；本地 5 行全为 `pending`，没有 `paid` 样本，改错值不会被任何一层拦住。

## 改动
1. 新增 `svc/erp/src/modules/receivable_status.rs`：`ReceivableStatus { Pending, Paid }`、`DB_VALUES`、`DEFAULT = Pending`、`from_db_str`（trim/lowercase、未知 `None`）、`as_db_str`；1 个单测（往返 + `written_off` 拒绝 + 默认值）。
2. `event_handlers/mod.rs` 的三条核销 UPDATE：`SET status = 'paid'` → `SET status = $5/$4`，`AND status = 'pending'` → `AND status = $6/$5`，分别绑 `Paid`/`Pending` 常量；分支参数位按原编号顺延，未改匹配语义。
3. 两条 INSERT 保留 SQL 字面量 `'pending'`（与枚举 `DEFAULT` 一致、有单测钉住，且无请求体可污染），后续可改为绑定参数。
4. 候选 DDL：`docs/database/erp-receivable-status-check-candidates-2026-11-21.sql`（`NOT VALID` + 预检 + 回滚）。

## 验证
- `cargo test -p topems-erp --lib receivable_status`：1 passed。
- `cargo check -p topems-erp --all-targets`、`cargo clippy -p topems-erp --all-targets -- -D warnings`：干净；`cargo fmt --all`。
- `check-request-txn` / `check-scope-api`：事件路径用 `scope_for_tenant`，未新增裸事务，Db::new 未增加。
- 本地事务演练（2 组 ROLLBACK，残留 0）：
  - `UPDATE pending → 'bogus'` → 23514；
  - `UPDATE pending → paid` → `UPDATE 1`。
- 盘点：Rust 枚举 139→140；值 151；不在 DB CHECK 113；色板缺口 0；队列 101 枚举 / 113 值；映射 69→70。

## 残留
- 候选 CHECK 未进 `database/migrations/`，生产窗口 + `VALIDATE`。
- 无 `paid` 存量样本，核销路径的真实链路（销售订单→应收→收款事件）未做端到端重放；建议在窗口前补一条 E2E。
- erp 队列只剩 `erp.audit_logs.status`（success/error，4462 行）：它是审计结果标记而不是业务生命周期，建议改名 `outcome` 或按 `{success,error}` 枚举化，需要 audit 中间件口径确认后再动。
