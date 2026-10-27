-- 20261027130000_fix_ehs_columns_and_mdm_v55_types.sql
-- 目的：
--   1) ehs 域 40+ 业务表缺 tenant_id（全量迁移补跑后仍缺，代码已引用 → 500）
--   2) ehs 业务列补齐（gender/program_no/program_id/check_no/hazard_no）
--   3) master_data mdm-v55 域表 id 为 text 而代码按 uuid 绑定 → 类型修正为 uuid；
--      时间列 text → timestamptz（usage/sla/billing 查询报 operator does not exist）
-- 安全性：ehs 表补列用 ADD COLUMN IF NOT EXISTS（幂等）；mdm 表经核实为空，USING 转换无数据风险。

-- 1) ehs 域缺 tenant_id 的表统一补齐（DO 块动态遍历，与 20261016000093 的 DO 块先例一致）
DO $$
DECLARE t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'ehs'
          AND table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'ehs'
                AND table_name = information_schema.tables.table_name
                AND column_name = 'tenant_id'
          )
    LOOP
        EXECUTE format('ALTER TABLE ehs.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    END LOOP;
END $$;

-- 2) ehs 业务列补齐
ALTER TABLE ehs.health_records
    ADD COLUMN IF NOT EXISTS gender VARCHAR(32),
    ADD COLUMN IF NOT EXISTS hazard_no VARCHAR(64);

ALTER TABLE ehs.qa_ehs_trainings
    ADD COLUMN IF NOT EXISTS program_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS program_id UUID;

ALTER TABLE ehs.qa_ehs_training_certificates
    ADD COLUMN IF NOT EXISTS program_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS program_id UUID;

ALTER TABLE ehs.qa_ehs_health_trainings
    ADD COLUMN IF NOT EXISTS program_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS program_id UUID;

ALTER TABLE ehs.training_programs
    ADD COLUMN IF NOT EXISTS program_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS program_id UUID;

ALTER TABLE ehs.training_records
    ADD COLUMN IF NOT EXISTS program_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS program_id UUID;

ALTER TABLE ehs.safety_checks
    ADD COLUMN IF NOT EXISTS check_no VARCHAR(64);

ALTER TABLE ehs.qa_ehs_inspection_plans
    ADD COLUMN IF NOT EXISTS check_no VARCHAR(64);

ALTER TABLE ehs.qa_ehs_inspection_records
    ADD COLUMN IF NOT EXISTS check_no VARCHAR(64);

ALTER TABLE ehs.qa_ehs_msds
    ADD COLUMN IF NOT EXISTS hazard_no VARCHAR(64);

ALTER TABLE ehs.qa_ehs_material_stocks
    ADD COLUMN IF NOT EXISTS hazard_no VARCHAR(64);

-- 3) master_data mdm-v55 域类型修正（表已核实为空）
ALTER TABLE master_data.mdm_api_products ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_rate_cards ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_sla_configs ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_sla_incidents ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_subscriptions ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_usage_records ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE master_data.mdm_billing_records ALTER COLUMN id TYPE UUID USING id::uuid;

ALTER TABLE master_data.mdm_usage_records ALTER COLUMN recorded_at DROP DEFAULT;
ALTER TABLE master_data.mdm_usage_records ALTER COLUMN recorded_at TYPE TIMESTAMPTZ USING recorded_at::timestamptz;
ALTER TABLE master_data.mdm_subscriptions ALTER COLUMN expires_at DROP DEFAULT;
ALTER TABLE master_data.mdm_subscriptions ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at::timestamptz;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN measured_at DROP DEFAULT;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN measured_at TYPE TIMESTAMPTZ USING measured_at::timestamptz;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN window_start DROP DEFAULT;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN window_start TYPE TIMESTAMPTZ USING window_start::timestamptz;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN window_end DROP DEFAULT;
ALTER TABLE master_data.mdm_sla_measurements ALTER COLUMN window_end TYPE TIMESTAMPTZ USING window_end::timestamptz;
