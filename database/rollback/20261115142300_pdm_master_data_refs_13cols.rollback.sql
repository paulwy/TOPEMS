-- 回滚：20261115142300_pdm_master_data_refs_13cols.sql
-- 空壳表整表对齐（5/6）· pdm.pdm_master_data_refs 补 13 列 + 唯一索引 + 状态 CHECK
--
-- 顺序：CHECK 约束 → 唯一索引 → 13 列。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有列（id / deleted_at）、不动 PK、不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    cols text[] := ARRAY[
        'master_data_id','tenant_id','domain','code','name','status','source_service',
        'local_entity_type','local_entity_id','payload_snapshot','last_synced_at',
        'created_at','updated_at'
    ];
    i text;
    n bigint;
BEGIN
    IF to_regclass('pdm.pdm_master_data_refs') IS NULL THEN
        RAISE NOTICE '回滚跳过：pdm.pdm_master_data_refs 不存在';
        RETURN;
    END IF;

    -- 1. CHECK 约束
    ALTER TABLE pdm.pdm_master_data_refs
        DROP CONSTRAINT IF EXISTS ck_pdm_master_data_refs_status_standard;

    -- 2. 唯一索引（回滚后 ON CONFLICT (master_data_id) 将重新 42P10，属预期）
    DROP INDEX IF EXISTS pdm.uq_pdm_master_data_refs_master_data_id;

    -- 3. 列（有数据保留）
    FOREACH i IN ARRAY cols LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='pdm' AND table_name='pdm_master_data_refs' AND column_name=i) THEN
            EXECUTE format('SELECT count(*) FROM pdm.pdm_master_data_refs WHERE %I IS NOT NULL', i) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE pdm.pdm_master_data_refs DROP COLUMN IF EXISTS %I', i);
            ELSE
                RAISE NOTICE '保留列 pdm_master_data_refs.%：存在 % 行非空值', i, n;
            END IF;
        END IF;
    END LOOP;
END $$;
