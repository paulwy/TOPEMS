# B210 · 财务应收/应付状态护栏证据（2026-11-23）

## 范围

- 表：`finance.receivables`、`finance.payables`
- 列：`status`（text NULL DEFAULT `pending`，两表同构）
- 代码：`svc/finance/src/modules/operational.rs`（`list/create/get/update` 共 8 个接口）
- 枚举：`svc/finance/src/modules/receivable_payable_status.rs`（复用既有枚举，本批补 `DB_VALUES` / `from_db_str` / `normalize` / `parse_filter`）
- 本地数据：两表均 0 行

## 值集

`ReceivablePayableStatus = { draft, approved, posted, cancelled }`。

历史别名由 `normalize_receivable_payable` 归一：`unpaid`（旧创建默认值）、`pending`（DB 默认）
→ `draft`；`approved`/`posted`/`cancelled` 原样。前端表单与色板用的正是这四个 canonical 值。

## 修掉的缺陷

1. **两个列表的过滤是自由串**：`list_receivables` / `list_payables` 都把 `params.status.clone()`
   直接绑进主查询与 COUNT（非法值静默查空、空串当真实值）。现 `parse_filter` 严格校验：
   空/`all` 不过滤，未知值 400（历史别名 `unpaid`/`pending` 按 `draft` 查询，与库里语义一致）。
2. **列表口径不一致**：两个列表的主查询都漏了 `deleted_at IS NULL`，而 COUNT 有——删一条，
   分页少一条、总数不少。已补。
3. **响应透出原始脏值**：8 个接口的返回都走 `row_to_receivable_json` / `row_to_payable_json`，
   此前直接把列值透出（`pending`/`unpaid` 会出现在前端下拉里对不上）。现两个构造器统一
   `ReceivablePayableStatus::normalize`，脏值回落 `draft`。
4. **两列无任何 DB 约束**：外部脚本、导入、手工 SQL 可写任意字符串。现加 canonical CHECK 兜底。

## 本地验证

```sql
ALTER TABLE finance.receivables ADD CONSTRAINT ck_finance_receivables_status_standard
  CHECK (status IS NULL OR status IN ('draft','approved','posted','cancelled')) NOT VALID;
ALTER TABLE finance.payables ADD CONSTRAINT ck_finance_payables_status_standard
  CHECK (status IS NULL OR status IN ('draft','approved','posted','cancelled')) NOT VALID;
```

- 两条均成功，`convalidated = f`；列可空，NULL 放行。
- 负向验证：插入 `payables.status='bogus'` 被 `ck_finance_payables_status_standard` 拒绝，事务回滚。
- 遗留项（已在 SQL 文件头注明）：两列 DB 默认值仍是 `'pending'`，不在常量集内。全仓只有
  `operational.rs` 两个创建接口写这两列且每次都显式绑定 status，无"省略即默认"的路径，
  因此约束不阻断现有写入；长期应把默认值改为 `'draft'`（迁移另排期）。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 门禁

- `cargo fmt --all`、`cargo clippy -p topems-finance --lib --tests -- -D warnings`、`cargo test -p topems-finance --lib`（1113 passed / 1 ignored）
- `dump-status-checks.mjs --check`、`dump-status-code-inventory.mjs --check --strict-palette`、`status-db-check-queue.mjs --check`
- `check-request-txn.mjs`、`check-scope-api.mjs`、`check-txn-write-non2xx.py --changed-only`
- `verify-glossary.cjs --strict`、`check-i18n.cjs --mode=quality --strict`、`apps/web npm run typecheck`

刷新后计数：catalog **400/5/323**、盘点 **280/236/57/245**、队列 **44/57 全 internal**，
前端键不在 DB CHECK **66**，色板缺口 0。
