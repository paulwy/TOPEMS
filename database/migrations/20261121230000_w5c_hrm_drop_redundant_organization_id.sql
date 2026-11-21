-- 20261121230000: W5-C 首批组织字段收敛
--
-- 口径：tenant_id 是租户隔离键；organization_id 是 V69.1 已废弃的第三套别名。
-- 本迁移只处理“organization_id 逐行等于 tenant_id”的 HRM 表，先守卫后删列；
-- 任一表出现 organization_id 与 tenant_id 不等的行，整条迁移中止，不做数据改写。
--
-- 覆盖：
--   hrm.departments         organization_id NOT NULL，5 行全部等于 tenant_id
--   hrm.employees           organization_id NULLABLE，19 行全部等于 tenant_id
--   hrm.positions           organization_id NOT NULL，7 行全部等于 tenant_id
--   hrm.attendance_records  organization_id NOT NULL，5 行全部等于 tenant_id
--
-- 代码侧已只读 tenant_id/org_id；attendance 的两处 INSERT 去掉 organization_id 列。
-- 本迁移不删除行、不改 tenant_id、不触碰 org_id/company_id。

-- 守卫：任一行不等即中止整条迁移（事务内回滚）
DO $$
DECLARE
    r record;
    mismatch bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('departments'),
            ('employees'),
            ('positions'),
            ('attendance_records')
        ) AS v(table_name)
    LOOP
        IF to_regclass(format('hrm.%I', r.table_name)) IS NOT NULL THEN
            EXECUTE format(
                'SELECT count(*) FROM hrm.%I WHERE organization_id IS DISTINCT FROM tenant_id',
                r.table_name
            ) INTO mismatch;
            IF mismatch > 0 THEN
                RAISE EXCEPTION
                    'W5-C guard failed: hrm.% has % rows where organization_id <> tenant_id',
                    r.table_name, mismatch;
            END IF;
        END IF;
    END LOOP;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-HRM-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t hrm.departments -t hrm.employees -t hrm.positions -t hrm.attendance_records
ALTER TABLE hrm.departments DROP COLUMN IF EXISTS organization_id;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-HRM-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t hrm.departments -t hrm.employees -t hrm.positions -t hrm.attendance_records
ALTER TABLE hrm.employees DROP COLUMN IF EXISTS organization_id;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-HRM-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t hrm.departments -t hrm.employees -t hrm.positions -t hrm.attendance_records
ALTER TABLE hrm.positions DROP COLUMN IF EXISTS organization_id;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-HRM-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t hrm.departments -t hrm.employees -t hrm.positions -t hrm.attendance_records
ALTER TABLE hrm.attendance_records DROP COLUMN IF EXISTS organization_id;
