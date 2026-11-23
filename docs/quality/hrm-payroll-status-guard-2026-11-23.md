# B209 · HRM 薪资周期 / 明细状态护栏证据（2026-11-23）

## 范围

- 表：`hrm.payroll_runs`（`status` varchar(20) NOT NULL DEFAULT `draft`）、
  `hrm.payroll_items`（`status` varchar(20) NOT NULL DEFAULT `pending`）
- 代码：`svc/hrm/src/modules/payroll.rs`
- 枚举：`svc/hrm/src/modules/payroll_status.rs`（新增，`PayrollRunStatus` + `PayrollItemStatus`）
- 本地数据：两表均 0 行

## 值集

- `PayrollRunStatus = { draft, calculated, paid }`，默认 `draft`
- `PayrollItemStatus = { pending, paid }`，默认 `pending`

依据全是本模块的真实写入点：创建 run 写 `draft`，计算写 `calculated`，发放写 `paid`；
明细在计算时写 `pending`、发放时写 `paid`。没有 `cancelled`/`approved` 之类写入方，不预置。

## 修掉的缺陷

1. **三个列表的过滤是自由串**：`GET /payroll-runs`、`GET /payroll-items`、`GET /payroll-slip`
   的 `params.status` 原样绑定到 SQL（非法值静默查空、空串当真实值）。现
   `parse_filter` 严格校验：空/`all` 不过滤，未知值 400。
2. **状态机全是 SQL 字面量**：创建 `'draft'`、计算 `SET 'calculated' WHERE 'draft'`、
   `INSERT ... 'pending'`、发放 `SET 'paid' WHERE 'pending'` / `WHERE 'calculated'`、
   删除守卫 `WHERE status='draft'`，共 8 处。现全部改为参数绑定 + 枚举常量，词表只有一个来源。
3. **工资单存在性判断用字符串比较**：`if payroll_run.status != "paid"`，脏值会静默按"未发放"
   处理。现用 `PayrollRunStatus::from_db_str` 严格解析后与枚举比较。
4. **列表口径不一致**：`GET /payroll-runs` 的主查询漏了 `deleted_at IS NULL`，与同函数内的
   COUNT 口径不同，导致"分页少了、总数没少"。已补上。
5. **响应出口**：run 列表/创建/计算/发放、item 列表/详情、工资单列表（`run_status` +
   `slip_status` 两个字段）共 7 处经 `normalize_run` / `normalize_item` 归一。

## 本地验证

```sql
ALTER TABLE hrm.payroll_runs  ADD CONSTRAINT ck_hrm_payroll_runs_status_standard
  CHECK (status IN ('draft','calculated','paid')) NOT VALID;
ALTER TABLE hrm.payroll_items ADD CONSTRAINT ck_hrm_payroll_items_status_standard
  CHECK (status IN ('pending','paid')) NOT VALID;
```

- 两条均成功，`convalidated = f`。
- 负向验证：插入 `payroll_runs.status='bogus'` 被 `ck_hrm_payroll_runs_status_standard` 拒绝，事务回滚。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 门禁

- `cargo fmt --all`、`cargo clippy -p topems-hrm --lib --tests -- -D warnings`、`cargo test -p topems-hrm --lib`（302 passed）
- `dump-status-checks.mjs --check`、`dump-status-code-inventory.mjs --check --strict-palette`、`status-db-check-queue.mjs --check`
- `check-request-txn.mjs`、`check-scope-api.mjs`、`check-txn-write-non2xx.py --changed-only`
- `verify-glossary.cjs --strict`、`check-i18n.cjs --mode=quality --strict`、`apps/web npm run typecheck`

刷新后计数：catalog **398/5/325**、盘点 **280/236/57/245**、队列 **44/57 全 internal**，
前端键不在 DB CHECK **66**，色板缺口 0。
