-- 回滚入口（M2a）：仓库统一放在 database/rollback/<version>_<name>.rollback.sql，与既有迁移一致。
-- 放位依据：scripts/check-migration-names.mjs --strict 会把 database/migrations 下的 *.down.sql 判为
--   UNKNOWN pattern 并阻断提交，故不使用 .down.sql；validate.sh 的 down 检查仅产生 WARN。
-- RLS 阶段二 M2a 回滚：删索引，并在「列内无任何非空数据」时删除 tenant_id 列。
-- 注意：若新二进制已写入 tenant_id，列会被保留并 RAISE NOTICE，这是有意的数据保护；
-- 此时需先人工确认数据归属，再决定是否手工删列。
-- 本迁移未改动策略，回滚不涉及 pg_policies。

-- 1. erp.meeting_rooms
DROP INDEX IF EXISTS erp.idx_erp_meeting_rooms_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.meeting_rooms WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.meeting_rooms DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.meeting_rooms 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 2. erp.meeting_bookings
DROP INDEX IF EXISTS erp.idx_erp_meeting_bookings_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.meeting_bookings WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.meeting_bookings DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.meeting_bookings 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 3. erp.vehicles
DROP INDEX IF EXISTS erp.idx_erp_vehicles_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.vehicles WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.vehicles DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.vehicles 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 4. erp.vehicle_requests
DROP INDEX IF EXISTS erp.idx_erp_vehicle_requests_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.vehicle_requests WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.vehicle_requests DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.vehicle_requests 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 5. erp.expenses
DROP INDEX IF EXISTS erp.idx_erp_expenses_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.expenses WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.expenses DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.expenses 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 6. crm.core_crm_customers
DROP INDEX IF EXISTS crm.idx_crm_core_crm_customers_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM crm.core_crm_customers WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE crm.core_crm_customers DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'crm.core_crm_customers 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 7. erp.core_erp_suppliers
DROP INDEX IF EXISTS erp.idx_erp_core_erp_suppliers_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.core_erp_suppliers WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE erp.core_erp_suppliers DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'erp.core_erp_suppliers 存在非空 tenant_id，保留列';
    END IF;
END $$;

-- 8. portal.portal_announcements
DROP INDEX IF EXISTS portal.idx_portal_portal_announcements_tenant_id;
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 M2a 补列；仅当列内无任何非空 tenant_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: RLS-PHASE2-20261114
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114201000_add_tenant_id_8_tables.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM portal.portal_announcements WHERE tenant_id IS NOT NULL) THEN
        ALTER TABLE portal.portal_announcements DROP COLUMN IF EXISTS tenant_id;
    ELSE
        RAISE NOTICE 'portal.portal_announcements 存在非空 tenant_id，保留列';
    END IF;
END $$;
