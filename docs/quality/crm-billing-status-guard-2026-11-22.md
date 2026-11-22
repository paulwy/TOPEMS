# B138 · CRM 应收账单状态收口

日期：2026-11-22

## 目标
`crm.billing_records.status` 统一为 `BillingStatus` 四值（`pending/paid/overdue/cancelled`）；替换本地错误的同名 CHECK（原允许 `active/inactive/archived/pending/paid`，会拦截 `overdue/cancelled`）；列表只返回规范集合，详情拒绝非法状态；事件建单与核销不再写字面量；核销覆盖 `pending` 与 `overdue` 两个起始态。

## 数据现状
- 本地 0 行；列 nullable、无默认；已有同名 VALID CHECK，值集错误。
- 生产快照 0 行；列 nullable、无默认；无 CHECK。
- 原代码已用 `BillingStatus` 做列表过滤、创建默认、更新矩阵与并发谓词，但事件写入仍写死 `'pending'/'paid'`，且核销只匹配 `pending`。

## 代码修复
### `svc/crm/src/modules/billing.rs`
1. 列表不再把 `status` 作为可空单值透传：
   - 未传时绑定 `BillingStatus::DB_VALUES` 四值数组；
   - 传值时严格解析，非法 400，绑定单值数组；
   - 列表与 COUNT 均改 `status = ANY($2::text[])`，非法存量行不会混入结果，分页口径一致。
2. 详情：读到记录后严格校验 `status`，非法返回 409，不再把非法值返回前端。
3. 更新入口并发 0 行：显式 `guard.take()` + `rollback()` 后再 409，避免“写入后返回非 2xx”被静默回滚。
4. `mark_paid` 入口：
   - `status = 'paid'` 改为 `$5` 绑定 `BillingStatus::Paid`；
   - 0 行并发冲突同样先回滚再 409。

### `svc/crm/src/event_handlers/mod.rs`
1. `OpportunityWon` 创建应收：
   - 原 SQL 写死 `'pending'`，改为 `$7` 绑定 `BillingStatus::DEFAULT`；
   - due/items/now 参数顺延为 `$6/$8/$9`。
2. `PaymentReceived` 核销：
   - 目标态绑定 `BillingStatus::Paid`；
   - 起始态由只匹配 `'pending'` 改为 `status = ANY($n::text[])` 绑定 `BillingStatus::mark_paid_from()`（`pending` + `overdue`）；
   - 按客户名与按金额兜底两条 UPDATE 都同样处理。
3. 测试辅助 `insert_pending_bill` 也改为绑定 `BillingStatus::DEFAULT`。

## 候选 DDL
`docs/database/crm-billing-status-check-candidates-2026-11-22.sql`
- 必须 `DROP CONSTRAINT IF EXISTS ck_billing_records_status_standard` 后重建，不能沿用错误值集；
- 回填 NULL 为 `pending`、补默认 `'pending'`、设 `NOT NULL`；
- 重建 `ck_billing_records_status_standard ... NOT VALID` 四值约束；
- 同步列注释；
- 2026-11-22 已应用到本地 `topems`（事务提交）；生产快照与生产环境未应用，部署仍需窗口。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除同名错误约束、解除 `NOT NULL`、清空默认，插入 1 行 `status=NULL`。
- 执行候选：NULL 回填 `pending`，`is_nullable=NO`，默认 `'pending'`。
- 新约束 `convalidated=false`，定义精确为四值。
- `overdue → paid → cancelled` 通过。
- 非法 `active`：23514（旧约束原本允许，新约束已拒绝）。
- ROLLBACK 后：0 行，旧错误约束原样恢复，列恢复 nullable 无默认。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：510 passed
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：208 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：144 枚举 / 152 值，resolved 112，分桶一致
- glossary 与 i18n quality：通过
