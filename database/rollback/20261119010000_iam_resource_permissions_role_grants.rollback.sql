-- 回滚 20261119010000：撤销角色 → 资源授予、用户 allow/deny 例外、scope 与 ACL 权限码。
--
-- 守卫：
--   * 存在角色授予行（含软删）或用户拒绝行时拒绝回滚，避免静默丢失 ACL 数据；
--   * 存在 tenant_id IS NULL 的行时拒绝恢复 tenant_id NOT NULL。
--
-- 注意：deleted_at 不删除。生产该表本来就有此列（本迁移在生产是 no-op），
-- 回滚删除它会连带删掉生产既有审计数据；仓库侧把它作为已对齐列保留。

DO $$
DECLARE
    role_rows bigint;
    deny_rows bigint;
    null_tenant_rows bigint;
BEGIN
    SELECT count(*) INTO role_rows FROM iam.resource_permissions WHERE role_id IS NOT NULL;
    SELECT count(*) INTO deny_rows FROM iam.resource_permissions WHERE effect = 'deny';
    IF role_rows > 0 OR deny_rows > 0 THEN
        RAISE EXCEPTION '存在角色授予 % 行 / 用户拒绝 % 行，请先人工清理后再回滚', role_rows, deny_rows;
    END IF;

    SELECT count(*) INTO null_tenant_rows FROM iam.resource_permissions WHERE tenant_id IS NULL;
    IF null_tenant_rows > 0 THEN
        RAISE EXCEPTION '存在 tenant_id 为空的行 % 行，请先人工清理后再回滚', null_tenant_rows;
    END IF;
END
$$;

-- 移除本迁移补建的 ACL 权限码与授权
DELETE FROM public.core_role_permissions rp
USING public.core_permissions p
WHERE rp.permission_id = p.id
  AND p.code IN ('iam:resource_acl:write', 'iam:resource_acl:delete');

DELETE FROM public.core_permissions
WHERE code IN ('iam:resource_acl:write', 'iam:resource_acl:delete');

DROP INDEX IF EXISTS iam.uq_resource_permissions_role_scope;
DROP INDEX IF EXISTS iam.idx_resource_permissions_role_id;

ALTER TABLE IF EXISTS iam.resource_permissions
    DROP CONSTRAINT IF EXISTS ck_resource_permissions_scope_tenant,
    DROP CONSTRAINT IF EXISTS ck_resource_permissions_scope,
    DROP CONSTRAINT IF EXISTS ck_resource_permissions_role_effect,
    DROP CONSTRAINT IF EXISTS ck_resource_permissions_effect,
    DROP CONSTRAINT IF EXISTS ck_resource_permissions_subject,
    DROP COLUMN IF EXISTS scope,
    DROP COLUMN IF EXISTS effect,
    DROP COLUMN IF EXISTS role_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'resource_permissions'
          AND column_name = 'tenant_id'
          AND is_nullable = 'YES'
    ) THEN
        RETURN;
    END IF;
    ALTER TABLE iam.resource_permissions ALTER COLUMN tenant_id SET NOT NULL;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'resource_permissions'
          AND column_name = 'user_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE iam.resource_permissions ALTER COLUMN user_id SET NOT NULL;
    END IF;
END
$$;

DO $$
DECLARE
    ledger_rows bigint;
BEGIN
    DELETE FROM public._sqlx_migrations WHERE version = 20261119010000;
    SELECT count(*) INTO ledger_rows
      FROM public._sqlx_migrations WHERE version = 20261119010000;
    IF ledger_rows <> 0 THEN
        RAISE EXCEPTION '回滚账本断言失败：version=20261119010000 仍残留 % 行', ledger_rows;
    END IF;
END
$$;
