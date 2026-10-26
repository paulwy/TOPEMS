-- 2026-10-26 ehs DDL 双轨对齐迁移（上游建议 B 项）
-- 背景（根因）：database/init/10_ehs_schema.sql 是未被迁移链消费的静态快照——ehs 两表真实
--       建表/演进全部走 database/migrations/（runtime DDL + 迁移链），init 快照严重滞后：
--       ehs.training_records 缺 8 列（employee_id/employee_name/enrollment_date/completion_date/
--       score/certificate_no/certificate_expiry/remarks）、status DEFAULT 'active'（迁移链终态
--       'ongoing'）；ehs.health_records 缺 3 列（chronic_diseases/emergency_contact/
--       emergency_phone）、birth_date 类型 date（迁移链终态 timestamptz）。
--       后果：任何按 init 快照建库的环境会得到与迁移链终态不符的结构（"DDL 双轨"反复漂移的根源）。
-- 方案：本迁移把两表缺失列/类型/DEFAULT 以幂等方式补齐至迁移链终态（新库/旧库执行后终态一致）；
--       同步更新 database/init/10_ehs_schema.sql 为同终态（消除幽灵双轨）。对齐方向以 dev 库
--       实测终态为准（0/21 行数据，零迁移风险；health 空表、training employee_id/program_id 全 NULL）。
-- 幂等：ADD COLUMN IF NOT EXISTS + 类型/DEFAULT 条件守卫，可重复执行。

DO $$
BEGIN
    -- ============ ehs.training_records：补 init 缺失 8 列（终态类型） ============
    ALTER TABLE ehs.training_records
        ADD COLUMN IF NOT EXISTS employee_id varchar(128),
        ADD COLUMN IF NOT EXISTS employee_name varchar(128),
        ADD COLUMN IF NOT EXISTS enrollment_date timestamptz,
        ADD COLUMN IF NOT EXISTS completion_date timestamptz,
        ADD COLUMN IF NOT EXISTS score numeric,
        ADD COLUMN IF NOT EXISTS certificate_no varchar(64),
        ADD COLUMN IF NOT EXISTS certificate_expiry timestamptz,
        ADD COLUMN IF NOT EXISTS remarks text;

    -- program_id / employee_id / employee_name / enrollment_date 对齐前端契约可空（非 NOT NULL）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='ehs' AND table_name='training_records'
                 AND column_name='program_id' AND is_nullable='NO') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN program_id DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='ehs' AND table_name='training_records'
                 AND column_name='employee_id' AND is_nullable='NO') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN employee_id DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='ehs' AND table_name='training_records'
                 AND column_name='employee_name' AND is_nullable='NO') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN employee_name DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='ehs' AND table_name='training_records'
                 AND column_name='enrollment_date' AND is_nullable='NO') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN enrollment_date DROP NOT NULL;
    END IF;

    -- ============ ehs.health_records：补 init 缺失 3 列 + birth_date 类型对齐 ============
    ALTER TABLE ehs.health_records
        ADD COLUMN IF NOT EXISTS chronic_diseases jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS emergency_contact varchar(128),
        ADD COLUMN IF NOT EXISTS emergency_phone varchar(32);

    -- birth_date date → timestamptz（0 行空表，零转换风险；仅类型为 date 时执行）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='ehs' AND table_name='health_records'
                 AND column_name='birth_date' AND data_type='date') THEN
        ALTER TABLE ehs.health_records ALTER COLUMN birth_date TYPE timestamptz;
    END IF;
END $$;
