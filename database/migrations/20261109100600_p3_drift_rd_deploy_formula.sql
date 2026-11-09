-- P3 A 级止血 / 2026-11-09：rd.deploys.formula_id（仅 rd 域，不跨域）
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A5）：
--   迁移 20261107000036 从未进入生产账本（锚点跳跃），导致 GET /rd/deploys 500：
--   list_deploys 查询 d.formula_id / f.name，而 rd.deploys 没有该列。
--
-- 范围（严格 rd 域）：
--   - rd.deploys 补 formula_id（uuid，可空）+ 外键 + 索引。
--   - 原 20261107000036 里对 rs 域的 3 条语句（approval_status CHECK、
--     formulas.created_by、formula_versions.created_by）以及 version 类型对齐，
--     已按“迁移不跨域”收敛到 20261109100800_p3_drift_rs_formula_type_align.sql。
--
-- 执行前只读复核（2026-11-09）：rd.deploys 0 行、rs.formulas 0 行，加外键无扫描风险。
--
-- Idempotency：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS +
--   pg_constraint 存在性守卫；重复执行为 no-op。
--
-- ROLLBACK（仅当 rd.deploys 仍 0 行）：
--   ALTER TABLE rd.deploys DROP CONSTRAINT IF EXISTS deploys_formula_id_fkey;
--   DROP INDEX IF EXISTS rd.idx_rd_deploys_formula;
--   ALTER TABLE rd.deploys DROP COLUMN IF EXISTS formula_id;

BEGIN;

-- 1) rd.deploys 补配方关联列（可空）
ALTER TABLE rd.deploys ADD COLUMN IF NOT EXISTS formula_id uuid;

-- 2) 外键：配方删除时置空，不连带删除部署历史
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deploys_formula_id_fkey'
    ) THEN
        ALTER TABLE rd.deploys
            ADD CONSTRAINT deploys_formula_id_fkey
            FOREIGN KEY (formula_id) REFERENCES rs.formulas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3) 关联查询索引
CREATE INDEX IF NOT EXISTS idx_rd_deploys_formula ON rd.deploys (formula_id);

COMMIT;
