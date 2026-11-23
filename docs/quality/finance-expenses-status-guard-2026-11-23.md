# B221 · 费用报销状态护栏证据（2026-11-23）

## 范围

- 表：`finance.expenses.status`（text NULL DEFAULT `pending`，本地 3 行，全部为 `pending`）
- 代码：`svc/finance/src/modules/operational.rs`（创建 / 列表 / 更新 / 删除）、`expense_status.rs`

## 值集

`ExpenseStatus = { draft, submitted, approved, rejected, paid }`；
读侧把历史 `pending` 归一为 `submitted`（`normalize_expense` / `from_db_str`），
`legacy_aliases()` 供 SQL 过滤同时匹配两值。

## 修掉的缺陷

1. **列表状态过滤完全裸绑**：`params.status.clone()` 直接绑进 `AND ($2::text IS NULL OR status = $2)`，
   拼写错误（如 `submited`）静默返回空列表，前端传 `all` 也返回空。
   现改为 `normalize_expense` 严格校验，非法值 400；合法值 + 历史别名走
   `status = $2 OR status = ANY($3::text[])`。
2. **列表主查询漏 `deleted_at IS NULL`**：软删除的报销单仍出现在列表里，
   但 `COUNT(*)` 里带了 `deleted_at IS NULL`，导致"列表有条目、分页计数更小"。
   已补齐，主查询与计数口径一致。
3. **枚举缺 canonical API**：`ExpenseStatus` 补 `DB_VALUES` / `DEFAULT` / `from_db_str` / `as_db_str`。
4. **列没有 DB 约束**：新增 `ck_expenses_status_standard`（`NOT VALID`）。

## 本地验证

- 约束应用后：`INSERT ... status='pending'` 被 `ck_expenses_status_standard` 拒绝，
  `status='submitted'` 正常写入（事务内测试，已回滚）。
- 存量 3 行 `pending` 不受影响（`NOT VALID`）；读侧归一与列表别名匹配保证老数据仍可见。

## 遗留（上线前必须处理）

- **列默认值仍是 `pending`**，不在 canonical 值集内：任何不显式写 status 的 INSERT 现在会被约束拒绝。
  当前代码只有一个创建入口且总是绑 status（缺省 `draft`），暂无内部触发；生产需改默认值为 `submitted`。
- **存量 3 行 `pending`** 需在 VALIDATE 前清洗为 `submitted`，否则约束无法升级为已校验状态。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束。
