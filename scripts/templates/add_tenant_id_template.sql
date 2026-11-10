-- ============================================================
-- TOPEMS add_tenant_id 迁移模板（{{SERVICE}} 服务）
-- 生成器：scripts/gen-add-tenant-id.mjs
-- 规范：
--   1. 每表 4 段：ADD COLUMN → 回填 → SET NOT NULL → CREATE INDEX
--   2. 回填两策略：
--        · 无外键依赖：  gen_random_uuid()
--        · 有外键父表：   (SELECT p.tenant_id FROM {{PARENT}} p WHERE p.id = c.{{PARENT}}_id)
--   3. RLS 策略：per-table 独立 policy 名 "tenant_isolation_{{TABLE}}"
--        · ENABLE 与 FORCE 必须成对（缺 FORCE 时表 owner 全量绕过策略，等于没做隔离）
--        · USING = NULLIF(current_setting('app.tenant_id', true), '')::uuid（fail-closed）
--        · WITH CHECK（建议写：写入时强制写回当前租户）
--   4. 首尾 BEGIN; ... COMMIT; 封装事务
--   5. 命名：YYYYMMDDhhmmss_add_tenant_id.sql （FULL 规范建议加 topic：YYYYMMDDhhmmss_add_tenant_id_to_*_tables.sql）
-- ============================================================

BEGIN;

-- ============================================
-- {{N}}. {{TABLE_COMMENT}} ({{TABLE}})
-- ============================================
ALTER TABLE IF EXISTS {{TABLE}} ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE {{TABLE}} SET tenant_id = {{BACKFILL_SQL}} WHERE tenant_id IS NULL;
ALTER TABLE {{TABLE}} ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_{{TABLE}}_tenant_id ON {{TABLE}}(tenant_id);
ALTER TABLE {{TABLE}} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{TABLE}} FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_{{TABLE}} ON {{TABLE}};
CREATE POLICY tenant_isolation_{{TABLE}} ON {{TABLE}}
    FOR ALL TO PUBLIC
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

COMMIT;
