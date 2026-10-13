-- ============================================================================
-- 20261013100000_runtime_contract_phase2_columns.sql
-- Phase2 运行时 SQL 契约收敛补列/补表（2026-10-13）
--
-- 背景: Phase2 修复 367 个 HARD（--all 门禁，29 crate 全绿后）过程中，为对齐
--   代码运行时查询与 live DB 契约，由并行分片在 live 直接执行了以下幂等 DDL。
--   本迁移将相同 DDL 固化进迁移链，保证「迁移台账 = 磁盘 = live」三方一致，
--   使 CI / 新环境具备同等 schema（否则门禁在其他环境将复现 42P01/42703）。
--
--   补列全部使用 TIMESTAMPTZ / UUID / JSONB，未引入任何 timestamp without time zone，
--   日期类型契约（naive=0 / timestamptz=4410 / date=283）不受破坏。
-- 幂等，可安全重放。
-- ============================================================================

-- ============ 1. wms.alerts：WMS 告警表（wms analytics 查询引用） ============
CREATE TABLE IF NOT EXISTS wms.alerts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid,
    severity   varchar(16),
    status     varchar(16),
    message    text,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz
);

-- ============ 2. rs.projects：配方项目实际结束日期（rd 查询引用） ============
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMPTZ;

-- ============ 3. portal.core_guide_lessons：新手引导课时归属 ============
ALTER TABLE portal.core_guide_lessons ADD COLUMN IF NOT EXISTS guide_id UUID;

-- ============ 4. integration.core_inter_module_sync：模块间同步负载 ============
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS data JSONB;

-- ============ 5. public.vehicles：车辆创建时间 ============
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
