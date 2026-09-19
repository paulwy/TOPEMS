-- TOPEMS database migration 20260920000083
-- TRAE 租户过滤（45e8d89ec/729c02543 给全查询加 tenant_id 过滤）暴露：47 项表缺 tenant_id 列（GET 冒烟业务 500 ×22）
-- 批量幂等补列（UUID，与 core_workflows 一致），仅表存在时执行。

DO $$
BEGIN
  IF to_regclass('portal.core_faqs') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_faqs' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_faqs ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.core_faqs') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_faqs' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_faqs ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.core_finance_payment_items') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_finance_payment_items' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_finance_payment_items ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('portal.core_guide_lessons') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_guide_lessons' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_guide_lessons ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.core_guide_lessons') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_guide_lessons' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_guide_lessons ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('portal.core_guides') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='portal' AND table_name='core_guides' AND column_name='tenant_id') THEN
    ALTER TABLE portal.core_guides ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.core_guides') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_guides' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_guides ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.core_tenants') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenants' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_tenants ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.core_tenants') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='core_tenants' AND column_name='tenant_id') THEN
    ALTER TABLE rs.core_tenants ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.core_workflow_versions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_workflow_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.core_workflow_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('core.core_workflow_versions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='core_workflow_versions' AND column_name='tenant_id') THEN
    ALTER TABLE core.core_workflow_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_bom_items') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_bom_items' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_bom_items ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_boms') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_boms' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_boms ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_change_notices') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_change_notices' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_change_notices ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_configurations') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_configurations' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_configurations ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_production_batches') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_batches' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_batches ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_production_formulas') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_formulas' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_formulas ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_production_processes') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_production_steps') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_production_steps' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_production_steps ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_versions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_workflow_instances') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_workflow_instances' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_workflow_instances ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.pdm_workflows') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pdm_workflows' AND column_name='tenant_id') THEN
    ALTER TABLE public.pdm_workflows ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.production_processes') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.production_processes') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='production_processes' AND column_name='tenant_id') THEN
    ALTER TABLE rs.production_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.production_schedules') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE public.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.production_schedules') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE rs.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('mes.production_schedules') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='tenant_id') THEN
    ALTER TABLE mes.production_schedules ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_ehs_hazards') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_ehs_hazards' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_ehs_hazards ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_ehs_sync_records') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_ehs_sync_records' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_ehs_sync_records ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lab_instruments') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_instruments' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_instruments ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lab_instruments') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_instruments' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_instruments ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lab_processes') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_processes' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lab_processes') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_processes' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_processes ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lab_reagents') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_reagents' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_reagents ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lab_reagents') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_reagents' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_reagents ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lab_samples') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_samples' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_samples ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lab_samples') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_samples' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_samples ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lab_tasks') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_tasks' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lab_tasks ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lab_tasks') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lab_tasks' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lab_tasks ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lims_method_categories') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_categories' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_categories ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lims_method_categories') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_categories' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_categories ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lims_method_validations') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_validations' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_validations ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lims_method_validations') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_validations' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_validations ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lims_method_versions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_versions' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_method_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lims_method_versions') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_method_versions' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_method_versions ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('public.qa_lims_test_methods') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_test_methods' AND column_name='tenant_id') THEN
    ALTER TABLE public.qa_lims_test_methods ADD COLUMN tenant_id UUID;
  END IF;
  IF to_regclass('rs.qa_lims_test_methods') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='qa_lims_test_methods' AND column_name='tenant_id') THEN
    ALTER TABLE rs.qa_lims_test_methods ADD COLUMN tenant_id UUID;
  END IF;
END $$;
