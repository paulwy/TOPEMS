-- 2026-10-26 training records 表重设计加固（用户拍板，待拍板项1 的增量设计层）
-- 背景：ehs.training_records / hrm.training_records 列均已在前期批次对齐前端契约
--       （ehs 20261017000004 补 13 列；hrm 自 20260725 起 29 列）。本迁移做设计级加固：
--       约束/外键/索引补强，不新增列、不改既有列类型，零数据迁移风险（两表均 0 行实测）。
-- 发现的问题：
--   A. ehs.training_records：无 record_no 唯一约束、无 status CHECK（前端契约
--      status: 'ongoing'|'completed'|'failed'）、无数值范围 CHECK；title 契约必填却可空。
--   B. hrm.training_records：status DEFAULT 'planned' 与既有 CHECK('active','inactive',
--      'archived') 冲突——不显式传 status 的 INSERT 必违反 CHECK（表 0 行未暴露，
--      潜在炸弹）；course_id/employee_id 无外键、无查询索引（enroll 高频 WHERE 列）。
-- 幂等：全部 DO $$ 条件守卫（约束存在则跳过），可重复执行；对空表无数据影响。

DO $$
BEGIN
    -- ============ A. ehs.training_records ============
    -- A1. record_no 业务单号唯一（空表 0 行，直接建）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'ehs' AND t.relname = 'training_records'
                     AND c.conname = 'uq_training_records_record_no') THEN
        ALTER TABLE ehs.training_records
            ADD CONSTRAINT uq_training_records_record_no UNIQUE (record_no);
    END IF;

    -- A2. status 对齐前端契约三态（ongoing/completed/failed）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'ehs' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_status') THEN
        ALTER TABLE ehs.training_records
            ADD CONSTRAINT ck_training_records_status
            CHECK (status IN ('ongoing', 'completed', 'failed'));
    END IF;

    -- A3. 数值范围（duration_hours 非负、pass_rate 0-100）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'ehs' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_duration_hours') THEN
        ALTER TABLE ehs.training_records
            ADD CONSTRAINT ck_training_records_duration_hours CHECK (duration_hours IS NULL OR duration_hours >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'ehs' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_pass_rate') THEN
        ALTER TABLE ehs.training_records
            ADD CONSTRAINT ck_training_records_pass_rate CHECK (pass_rate IS NULL OR (pass_rate >= 0 AND pass_rate <= 100));
    END IF;

    -- A4. title 契约必填（表 0 行，直接收紧）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'ehs' AND table_name = 'training_records'
                 AND column_name = 'title' AND is_nullable = 'YES') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN title SET NOT NULL;
    END IF;

    -- ============ B. hrm.training_records ============
    -- B1. 修 status DEFAULT 'planned' ↔ CHECK 冲突：重建 CHECK 覆盖计划态全家桶
    IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
               JOIN pg_namespace n ON n.oid = t.relnamespace
               WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                 AND c.conname = 'ck_training_records_status_standard') THEN
        ALTER TABLE hrm.training_records
            DROP CONSTRAINT ck_training_records_status_standard;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_status') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT ck_training_records_status
            CHECK (status IN ('planned', 'active', 'inactive', 'archived', 'completed', 'cancelled'));
    END IF;

    -- B2. course_id → hrm.training_courses 外键（ON DELETE SET NULL）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'fk_training_records_course') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT fk_training_records_course
            FOREIGN KEY (course_id) REFERENCES hrm.training_courses(id) ON DELETE SET NULL;
    END IF;

    -- B3. employee_id → hrm.employees 外键（ON DELETE SET NULL）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'fk_training_records_employee') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT fk_training_records_employee
            FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE SET NULL;
    END IF;

    -- B4. 数值范围（cost 非负、score 0-100、duration_hours 非负）
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_cost') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT ck_training_records_cost CHECK (cost IS NULL OR cost >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_score') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT ck_training_records_score CHECK (score IS NULL OR (score >= 0 AND score <= 100));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                   JOIN pg_namespace n ON n.oid = t.relnamespace
                   WHERE n.nspname = 'hrm' AND t.relname = 'training_records'
                     AND c.conname = 'ck_training_records_duration_hours') THEN
        ALTER TABLE hrm.training_records
            ADD CONSTRAINT ck_training_records_duration_hours CHECK (duration_hours IS NULL OR duration_hours >= 0);
    END IF;
END $$;

-- B5. course_id / employee_id 查询索引（enroll 高频 WHERE 列）
CREATE INDEX IF NOT EXISTS idx_training_records_course_id ON hrm.training_records (course_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee_id ON hrm.training_records (employee_id);
