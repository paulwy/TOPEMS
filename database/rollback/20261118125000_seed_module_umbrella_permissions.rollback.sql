-- 回滚：20261118125000_seed_module_umbrella_permissions.sql
--
-- 只删除本迁移“实际插入”的行，不碰既有数据：
--   以 _sqlx_migrations.installed_on 为锚，created_at 落在锚点前后 5 分钟窗口内的
--   69 条伞码视为本迁移插入；生产在 2026-10-26 已存在的同码行 created_at 远早于锚点，
--   不会被命中（克隆库/生产回滚删除 0 行）。
-- 最后删除本迁移在 _sqlx_migrations 的登记行，便于重新执行迁移。
-- 幂等：重复执行第二次删除 0 行。

BEGIN;

DO $$
DECLARE
    anchor timestamptz;
BEGIN
    SELECT installed_on INTO anchor
    FROM public._sqlx_migrations
    WHERE version = 20261118125000;

    IF anchor IS NULL THEN
        RAISE EXCEPTION '回滚拒绝：_sqlx_migrations 无 20261118125000 记录，无法判定行归属';
    END IF;
END $$;

CREATE TEMP TABLE _seed_125000 ON COMMIT DROP AS
SELECT p.id, p.code
FROM public.core_permissions p
JOIN public._sqlx_migrations m ON m.version = 20261118125000
WHERE p.code IN (
    'ai:delete','ai:read','ai:write','crm:admin','crm:delete','crm:write',
    'doc:admin','doc:delete','doc:read','doc:write','ehs:admin','ehs:delete','ehs:write',
    'erp:admin','erp:delete','file:admin','file:delete','file:read','file:write',
    'gis:admin','gis:delete','gis:read','gis:write','hrm:admin','hrm:delete','hrm:write',
    'iam:admin','iam:delete','iam:read','iam:write','im:admin','im:delete','im:read','im:write',
    'integration:admin','integration:delete','integration:read','integration:write',
    'mes:admin','mes:delete','mes:write','notification:admin','notification:delete',
    'notification:read','notification:write','pm:admin','pm:delete','pm:write',
    'qms:admin','qms:delete','rs:admin','rs:delete','rs:read','rs:write','scm:admin','scm:delete',
    'system:audit','system:dictionary','system:migration','system:monitor','system:plugin',
    'system:settings','wms:admin','wms:delete','workflow:admin','workflow:approve',
    'workflow:delete','workflow:read','workflow:write'
)
  AND p.created_at BETWEEN m.installed_on - interval '5 minutes'
                       AND m.installed_on + interval '5 minutes';

-- 先删绑定，再删权限；只针对上面的“本迁移插入”集合
DELETE FROM public.core_role_permissions rp
USING _seed_125000 s
WHERE rp.permission_id = s.id;

DELETE FROM public.core_permissions p
USING _seed_125000 s
WHERE p.id = s.id;

DO $$
DECLARE
    left_override integer;
BEGIN
    SELECT count(*) INTO left_override
    FROM public.core_permissions p
    JOIN public._sqlx_migrations m ON m.version = 20261118125000
    WHERE p.code IN (
        'ai:delete','ai:read','ai:write','crm:admin','crm:delete','crm:write',
        'doc:admin','doc:delete','doc:read','doc:write','ehs:admin','ehs:delete','ehs:write',
        'erp:admin','erp:delete','file:admin','file:delete','file:read','file:write',
        'gis:admin','gis:delete','gis:read','gis:write','hrm:admin','hrm:delete','hrm:write',
        'iam:admin','iam:delete','iam:read','iam:write','im:admin','im:delete','im:read','im:write',
        'integration:admin','integration:delete','integration:read','integration:write',
        'mes:admin','mes:delete','mes:write','notification:admin','notification:delete',
        'notification:read','notification:write','pm:admin','pm:delete','pm:write',
        'qms:admin','qms:delete','rs:admin','rs:delete','rs:read','rs:write','scm:admin','scm:delete',
        'system:audit','system:dictionary','system:migration','system:monitor','system:plugin',
        'system:settings','wms:admin','wms:delete','workflow:admin','workflow:approve',
        'workflow:delete','workflow:read','workflow:write'
    )
      AND p.created_at BETWEEN m.installed_on - interval '5 minutes'
                           AND m.installed_on + interval '5 minutes';

    IF left_override <> 0 THEN
        RAISE EXCEPTION '回滚断言失败：仍有 % 行本迁移插入的伞码未删除', left_override;
    END IF;
END $$;

DELETE FROM public._sqlx_migrations WHERE version = 20261118125000;

COMMIT;
