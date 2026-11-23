# B245 · `hrm.training_plans.status` 状态守卫（2026-11-23）

## 结论

`hrm.training_plans.status` 已收敛到唯一 Rust 枚举 `TrainingPlanStatus`
（`active` / `inactive` / `completed` / `archived`，默认 `active`）；
创建、更新、启停接口与数据库 CHECK 共用同一值集，非法值与终态复活返回 400，
`completed` / `archived` 均为终态。

## 修复的真实缺陷

1. **既有 DB 约束与代码值集不一致**：本地/基线已有 `ck_training_plans_status_standard`，只允许 `active/inactive/archived`；模型测试与业务语义使用 `completed`，写入 `completed` 会撞库 500。本批用 `ck_training_plans_status_lifecycle_standard` 替换，统一为四态。
2. **创建硬编码 `'active'`**：改为绑定 `TrainingPlanStatus::DEFAULT`，与列默认值一致。
3. **更新接口原样落库**：`status = COALESCE($7, status)` 直接写请求值；现先解析枚举、再查当前状态并按流转表校验，非法值/终态回退返回 400。
4. **启停接口可从终态复活**：`activate_plan` / `deactivate_plan` 原先无条件 `UPDATE ... SET status=$2`，已 `completed/archived` 的计划仍可改回 `active/inactive`；现统一走 `set_plan_status`，先校验来源状态，终态返回 400。
5. **列表 `status` 过滤未解析**：非法值原先静默返回空列表；现先解析枚举，非法值返回 400。

## 生命周期

```text
active ⇄ inactive
   │        │
   └────────┴──→ completed
   │        │
   └────────┴──→ archived
```

- `completed` / `archived` 为终态，禁止回到 `active/inactive`。
- 更新接口允许同值、`active↔inactive`、`active/inactive→completed/archived`。
- `activate` 只允许 `active/inactive` 来源；`deactivate` 只允许 `active/inactive` 来源；同值幂等。

## 数据库

- 旧约束：`hrm.training_plans.ck_training_plans_status_standard`（validated，`active/inactive/archived`）已在本地 DROP。
- 新约束：`hrm.training_plans.ck_training_plans_status_lifecycle_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','completed','archived'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前表内 0 行。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_training_plans_status_lifecycle_standard"`。
  - 事务内探针 `status='completed'`：写入成功后回滚。
- 参考库仍保留旧约束，新约束不存在；已登记 `prod-only-status-checks-2026-11-23.json`（第 413 条，`hrm` schema）。
- 部署时必须先 DROP 旧约束再 ADD 新约束，否则 `completed` 仍会被旧 CHECK 拒绝。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-hrm --all-targets -- -D warnings`：通过
- `cargo test -p topems-hrm --lib`：312 passed
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列一致
- `dump-status-code-inventory.mjs --check --strict-palette`：311 枚举 / 249 前端键 / 色板缺口 0
- `status-db-check-queue.mjs --check`：185 枚举 / 193 值分桶一致
- mappings：297 条；prod-only：413 条
- `check-request-txn.mjs`：通过（`bare_txn=1650`，低于基线 1651）
- `check-scope-api.mjs`：未标记调用与 `Db::new` 均未增加
- `check-txn-write-non2xx.py --changed-only`：通过
- `verify-glossary.cjs --strict` 与 `check-i18n.cjs --mode=quality --strict`：`7-in-1 Gate Result: ✅ PASS`
- 前端 `npm run typecheck`：通过
