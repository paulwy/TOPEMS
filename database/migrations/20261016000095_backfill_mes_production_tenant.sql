-- 20261016000095_backfill_mes_production_tenant.sql
-- 数据治理：mes.production_orders / production_schedules 租户归属回填至主租户 0001
-- 背景（TODO 批3-E/F 观察项）：
--   - production_orders 99 行：76 行 0001（2026-06 种子）+ 21 行全 0（2026-10-06 空壳 pending
--     测试单，order_no 全空）+ 2 行 NULL（2026-09-28 种子）——全 0/NULL 行经 RLS nil 分支
--     对所有租户上下文可见，业务数据跨租户泄漏
--   - production_schedules 198 行全 0：其中 55 行关联 0001 订单、126 行关联全 0 订单、
--     17 行孤儿（order_id 无对应订单）——子表租户与父表不一致
-- 口径：与 88（种子回填 0001）/90（空壳回填 0001）/92（关联不上归 0001）一致，
--   统一归主租户 0001；不删除数据。

-- RLS FORCE：凭证表 policy 无租户上下文时经 nil 分支放行（与 88-94 同惯例）
SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

BEGIN;

-- 1. production_orders：NULL + 全 0 → 0001
UPDATE mes.production_orders
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL
   OR tenant_id = '00000000-0000-0000-0000-000000000000';

-- 2. production_schedules：按关联订单租户回填，孤儿兜底 0001
UPDATE mes.production_schedules s
SET tenant_id = COALESCE(
    (SELECT o.tenant_id FROM mes.production_orders o WHERE o.id = s.order_id),
    '00000000-0000-0000-0000-000000000001'
)
WHERE s.tenant_id IS NULL
   OR s.tenant_id = '00000000-0000-0000-0000-000000000000';

-- 3. 断言：两表 0 NULL / 0 全 0
DO $$
DECLARE
  po_left int;
  ps_left int;
BEGIN
  SELECT count(*) INTO po_left FROM mes.production_orders
    WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
  SELECT count(*) INTO ps_left FROM mes.production_schedules
    WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
  IF po_left > 0 OR ps_left > 0 THEN
    RAISE EXCEPTION 'mes 租户回填残留: orders=%, schedules=%', po_left, ps_left;
  END IF;
END $$;

COMMIT;

RESET app.tenant_id;
