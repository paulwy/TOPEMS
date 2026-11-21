# CRM 账单状态收口（B103）

日期：2026-11-22
范围：`svc/crm/src/modules/billing.rs`、`svc/crm/src/modules/billing_status.rs`、`crm.billing_records.status`

## 命中问题

- 列表 `status` 参数原样透传 SQL，非法值返回空列表而非 400。
- 创建账单硬编码 `'pending'`，无枚举来源。
- 通用 PUT 的 `status = COALESCE($8, status)` 可写任意字符串，且不校验迁移合法性；写 `paid` 时 `paid_at` 不联动。
- `/billing/{id}/paid` 无起始态谓词，`cancelled` 也能被核销成 `paid`；0 行统一返回 404。
- 前端 `crm.billing` 状态类型为 `pending/paid/overdue/cancelled`，后端无对应枚举。
- **数据库冲突**：本地已有 `ck_billing_records_status_standard`，仅允许 `active/inactive/archived/pending/paid`，会把 `overdue/cancelled` 判为非法。该约束是通用状态标准误用，必须替换而不是叠加。
- 本地 `crm.billing_records` 0 行。

## 代码收口

1. 新建 `billing_status.rs`：四值 `pending/paid/overdue/cancelled`，`DEFAULT=Pending`，定义 `can_transition`：`pending → paid/overdue/cancelled`、`overdue → paid/cancelled`，`paid/cancelled` 为终态。
2. 列表：`status` 严格解析，非法值 400，SQL 只接收规范值。
3. 创建：状态改用 `BillingStatus::DEFAULT`，INSERT 绑定枚举值。
4. 通用 PUT：先读取现有账单并严格解析当前状态；目标状态非法 400；非法迁移 409；同值允许。预读通过 `Db::scope_with(&mut *txn)` 复用请求事务，不新增裸事务计数。
5. 通用 PUT 的 SQL：`status = COALESCE($8, status)`，`paid_at` 随状态联动（`paid` 填当前时间或保留原值，`pending/overdue/cancelled` 清空）；增加 `status = $11` 并发谓词，0 行返回 409，不再把并发冲突伪装成 404。
6. `/paid`：先读取并严格解析状态；已 `paid` 保持幂等成功；只有 `pending/overdue` 可核销；UPDATE 增加 `status = ANY($4)` 起始态谓词，0 行返回 409。
7. 前端色板已覆盖 `paid/overdue/cancelled`，无需新增。

## 数据库候选约束

候选文件：`docs/database/crm-billing-status-check-candidates-2026-11-22.sql`

```sql
ALTER TABLE crm.billing_records
    DROP CONSTRAINT IF EXISTS ck_billing_records_status_standard;

ALTER TABLE crm.billing_records
    ADD CONSTRAINT ck_crm_billing_records_status_canonical
    CHECK (status::text = ANY (ARRAY['pending','paid','overdue','cancelled']::text[]))
    NOT VALID;
```

本地事务演练：替换后插入 `pending/overdue/cancelled/paid` 4 行全部成功；插入 `bogus` 返回 `23514 check_violation`，约束名 `ck_crm_billing_records_status_canonical`；`ROLLBACK` 后表仍 0 行，旧约束保持原样。候选仅 `NOT VALID`，未进入 `database/migrations/`，未在生产执行。

## 上线顺序风险

现有 `ck_billing_records_status_standard` 会在迁移前拦截 `overdue/cancelled`。代码已按领域四值放行，迁移落地前写入这两个目标值仍会被数据库 23514 拒绝；因此生产必须先执行候选替换，再做状态写入。替换前需预检存量是否含 `active/inactive/archived`，存在则需先修订或扩展候选集合。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm billing_status --lib`：1 passed
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：179 枚举 / 178 值 / 139 不在 DB CHECK / 色板缺口 0
- `node scripts/ci/status-db-check-queue.mjs --check`：124 枚举 / 139 值，分桶 80/33/11/15
- 本地 `crm.billing_records` 0 行，演练后残留 0。

## 未做

- 未提交候选约束到迁移，未在生产执行。
- 未新增 `overdue` 定时标记与 `cancelled` 独立接口；当前两者只能通过通用 PUT 在允许迁移内写入。
- 未改账单列表缓存（该模块无缓存）。
