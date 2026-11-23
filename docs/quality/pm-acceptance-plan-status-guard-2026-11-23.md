# B242 · `pm.acceptance_plans.status` 状态守卫（2026-11-23）

## 结论

`pm.acceptance_plans.status` 已收敛到唯一 Rust 枚举 `AcceptancePlanStatus`
（`pending` / `in_progress` / `completed` / `cancelled`，默认 `pending`）；
创建、更新与数据库 CHECK 共用同一值集，非法值与非法流转返回 400，终态计划禁止修改。

## 修复的真实缺陷

1. **创建硬编码 `'pending'`**：改为绑定 `AcceptancePlanStatus::DEFAULT`，与 DB 列默认值一致，后续改默认只需改枚举。
2. **更新接口原样落库**：`status = COALESCE($5, status)` 直接写请求值，任意字符串可入库；现先查当前状态，解析枚举后再按流转表校验，非法值/非法流转返回 400。
3. **终态无保护**：原更新没有终态判断，`completed` / `cancelled` 计划仍可改名称、验收标准、参与人；现返回 409「已结束的验收计划不允许修改」。

## 生命周期

```text
pending → in_progress → completed
   │            │
   └────────────┴──→ cancelled
```

- `completed` / `cancelled` 为终态。
- 更新接口允许：`pending→in_progress`、`pending→cancelled`、`in_progress→completed`、`in_progress→cancelled`；同值放行。
- 不允许 `pending→completed` 跳过执行，也不允许终态回到任何非终态。

## 数据库

- 约束：`pm.acceptance_plans.ck_acceptance_plans_status_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['pending','in_progress','completed','cancelled'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前已有 1 行 `pending`，合法。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_acceptance_plans_status_standard"`。
  - 事务内探针 `status='in_progress'`：写入成功后回滚。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 410 条，`pm` schema）。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-pm --all-targets -- -D warnings`：通过
- `cargo test -p topems-pm --lib`：540 passed
- `dump-status-code-inventory.mjs`：308 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：184 枚举 / 192 值（`internal_state` 164 / `persisted_unmapped` 14 / `finance_candidate_ready` 14）
- mappings：294 条；prod-only：410 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录
