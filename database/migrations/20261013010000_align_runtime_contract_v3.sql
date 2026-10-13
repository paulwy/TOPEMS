-- ============================================================================
-- 20261013010000_align_runtime_contract_v3.sql
-- 运行时契约对齐 v3（2026-10-13 日志旁路错误清理）
--
-- 背景: smoke 全绿后清理旁路日志错误，均为 live DB 与 handler/服务契约的列缺失：
--   - rs.audit_logs：SchemaAwareAuditLogService INSERT 引用 entity_ids（共享 15-col 标准），
--     stub 建表漏列 → topems_rd 审计写入持续失败。
--   - mes.capacities：analytics 产能利用率查询引用 shift（COALESCE 白班），表缺列。
--   - mes.equipment_maintenance_records：analytics MTBF/MTTR 查询引用 started_at，表缺列。
--
-- 幂等，可安全重放。
-- ============================================================================

-- ============ 1. rs.audit_logs：补齐共享审计标准列 ============
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS entity_ids JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS resource VARCHAR(100);
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(100);
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS request_details JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS response_details JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'success';
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ============ 2. mes.capacities：产能排班班次列 ============
ALTER TABLE mes.capacities ADD COLUMN IF NOT EXISTS shift VARCHAR(32);

-- ============ 3. mes.equipment_maintenance_records：维护起始时间 ============
ALTER TABLE mes.equipment_maintenance_records ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- ============ 4. rs.formulas：补 nil 租户豁免策略（对齐 change_requests/formula_versions 双策略模式） ============
-- 背景: rd 配方创建写 rs.formulas，superuser 会话 app.tenant_id='' 时仅 tenant_isolation_formulas
--      只放行 NULL 租户行，INSERT nil 租户(00000000-...-0001) 违反 RLS → 500。补豁免策略。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'rs' AND tablename = 'formulas' AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON rs.formulas
            FOR ALL
            USING (
                (current_setting('app.tenant_id'::text, true) IS NULL)
                OR (current_setting('app.tenant_id'::text, true) = ''::text)
                OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
                OR (tenant_id IS NULL)
                OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
            )$policy$;
    END IF;
END $$;

-- ============ 5. rs.formulas：删除 stub 状态白名单 CHECK（误伤业务枚举 草稿/draft） ============
-- 背景: 创建配方默认 status='草稿'，stub 约束仅放行 active/inactive/archived → 500。
--      与 v2 对 audit_logs CHECK 的处理一致：业务枚举不由 stub 白名单约束。
ALTER TABLE rs.formulas DROP CONSTRAINT IF EXISTS ck_formulas_status_standard;
