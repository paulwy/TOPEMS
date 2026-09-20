-- TOPEMS database migration 20260920000080
-- 日志驱动补列（HTTP 200 但业务 code=500）：
--   flow/workflow.rs list/create 500：core_workflows 缺 tenant_id / code 列
--   （SELECT id, tenant_id, name, code, ... / INSERT INTO core_workflows (..., tenant_id)）
--   search_path = flow, mobile, rs, erp, public, iam, shared（core 不在其中），
--   无前缀 core_workflows 可解析到 rs./public. 的副本，故三 schema 全补。
--   mes init WARN：equipment 缺 equipment_no 列。
-- 条件 ALTER（表存在才执行），双库幂等安全。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE core.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE core.core_workflows ADD COLUMN IF NOT EXISTS code TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE rs.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE rs.core_workflows ADD COLUMN IF NOT EXISTS code TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflows' AND c.relkind='r') THEN
    ALTER TABLE public.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.core_workflows ADD COLUMN IF NOT EXISTS code TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment' AND c.relkind='r') THEN
    ALTER TABLE mes.equipment ADD COLUMN IF NOT EXISTS equipment_no TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='equipment' AND c.relkind='r') THEN
    ALTER TABLE rs.equipment ADD COLUMN IF NOT EXISTS equipment_no TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='equipment' AND c.relkind='r') THEN
    ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS equipment_no TEXT;
  END IF;
END $$;
