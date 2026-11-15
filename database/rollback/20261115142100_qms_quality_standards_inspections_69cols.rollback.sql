-- 回滚：20261115142100_qms_quality_standards_inspections_69cols.sql
-- 空壳表整表对齐（3/6）· qms.quality_standards + qms.quality_inspections
--
-- 逆序执行：子表外键 → 子表索引 → 子表列 → 父表索引 → 父表列。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有列（id / deleted_at）、不动 PK、不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    insp_idx text[] := ARRAY[
        'idx_qms_quality_inspections_tenant_id','idx_quality_inspections_actual_date',
        'idx_quality_inspections_inspection_number','idx_quality_inspections_inspector',
        'idx_quality_inspections_object_id','idx_quality_inspections_organization_id',
        'idx_quality_inspections_planned_date','idx_quality_inspections_result',
        'idx_quality_inspections_standard_id','idx_quality_inspections_status',
        'idx_quality_inspections_type','quality_inspections_tenant_id_idx'
    ];
    std_idx text[] := ARRAY[
        'idx_qms_quality_standards_tenant_id','idx_quality_standards_category',
        'idx_quality_standards_code','idx_quality_standards_code_unique',
        'idx_quality_standards_effective_date','idx_quality_standards_name',
        'idx_quality_standards_next_review_date','idx_quality_standards_organization_id',
        'idx_quality_standards_standard_type','idx_quality_standards_status',
        'quality_standards_tenant_id_idx'
    ];
    insp_cols text[] := ARRAY[
        'organization_id','standard_id','inspection_number','title','description',
        'inspection_type','inspection_method','inspection_category','object_type',
        'object_id','object_name','object_batch','inspector','inspector_id',
        'department','location','planned_date','actual_date','start_time','end_time',
        'duration_minutes','status','result','score','pass_rate','total_items',
        'passed_items','failed_items','findings','conclusion','recommendations',
        'risk_level','next_inspection_date','follow_up_required','approved_by',
        'approved_at','attachments','notes','created_at','updated_at','created_by',
        'updated_by','tenant_id'
    ];
    std_cols text[] := ARRAY[
        'organization_id','code','name','description','category','version',
        'standard_type','authority','effective_date','expiry_date','requirements',
        'criteria','compliance_level','status','is_mandatory','review_frequency',
        'last_review_date','next_review_date','reviewer','notes','attachments',
        'created_at','updated_at','created_by','updated_by','tenant_id'
    ];
    i text;
    n bigint;
BEGIN
    IF to_regclass('qms.quality_standards') IS NULL OR to_regclass('qms.quality_inspections') IS NULL THEN
        RAISE NOTICE '回滚跳过：qms.quality_standards / qms.quality_inspections 不全存在';
        RETURN;
    END IF;

    -- 1. 子表外键
    ALTER TABLE qms.quality_inspections
        DROP CONSTRAINT IF EXISTS quality_inspections_standard_id_fkey;

    -- 2. 子表索引
    FOREACH i IN ARRAY insp_idx LOOP
        EXECUTE format('DROP INDEX IF EXISTS qms.%I', i);
    END LOOP;

    -- 3. 子表列（有数据保留）
    FOREACH i IN ARRAY insp_cols LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='qms' AND table_name='quality_inspections' AND column_name=i) THEN
            EXECUTE format('SELECT count(*) FROM qms.quality_inspections WHERE %I IS NOT NULL', i) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE qms.quality_inspections DROP COLUMN IF EXISTS %I', i);
            ELSE
                RAISE NOTICE '保留列 quality_inspections.%：存在 % 行非空值', i, n;
            END IF;
        END IF;
    END LOOP;

    -- 4. 父表索引
    FOREACH i IN ARRAY std_idx LOOP
        EXECUTE format('DROP INDEX IF EXISTS qms.%I', i);
    END LOOP;

    -- 5. 父表列（有数据保留）
    FOREACH i IN ARRAY std_cols LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='qms' AND table_name='quality_standards' AND column_name=i) THEN
            EXECUTE format('SELECT count(*) FROM qms.quality_standards WHERE %I IS NOT NULL', i) INTO n;
            IF n = 0 THEN
                EXECUTE format('ALTER TABLE qms.quality_standards DROP COLUMN IF EXISTS %I', i);
            ELSE
                RAISE NOTICE '保留列 quality_standards.%：存在 % 行非空值', i, n;
            END IF;
        END IF;
    END LOOP;
END $$;
