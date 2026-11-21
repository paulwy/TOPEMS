# B63 · erp.assets 状态归一与用法收敛（2026-11-21）

## 现状（改动前）
- `erp.assets.status`：本地 1 行 `active`，属于 `AssetStatus` 集合外；B29 候选已标注需在窗口内归一为 `in_use`。
- 创建仍写死 `'in_use'` 字面量；列表 `?status=` 自由文本，非法值静默返回空列表；列表 SELECT 缺少 `deleted_at IS NULL`，与 COUNT 口径不一致。
- 存量 `active` 行会原样返回给前端，前端联合类型没有该值，状态展示与筛选对不上。

## 改动
1. `content_status.rs`：`AssetStatus::from_db_str` 把历史 `active` 兼容解析为 `in_use`，其余未知值仍返回 `None`。
2. `asset.rs` 创建 SQL 状态由 `'in_use'` 字面量改绑 `AssetStatus::DEFAULT`（新增 `$22`）。
3. 列表状态筛选严格解析，未知值 400；列表 SELECT 补 `deleted_at IS NULL`。
4. 列表、详情、创建/更新 RETURNING 的状态列统一 `CASE WHEN status='active' THEN 'in_use'`，API 不再透出集合外旧值。
5. 候选 DDL 沿用 `docs/database/erp-content-status-check-candidates-2026-11-21.sql`（B29），窗口内先 `UPDATE ... active → in_use` 再 `VALIDATE`。

## 验证
- `cargo check -p topems-erp`、`cargo clippy -p topems-erp --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK，残留 0）：存量 active→in_use `UPDATE 1`；in_use→in_stock→maintenance→scrapped→transferred 各 `UPDATE 1`；`bogus` 插入 → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 生产若存在 `active` 存量，必须先执行候选中的归一 UPDATE，否则 `VALIDATE CONSTRAINT` 会失败；任何对旧行的更新在约束下也会 23514。
- 资产没有独立的状态动作端点，编辑接口允许五态任意互转。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
