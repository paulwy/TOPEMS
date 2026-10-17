-- 2026-10-17 ehs environmental_compliance 域：regulations 接真表补列
-- 背景：svc/ehs/src/modules/environmental_compliance.rs regulations 5 handler
--       （apps/web/src/api/ehs/compliance.ts 前端 CompliancePage 真实调用 listEnvironmentalRegulations/
--        createEnvironmentalRegulation/updateEnvironmentalRegulation/deleteEnvironmentalRegulation，
--        前端契约 apps/web/src/api/ehs/types/environment.ts:109 EnvironmentalRegulation）此前返回空数组桩，
--       即"前端真实在调、后端假数据"的契约撒谎面。
-- 现状：ehs.qa_ehs_environmental_regulations 19 列已就绪（含 RLS 策略
--       qa_ehs_environmental_regulations_tenant_policy ALL、deleted_at 软删、tenant_id），
--       与前端契约差异：缺 keywords/applicable_scopes/created_by 3 列；表当前 0 行（空表，零风险）。
--       列别名映射（handler 层做）：regulation_no←reg_no、issue_date←issued_date、attachments←related_files。
-- 方案（后端宽容、零回归）：仅补缺列，既有列/RLS 不动。幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.qa_ehs_environmental_regulations
    ADD COLUMN IF NOT EXISTS keywords jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS applicable_scopes jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS created_by varchar(128);
