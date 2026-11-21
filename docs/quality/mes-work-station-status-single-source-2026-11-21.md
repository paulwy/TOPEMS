# B36 · mes.work_stations 状态单一源（2026-11-21）

## 现状（改动前）
`mes.work_stations` 本地 79 行：`active` 69 / `available` 10；生产快照 0 行。

- 创建：`work_station.rs` 写 `'active'` 字面量；
- 编辑：`status = COALESCE($5, status)` 直接绑 `req.status`，任意字符串可落库；
- 激活：`SET status = 'active'`，无起始谓词；停用：`SET status = 'inactive' WHERE status = 'active'`；
- **DB 列默认值是 `'available'`，与代码创建的 `'active'` 不一致**；`available` 存量 10 行没有当前写入路径；
- DB 无 CHECK 约束。

## 改动
1. 新增 `svc/mes/src/modules/work_station_status.rs`：`WorkStationStatus { Available, Active, Inactive }`、`DEFAULT=Active`、严格解析、`deactivate_from`；1 个单测（含 `maintenance` 拒绝）。
2. `work_station.rs`：创建改绑 `DEFAULT`；编辑先严格解析（未知值 `400`）再绑枚举；激活绑 `Active`；停用绑 `Inactive` + `status = ANY($n)` 起始谓词。
3. 前端色板补 `available: 'success'`。
4. 候选 DDL `docs/database/mes-work-station-status-check-candidates-2026-11-21.sql`：`NOT VALID` CHECK + **`ALTER COLUMN status SET DEFAULT 'active'`**（对齐代码默认），并附 `available` 清理候选（需业务确认）。

## 验证
- `cargo test -p topems-mes --lib work_station`：7 passed（含枚举单测）；`cargo check/clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 本地演练（事务内 ROLLBACK，残留 0）：`active→inactive`（谓词 active）`UPDATE 1`；`inactive→active` `UPDATE 1`；`active→'bogus'` → 23514。
- 盘点：枚举 144→145、值 156、不在 DB CHECK 117、色板缺口 0；前端键 170→171；队列 105→106；映射 79→80。

## 残留
- `available` 与 `active` 语义是否等价未确认（10 行存量）；清理 SQL 只作候选。
- 激活接口没有起始谓词（`available/active/inactive` 都能被激活成 active），只做了目标态绑定。
- 软删没有状态守卫，任意状态工位都可删，本批未改。
- 候选 CHECK 与默认值变更未进 `database/migrations/`，生产窗口执行。
- 列表 `status` 过滤未严格校验。
