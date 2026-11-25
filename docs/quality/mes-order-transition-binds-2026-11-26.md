# MES 生产工单状态迁移参数绑定修复（B335，2026-11-26）

## 背景

`mes.production_orders` 本地 134 行：planned 67 / pending 52 / released 10 / in_progress 5，无软删行。状态值的唯一来源是 `svc/mes/src/modules/production_order_status.rs` 的 `ProductionOrderStatus`（B3xx 已收敛），编辑与删除入口此前已补租户、状态集合与软删谓词。

## 缺口

四个状态迁移入口的 UPDATE 语句引用了目标态与来源态集合占位符，但 Rust 侧只绑定了 id / 时间 / 租户，目标态和来源集合完全没有 `.bind()`：

| 入口 | SQL 引用 | 实际绑定 | 影响 |
| --- | --- | --- | --- |
| `release_production_order` | `$1..$5`（`status = $4`、`ANY($5)`） | 3 个 | 执行期参数数量不匹配，必然报错 |
| `start_production_order` | `$1..$6`（`status = $5`、`ANY($6)`） | 4 个 | 同上 |
| `complete_production_order` | `$1..$6`（`status = $5`、`ANY($6)`） | 4 个 | 同上 |
| `cancel_production_order` | `$1..$5`（`status = $4`、`ANY($5)`） | 3 个 | 同上 |

`cargo check` 无法发现该问题（`sqlx::query_as` 走运行期字符串，不经编译期校验），因此四条主流程（下达、开工、完工、取消）在真实请求下全部落到 500，前端只能看到“操作失败”。

## 修复

四个入口统一为一致参数顺序，并显式绑定状态机常量，不再依赖手写字符串：

- `$1` id、`$2` 目标态、`$3` 业务时间、`$4` updated_at、`$5` 来源集合、`$6` 租户（release/cancel 无业务时间列，参数顺延为 `$3` updated_at、`$4` 来源集合、`$5` 租户）。
- 目标态：release → `Released`，start → `InProgress`，complete → `Completed`，cancel → `Cancelled`，均取 `ProductionOrderStatus::as_db_str()`。
- 来源集合：`release_from()` / `start_from()` / `complete_from()` / `cancel_from()`，与 `can_transition_to` 保持同源。
- 保留原租户显式谓词、`deleted_at IS NULL` 与并发冲突时的 404/“状态不允许”语义，未改动状态机与事务方式。

新增单测 `production_order_transition_targets_match_sources`：对四组（来源集合，目标态）逐项断言目标态在 `DB_VALUES` 内，且每个来源都能通过 `can_transition_to` 到达目标态，防止后续改集合时再次与绑定脱节。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib production_order` 22 passed（含新增用例）。
- SQL 冒烟（本地库事务内执行四条迁移语句后 `ROLLBACK`，未产生持久写入）：release / start / complete / cancel 各 `UPDATE 1`。按链路取同租户 `000…001` 的 pending → released → in_progress 行，证明占位符、类型与 `ANY(varchar[])` 谓词均可用。
- 状态与 SQL 门禁：`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`、`check-request-txn --changed-only`、`check-destructive-sql`、`check-directed-migrations --changed-only` 全部通过。

## 遗留

- 参数数量与绑定数量不一致属编译期不可见的缺陷，本轮只修了生产工单四个入口。对 `svc/**` 做启发式扫描（静态 SQL 块内 `$n` 上界 vs `.bind()` 计数）后，仍有若干候选点位需要逐个复核（如 SCM 看板、WMS 批次/序列号、CRM 等处的 `query_as` 运行期 SQL），将在后续批次用统一脚本按“执行期 SQL 参数完整性”口径排查，避免误报动态 SQL 与宏查询。

## 附带：状态盘点补录

执行 `dump-status-code-inventory.mjs` 时发现仓库内盘点已落后于代码：B324 的 `MenuStatus` 与 B325 的 `ErpLedgerStatus` 两个枚举此前合入时未重生成盘点，`--check` 因此报“代码侧状态盘点与仓库不一致”。本次重生成并一并提交，Rust 枚举 322 → 324，前端键与 DB CHECK 侧无变化；`--check --strict-palette` 恢复 PASS。
