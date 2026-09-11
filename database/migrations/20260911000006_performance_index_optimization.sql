-- 性能优化：索引优化第一阶段
-- 日期：2026-09-11
-- 说明：基于代码分析和索引使用统计，添加缺失索引并删除冗余索引

-- ============================================
-- 一、删除冗余索引
-- ============================================

-- idx_core_tenants_code 与 core_tenants_code_key 重复（都是 code 列的唯一索引）
DROP INDEX IF EXISTS public.idx_core_tenants_code;

-- ============================================
-- 二、添加外键索引（多表 JOIN 查询优化）
-- ============================================

-- 1. erp.inventory.material_id（inventory.rs:359 与 materials 表 JOIN）
CREATE INDEX IF NOT EXISTS idx_inventory_material_id 
ON erp.inventory (material_id);

-- 2. finance.finance_voucher_template_lines.template_id（voucher_template_entries.rs 与 templates 表 JOIN）
CREATE INDEX IF NOT EXISTS idx_voucher_template_lines_template_id 
ON finance.finance_voucher_template_lines (template_id);

-- 3. hrm.employees.dept_id（monitor/metrics.rs:722 与 departments 表 JOIN）
-- 检查 hrm.employees 表是否有 dept_id 列
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'hrm' AND table_name = 'employees' AND column_name = 'dept_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_employees_dept_id 
        ON hrm.employees (dept_id);
    END IF;
END $$;

-- public.employees 表也可能需要（monitor 服务可能使用 public schema）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'dept_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_public_employees_dept_id 
        ON public.employees (dept_id);
    END IF;
END $$;

-- ============================================
-- 三、添加聚合查询索引（GROUP BY 优化）
-- ============================================

-- 4. crm.opportunities.created_at（analytics.rs:137 按月度分组统计）
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at 
ON crm.opportunities (created_at);

-- 5. ehs.qa_ehs_hazards.category（dashboard.rs:91 按类别分组统计）
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_category 
ON ehs.qa_ehs_hazards (category);

-- 6. erp.erp_master_data_refs.domain（master_data_assets.rs:200 按域分组统计）
CREATE INDEX IF NOT EXISTS idx_master_data_refs_domain 
ON erp.erp_master_data_refs (domain);

-- ============================================
-- 四、复合索引（多条件查询优化）
-- ============================================

-- 7. crm.opportunities (tenant_id, stage, created_at) - Dashboard 和 Analytics 常用查询
-- 注意：tenant_id 是 RLS 必需列，stage 和 created_at 是常用过滤和分组列
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_stage_created 
ON crm.opportunities (tenant_id, stage, created_at);

-- 8. crm.customers (tenant_id, industry) - Dashboard 按行业统计
CREATE INDEX IF NOT EXISTS idx_customers_tenant_industry 
ON crm.customers (tenant_id, industry);

-- ============================================
-- 五、验证索引创建结果
-- ============================================

-- 验证新创建的索引
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE indexname IN (
        'idx_inventory_material_id',
        'idx_voucher_template_lines_template_id',
        'idx_employees_dept_id',
        'idx_opportunities_created_at',
        'idx_qa_ehs_hazards_category',
        'idx_master_data_refs_domain',
        'idx_opportunities_tenant_stage_created',
        'idx_customers_tenant_industry'
    );
    
    RAISE NOTICE '索引优化完成：共创建 % 个新索引，删除 1 个冗余索引', idx_count;
END $$;
