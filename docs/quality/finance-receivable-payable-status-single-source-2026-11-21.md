# 应收/应付状态单一源（2026-11-21）

## 结论

`finance.receivables.status` 与 `finance.payables.status` 原本是自由文本列，DB 默认 `pending`；后端创建写死 `unpaid`，更新接受任意字符串；前端表单固定 `draft/approved/posted/cancelled`。三处口径不一致，导致列表筛选、看板和后续核销对不上。

现已统一为代码侧单一集合：`draft / approved / posted / cancelled`。历史 `unpaid`（旧创建默认值）与 `pending`（DB 默认值）在写入口归一为 `draft`，未知值返回 400，不再落库。

## 改动

- 新增 `svc/finance/src/modules/receivable_payable_status.rs`：枚举 `ReceivablePayableStatus`、`normalize_receivable_payable`、2 个单测。
- `create_receivable` / `create_payable`：
  - `status` 缺省 `draft`，显式值必须归一成功；
  - INSERT 不再写死 `'unpaid'`，状态改为参数 `$10`，后续时间/租户参数顺延为 `$11/$12/$13`。
- `update_receivable` / `update_payable`：
  - 显式 `status` 必须归一成功，否则 400；
  - 未传 `status` 时 `COALESCE($7, status)` 保留原值，不会把已审批/已过账记录重置或写 NULL。
- 前端 `apps/web/src/schemas/finance/receivablePayable.ts` 的状态选项本来就是这四值，无需改动。

## 验证

- `cargo test -p topems-finance --lib modules::receivable_payable_status`：2 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- 本地库事务回滚验证：
  - 应收、应付各插入一条 `draft` 成功；
  - 更新时状态参数传 `NULL`，返回值仍为 `draft`，确认 `COALESCE` 生效。
- 本地两表均为 0 行，未做数据迁移。

## DB CHECK（待生产窗口）

本地可直接加约束；生产需先盘点存量状态并归一，再加 `NOT VALID`，确认无异常后 `VALIDATE`。

```sql
ALTER TABLE finance.receivables
  ADD CONSTRAINT receivables_status_check
  CHECK (status IN ('draft','approved','posted','cancelled')) NOT VALID;

ALTER TABLE finance.payables
  ADD CONSTRAINT payables_status_check
  CHECK (status IN ('draft','approved','posted','cancelled')) NOT VALID;

-- 存量归一（先跑 SELECT 核对影响行数）
UPDATE finance.receivables SET status = 'draft', updated_at = now()
 WHERE status IN ('unpaid','pending');
UPDATE finance.payables SET status = 'draft', updated_at = now()
 WHERE status IN ('unpaid','pending');

ALTER TABLE finance.receivables VALIDATE CONSTRAINT receivables_status_check;
ALTER TABLE finance.payables VALIDATE CONSTRAINT payables_status_check;
```

生产执行前必须确认：两张表存量 `status` 是否还有四值以外的业务值（例如 `paid`、`partially_paid`、`void`）；若有，先与财务确认映射，不得直接归一到 `draft`。

## 回滚

```sql
ALTER TABLE finance.receivables DROP CONSTRAINT IF EXISTS receivables_status_check;
ALTER TABLE finance.payables DROP CONSTRAINT IF EXISTS payables_status_check;
```

代码回滚到 `6362d97e3` 即可恢复旧的自由文本写入（不推荐，会重新引入 `unpaid` 口径）。
