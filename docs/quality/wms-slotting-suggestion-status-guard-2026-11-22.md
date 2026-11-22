# WMS 库位优化建议状态治理（B120）

日期：2026-11-22
范围：`wms.slotting_suggestions.status`

## 唯一状态集合

| DB 值 | Rust 枚举 | 语义 | 迁移 |
| --- | --- | --- | --- |
| `pending` | `SlottingSuggestionStatus::Pending` | 优化任务生成的待处理建议 | → `applied` / `rejected` |
| `applied` | `SlottingSuggestionStatus::Applied` | 已应用 | 终态 |
| `rejected` | `SlottingSuggestionStatus::Rejected` | 已拒绝 | 终态 |

- 新增 `SlottingSuggestionStatus`，`DEFAULT = Pending`，与列默认 `pending` 一致。
- 新增 `decide_from = ["pending"]`、`is_terminal` 与 `can_transition_to` 单测。
- 前端 `slotting.ts` 的 `SlottingSuggestion.status` 本就是三值联合类型，无需改动。

## 读侧与写入口修复

- `run_optimization`：
  - 规则读取和分区关联原先没有租户、软删过滤。
  - 现在规则、分区、`NOT EXISTS` 去重都限定当前租户，并过滤 `deleted_at IS NULL`。
  - 插入建议的 `status` 由 SQL 字面量 `'pending'` 改为绑定 `SlottingSuggestionStatus::DEFAULT`。
- `list_suggestions`：
  - 原 `status` 参数直接拼 SQL，非法值静默返回空集。
  - 现在严格解析，非法值 400。
  - SELECT / COUNT 补 `tenant_id`、`deleted_at IS NULL` 与 `status = ANY('pending','applied','rejected')`。
- `get_suggestion`：原 `WHERE id = $1`，会读到跨租户、已软删和非法状态行；现在补租户、软删与规范集合。
- `apply_suggestion` / `reject_suggestion`：
  - 原 `WHERE id AND status='pending'`，无租户、无软删，0 行返回 404。
  - 现在补租户、软删与起始态 `decide_from`，0 行统一 409。
  - 状态与 `applied_at` 写入均绑定枚举。
- `get_impact_analysis`：原无租户、无软删、无状态集合；现在只统计当前租户、未删除、规范集合建议。

## 存量数据

- 本地 `wms.slotting_suggestions` 0 行；生产快照 0 行。
- 本地原无状态 CHECK，列默认 `pending`。
- 无历史非规范值需要归并。

## DB 候选与事务演练

候选：`docs/database/wms-slotting-suggestion-status-check-candidates-2026-11-22.sql`

- 新增 `ck_slotting_suggestions_status_standard`，`NOT VALID`。
- 本地演练（同一事务 `ROLLBACK`）：
  - 插入不写状态，默认得到 `pending`。
  - 合法更新到 `applied`；另插入 `rejected` 成功。
  - 非法 `done` 插入触发 `23514`。
  - 回滚后：状态 CHECK 数量 0、建议 0 行、列默认仍为 `pending`。

## 门禁

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo fmt --all`：已执行
- `cargo test -p topems-wms --lib`：584 passed，0 failed
- `node scripts/ci/check-request-txn.mjs --changed-only`：通过
- `node scripts/ci/check-scope-api.mjs --changed-only`：通过
- `python3 scripts/ci/check-txn-write-non2xx.py --changed-only`：通过
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：通过
- `node scripts/ci/status-db-check-queue.mjs --check`：通过
- `node scripts/ci/verify-glossary.cjs --strict`：通过
- `node scripts/ci/check-i18n.cjs --mode=quality --strict`：通过

## 未决项

- `apply_suggestion` 目前只标记建议为已应用，不执行真实库位迁移/库存移动；模块仍是“最小可用实现”，状态治理不改变该业务缺口。
- `wms.slotting_zones.status` 不存在，分区使用 `is_active` 布尔；本次未改分区模型。
