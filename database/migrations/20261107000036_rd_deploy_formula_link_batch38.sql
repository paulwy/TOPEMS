-- ============================================================================
-- Migration: 20261107000036_rd_deploy_formula_link_batch38
--
-- Purpose:
--   batch 38 —— 修正 RD 域「配方发布」页的语义错配。该页面读 rd.deploys（部署
--   记录表），但表里没有配方关联列，无法回答"这次发布的是哪个配方的哪个版本"。
--   本迁移补上 formula_id 关联，使「评审通过 → 发布」这条链路在数据层可贯通。
--
--   同时为 rs.formulas.approval_status 补 CHECK 约束：批 38 把配方评审落到
--   该字段（pending / approved / rejected 三态），而该字段此前完全无约束，
--   上层代码误写任意字符串也不会报错，属"数据库该补充"项。
--
-- Idempotency:
--   每一步都用 IF NOT EXISTS / DO $$ ... IF NOT EXISTS ... END IF $$ 包裹，
--   在已处于目标状态的库上重复执行是 no-op。
--
-- Scope:
--   - rd.deploys 新增 formula_id（uuid，可空）+ 外键 -> rs.formulas(id) ON DELETE SET NULL
--   - rd.deploys 新增索引 idx_rd_deploys_formula
--   - rs.formulas 新增 CHECK 约束 ck_formulas_approval_status
--
-- Not in scope（明确不做，理由见 docs/audit/P3-29_rd三页语义错配修正_批38_执行记录）:
--   - 不回填历史 deploy 行的 formula_id：现存 166 行均为种子数据、app_name /
--     version / project_name 全为空，无法从记录本身推断出对应配方，硬填就是伪造
--     关联。留 NULL 并登记为待产品补录。
--   - 不动 rs.formulas.status 的约束：既有 create/update 路径可能写入任意 status
--     值（含历史中文值），此时加 CHECK 会直接破坏既有写入，须另行取证后再做。
-- ============================================================================

BEGIN;

-- 1) rd.deploys 补配方关联列
ALTER TABLE rd.deploys ADD COLUMN IF NOT EXISTS formula_id uuid;

-- 2) 外键：配方被删时置空，不连带删除部署历史
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

-- 4) rs.formulas.approval_status 三态约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_formulas_approval_status'
    ) THEN
        ALTER TABLE rs.formulas
            ADD CONSTRAINT ck_formulas_approval_status
            CHECK (
                approval_status IS NULL
                OR approval_status IN ('pending', 'approved', 'rejected')
            );
    END IF;
END $$;

-- 5) created_by 类型对齐（批 38 实跑发现）
--
-- rs.formulas / rs.formula_versions 的 created_by 是 uuid，但后端 Rust
-- 侧（svc/rd/src/models/formula.rs 的 Formula / FormulaVersion）把它声明为
-- String，create_formula 也直接 bind claims.sub（字符串）。
--
-- 后果：①创建配方时 uuid 列无法接受字符串，直接 500；②一旦表里有数据，
-- list_formulas 的 query_as 会把 uuid 列解码成 String 而报错。
-- 这也解释了为什么 rs.formulas 长期 0 行——创建路径从未跑通过。
--
-- 该列语义是"创建人标识"（用户名/账号 id），不是严格的 uuid 外键，故把列
-- 放宽为 text，与 Rust 侧一致。既有 0 行，转换无数据风险。
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formulas'
          AND column_name = 'created_by' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE rs.formulas
            ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'rs' AND table_name = 'formula_versions'
          AND column_name = 'created_by' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE rs.formula_versions
            ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
END $$;

COMMIT;
