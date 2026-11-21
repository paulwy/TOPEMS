-- 20261121235900: W5-C 第二批（WMS audit_logs + inbound_orders）
--
-- 表级比对结论（本地 topems 2026-11-21）：
--   wms.audit_logs       organization_id 逐行等于 org_id（7243/7243），是 org 重复列；
--                        代码只读 tenant_id/org_id，不读 organization_id；
--   wms.inbound_orders   organization_id 逐行等于 tenant_id（18/18），是租户重复列；
--                        inbound_order.rs 已改为只读 tenant_id，organization_id 仅作 API 别名。
--
-- 守卫：任一表出现 organization_id 与目标列不等的行，整条迁移中止。
-- 本迁移不删行、不改 tenant_id/org_id、不触碰 inventory 等 organization_id 为业务组织值的表。

DO $$
DECLARE
    mismatch bigint;
BEGIN
    IF to_regclass('wms.audit_logs') IS NOT NULL THEN
        SELECT count(*) INTO mismatch
        FROM wms.audit_logs
        WHERE organization_id IS DISTINCT FROM org_id;
        IF mismatch > 0 THEN
            RAISE EXCEPTION 'W5-C guard failed: wms.audit_logs has % rows where organization_id <> org_id', mismatch;
        END IF;
    END IF;

    IF to_regclass('wms.inbound_orders') IS NOT NULL THEN
        SELECT count(*) INTO mismatch
        FROM wms.inbound_orders
        WHERE organization_id IS DISTINCT FROM tenant_id;
        IF mismatch > 0 THEN
            RAISE EXCEPTION 'W5-C guard failed: wms.inbound_orders has % rows where organization_id <> tenant_id', mismatch;
        END IF;
    END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 org_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-WMS-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t wms.audit_logs -t wms.inbound_orders
ALTER TABLE wms.audit_logs DROP COLUMN IF EXISTS organization_id;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除逐行等于 tenant_id 的废弃 organization_id 重复列
-- destructive-owner: w5c
-- destructive-ticket: W5C-ORG-WMS-20261121
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t wms.audit_logs -t wms.inbound_orders
ALTER TABLE wms.inbound_orders DROP COLUMN IF EXISTS organization_id;
