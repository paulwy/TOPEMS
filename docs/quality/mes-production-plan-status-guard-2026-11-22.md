# MES 生产计划状态集合收口（B98）

日期：2026-11-22
范围：`mes.production_plans` 列表/详情/更新/提交审批/审批通过/驳回。

## 问题

- 列表 `status` 参数原样绑定，SQL 只有 `($3 IS NULL OR status = $3)`，没有六值过滤。
- 详情、更新前读取和各流转前读取都没有 `status IN (...)`，集合外历史值可读，也会进入 `can_transition`。
- 通用 PUT 直接 `req.status.unwrap_or(existing.status)` 写库，可绕过 `PRODUCTION_PLAN` 状态机，任意跳转状态。
- 三个流转端点读完状态后直接 UPDATE，没有起始态 SQL 谓词；并发下两个请求都可能读到旧状态并各自成功。

## 方案

- 新增 `ProductionPlanStatus` 六值枚举：`draft/pending_approval/approved/in_progress/completed/cancelled`；`DEFAULT = Draft`；严格 `from_db_str`（`canceled` 归一为 `cancelled`）、`as_db_str`；提供 `submit_from/approve_from/reject_from` 起始态集合。生命周期仍以 `shared::aps_fsm::PRODUCTION_PLAN` 为准。
- 列表：`status` 严格解析并回填规范值，未知 400；列表与总数固定加六值过滤。
- 详情、更新前读取、三个流转前读取：统一加六值 `status IN (...)`，集合外按 404。
- 通用更新：`status` 显式传入时严格解析；只要与当前值不同就 400「生产计划状态只能通过审批流变更」；UPDATE 的 status 绑定固定 `NULL`，由 `COALESCE($5, status)` 保持库里现值，避免内容编辑把并发流转覆盖回旧状态。
- 流转：提交 UPDATE 加 `status = 'draft'`，审批通过/驳回加 `status = 'pending_approval'`；`fetch_one` 改 `fetch_optional`，0 行返回 409「状态已变更，请刷新后重试」。
- 前端：生产计划表单不再渲染状态选择（`showInForm: false`，并从首个 formSection 移除 `status`），状态列与详情仍保留；状态筛选补充「待审批」选项及 i18n 键 `aps.production_plan_page.k42`。

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib production_plan`：11 passed（含新枚举 roundtrip 与既有 FSM 用例）。
- 本地 `mes.production_plans` 0 行。事务内插入 `draft` 与 `bogus` 两行：全表 2、六值过滤 1；`draft→pending_approval` 一次 `UPDATE 1`、同谓词重复 `UPDATE 0`、`bogus` 按 draft 起始态 `UPDATE 0`；六值谓词改 `plan_name` 对 `bogus` `UPDATE 0`、对 `draft` `UPDATE 1`；`ROLLBACK` 后 0 行。
- 候选 `production_plans_status_check` 以 `NOT VALID` 添加后，将 `draft` 行改为 `bogus` 触发 23514；`ROLLBACK` 后无残留。
- 状态盘点：174 个 Rust 枚举 / 170 值 / 131 值不在 DB CHECK / 185 个前端键 / 色板缺口 0；队列 120 枚举 / 131 值（internal_state 72、persisted_unmapped 33、api_projection 11、finance_candidate_ready 15）。
- 候选约束保持 `docs/database/mes-production-plan-status-check-candidates-2026-11-22.sql` 的 `NOT VALID`，未进迁移、未在生产执行。
