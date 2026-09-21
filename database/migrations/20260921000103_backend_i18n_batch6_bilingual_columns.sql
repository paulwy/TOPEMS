-- 000103: 后端数据多语言第六批（字段级双语列）——
--   qms 质量问题标题 title、mes 工艺流程名 name（新增英文备用列）
-- 目的：在已有中文字段之外新增英文备用列，运行时按 Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(<col>_en, <col>) ELSE <col> END AS <col>
--       未提供英文时 COALESCE 回退到中文原列，保证向后兼容。
-- 说明：
--   - ehs 隐患名（ehs.hazards.title）本批复查仍为桩代码（list 返回空 vec，无真实 SQL），
--     双语化无意义，跳过，不加列。
--   - 搜索仍按中文原名（* ILIKE 不动）；合并/回退读取保留原始列，不用 CASE 后的值。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. qms 质量问题：问题标题英文列（用户可见字段 title）
ALTER TABLE qms.qa_quality_issues ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);

-- 2. mes 工艺流程：工艺名英文列（用户可见字段 name）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='process_flows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='process_flows' AND column_name='name_en') THEN
    ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='mes' AND table_name='process_flows' AND column_name='name_en') THEN
    ALTER TABLE mes.process_flows ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
  END IF;
END $$;
