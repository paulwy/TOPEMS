-- 2026-10-28: mes.production_processes.organization_id 可空化（空库一致性，P3-50 余波）
-- 背景：v69_unify_organization_id Part C 在空库重放时会 DROP 有 tenant_id 表的 organization_id；
--       代码 create_process INSERT 此前写 organization_id 列 → 空库重建后创建接口必然 500。
-- 修复：① 代码 INSERT 不再写 organization_id（tenant_id 承担租户隔离，见 production_process.rs）；
--       ② 本迁移将存量库该列改为可空（INSERT 不写 → NULL，不再 NOT NULL 违规）；
--       空库重放时列不存在 → DO 块条件跳过（无操作），迁移幂等。
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mes' AND table_name = 'production_processes' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE mes.production_processes ALTER COLUMN organization_id DROP NOT NULL;
    END IF;
END $$;
