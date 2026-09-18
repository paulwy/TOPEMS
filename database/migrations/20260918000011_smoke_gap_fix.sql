-- ============================================================================
-- 冒烟缺口修复（2026-09-18）
-- 1) ticket: feedback 兼容层表名 tickets → core_tickets（代码已改，本迁移无需 DDL；
--    core_tickets 列与查询结构全匹配）
-- 2) wms: locations 查询列 code/name/type 实为 location_code/location_name/location_type
--    （代码已改 SELECT 别名 + INSERT 列）
-- 3) mes: production_processes 代码（旧结构）引用 process_no/name/equipment_required/
--    estimated_duration，表（新结构）为 process_code/process_name/standard_time_minutes——
--    本迁移加兼容列并回填（治标；后续代码迁移登记 TODO）
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='process_no') THEN
    ALTER TABLE mes.production_processes ADD COLUMN process_no varchar(64);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='name') THEN
    ALTER TABLE mes.production_processes ADD COLUMN name varchar(128);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='equipment_required') THEN
    ALTER TABLE mes.production_processes ADD COLUMN equipment_required boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='estimated_duration') THEN
    ALTER TABLE mes.production_processes ADD COLUMN estimated_duration integer;
  END IF;
END $$;

UPDATE mes.production_processes
SET process_no = process_code,
    name = process_name,
    estimated_duration = standard_time_minutes
WHERE process_no IS NULL OR name IS NULL;

-- wms.locations 种子数据 tenant_id 回填（解码 NULL 修复）
-- 2026-09-18 防御化（空库重建链卡点）：wms.locations 可能仅为 2 列骨架（无 tenant_id），跳过。
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='wms' AND table_name='locations' AND column_name='tenant_id') THEN
    EXECUTE $x$UPDATE wms.locations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL$x$;
  END IF;
END $$;
