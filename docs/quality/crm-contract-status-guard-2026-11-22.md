# CRM 合同状态收口（B101）

日期：2026-11-22
范围：`svc/crm/src/modules/contract.rs`、`svc/crm/src/modules/contract_status.rs`、`crm.contracts.status`

## 命中问题

- 列表 `status` 过滤参数原样透传 SQL，任意字符串都会落到 `status = $2`，非法值返回空结果而非 400，调用方无法区分“没有数据”和“参数写错”。
- 创建接口 `req.status` 可为任意字符串，SQL 仅用 `COALESCE($7,'draft')` 兜底空值，不校验非法值。
- 更新接口 `status = COALESCE($7, status)` 可把合同改成任意字符串，无枚举约束。
- 前端 `CrmContractRedesignPage` 已使用 `draft/pending/active/completed/expired/terminated` 六值，后端没有对应唯一值源，前后端靠约定而非代码约束对齐。
- 本地 `crm.contracts` 仅 1 行（`CT-2026-001`，`active`），在六值集合内，无需存量修订。

## 代码收口

1. 新建 `contract_status.rs`：六值 `draft/pending/active/completed/expired/terminated`，`DEFAULT=Draft`，提供 `DB_VALUES`、`from_db_str`、`as_db_str`、`is_terminal` 与单测 `roundtrip_all_values`。
2. 列表：`params.status` 先严格解析为枚举，非法值直接 400「合同状态非法」；SQL 只接收规范值。
3. 创建：`req.status` 为空时使用 `ContractStatus::DEFAULT`；非法值 400；INSERT 直接绑定规范值，不再依赖 `COALESCE`。
4. 更新：`req.status` 为空保持原值；非法值 400；UPDATE 绑定规范值或 `NULL` 保留现值。
5. 前端色板：`apps/web/src/utils/status.ts` 补 `terminated: 'error'`，六值均进入统一色板；页面本地状态映射保持不变。

合同没有独立的状态流转端点，状态仍由通用 PUT 维护，因此本批只做“值域唯一 + 写入口严格解析”，不引入起始态谓词；后续若增加提交/签署/终止动作，应再按 FSM 批次补起始态。

## 数据库候选约束

候选文件：`docs/database/crm-contract-status-check-candidates-2026-11-22.sql`

```sql
ALTER TABLE crm.contracts
    ADD CONSTRAINT ck_crm_contracts_status_canonical
    CHECK (status::text = ANY (ARRAY['draft','pending','active','completed','expired','terminated']::text[]))
    NOT VALID;
```

本地事务演练：加约束后插入 `status='bogus'`，PostgreSQL 返回 `23514 check_violation`，约束名 `ck_crm_contracts_status_canonical`；事务 `ROLLBACK` 后表仍 1 行，合法值 1 行。约束仅 `NOT VALID`，未进入 `database/migrations/`，未在生产执行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm contract_status --lib`：1 passed
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：177 枚举 / 176 值 / 137 不在 DB CHECK / 色板缺口 0
- `node scripts/ci/status-db-check-queue.mjs --check`：123 枚举 / 137 值，分桶 78/33/11/15
- 本地 `crm.contracts` 1 行，合法六值 1 行，演练后残留 0 条 bogus。

## 未做

- 未提交 `ck_crm_contracts_status_canonical` 到迁移，未在生产执行。
- 未新增合同状态流转端点。
- 未改前端合同页的状态筛选（页面当前只按 type 过滤，不传 status）。
