# MES 需求预测状态集合收口（B99）

日期：2026-11-22
范围：`mes.demand_forecasts` 列表/详情/更新/计算/验证/采纳。

## 问题

- 列表 `status` 原样绑定，SQL 只有 `($3 IS NULL OR status = $3)`，没有六值过滤。
- 详情、更新前读取、三个流转前读取都没有 `status IN (...)`，集合外历史值可读。
- 通用 PUT 直接 `req.status.unwrap_or(existing.status)` 写库，可绕过 `DEMAND_FORECAST` 状态机。
- 计算/验证/采纳三个 UPDATE 没有起始态谓词，并发重复请求可各自成功。

## 方案

- 新增 `DemandForecastStatus` 六值枚举：`draft/calculated/validated/adopted/superseded/cancelled`；`DEFAULT = Draft`；严格 `from_db_str`（`canceled` 归一为 `cancelled`）、`as_db_str`；提供 `calculate_from/validate_from/adopt_from` 起始态集合。生命周期仍以 `shared::aps_fsm::DEMAND_FORECAST` 为准。
- 列表：`status` 严格解析并回填规范值，未知 400；列表与总数固定加六值过滤。
- 详情、更新前读取、三个流转前读取：统一加六值 `status IN (...)`，集合外按 404。
- 通用更新：`status` 显式传入时严格解析；与当前值不同直接 400「状态只能通过计算/验证/采纳流程变更」；UPDATE 的 status 绑定固定 `NULL`，由 `COALESCE($10, status)` 保持库里现值，避免内容编辑覆盖并发流转。
- 流转：计算 UPDATE 加 `status = 'draft'`，验证加 `'calculated'`，采纳加 `'validated'`；`fetch_one` 改 `fetch_optional`，0 行返回 409。
- 前端：需求预测状态字段改为 `showInForm: false`，创建/编辑不再提供状态选择；色板补 `validated/adopted/superseded` 三键。

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib demand_forecast`：10 passed（含新枚举 roundtrip 与既有 FSM 用例）。
- 本地 `mes.demand_forecasts` 0 行。事务内插入 `draft` 与 `bogus` 两行：全表 2、六值过滤 1；`draft→calculated` 一次 `UPDATE 1`、同谓词重复 `UPDATE 0`、`bogus` 按 draft 起始态 `UPDATE 0`；`calculated→validated→adopted` 各 `UPDATE 1`；六值谓词改 notes 对 `bogus` `UPDATE 0`；`ROLLBACK` 后 0 行。
- 候选 `demand_forecasts_status_check` 以 `NOT VALID` 添加后，将 `draft` 行改为 `bogus` 触发 23514；`ROLLBACK` 后无残留。
- 状态盘点：175 个 Rust 枚举 / 173 值 / 134 值不在 DB CHECK / 188 个前端键 / 色板缺口 0；队列 121 枚举 / 134 值（internal_state 75、persisted_unmapped 33、api_projection 11、finance_candidate_ready 31）。
- 候选约束保持 `docs/database/mes-demand-forecast-status-check-candidates-2026-11-22.sql` 的 `NOT VALID`，未进迁移、未在生产执行。
