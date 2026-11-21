# CRM 商机状态与阶段写入收口（B102）

日期：2026-11-22
范围：`svc/crm/src/modules/opportunity.rs`、`svc/crm/src/modules/opportunity_status.rs`、`crm.opportunities.status`

## 命中问题

- 通用 PUT `POST /opportunities/{id}` 的 `status = req.status.unwrap_or(existing.status)` 可把商机状态写成任意字符串。
- 同一 PUT 的 `stage = req.stage.unwrap_or(existing.stage)` 可绕过 `/advance`、`/rollback` 的阶段 FSM，直接把 `draft` 改成 `won`。
- 列表读取缓存后直接返回，状态无枚举约束；本地 `crm.opportunities` 仅 1 行（`draft/open`）。
- 阶段接口把状态写成字符串字面量：`won/lost/archived`，与列表/通用 PUT 的口径没有唯一值源。

## 代码收口

1. 新建 `opportunity_status.rs`：四值 `open/won/lost/archived`，`DEFAULT=Open`，提供 `DB_VALUES`、`from_db_str`、`as_db_str`、`is_terminal` 与单测 `roundtrip_all_values`。
2. 创建商机：状态改用 `OpportunityStatus::DEFAULT`，不再硬编码 `"open"`。
3. 通用 PUT：显式传入 `stage` 时先严格解析，非法值 400；与当前阶段不同则 400「商机阶段只能通过推进或回退接口变更」。
4. 通用 PUT：显式传入 `status` 时严格解析，非法值 400；与当前状态不同则 400「商机状态只能通过阶段推进或回退变更」。
5. 通用 PUT 的 SQL 改为 `stage = COALESCE($6, stage)`、`status = COALESCE($11, status)`，绑定 `NULL`，防止内容编辑覆盖并发推进/回退结果。
6. 推进接口：读到 `existing.status` 先严格校验，非法值 400；`won/lost/closed` 阶段分别映射 `won/lost/archived`，非终态映射保留原状态。
7. 回退接口：同样先校验 `existing.status`；回退到非终态统一置 `open`，终态分支保留 `archived` 定义（FMS 实际会先拦截终态）。
8. 前端色板补 `won: success`、`lost: error`，四值全部进入统一色板。

## 数据库候选约束

候选文件：`docs/database/crm-opportunity-status-check-candidates-2026-11-22.sql`

```sql
ALTER TABLE crm.opportunities
    ADD CONSTRAINT ck_crm_opportunities_status_canonical
    CHECK (status::text = ANY (ARRAY['open','won','lost','archived']::text[]))
    NOT VALID;
```

本地事务演练：加约束后插入 `status='bogus'`，PostgreSQL 返回 `23514 check_violation`，约束名 `ck_crm_opportunities_status_canonical`；事务 `ROLLBACK` 后表仍 1 行，合法值 1 行。约束仅 `NOT VALID`，未进入 `database/migrations/`，未在生产执行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm opportunity_status --lib`：1 passed
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：178 枚举 / 178 值 / 139 不在 DB CHECK / 色板缺口 0
- `node scripts/ci/status-db-check-queue.mjs --check`：124 枚举 / 139 值，分桶 80/33/11/15
- 本地 `crm.opportunities` 1 行，合法四值 1 行，演练后残留 0 条 bogus。

## 未做

- 未提交 `ck_crm_opportunities_status_canonical` 到迁移，未在生产执行。
- 未把阶段枚举 `OppStage` 迁到数据库 CHECK；`stage` 仍有 `new/prospecting` 等历史口径与代码 `draft/lead` 不一致，需要单独评估存量与前端。
- 未改列表缓存键以包含状态（当前列表不接受 `status` 参数）。
