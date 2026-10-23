-- ============================================================================
-- 20261024000002_lab_samples_status_check_fsm.sql
--
-- 第三批 P2：public.qa_lab_samples.status CHECK 放宽对齐 lims 样品生命周期 FSM。
--
-- 背景：
--   现约束 ck_qa_lab_samples_status_standard（20261003000003_r3 放宽后）仅允许
--     active / inactive / archived / received / registered。
--   lims 样品生命周期 FSM（svc/lims/src/modules/sample.rs:685 LIFECYCLE_STAGES）为
--     received → registered → testing → completed → stored → retrieved → disposed → destroyed
--   （sample.rs:698 SAMPLE_STAGE_EDGES 逐阶前进校验），实际写入路径：
--     - sample_barcode.rs:661  UPDATE ... SET status='destroyed'
--     - report.rs:268          UPDATE ... SET status='completed'
--     - statistics.rs:63/71、dashboard.rs:61/69 按 'testing'/'completed' 统计
--   后段 6 状态不在 CHECK 枚举内，FSM 转移写入将被 DB 约束拦截。
--
-- 处置：DROP + ADD 扩枚举集（新枚举集 ⊃ 旧集，存量数据无冲突）。
-- 幂等：information_schema 列存在守卫；DROP IF EXISTS + ADD 前 pg_constraint 守卫。
-- 注：表在 public schema（lims.qa_lab_samples 已被 20261003000002 DROP 清理）。
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'qa_lab_samples' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.qa_lab_samples DROP CONSTRAINT IF EXISTS ck_qa_lab_samples_status_standard;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ck_qa_lab_samples_status_standard'
              AND conrelid = 'public.qa_lab_samples'::regclass
        ) THEN
            ALTER TABLE public.qa_lab_samples ADD CONSTRAINT ck_qa_lab_samples_status_standard
                CHECK (status IS NULL OR status IN (
                    'active', 'inactive', 'archived',
                    'received', 'registered',
                    'testing', 'completed', 'stored', 'retrieved', 'disposed', 'destroyed'
                ));
        END IF;
    ELSE
        RAISE NOTICE 'public.qa_lab_samples.status 列不存在，跳过';
    END IF;
END $$;
