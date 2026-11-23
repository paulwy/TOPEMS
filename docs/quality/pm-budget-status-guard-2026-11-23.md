# B229 · pm.budgets.status 状态治理

日期：2026-11-23
表列：`pm.budgets.status`（varchar NOT NULL DEFAULT `'draft'`）
枚举：`svc/pm/src/modules/budget_status.rs` → `BudgetStatus`

## 发现的问题

1. **创建 INSERT 拼 `'draft'`**：状态字面量直接写在 SQL 里。
2. **提交/审批不看来源状态**：`submit_budget` / `approve_budget` 各自 `UPDATE ... SET status='pending'/'approved' WHERE id=$1`，草稿可直接 approve，已通过的预算也能被再次提交。
3. **更新接口原样入库**：`update_budget` 把 `req.status` 直绑 `status = COALESCE($4, status)`，未知值可落库，也可 draft 直改 approved。
4. **无 DB CHECK**：任意值可落库。

## 改动

- 新增 `BudgetStatus`（3 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（draft→pending→approved，同值放行；approved 终态）/ is_terminal / Display / FromStr` + 单测。
- 创建 INSERT 的 `'draft'` 改绑定 `BudgetStatus::DEFAULT`（占位符顺延为 `$7`）。
- 新增 `ensure_budget_transition()`：加载当前状态（不存在 404、存量未知值 400、非法流转 400），提交/审批两个动作与更新接口统一接入；两处动作 SQL 改参数绑定 `$2`。
- 更新接口 `req.status` 先 `normalize`（未知 400）再校验流转。
- 新增 `ck_budgets_status_standard`（3 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内造父项目 + 预算验证：`bogus` 被拒（`violates check constraint`）。注意 `finance.budgets` 有同名约束（验证态 true），schema 不同互不影响。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：501 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 397。
- 映射 280 → 281；inventory / queue 随之刷新。
