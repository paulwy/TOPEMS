-- ================================================================================
-- R-7b：erp.erp_master_data_refs 建表对齐——补齐 MDM 本地 ref 业务列
-- 来源：go-live 排期 R-7b 联动（erp MDM 本地 ref 同步此前静默失败 → 现转可见重试+DLQ）
--
-- 漂移定案（实测，非转述）：
--   * 20260725000000_business_base_tables.sql:3079 建表仅
--       CREATE TABLE erp.erp_master_data_refs (id UUID PRIMARY KEY DEFAULT gen_random_uuid())
--   * 20260923000003_erp_column_fixes.sql F 仅补 8 个生命周期归档列
--       (archive_reason/archived_at/archived_by/destroy_reason/destroy_scheduled_at/
--        destroy_scheduled_by/destroyed_at/destroyed_by)——这些列 erp 生命周期代码确实用到，保留。
--   * 结果：表缺 MDM upsert/读取所需的全部 13 个业务列。
--
-- 权威参照（以代码实际读写列 + crm 同型表为准）：
--   * upsert：svc/erp/src/event_handlers/mod.rs:1879
--       INSERT INTO erp_master_data_refs
--        (master_data_id, tenant_id, domain, code, name, status, source_service,
--         local_entity_type, payload_snapshot, last_synced_at, created_at, updated_at)
--       ... ON CONFLICT (master_data_id) DO UPDATE ...
--   * 读取：svc/erp/src/modules/master_data_lifecycle.rs
--       SELECT master_data_id, tenant_id, domain, code, name, status, source_service,
--              local_entity_type, local_entity_id, payload_snapshot, last_synced_at,
--              created_at, updated_at ...
--   * crm.crm_master_data_refs / scm.scm_master_data_refs（runtime ensure_master_data_refs_table
--     建表，已在产同步正常）列结构逐列对齐本迁移。
--
-- 关键决策：
--   1) 保留现存 id PK + 8 生命周期列（erp 生命周期 UPDATE 在用），仅补业务列，不重建表。
--   2) ON CONFLICT (master_data_id) 需要 master_data_id 唯一约束——新增 UNIQUE（不动 id PK）。
--   3) 不加 crm 的窄 status CHECK（仅 active/inactive/archived）：erp 生命周期代码写入
--      pending_destruction/destroyed/deleted，窄约束会拦截；runtime DDL 本就无 CHECK。
--   4) 运行时连接用户 topems 为 superuser，FORCE RLS 无 policy 亦被绕过，非阻断点，故不动 RLS。
--
-- 幂等：ADD COLUMN IF NOT EXISTS + 约束/索引存在性守卫，可安全重放；不改任何已应用迁移文件。
-- ================================================================================

-- 1) 补齐 13 个业务列（类型/可空/默认对齐 crm.crm_master_data_refs）
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS master_data_id    VARCHAR(128);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS tenant_id         UUID;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS domain            VARCHAR(32);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS code              VARCHAR(128);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS name              VARCHAR(256);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS status            VARCHAR(32) DEFAULT 'active';
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS source_service   VARCHAR(64);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS local_entity_type VARCHAR(64);
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS local_entity_id  UUID;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS payload_snapshot JSONB;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS last_synced_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- 2) NOT NULL 约束对齐 crm（upsert 恒提供这些列；表现为空，加约束安全）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_master_data_refs'
                 AND column_name='tenant_id' AND is_nullable='YES') THEN
        ALTER TABLE erp.erp_master_data_refs ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_master_data_refs'
                 AND column_name='domain' AND is_nullable='YES') THEN
        ALTER TABLE erp.erp_master_data_refs ALTER COLUMN domain SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_master_data_refs'
                 AND column_name='code' AND is_nullable='YES') THEN
        ALTER TABLE erp.erp_master_data_refs ALTER COLUMN code SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_master_data_refs'
                 AND column_name='source_service' AND is_nullable='YES') THEN
        ALTER TABLE erp.erp_master_data_refs ALTER COLUMN source_service SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_master_data_refs'
                 AND column_name='master_data_id' AND is_nullable='YES') THEN
        ALTER TABLE erp.erp_master_data_refs ALTER COLUMN master_data_id SET NOT NULL;
    END IF;
END $$;

-- 3) master_data_id 唯一约束（ON CONFLICT (master_data_id) 的目标；保留现存 id PK）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint c
                   JOIN pg_class t ON t.oid=c.conrelid
                   JOIN pg_namespace n ON n.oid=t.relnamespace
                   WHERE n.nspname='erp' AND t.relname='erp_master_data_refs'
                     AND c.contype='u' AND c.conname='erp_master_data_refs_master_data_id_key') THEN
        ALTER TABLE erp.erp_master_data_refs
            ADD CONSTRAINT erp_master_data_refs_master_data_id_key UNIQUE (master_data_id);
    END IF;
END $$;

-- 4) domain 索引（兑现 20260911000006_performance_index_optimization 对 domain 分组统计的预期；
--    该迁移当初因 domain 列缺失而空转）
CREATE INDEX IF NOT EXISTS erp_master_data_refs_domain_idx
    ON erp.erp_master_data_refs (domain);
