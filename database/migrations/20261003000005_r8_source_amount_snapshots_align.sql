-- R-8（U6 迁移 schema 漂移修复）：source_amount_snapshots 表归属对齐
--
-- 【漂移定案（2026-10-03 5432 实测 + 全仓 grep）】
--   1) 代码侧运行时字面命中 `finance.source_amount_snapshots`：
--      - svc/finance/src/event_handlers/mod.rs:521  INSERT INTO finance.source_amount_snapshots
--      - svc/finance/src/modules/voucher_template.rs:515 SELECT ... FROM finance.source_amount_snapshots
--      - `only_own_schema_query!`（lib/shared-boundary/src/lib.rs:328-329）展开为原始 SQL 字面量，
--        不做 schema 重写；SQL 已带 `finance.` 全限定前缀，无 search_path 解析歧义。
--   2) 5432 实测两张同名表：
--      - `finance.source_amount_snapshots`：business_base_tables.sql:3126 建的骨架空壳
--        （仅 id PK + deleted_at，0 行，RLS 启用但零策略），代码 INSERT/SELECT 因缺业务列
--        必然失败 → 走 graceful 兜底（event_handlers warn / voucher_template 默认 1000.00）。
--      - `plugin_finance.source_amount_snapshots`：v254（20260824000000）建的"权威"表，
--        含 source_type/source_id/payable_amount(DOUBLE PRECISION)/created_at/updated_at，
--        RLS 关闭，0 行。全仓 grep：除其自身 v254 建表迁移外，仅 scripts/db/rls-app-grants.sql:12
--        一处 GRANT 引用，无任何 Rust 代码读写 → 属历史遗留，本迁移不删（保留既有 GRANT 引用）。
--   3) U6（20261003000000）失败根因：它对 `finance.source_amount_snapshots` 做
--      ALTER COLUMN payable_amount，但 finance 空壳根本没有该列 → column does not exist。
--      本迁移在正确位置（finance schema）补齐业务列并把金额列对齐 NUMERIC(18,4)，
--      达成 U6 原本意图，使代码路径真实生效、消除 graceful 兜底。
--
-- 【幂等】全部 IF NOT EXISTS 守卫，空库重建 / 重放可重复执行。
-- 【不改已应用迁移】U6（20261003000000）及历史迁移文件保持原样（防 checksum 漂移）。

-- 1) 补齐业务列（finance 空壳当前仅 id + deleted_at）。列类型对齐代码 INSERT/SELECT 契约：
--    (source_type, source_id, payable_amount, updated_at, tenant_id)。
ALTER TABLE IF EXISTS finance.source_amount_snapshots
    ADD COLUMN IF NOT EXISTS source_type    VARCHAR(50)           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS source_id      UUID                  NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS payable_amount NUMERIC(18,4)         NOT NULL DEFAULT 0,   -- U6 意图：float8→NUMERIC(18,4)
    ADD COLUMN IF NOT EXISTS tenant_id      UUID,
    ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ            NOT NULL DEFAULT NOW();

-- 2) 代码 INSERT 带 ON CONFLICT (source_type, source_id) DO UPDATE，需要唯一索引支撑。
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_source_amount_snapshots_type_id
    ON finance.source_amount_snapshots (source_type, source_id);

-- 3) SELECT 以 source_type 过滤，补普通索引（对齐 v254）。
CREATE INDEX IF NOT EXISTS idx_finance_source_amount_snapshots_source_type
    ON finance.source_amount_snapshots (source_type);

-- 注：plugin_finance.source_amount_snapshots 为 v254 历史遗留表（无 Rust 引用，仅 GRANT 引用），
--     按 R-8 约束不删除、不改动；业务事实落点已由本表（finance schema）承接。
