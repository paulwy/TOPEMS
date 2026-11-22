# WMS 补货建议状态治理（B118）

日期：2026-11-22
范围：`wms.replenishment_suggestions.status`

## 唯一状态集合

| DB 值 | Rust 枚举 | 语义 | 迁移 |
| --- | --- | --- | --- |
| `draft` | `ReplenishmentSuggestionStatus::Draft` | 历史草稿态，仅保留读取兼容 | → `confirmed` |
| `active` | `ReplenishmentSuggestionStatus::Active` | 系统计算生成的待确认建议，后端默认态 | → `confirmed` |
| `confirmed` | `ReplenishmentSuggestionStatus::Confirmed` | 已确认终态 | 终态 |

- 新增 `can_transition_to` 迁移矩阵与单测：`draft / active → confirmed`，`confirmed` 不可回退。
- `DEFAULT = Active`，与计算任务实际写入值一致。
- 候选 CHECK 同时接受 `draft`，避免历史草稿态直接触发 23514；`draft` 不再由新写入产生。

## 读侧与写入口修复

- `list_suggestions`：
  - 之前 `status` / `search` 参数被直接 clone 拼 SQL，非法状态静默返回空集。
  - 现在 `status` 用 `from_db_str` 严格解析，非法值 400。
  - SELECT / COUNT 补 `deleted_at IS NULL`、`tenant_id` 与 `status = ANY('draft','active','confirmed')`。
- `get_suggestion`：原 `WHERE id = $1`，会读到已软删、跨租户和非法状态行；现在补租户、软删与规范集合过滤。
- `confirm_suggestion`：
  - 预读补 `tenant_id` / `deleted_at IS NULL`。
  - UPDATE 尾部补 `tenant_id` 与 `deleted_at IS NULL`，并把 `fetch_one` 改为 `fetch_optional`：0 行返回 409「状态已变化」，不再落成 500。
  - 保留 `confirm_from` 起始态校验与 `status = ANY` 状态谓词。
- `get_statistics`：
  - 原 SQL 为 `warehouse_id = $1 OR $1 IS NULL`，无租户、无软删、无状态集合，且缺少 `active_count`。
  - 改为运行时 `sqlx::query` + `Row::try_get`，补租户、软删、规范状态集合，并新增 `active_count`。
- `compute_replenishment` 括号优先级修复：
  - 旧：`AND ($4 IS NULL OR i.warehouse_id = $4 AND 阈值1 AND 阈值2)`
  - 新：`AND ($4 IS NULL OR i.warehouse_id = $4) AND 阈值1 AND 阈值2`
  - 旧写法在未指定仓库时短路两条阈值条件，会为全部库存生成建议，包括 `suggested_quantity = 0` 的行；这是本地 7332 条 `active` 建议全部为零建议量的直接原因。

## 存量数据风险

- 本地 `wms.replenishment_suggestions` 7332 行，全部 `status = active`，且 `suggested_quantity <= 0` 也是 7332 行。
- 生产快照 0 行。
- 修复 SQL 不会自动清理存量；候选文件内提供默认注释的软删语句，需业务确认后单独执行，不在本批自动跑数据变更。

## 前端收敛

`apps/web/src/schemas/wms/suggestion.ts` 原来使用 `pending / approved / rejected / converted` 四个与后端和 DB 完全无关的幽灵状态，现收敛为：

- 表单/列表选项：`draft / active / confirmed`
- 状态色板：`draft=warning`、`active=info`、`confirmed=success`
- 筛选器：`draft / active / confirmed`
- i18n 文案：草稿 / 待确认 / 已确认（英文 Draft / Pending Confirmation / Confirmed）

## DB 候选与事务演练

候选：`docs/database/wms-replenishment-suggestion-status-check-candidates-2026-11-22.sql`

- 列默认值 `draft → active`。
- 新增 `ck_replenishment_suggestions_status_standard`，`NOT VALID`。
- 本地演练（均在同一事务内 `ROLLBACK`）：
  - 合法：`active → confirmed`，`UPDATE 1`，分布变为 `active 7331 / confirmed 1`。
  - 非法：写 `pending` 触发 `23514`，约束名 `ck_replenishment_suggestions_status_standard`。
  - 回滚后：状态 CHECK 数量 0、列默认仍为 `draft`、7332 行仍全部 `active`。

## 门禁

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo fmt --all`：已执行
- `cargo test -p topems-wms --lib`：581 passed，0 failed
- `node scripts/ci/check-request-txn.mjs --changed-only`：通过
- `node scripts/ci/check-scope-api.mjs --changed-only`：通过
- `python3 scripts/ci/check-txn-write-non2xx.py --changed-only`：通过
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：通过
- `node scripts/ci/status-db-check-queue.mjs --check`：通过
- `node scripts/ci/verify-glossary.cjs --strict`：通过
- `node scripts/ci/check-i18n.cjs --mode=quality --strict`：通过

## 未决项

- 本地 7332 条零建议量历史建议是否软删/重建，需要业务确认。
- `wms.replenishment_suggestions.priority` 后端为 `urgent / high / medium`，前端仍列 `normal / low`，属于独立优先级收敛项，未并入本批状态治理。
