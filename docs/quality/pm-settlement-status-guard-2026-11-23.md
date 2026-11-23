# B239 · `pm.settlements.status` 状态守卫（2026-11-23）

## 结论

`pm.settlements.status` 已收敛到唯一 Rust 枚举 `ProjectSettlementStatus`
（`draft` / `pending` / `approved` / `rejected`，默认 `draft`）；
创建、更新、审批、事件写入与数据库 CHECK 共用同一值集，非法值、非法流转和审批后修改返回 400/409。

## 修复的真实缺陷

1. **创建态与真库默认值分裂**：创建 INSERT 硬编码 `'draft'`，但 `pm.settlements.status` 的列默认是 `'pending'`；
   依赖默认值的写入路径会得到不同初始态。现创建显式绑定 `ProjectSettlementStatus::DEFAULT`，并把列默认同步改为 `draft`。
2. **更新接口可写任意状态**：原 `status = COALESCE($2, status)` 直接落库，可写入任意字符串，也可绕过审批接口把 `draft/pending` 直接改成 `approved`。
   现先解析枚举，再按流转表校验；非法值/非法流转返回 400。
3. **审批后金额仍可改**：原更新没有终态保护，`approved` 决算仍可修改名称、金额、备注，导致 `PmProjectSettled` 下游应收/凭证金额与决算行不一致。
   现已审批决算返回 409「已审批决算不允许修改」。
4. **审批接口无来源状态约束**：原 `UPDATE ... SET status='approved' WHERE id` 无状态谓词，已审批可重复审批、`rejected` 也能直接改回 `approved`。
   现仅 `draft` / `pending` 可审批，其余返回 409。
5. **事件创建入口信任载荷**：`SettlementCreated` 事件把 `payload.status` 原样落库；重放或被伪造时非法状态可入库。
   现在 `handle_settlement_created` 先严格解析枚举，未知值直接 `ValidationFailed`；`handle_settlement_approved` 的 `IN ('pending','draft')` 字面量改为参数绑定 `APPROVE_FROM`。

## 生命周期

```text
draft → pending → approved
  ↑        │
  └────────┘（撤回）
rejected → draft（重新提交）
```

- 更新接口允许：`draft→pending`、`pending→draft`、`rejected→draft`；同值放行。
- `approved` 为终态，不可改状态、不可改金额。
- 审批入口仅接受 `draft` / `pending`，审批后 `approved_at` 与项目结算字段在同一事务内写入。

## 数据库

- 约束：`pm.settlements.ck_settlements_status_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['draft','pending','approved','rejected'])) NOT VALID`
- 列默认：`'pending'::character varying` → `'draft'::character varying`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 0 行。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_settlements_status_standard"`。
  - 事务内探针 `status='draft'`：写入成功后回滚。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 407 条，`pm` schema）。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-pm --all-targets -- -D warnings`：通过
- `cargo test -p topems-pm --lib`：536 passed
- `dump-status-code-inventory.mjs`：305 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：182 枚举 / 192 值（`internal_state` 164 / `persisted_unmapped` 14 / `finance_candidate_ready` 14）
- mappings：291 条；prod-only：407 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录
