# B29 · erp 公告/资产状态单一源（2026-11-21）

## 问题
两张表的状态都是「创建时写死字面量、编辑时原样透传请求串」：

- `erp.announcements.status`：create 的 SQL 写死 `'draft'`；update 取 `req.status.unwrap_or(existing.status)` 后直接 `.bind(&status)`，前端传 `publish`、`bogus` 都能落库并返回成功。前端类型已声明 `draft|published|expired|archived`，后端无对应约束。
- `erp.assets.status`：create 写死 `'in_use'`；update 同样原样透传。前端类型是 `in_stock|in_use|maintenance|scrapped|transferred`，但本地存量有 1 行 `status='active'`（旧默认残留），两端不一致。

## 改动
1. 新增 `svc/erp/src/modules/content_status.rs`：
   - `AnnouncementStatus { Draft, Published, Expired, Archived }`，`DB_VALUES`、`DEFAULT = Draft`、`from_db_str`、`as_db_str`；
   - `AssetStatus { InStock, InUse, Maintenance, Scrapped, Transferred }`，`DB_VALUES`、`DEFAULT = InUse`、`from_db_str`、`as_db_str`；
   - 2 个单测：往返 + 默认值与 SQL 字面量一致（`draft`/`in_use`），并显式断言 `active` 被拒绝。
2. `announcement.rs` / `asset.rs` 的 update：`req.status` 改为严格解析，未知值 400（`invalid announcement|asset status ... allowed: ...`），合法值统一写成 `as_db_str()`；未传则沿用现值。
3. 前端色板补 `in_stock: 'info'`、`transferred: 'default'`（`in_use/maintenance/scrapped` 已有），色板缺口回到 0。
4. 候选 DDL：`docs/database/erp-content-status-check-candidates-2026-11-21.sql`（两条 `NOT VALID` + 预检 + 存量修订脚本 + 回滚）。

## 验证
- `cargo test -p topems-erp --lib content_status`：2 passed；`cargo clippy -p topems-erp --all-targets -- -D warnings` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务，Db::new 未增加。
- 本地事务演练（4 组均 ROLLBACK，残留 0）：
  - `announcements UPDATE published→bogus` → 23514；
  - `announcements UPDATE published→expired` → `UPDATE 1`；
  - `assets INSERT status='in_stock'` → 成功；
  - `assets UPDATE` 存量 `active` 行 → 23514（VALIDATE 前需 `UPDATE ... SET status='in_use' WHERE status='active'`）。
- 盘点：Rust 枚举 137→139、值 147→151、不在 DB CHECK 113、色板缺口 0；前端键 165→167；队列 101 枚举 / 113 值；映射 67→69。
- `vitest src/utils/__tests__/status.test.ts`：8 passed。

## 残留
- 两条候选 CHECK 未进 `database/migrations/`，生产窗口 + 先修 `assets.active` + `VALIDATE`。
- 创建接口仍写死 `draft`/`in_use` 字面量（与枚举 `DEFAULT` 有单测钉住），后续可改成绑定参数；前端创建时不传 status，无假成功面。
- `erp.receivables`（5 行 pending）、`erp.audit_logs`（4462 行 success/error）仍无枚举，是 erp 队列剩余两项。
