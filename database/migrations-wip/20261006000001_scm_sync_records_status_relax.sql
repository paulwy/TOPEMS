-- ================================================================================
-- scm.sync_records：放宽 ck_sync_records_status_standard 窄约束
-- 来源：web 前端契约收口 BFF 探测 /api/scm/sync/wms/:x、/api/scm/sync/srm/:x 返回 500。
--
-- 根因：
--   P3-2（20260809000002）给带 status 列的表统一加了窄约束
--   ck_*_status_standard（仅允许 active/inactive/archived）。
--   scm.sync_records 的同步生命周期实际写入：pending（默认）、running（创建中）、
--   completed（trigger_sync 直接落库 / 后台完成 / retry 标记）。
--   trigger_sync INSERT status='completed' 触发
--   "violates check constraint ck_sync_records_status_standard" → 500。
--
-- 本迁移：DROP 窄约束 + ADD 放宽约束（保留通用三态，追加同步业务状态）。
-- 幂等：IF EXISTS 守卫；表不存在则跳过。不吞错。
-- ================================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='scm' AND table_name='sync_records') THEN
        ALTER TABLE scm.sync_records DROP CONSTRAINT IF EXISTS ck_sync_records_status_standard;
        ALTER TABLE scm.sync_records ADD CONSTRAINT ck_sync_records_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'pending','running','completed','failed'
            ));
    END IF;
END $$;
