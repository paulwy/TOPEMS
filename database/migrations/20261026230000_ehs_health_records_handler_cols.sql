-- 2026-10-26 ehs.health_records 补齐 handler/前端契约所需列（修复契约 smoke 唯一失败项）
-- 背景：GET /api/ehs/health 返回 500 handler_error。
--   svc/ehs/src/modules/health.rs 的列表查询 SELECT
--       record_no, employee_name, employee_id, department, check_type, check_date,
--       result, status, remarks, created_at, updated_at, tenant_id
--   而迁移链终态（20261026120000 对齐后的 ehs.health_records）只有 16 列：
--       id, deleted_at, record_no, department, position, workplace, hazard_factors,
--       allergy_history, contact_info, check_type, check_date, result, remarks,
--       chronic_diseases, emergency_contact, emergency_phone
--   上述 6 列（employee_name/employee_id/status/created_at/updated_at/tenant_id）两处都不存在。
--   实测（2026-10-26 xingzhai 生产库 topems_prod，迁移 483/483 后）：
--       ERROR: column "employee_name" does not exist
--       契约 smoke 4104/4105 PASS，唯一 FAIL = GET /api/ehs/health body=500
-- 说明：20261026120000 的对齐方向是「以 dev 库实测终态为准」，只补了 init 快照缺的 3 列；
--       真正的错配是「Rust handler + 前端契约 ↔ 数据库 schema」，因此在本迁移中补列。
-- 版本号取 20261026990000（高于现有全部迁移，且刻意留出 131000+ 区间给上游正式编号，
--       避免与上游后续补丁同版本冲突）。
-- 幂等：ADD COLUMN IF NOT EXISTS，可重复执行；health_records 为空表，零数据风险。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'ehs' AND table_name = 'health_records') THEN
        ALTER TABLE ehs.health_records
            ADD COLUMN IF NOT EXISTS employee_id character varying(128),
            ADD COLUMN IF NOT EXISTS employee_name character varying(128),
            ADD COLUMN IF NOT EXISTS status character varying(32) DEFAULT 'active'::character varying,
            ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL,
            ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL,
            ADD COLUMN IF NOT EXISTS tenant_id uuid;
    END IF;
END $$;
