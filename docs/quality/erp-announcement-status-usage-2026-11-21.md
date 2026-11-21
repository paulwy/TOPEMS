# B62 · erp.announcements 状态用法收敛（2026-11-21）

## 现状（改动前）
- `erp.announcements.status`：本地 4 行全 `published`；列非空，无 CHECK。
- 枚举 `AnnouncementStatus`（draft/published/expired/archived）与候选 DDL 已在 B29 落地，更新接口也已严格解析。
- 但创建仍写死 `'draft'` 字面量；列表 `?status=` 仍自由文本，非法值静默返回空列表；列表 SELECT 缺少 `deleted_at IS NULL`，与 COUNT 口径不一致。

## 改动
1. `announcement.rs` 创建 SQL 的状态由 `'draft'` 字面量改绑 `AnnouncementStatus::DEFAULT`（新增 `$12`，locale 顺延 `$13`）。
2. 列表状态筛选严格解析，未知值 400。
3. 列表 SELECT 补 `deleted_at IS NULL`，与 COUNT 对齐。
4. 候选 DDL 沿用 `docs/database/erp-content-status-check-candidates-2026-11-21.sql`（B29），不新增。

## 验证
- `cargo check -p topems-erp`、`cargo clippy -p topems-erp --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK，残留 0）：四值各插入 1 行；published→expired `UPDATE 1`；`bogus` 插入 → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 没有发布/过期/归档动作端点，编辑接口允许四态任意互转，到期不会自动转 expired。
- 创建固定 draft，但前端可能期望创建即发布；需要产品确认发布动作。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
