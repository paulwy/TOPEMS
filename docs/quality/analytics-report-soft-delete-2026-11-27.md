# Analytics 报表订阅/调度域软删与写入命中收口（B364，2026-11-27）

## 背景

`bi.report_subscriptions`（`20261007000009_align_orphan_tables_selfheal3.sql:245`）和
`bi.report_schedules`（`20260918000022_align_reports_tables.sql:70` 补列）都有 `deleted_at` 软删列，
`svc/analytics/src/modules/report/{subscription,schedule,scheduler}.rs` 的读写却只按 `id` / `status` / `user_id` 过滤。
后果分四类：

1. **软删行仍可见**：列表/详情照常返回已删订阅、已删调度；
2. **写命中不到行也报成功**：update / delete / toggle 用 `WHERE id = $n` 执行后不看
   `rows_affected()`，删两次、改不存在的 id 都返回 200「Subscription deleted / Schedule updated」；
3. **后台越权续跑**：`scheduler.rs` 的 `load_schedules` / `check_and_execute_schedules` 按
   `status = 'active'` 跨租户扫描，`notify_subscribers` 按 `enabled = true` 取订阅——已删但状态未改的
   调度/订阅会继续跑批、继续给已删订阅发信；
4. **错误被吞成空列表**：4 处 `.unwrap_or_default()` 把查询失败变成 `success: true, total: 0`，
   前端看到的是「没有数据」而不是「查询失败」。

同一个域里还有第二份实现：`svc/finance/src/modules/financial_reports.rs` 的报表订阅 5 个端点完全不落库
（B363 证据文档已记录为假成功）。真正的持久化实现只在本文件（analytics），本批只收口 analytics 侧。

## 改动

### `subscription.rs`（读 3 + 写 3）

| handler | 改动 |
| --- | --- |
| `get_subscription` | `WHERE s.id = $1 AND s.deleted_at IS NULL`（已删 → 404） |
| `list_subscriptions` | `WHERE s.deleted_at IS NULL`；`unwrap_or_default()` → 失败返回 500 |
| `get_user_subscriptions` | 同上（按 user 过滤 + 软删过滤 + 失败 500） |
| `update_subscription` | `WHERE id = $4 AND deleted_at IS NULL`，`rows_affected() == 0` → 404 |
| `delete_subscription` | `WHERE id = $1 AND deleted_at IS NULL`，重复删 → 404（幂等语义改为显式告知） |
| `toggle_subscription` | `WHERE id = $1 AND deleted_at IS NULL`（已删不再被 toggle 回来） |

### `schedule.rs`（读 2 + 写 4 + 历史）

| handler | 改动 |
| --- | --- |
| `list_schedules` | `WHERE s.deleted_at IS NULL`；失败返回 500 |
| `get_schedule` | `WHERE s.id = $1 AND s.deleted_at IS NULL` |
| `update_schedule` | `WHERE id = $7 AND deleted_at IS NULL`，0 行 → 404 |
| `delete_schedule` | `WHERE id = $1 AND deleted_at IS NULL`，0 行 → 404 |
| `execute_schedule` | 回写 `last_run_at` 时 `AND deleted_at IS NULL`，0 行 → 404 |
| `toggle_schedule` | `AND deleted_at IS NULL`，0 行 → 404 |
| `get_execution_history` | `unwrap_or_default()` → 失败 500 |

### `scheduler.rs`（后台通道）

- `load_schedules`：`WHERE status = 'active' AND deleted_at IS NULL`；
- `check_and_execute_schedules`：到期扫描同样加 `AND deleted_at IS NULL`；
- `run_report` / `notify_subscribers`：调度与订阅查询均加 `deleted_at IS NULL`；
- 执行结果回写 `bi.report_schedules` 的两条 UPDATE（成功 `run_count+1`、失败写 `error_message`）
  各加 `AND deleted_at IS NULL`——执行过程中被删的调度不再被回写复活。

### 结构性棘轮 `svc/analytics/src/modules/report/soft_delete_ratchet.rs`

三个断言直接读源码（`include_str!` 会扫到测试自身，改用 `CARGO_MANIFEST_DIR` + 运行时读文件）：

1. `r#"…"#` 里凡出现 `bi.report_subscriptions` / `bi.report_schedules` 的 `SELECT` / `UPDATE`
   必须含 `deleted_at IS NULL`（`INSERT` 豁免），并要求扫到 ≥15 条，防解析失效空跑；
2. 三个文件不得再出现 `.unwrap_or_default()`；
3. `subscription.rs` ≥2 处、`schedule.rs` ≥4 处「命中 0 行 → 404」守卫。

棘轮在第一次运行时就抓到了 `scheduler.rs` 里两条漏网的 `last_run_at` 回写，说明它不是形式主义。

## 验证

- `cargo test -p topems-analytics --lib`：188 passed / 0 failed（含 3 条新棘轮）。
- `cargo clippy -p topems-analytics --lib -- -D warnings`：干净。
- `.sqlx` 离线缓存：`scripts/dev/sqlx-prepare.sh -p topems-analytics` 刷新，新增 7 条 query 缓存。
- 本地 `bi.report_subscriptions` / `bi.report_schedules` 均 0 行（含 0 行软删），无数据迁移影响。

## 遗留

- utoipa 注解仍只声明 200，未补 404 响应体；`docs/api/openapi.json` 未改（本批不改契约形状）。
- 同一文件里 `create_subscription` 未做「同租户 + 同 user + 同 template」去重，重复订阅会产生多份发信；
  需要业务确认是否要唯一约束（涉迁移，另批）。
- `finance` 侧 5 个报表订阅假端点仍与他并存，前端若打 finance 就永远看不到真实订阅数据，
  建议后续统一指向 analytics（B363 已列候选）。
- `analytics.report_execution_records` 无 `deleted_at`，历史查询未做软删过滤（表本身不支持）。
