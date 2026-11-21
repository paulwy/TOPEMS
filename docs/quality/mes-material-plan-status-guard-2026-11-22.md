# MES 材料计划状态集合收口（B97）

日期：2026-11-22
范围：`mes.material_plans` 列表/详情/创建/更新/提交/请购/取消。

## 问题

- 列表 `status` 参数原样作为 `$1` 绑定，SQL 只有 `($1 IS NULL OR status = $1)`，没有六值过滤；任意字符串可直接进入查询。
- 创建 `status` 缺省自由字符串 `pending`，更新 `status` 原样 `COALESCE` 写入，非法值无 400 拦截。
- 提交、请购、取消共用 `transition_status`，UPDATE 只有 `id + tenant_id` 谓词，重复调用会再次成功，没有起始态校验。
- 详情按 `id + tenant_id` 直读，集合外状态可被读出。

## 方案

- 新增 `MaterialPlanStatus` 六值枚举：`pending/requisitioned/sourced/satisfied/shortage/cancelled`；提供 `DB_VALUES`、`DEFAULT = Pending`、严格 `from_db_str`（`canceled` 归一为 `cancelled`）、`as_db_str`，以及 `submit_from/requisition_from/cancel_from` 起始态集合。
- 列表：`status` 严格解析并回填规范值，未知 400；总数与分页 SQL 固定加六值 `status IN (...)`。
- 详情与更新：UPDATE/SELECT 固定加六值过滤；更新请求 `status` 严格解析，非法 400。
- 创建：缺省取枚举默认 `pending`；显式非法值 400。
- 流转：`transition_status` 新增 `allowed_from`，SQL 用 `status = ANY($4::text[])` 限制起始态；0 行时再查记录是否存在，存在返回 409，不存在返回 404，重复流转不再假成功。

起始态口径：

- 提交：仅 `pending`
- 请购：仅 `requisitioned`
- 取消：`pending/requisitioned/sourced/shortage`，`satisfied` 与 `cancelled` 为终态

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib material_plan_status`：1 passed。
- 本地 `mes.material_plans` 0 行。事务内插入 `pending` 与 `bogus` 两行：全表 2、六值过滤 1；`pending→requisitioned` 一次 `UPDATE 1`，同谓词重复 `UPDATE 0`，`bogus` 按 `requisitioned` 起始态更新 `UPDATE 0`；`ROLLBACK` 后 0 行。
- 候选 `material_plans_status_check` 以 `NOT VALID` 添加后，将 `pending` 行改为 `bogus` 触发 23514；`ROLLBACK` 后无残留。
- 状态盘点：173 个 Rust 枚举 / 170 值 / 131 值不在 DB CHECK / 185 个前端键 / 色板缺口 0；队列 119 枚举 / 131 值（internal_state 72、persisted_unmapped 33、api_projection 11、finance_candidate_ready 15）。
- 前端 `STATUS_COLOR_MAP` 补充 `requisitioned/sourced/satisfied/shortage` 四键，与 `apps/web/src/api/aps/types.ts` 的 `MaterialPlanStatus` 六值对齐。
- 候选约束保持 `docs/database/mes-material-plan-status-check-candidates-2026-11-22.sql` 的 `NOT VALID`，未进迁移、未在生产执行。
