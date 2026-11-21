# MES 产能状态集合收口（B100）

日期：2026-11-22
范围：`mes.capacities` 列表/详情/更新/分配/提交/释放/维护切换。

## 问题

- 列表 `status` 原样绑定，SQL 只有 `($3 IS NULL OR status = $3)`，没有五值过滤；缓存键也在校验前生成。
- 详情、更新前读取、四个动作前读取都没有 `status IN (...)`，集合外历史值可读。
- 通用 PUT 直接 `req.status.unwrap_or(existing.status)` 写库，可绕过 `CAPACITY` 状态机。
- 四个动作 UPDATE 没有起始态谓词，并发重复请求可各自成功。
- 前端产能状态使用的是 `available/busy/maintenance/offline`，与后端 FSM 的 `available/allocated/consumed/maintenance/released` 不一致，`allocated/released` 只能落到灰色 fallback。

## 方案

- 新增 `CapacityStatus` 五值枚举：`available/allocated/consumed/maintenance/released`；`DEFAULT = Available`；严格 `from_db_str`、`as_db_str`；提供 `allocate_from/release_from/maintenance_from/restore_from` 起始态集合。生命周期仍以 `shared::aps_fsm::CAPACITY` 为准。
- 列表：`status` 在缓存命中前严格解析并回填规范值，未知 400；缓存键使用规范值；列表与总数固定加五值过滤。
- 详情、更新前读取、四个动作前读取：统一加五值 `status IN (...)`，集合外按 404。
- 通用更新：`status` 显式传入时严格解析；与当前值不同直接 400「产能状态只能通过分配/释放/维护流程变更」；UPDATE 的 status 绑定固定 `NULL`，由 `COALESCE($6, status)` 保持库里现值。
- 流转：分配与提交 UPDATE 加 `status = 'available'`，释放加 `'allocated'`，维护切换用 `status = ANY($5::text[])` 限制 `available` 或 `maintenance`；全部改 `fetch_optional`，0 行返回 409。
- 前端：状态字段 `showInForm: false`；状态选项、色板、筛选统一改为五值，补 i18n `k14/k15/k16`（已分配/已消耗/已释放），并在 `STATUS_COLOR_MAP` 补 `allocated/consumed`。

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib capacity`：16 passed（含新枚举 roundtrip 与既有 FSM 用例）。
- 本地 `mes.capacities` 0 行。事务内插入 `available`、`bogus`、`maintenance` 三行：全表 3、五值过滤 2；`available→allocated` 一次 `UPDATE 1`、同谓词重复 `UPDATE 0`；`allocated→released` `UPDATE 1`；`maintenance→available` 与 `available→maintenance` 各 `UPDATE 1`；五值谓词改 `used_hours` 对 `bogus` `UPDATE 0`；`ROLLBACK` 后 0 行。
- 候选 `capacities_status_check` 以 `NOT VALID` 添加后，将 `available` 行改为 `bogus` 触发 23514；`ROLLBACK` 后无残留。
- 状态盘点：176 个 Rust 枚举 / 175 值 / 136 值不在 DB CHECK / 190 个前端键 / 色板缺口 0；队列 122 枚举 / 136 值（internal_state 77、persisted_unmapped 33、api_projection 11、finance_candidate_ready 15）。
- 候选约束保持 `docs/database/mes-capacity-status-check-candidates-2026-11-22.sql` 的 `NOT VALID`，未进迁移、未在生产执行。
