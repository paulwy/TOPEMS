# B251 · `finance.budgets.status` 状态守卫（2026-11-24）

## 结论

`finance.budgets.status` 已收敛到唯一 Rust 枚举 `BudgetStatus`
（`active` / `inactive` / `frozen` / `exhausted` / `archived`，默认 `active`）。
数据库 CHECK、创建入口、更新入口、前端标签/颜色/选项共用同一值集；
旧 DB 只允许 `active/inactive/archived`、前端却使用 `frozen/exhausted` 的分裂已消除。

## 修复的真实缺陷

1. **DB 与前端值集分裂**：既有 `ck_budgets_status_standard` 只允许
   `active/inactive/archived`；前端预算表单与标签使用
   `active/frozen/exhausted`，`frozen/exhausted` 一写就被旧 CHECK 拒绝。
2. **创建状态硬编码**：`create_budget` 的 INSERT 直接写死 `'active'`，请求里的 `status` 完全不读。
   现先解析 `BudgetStatus`，未传用默认值，非法值 400。
3. **更新状态缺失时被重置为 active**：`update_budget` 用
   `req.get("status").unwrap_or("active")` 绑定，任何不带 `status` 的更新都会把原状态改回 `active`。
   现先读当前行状态，未传则保留原值；非法值 400。
4. **前端状态展示不完整**：`getStatusLabels` / `STATUS_COLORS` / 表单选项只覆盖三态；
   现补齐 `inactive`、`archived`，并补 `exhausted` 的全局色板键，避免色板缺口。

## 状态语义

- 五个值都是运营态，允许互相调整（启用、停用、冻结、额度耗尽、归档），没有不可逆终态。
- `frozen` 表示暂停占用与执行；`exhausted` 表示额度已用完。

## 数据库

- 旧约束：`finance.budgets.ck_budgets_status_standard`（validated，`active/inactive/archived`）已在本地 DROP。
- 新约束：`finance.budgets.ck_budgets_status_lifecycle_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','frozen','exhausted','archived'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 286 行全部 `active`，合法。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_budgets_status_lifecycle_standard"`。
  - 事务内探针 `status='frozen'`：写入成功后回滚。
- 参考库仍保留旧约束，新约束不存在；已登记 `prod-only-status-checks-2026-11-23.json`（第 417 条，`finance` 41）。
- 部署时必须先 DROP 旧约束再 ADD 新约束，否则 `frozen/exhausted` 仍会被旧 CHECK 拒绝。

## 门禁

- `cargo fmt --all --check`
- `cargo clippy -p topems-finance --all-targets -- -D warnings`
- `cargo test -p topems-finance --lib`
- request-txn / scope-api / txn-2xx
- status-catalog、inventory（314 枚举 / 242 值 / 251 前端键 / 色板 0）、queue（187 / 195）
- glossary、i18n 7-in-1、OpenAPI、前端 typecheck

结果（2026-11-24 本地实测）：

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-finance --all-targets -- -D warnings`：PASS
- `cargo test -p topems-finance --lib`：1123 passed / 1 ignored
- request-txn / scope-api / txn-2xx：PASS
- status-catalog：33 CHECK / 5 ENUM / 683 无约束列
- inventory：314 枚举 / 242 值 / 251 前端键，色板缺口 0
- queue：187 枚举 / 195 值分桶一致
- glossary、i18n 7-in-1、OpenAPI、前端 typecheck：PASS
