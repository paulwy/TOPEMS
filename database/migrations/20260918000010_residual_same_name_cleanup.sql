-- ============================================================================
-- 残留同名组收敛（2026-09-18）
-- 依据代码审计：
--   announcements：erp 权威（erp_real_module 强制 erp,public；查询含 deleted_at 过滤）——
--                  erp 表缺 deleted_at/tenant_id 致 count 500；public 3 行数据影子
--   contacts：crm 权威（schema_defense 断言 + crm:6 行）；public 0 行影子
--   capacities：mes 权威（mes 查询无前缀）；public 0 行影子
-- 处理（幂等）：
--   1) erp.announcements 补列 + 迁移 public 数据
--   2) DROP public.announcements / public.contacts / public.capacities
-- ============================================================================

-- 1) erp.announcements 补列
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='announcements' AND column_name='deleted_at') THEN
    ALTER TABLE erp.announcements ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='announcements' AND column_name='tenant_id') THEN
    ALTER TABLE erp.announcements ADD COLUMN tenant_id uuid;
  END IF;
END $$;

-- 2) 迁移 public 数据 → erp（仅映射 erp 结构列；tenant_id/deleted_at 取公共值）
-- 2026-09-18 防御化（空库重建链卡点）：public.announcements 可能仅为 2 列骨架
-- （无 title 等源列），数据迁移解析失败；源表含业务列才执行（骨架无数据，跳过等价）。
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='announcements' AND column_name='title') THEN
    EXECUTE $x$INSERT INTO erp.announcements (id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at, tenant_id, deleted_at)
    SELECT id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at, tenant_id, deleted_at
    FROM public.announcements
    ON CONFLICT (id) DO NOTHING$x$;
  END IF;
END $$;

-- 3) DROP 影子（announcements 数据已迁移；contacts/capacities 空表）
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.contacts;
DROP TABLE IF EXISTS public.capacities;
