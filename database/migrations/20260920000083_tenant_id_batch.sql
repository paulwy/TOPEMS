-- TOPEMS database migration 20260920000083
-- TRAE 租户过滤（45e8d89ec/729c02543 给全查询加 tenant_id 过滤）暴露：47 项表缺 tenant_id 列（GET 冒烟业务 500 ×22）
-- 批量幂等补列（UUID，与 core_workflows 一致），仅表存在时执行。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_faqs' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_faqs' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_faqs ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_faqs' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_faqs' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_faqs ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_payment_items' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_finance_payment_items' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_finance_payment_items ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_guide_lessons' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_guide_lessons' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_guide_lessons ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_guide_lessons' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_guide_lessons' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_guide_lessons ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_guides' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_guides' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_guides ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_guides' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_guides' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_guides ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenants' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenants' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_tenants ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='core_tenants' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_tenants' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_tenants ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_versions' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_workflow_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_workflow_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_workflow_versions' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='core_workflow_versions' AND column_name='tenant_id') THEN
    ALTER TABLE core.core_workflow_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_bom_items' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_bom_items' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_bom_items ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_boms' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_boms' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_boms ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_change_notices' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_change_notices' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_change_notices ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_configurations' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_configurations' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_configurations ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_production_batches' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_batches' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_batches ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_production_formulas' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_formulas' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_formulas ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_production_processes' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_production_steps' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_steps' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_steps ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_versions' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_workflow_instances' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_workflow_instances' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_workflow_instances ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='pdm_workflows' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_workflows' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_workflows ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='production_processes' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='production_processes' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE rs.production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='production_schedules' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE public.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='production_schedules' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE rs.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_schedules' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE mes.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_ehs_hazards' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_ehs_hazards' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_ehs_hazards ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_ehs_sync_records' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_ehs_sync_records' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_ehs_sync_records ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_instruments' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_instruments' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_instruments ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lab_instruments' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_instruments' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_instruments ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_processes' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lab_processes' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_processes' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_reagents' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_reagents' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_reagents ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lab_reagents' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_reagents' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_reagents ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_samples' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_samples' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_samples ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lab_samples' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_samples' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_samples ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_tasks' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_tasks' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_tasks ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lab_tasks' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_tasks' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_tasks ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_method_categories' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_categories' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_categories ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lims_method_categories' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_categories' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_categories ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_method_validations' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_validations' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_validations ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lims_method_validations' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_validations' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_validations ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_method_versions' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lims_method_versions' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_versions' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_test_methods' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_test_methods' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_test_methods ADD COLUMN tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='qa_lims_test_methods' AND c.relkind='r') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_test_methods' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_test_methods ADD COLUMN tenant_id UUID;
  END IF;
END $$;
