# B241 · `qms.qa_audit_plans.status` 状态守卫（2026-11-23）

## 结论

`qms.qa_audit_plans.status` 已收敛到唯一 Rust 枚举 `AuditPlanStatus`
（`draft` / `scheduled` / `in_progress` / `completed` / `cancelled`，默认 `draft`），
与既有 `shared::fsm::AUDIT_PLAN` 同源；列表过滤、创建、排期、启动、完成与数据库 CHECK 共用同一值集。

本批同时补上缺失的 `POST /audit-plans/{id}/schedule`：
此前 FSM 要求 `draft → scheduled → in_progress`，但代码没有排期入口，
`/start` 只能从任意状态直接写 `in_progress`，导致 FSM 形同虚设。

## 修复的真实缺陷

1. **启动接口无来源状态约束**：原 `UPDATE ... SET status='in_progress' WHERE id AND tenant_id` 可从 `draft`、`completed`、`cancelled` 任意状态启动；已完成的审核计划可被重新打开。现只有 `scheduled` 可启动，其余 409。
2. **完成接口无来源状态约束**：原 `UPDATE ... SET status='completed'` 可从任意状态完成，未开始的计划也能直接完成；现只有 `in_progress` 可完成，其余 409。
3. **缺少排期入口**：FSM 的 `draft → scheduled` 没有任何 API 能触发，严格校验后所有计划会卡在 `draft`。本批新增 `/audit-plans/{id}/schedule`，只接受 `draft`。
4. **列表过滤原样拼 SQL**：`query.status` 直接绑定，非法值返回 200 空列表；现先解析枚举，非法值 400。
5. **创建硬编码 `'draft'`**：改为绑定 `AuditPlanStatus::DEFAULT`，与 DB 列默认值一致。

## 生命周期

```text
draft → scheduled → in_progress → completed
  │         │            │
  └─────────┴────────────┴──→ cancelled
```

- `completed` / `cancelled` 为终态，不可再启动或完成。
- 排期：`draft → scheduled`。
- 启动：`scheduled → in_progress`。
- 完成：`in_progress → completed`。
- 取消：`draft/scheduled/in_progress → cancelled`（当前无取消接口，DB 值集保留，供后续入口使用）。

## 数据库

- 约束：`qms.qa_audit_plans.ck_qa_audit_plans_status_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['draft','scheduled','in_progress','completed','cancelled'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 0 行。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_qa_audit_plans_status_standard"`。
  - 事务内探针 `status='scheduled'`：写入成功后回滚。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 409 条，`qms` schema）。

## 兼容性说明

- `POST /audit-plans/{id}/start` 不再接受 `draft`，调用方需先调用 `/schedule`。
- 前端当前没有审核计划调用点（`apps/web/src` 无 `/audit-plans` 引用），无前端改造。
- OpenAPI 已注册 `schedule_audit_plan`，`extract_openapi_spec` 单测通过。

## 门禁

- `cargo fmt --all --check`：通过
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：通过
- `cargo test -p topems-qms --lib`：268 passed
- `dump-status-code-inventory.mjs`：307 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：184 枚举 / 192 值（`internal_state` 164 / `persisted_unmapped` 14 / `finance_candidate_ready` 14）
- mappings：293 条；prod-only：409 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录
