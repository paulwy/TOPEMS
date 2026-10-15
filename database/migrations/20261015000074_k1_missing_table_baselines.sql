-- 迁移链缺 11 张运行时表的基线（2026-10-15 空库重建链修复）：
-- 20261015000074_rls_insert_tenant_backfill 对 125 张代码 INSERT 契约表做 tenant_id backfill，
-- 其中 11 张表在迁移链中无任何创建源（仅由运行时 schema_defense 创建；live 存在、旧库/空库缺失），
-- 空库重建链在 UPDATE/断言处必然报 relation does not exist。
-- 本补丁版本 202610150000731（> 20261015000073 < 20261015000074）补最小骨架：
--   骨架 + 运行时 schema_defense 逐列 ADD COLUMN IF NOT EXISTS（20260725000000 同款幂等模式）→ 最终完整。
-- 列最小集满足 backfill 的 tenant_id 引用与主键惯例；已应用环境 CREATE IF NOT EXISTS 幂等跳过。
CREATE TABLE IF NOT EXISTS finance.finance_budget_variances_v53 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finance.finance_cash_flow_predictions_v53 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finance.finance_prediction_models_v53 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cqrs_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cqrs_projection_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.report_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.report_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
