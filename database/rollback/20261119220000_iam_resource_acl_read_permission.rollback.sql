-- 回滚 20261119220000_iam_resource_acl_read_permission.sql
--
-- 仅移除本迁移新增的只读权限码及其角色授权；不触碰表结构、资源授权数据与 RLS。
-- 结束时按 version 精确删除自身账本行，并断言无残留。

DELETE FROM public.core_role_permissions rp
USING public.core_permissions p
WHERE rp.permission_id = p.id
  AND p.code = 'iam:resource_acl:read';

DELETE FROM public.core_permissions
WHERE code = 'iam:resource_acl:read';

DO $$
DECLARE
    ledger_rows bigint;
BEGIN
    DELETE FROM public._sqlx_migrations WHERE version = 20261119220000;
    SELECT count(*) INTO ledger_rows
      FROM public._sqlx_migrations WHERE version = 20261119220000;
    IF ledger_rows <> 0 THEN
        RAISE EXCEPTION '回滚账本断言失败：version=20261119220000 仍残留 % 行', ledger_rows;
    END IF;
END
$$;
