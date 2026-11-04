-- ============================================================================
-- database/seeds/coding_rules.sql
--
-- 编码规则 seed：员工编号 / 采购单号自动生成规则（P1 挂账）
--
-- 设计：
--   - core_coding_rules 规则配置表（前缀 + 日期段 + 序号位数 + 示例）
--   - 配套业务序列（employee_no_seq / purchase_order_no_seq），
--     保证编号唯一递增；按年重置由应用层结合 date_format 处理
--   - 格式沿用现有惯例：采购单 PO-2026-0001（erp.purchase_orders.order_no
--     demo 数据），员工编号同构 EMP-2026-0001
--
-- 用法：
--   psql -U topems_prod -d topems_prod -f database/seeds/coding_rules.sql
--
-- 幂等：CREATE TABLE/SEQUENCE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING
-- ============================================================================

-- ── 规则配置表 ──
CREATE TABLE IF NOT EXISTS public.core_coding_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    prefix VARCHAR(16) NOT NULL,
    date_format VARCHAR(16),
    seq_digits INT NOT NULL DEFAULT 4,
    seq_start INT NOT NULL DEFAULT 1,
    pattern VARCHAR(64) NOT NULL,
    description VARCHAR(256),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 业务编码序列（唯一递增；按年重置由应用层处理）──
CREATE SEQUENCE IF NOT EXISTS public.employee_no_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.purchase_order_no_seq START 1;

-- ── 规则 seed ──
INSERT INTO public.core_coding_rules
    (code, name, prefix, date_format, seq_digits, seq_start, pattern, description)
VALUES
    ('employee_no', '员工编号', 'EMP', 'YYYY', 4, 1, 'EMP-2026-0001',
     '员工编号自动生成：EMP-年份-4位序号（ehs.qa_ehs_employees.employee_no）'),
    ('purchase_order_no', '采购单号', 'PO', 'YYYY', 4, 1, 'PO-2026-0001',
     '采购单号自动生成：PO-年份-4位序号（erp.purchase_orders.order_no，沿用 demo 惯例）')
ON CONFLICT (code) DO NOTHING;
