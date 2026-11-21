-- 20261121235930: W5-C 第三批组织字段收敛（HRM 初始化进度）
--
-- 口径：tenant_id 是租户隔离键；organization_id 是 V69.1 已废弃的第三套别名。
-- hrm.initialization_status 的 organization_id 逐行等于 tenant_id，且代码只读
-- tenant_id（setup.rs 用 tenant_id AS organization_id 保留 API 字段），本列已无读者。
--
-- 本迁移只处理该表：先守卫后删列；出现不等的行即中止，不改写数据。
-- 不删除行、不改 tenant_id、不触碰 org_id/company_id。

-- 守卫：任一行不等即中止整条迁移（事务内回滚）
DO $$
DECLARE
    mismatch bigint;
BEGIN
    IF to_regclass('hrm.initialization_status') IS NOT NULL THEN
        SELECT count(*) INTO mismatch
        FROM hrm.initialization_status
        WHERE organization_id IS DISTINCT FROM tenant_id;
        IF mismatch > 0 THEN
            RAISE EXCEPTION
                'W5-C guard failed: hrm.initialization_status has % rows where organization_id <> tenant_id',
                mismatch;
        END IF;
    END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id、且代码已无读取的废弃 organization_id 列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-HRM-INIT-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t hrm.initialization_status
ALTER TABLE hrm.initialization_status DROP COLUMN IF EXISTS organization_id;
