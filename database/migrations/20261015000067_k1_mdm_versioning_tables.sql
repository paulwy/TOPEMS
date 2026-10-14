-- 2026-10-15 K1 续：versioning_v54 剩余实体接真表（分支/审计/权限/角色）。
--
-- 背景：迁移 20261014000060 只为核心 3 模块挑了 4 张核心表，v54 的
--       version_branches / audit_events / audit_export_logs / permission_roles /
--       data_permissions / user_role_assignments 仍走内存 Store + persist 快照。
--       本迁移补齐 6 表，回填自 master_data.mdm_collections（module='versioning_v54'）。
-- 风格对齐：master_data schema；tenant_id + RLS FORCE + nil/空/全零豁免；
--           IF NOT EXISTS / DROP POLICY IF EXISTS 幂等；回填 ON CONFLICT DO NOTHING。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- versioning_v54：版本分支 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_version_branches (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    branch_type   TEXT NOT NULL DEFAULT 'feature',
    parent_branch TEXT,
    created_at    TEXT NOT NULL DEFAULT '',
    created_by    TEXT NOT NULL DEFAULT '',
    merged_at     TEXT,
    merged_by     TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_vbranch_name_idx
    ON master_data.mdm_version_branches (name);

-- ---------- versioning_v54：审计事件 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_audit_events (
    id          TEXT PRIMARY KEY,
    event_type  TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT '',
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id   TEXT NOT NULL DEFAULT '',
    user_id     TEXT NOT NULL DEFAULT '',
    old_value   JSONB,
    new_value   JSONB,
    ip_address  TEXT NOT NULL DEFAULT '',
    timestamp   TEXT NOT NULL DEFAULT '',
    session_id  TEXT NOT NULL DEFAULT '',
    tenant_id   UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_audit_entity_idx
    ON master_data.mdm_audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS mdm_audit_user_idx
    ON master_data.mdm_audit_events (user_id);

-- ---------- versioning_v54：审计导出日志 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_audit_export_logs (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL DEFAULT '',
    export_type  TEXT NOT NULL DEFAULT 'json',
    record_count BIGINT NOT NULL DEFAULT 0,
    exported_at  TEXT NOT NULL DEFAULT '',
    ip_address   TEXT NOT NULL DEFAULT '',
    tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- ---------- versioning_v54：权限角色 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_permission_roles (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    inherited_from TEXT,
    created_at     TEXT NOT NULL DEFAULT '',
    tenant_id      UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_permission_roles_name_idx
    ON master_data.mdm_permission_roles (name);

-- ---------- versioning_v54：数据权限 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_data_permissions (
    id            TEXT PRIMARY KEY,
    role_id       TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT '',
    resource_id   TEXT NOT NULL DEFAULT '',
    action        TEXT NOT NULL DEFAULT 'read',
    condition     JSONB,
    inherited     BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_data_permissions_role_idx
    ON master_data.mdm_data_permissions (role_id);

-- ---------- versioning_v54：用户-角色分配 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_user_role_assignments (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    role_id     TEXT NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT '',
    tenant_id   UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_user_role_user_idx
    ON master_data.mdm_user_role_assignments (user_id);

-- ---------- RLS ----------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'mdm_version_branches',
        'mdm_audit_events',
        'mdm_audit_export_logs',
        'mdm_permission_roles',
        'mdm_data_permissions',
        'mdm_user_role_assignments'
    ]
    LOOP
        EXECUTE format('ALTER TABLE master_data.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE master_data.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON master_data.%I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON master_data.%I
             USING (tenant_id IS NULL OR tenant_id::text = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))
             WITH CHECK (tenant_id IS NULL OR tenant_id::text = '''' OR tenant_id = ''00000000-0000-0000-0000-000000000001''::uuid
                    OR tenant_id::text = current_setting(''app.tenant_id'', true))',
            t);
    END LOOP;
END $$;

-- ---------- 回填（mdm_collections JSONB 快照） ----------
INSERT INTO master_data.mdm_version_branches (id, name, branch_type, parent_branch, created_at, created_by, merged_at, merged_by, status)
SELECT elem->>'id', elem->>'name', COALESCE(elem->>'branch_type', 'feature'),
       elem->>'parent_branch', COALESCE(elem->>'created_at', ''), COALESCE(elem->>'created_by', ''),
       elem->>'merged_at', elem->>'merged_by', COALESCE(elem->>'status', 'active')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'version_branches'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_audit_events (id, event_type, category, entity_type, entity_id, user_id, old_value, new_value, ip_address, timestamp, session_id)
SELECT elem->>'id', COALESCE(elem->>'event_type', ''), COALESCE(elem->>'category', ''),
       COALESCE(elem->>'entity_type', ''), COALESCE(elem->>'entity_id', ''), COALESCE(elem->>'user_id', ''),
       elem->'old_value', elem->'new_value',
       COALESCE(elem->>'ip_address', ''), COALESCE(elem->>'timestamp', ''), COALESCE(elem->>'session_id', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'audit_events'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_audit_export_logs (id, user_id, export_type, record_count, exported_at, ip_address)
SELECT elem->>'id', COALESCE(elem->>'user_id', ''), COALESCE(elem->>'export_type', 'json'),
       COALESCE((elem->>'record_count')::bigint, 0), COALESCE(elem->>'exported_at', ''), COALESCE(elem->>'ip_address', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'audit_export_logs'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_permission_roles (id, name, description, inherited_from, created_at)
SELECT elem->>'id', COALESCE(elem->>'name', ''), COALESCE(elem->>'description', ''),
       elem->>'inherited_from', COALESCE(elem->>'created_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'permission_roles'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_data_permissions (id, role_id, resource_type, resource_id, action, condition, inherited)
SELECT elem->>'id', COALESCE(elem->>'role_id', ''), COALESCE(elem->>'resource_type', ''),
       COALESCE(elem->>'resource_id', ''), COALESCE(elem->>'action', 'read'),
       elem->'condition', COALESCE((elem->>'inherited')::boolean, FALSE)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'data_permissions'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_user_role_assignments (id, user_id, role_id, assigned_at)
SELECT elem->>'id', COALESCE(elem->>'user_id', ''), COALESCE(elem->>'role_id', ''),
       COALESCE(elem->>'assigned_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS elem
WHERE c.module = 'versioning_v54' AND c.entity = 'user_role_assignments'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;
