-- =============================================================================
-- 由 scripts/gen-missing-columns-migration.py 生成（自愈验证后系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@localhost:5433/topems
-- 同表缺失列: 916（ADD COLUMN IF NOT EXISTS 幂等）
-- =============================================================================

-- 注: 表不存在（运行时自建域，由后续迁移/服务自愈建表）时跳过，保证纯迁移链重放顺序无关

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname='ai_models' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ai"."ai_models" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname='ai_prompt_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ai"."ai_prompt_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname='ai_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ai"."ai_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname='ai_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ai"."ai_settings" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT gen_random_uuid();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname='usage_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ai"."usage_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_comparison_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_comparison_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_dashboard_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_dashboard_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_dashboards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_dashboards" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_datasets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD COLUMN IF NOT EXISTS "created_by" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_datasets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD COLUMN IF NOT EXISTS "source_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_datasets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD COLUMN IF NOT EXISTS "source_type" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_datasets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_datasources' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_datasources" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_drilldown_history' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_drilldown_history" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_sync_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='analytics_widgets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."analytics_widgets" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bi' AND c.relname='report_execution_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "bi"."report_execution_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugin_navigation' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugin_navigation" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "activated_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "author_name" character varying(100);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "author_url" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "category" character varying(100);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "checksum" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "code" character varying(100);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "dependencies" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "entry_point" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "homepage_url" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "install_count" integer DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "installed_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_free" boolean DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_installed" boolean DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "is_recommended" boolean DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "name" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "plugin_type" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "price_cents" integer DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "rating" numeric(3,2) DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "rating_count" integer DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "remote_url" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "screenshots" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "tags" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugins' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."core_plugins" ADD COLUMN IF NOT EXISTS "version" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='knowledge_bases' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."knowledge_bases" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='knowledge_chunks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."knowledge_chunks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='knowledge_documents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."knowledge_documents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='knowledge_qa_history' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "core"."knowledge_qa_history" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='customer_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."customer_orders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='customer_recommendations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."customer_recommendations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='customer_scores' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."customer_scores" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='customer_segments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."customer_segments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='interactions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."interactions" ADD COLUMN IF NOT EXISTS "interaction_time" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='interactions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."interactions" ADD COLUMN IF NOT EXISTS "type" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='rfm_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."rfm_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='sales_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."sales_forecasts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='crm' AND c.relname='sales_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "crm"."sales_orders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_investigations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_accident_investigations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_reviews' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_accident_reviews" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_treatments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_accident_treatments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_accidents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_accidents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_alerts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_alerts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_compliance_evaluations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_compliance_evaluations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_compliance_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_compliance_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_contraindications' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_contraindications" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_detection_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_detection_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_discharge_permits' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_discharge_permits" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_disease_cases' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_disease_cases" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_evaluations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_drill_evaluations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_drill_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_problems' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_drill_problems" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_drill_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_approvals' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_emergency_plan_approvals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_supplies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_emergency_plan_supplies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_emergency_plan_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_emergency_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_env_monitor_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_env_monitor_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_environment' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_environment" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_environment_incidents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_environment_incidents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_environmental_regulations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_environmental_regulations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_rectifications' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_hazard_rectifications" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_verifications' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_hazard_verifications" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_abnormalities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_health_abnormalities" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_exam_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_health_exam_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_exam_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_health_exam_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_trainings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_health_trainings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_inspection_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_inspection_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_record_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_inspection_record_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_inspection_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_material_stocks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_material_stocks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_msds' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_msds" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_protection_measures' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_protection_measures" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_risks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_risks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_stock_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_stock_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_sync_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_trainings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ehs"."qa_ehs_trainings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='asset_categories' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."asset_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='documents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."documents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='erp_master_data_audit_trail' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."erp_master_data_audit_trail" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='erp_master_data_conflicts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."erp_master_data_conflicts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='erp_master_data_quality_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."erp_master_data_quality_reports" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='erp_master_data_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."erp_master_data_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='meeting_bookings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."meeting_bookings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='meeting_rooms' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."meeting_rooms" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='office_supplies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."office_supplies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='vehicle_requests' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."vehicle_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='vehicles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "erp"."vehicles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='accounting_subjects' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."accounting_subjects" ADD COLUMN IF NOT EXISTS "code" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='accounting_subjects' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."accounting_subjects" ADD COLUMN IF NOT EXISTS "name" character varying(100);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='accounting_subjects' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."accounting_subjects" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='core_finance_voucher_lines' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."core_finance_voucher_lines" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='cqrs_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."cqrs_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_compliance_issues' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_compliance_issues" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_fraud_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_fraud_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_fraud_scores' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_fraud_scores" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_review_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_review_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_review_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_review_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_review_workflows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_review_workflows" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_risk_alerts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_risk_alerts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v54_risk_indicators' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v54_risk_indicators" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_invoice_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_invoice_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_invoices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_invoices" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_payment_requests' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_payment_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_payment_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_payment_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_reconciliation_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v55_reconciliation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v56_tax_brackets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v56_tax_brackets" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v56_tax_forms' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v56_tax_forms" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v56_tax_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v56_tax_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v56_tax_rates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v56_tax_rates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v56_tax_suggestions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v56_tax_suggestions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v57_analysis_dimensions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v57_analysis_dimensions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v57_analysis_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v57_analysis_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v57_forecast_models' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v57_forecast_models" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v57_insights' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v57_insights" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v57_report_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v57_report_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_cash_pools' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_cash_pools" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_forecast_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_forecast_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_forecast_scenarios' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_forecast_scenarios" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_liquidity_targets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_liquidity_targets" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_optimization_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_optimization_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_pool_allocations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_pool_allocations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v58_pool_transfers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v58_pool_transfers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_credit_profiles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_credit_profiles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_device_profiles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_device_profiles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_decisions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_decisions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_fraud_signals' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_signals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_scoring_models' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_scoring_models" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_stress_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_stress_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v59_stress_scenarios' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v59_stress_scenarios" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_alert_channels' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_alert_channels" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_alert_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_alert_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_alerts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_alerts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_decision_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_decision_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_decision_scenarios' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_decision_scenarios" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_dependencies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_dependencies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_executions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_executions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='finance_v60_schedule_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_tasks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='payables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."payables" ADD COLUMN IF NOT EXISTS "amount" numeric(18,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='payables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."payables" ADD COLUMN IF NOT EXISTS "invoice_number" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='payables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."payables" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='receivables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."receivables" ADD COLUMN IF NOT EXISTS "amount" numeric(18,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='receivables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."receivables" ADD COLUMN IF NOT EXISTS "invoice_number" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='receivables' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."receivables" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='reconcile_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."reconcile_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='reconcile_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."reconcile_orders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='sales_invoices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."sales_invoices" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='voucher_lines' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."voucher_lines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relname='vouchers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "finance"."vouchers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_file_folders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_file_folders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_file_permissions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_file_permissions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_master_data_change_log' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_master_data_change_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_master_data_event_outbox' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_master_data_event_outbox" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_mdm_approvals' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_mdm_approvals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_mdm_reconciliation_log' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_mdm_reconciliation_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_migration_history' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_migration_history" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_operation_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_operation_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_tenant_modules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_tenant_modules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_tenant_usage' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_tenant_usage" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='flow' AND c.relname='core_workflow_instances' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "flow"."core_workflow_instances" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='gis' AND c.relname='geofences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "gis"."geofences" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='gis' AND c.relname='locations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "gis"."locations" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='gis' AND c.relname='track_positions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "gis"."track_positions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hrm' AND c.relname='module_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "hrm"."module_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='external_erp_staging' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."external_erp_staging" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "error_message" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "event_type" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "payload" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "source_record_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "source_system" character varying(50) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "status" character varying(50) NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "synced_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "target_record_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "target_system" character varying(50) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='integration_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."integration_events" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "inspection_notes" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "inspection_result" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "lims_sample_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "qms_inspection_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "sample_name" character varying(255) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "sync_error" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "sync_status" character varying(50) NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "synced" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='lims_qms_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."lims_qms_sync" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "erp_order_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "max_retries" integer DEFAULT 5;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "mes_order_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "order_number" character varying(255) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "payload" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "product_name" character varying(255);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "quantity" numeric(15,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "sync_direction" character varying(50) DEFAULT 'erp_to_mes'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "sync_error" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "sync_status" character varying(50) NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "sync_type" character varying(50) DEFAULT 'create'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "synced" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='mes_erp_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."mes_erp_sync" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "item_name" character varying(255) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "quantity" numeric(15,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "scm_supply_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "sync_error" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "sync_status" character varying(50) NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "synced" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "unit" character varying(50);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='integration' AND c.relname='wms_scm_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "integration"."wms_scm_sync" ADD COLUMN IF NOT EXISTS "wms_inventory_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "dict_type_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "extra_data" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "name" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "parent_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_items" ADD COLUMN IF NOT EXISTS "value" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "category" character varying(100) NOT NULL DEFAULT 'general'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "name" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='batch_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."batch_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "available_hours" numeric(10,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "capacity_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'available'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "used_hours" numeric(10,2) DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "utilization_rate" numeric(5,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "work_center_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."capacities" ADD COLUMN IF NOT EXISTS "work_center_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "accuracy_rate" numeric(5,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "actual_quantity" numeric(14,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "confidence_level" numeric(5,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "forecast_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "forecast_no" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "forecast_period" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "forecast_quantity" numeric(14,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "method" character varying(64) DEFAULT 'moving_average'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "notes" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "product_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "product_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'draft'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='demand_forecasts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."demand_forecasts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "maintenance_cycle" integer DEFAULT 30;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "name" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "warranty_end_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."equipment_inspections" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."material_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_requirements' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."material_requirements" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_return_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."material_return_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='module_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."module_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "equipment_ids" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "flow_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "process_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "quality_check_required" boolean DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "sequence" integer NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "standard_time" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "transfer_time" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "wait_time" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD COLUMN IF NOT EXISTS "work_station_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "capacity" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "code" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "name" character varying(256) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "production_line" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "route_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "unit" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."process_flows" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_costs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_costs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "product_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "source" character varying(32) DEFAULT 'manual'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "end_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "notes" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "plan_name" character varying(256) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "plan_no" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "plan_type" character varying(32) DEFAULT 'monthly'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "product_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "product_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "start_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'draft'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "target_quantity" numeric(14,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_plans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "equipment_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "product_code" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "product_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "qualified_quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "quantity_defective" numeric(12,2) DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "quantity_produced" numeric(12,2) DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "record_no" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "unqualified_quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_no" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_time" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_type" character varying(32) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "inspector" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "memo" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "order_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "order_number" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "process_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "process_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "product_code" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "product_name" character varying(256) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "qualification_rate" numeric(5,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "qualified_quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "result" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "unqualified_quantity" numeric(12,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_inspections" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "actual_value" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "item_name" character varying(256) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "patrol_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "remark" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "standard" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "status" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "findings" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "inspector" character varying(128) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "memo" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "patrol_no" character varying(64) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "patrol_time" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "production_line" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "result" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "workstation_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_patrols" ADD COLUMN IF NOT EXISTS "workstation_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "inspection_method" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "item_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "lower_limit" numeric(12,4);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "remark" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "standard_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "unit" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD COLUMN IF NOT EXISTS "upper_limit" numeric(12,4);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "code" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "effective_date" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "inspection_type" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "name" character varying(256) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "product_code" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "product_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."quality_standards" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='team_members' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."team_members" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='team_members' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."team_members" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='team_members' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."team_members" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='teams' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."teams" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "approval_remark" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "approved_by" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "order_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "order_no" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "remark" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "report_date" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "report_no" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "reporter_name" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "shift" character varying(32);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "work_order_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "work_order_no" character varying(64);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "work_station_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_reports" ADD COLUMN IF NOT EXISTS "work_station_name" character varying(256);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_stations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "name" character varying(128);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "address" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "file_url" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "recorded_at" timestamp with time zone NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "recorded_by" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='audio_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."audio_recordings" ADD COLUMN IF NOT EXISTS "title" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "barcode" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "barcode_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "decoded_data" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "location_lat" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "location_lng" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "result_action" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "result_data" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "scanned_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='barcode_scans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."barcode_scans" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "app_version" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "device_id" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "device_name" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "device_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "os_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "os_version" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "push_token" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."devices" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "file_name" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "file_size" bigint NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "file_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "file_url" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "mime_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "tags" text[];
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "uploaded_by" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='media_files' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."media_files" ADD COLUMN IF NOT EXISTS "uploaded_by_name" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_push_notifications' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_push_notifications" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "location_lat" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "location_lng" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "result_data" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "scan_data" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "scan_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_scan_records" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "assignee" character varying(100);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "due_date" date;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10,6);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10,6);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "priority" character varying(20) NOT NULL DEFAULT 'normal'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "task_type" character varying(50) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "title" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "avatar_url" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "department" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "email" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "nickname" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "password_hash" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "phone" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "position" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='mobile_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."mobile_users" ADD COLUMN IF NOT EXISTS "username" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_announcements' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."oa_announcements" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_calendar_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."oa_calendar_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_meetings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."oa_meetings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."oa_tasks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "entity_id" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "entity_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "last_sync_error" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "operation_data" jsonb NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "operation_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "sync_attempts" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "sync_status" character varying NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "synced_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_operations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_operations" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "failed_count" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'pending'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "sync_data" jsonb NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "sync_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "synced_count" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='offline_sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."offline_sync_records" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "address" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "checked_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "checked_by" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "patrol_type" text NOT NULL DEFAULT 'routine'::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending'::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='patrol_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."patrol_records" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "address" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "file_url" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "recorded_at" timestamp with time zone NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "recorded_by" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_evidences' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_evidences" ADD COLUMN IF NOT EXISTS "title" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "compression_ratio" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "file_name" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "file_path" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "file_size" bigint NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "has_watermark" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "height" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "location_lat" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "location_lng" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "mime_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "upload_progress" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "upload_status" character varying NOT NULL DEFAULT 'uploading'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "uploaded_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "watermark_text" character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='photo_uploads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."photo_uploads" ADD COLUMN IF NOT EXISTS "width" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "app_version" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "device_model" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "device_token" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "os_version" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "platform" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_devices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_devices" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "body_template" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "notification_type" character varying NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "title_template" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='push_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."push_templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "barcode" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "item_type" character varying(50) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "operator" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "quantity" numeric(10,2);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "scanned_at" timestamp with time zone NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='scan_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."scan_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='shortcuts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."shortcuts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "auto_sync_enabled" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "conflict_strategy" character varying NOT NULL DEFAULT 'server优先'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "sync_interval_minutes" integer NOT NULL DEFAULT 5;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "sync_on_network_change" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='sync_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."sync_policies" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "file_url" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "location_track" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "recorded_at" timestamp with time zone NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "recorded_by" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "start_location_lat" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "start_location_lng" numeric(10,6) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying(500);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='video_recordings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "mobile"."video_recordings" ADD COLUMN IF NOT EXISTS "title" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pdm' AND c.relname='module_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "pdm"."module_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='difference_adjustments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."difference_adjustments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='reconciliation_item_snapshots' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."reconciliation_item_snapshots" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='reconciliation_settlement_links' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."reconciliation_settlement_links" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='reconciliation_snapshots' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."reconciliation_snapshots" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='settlement_snapshots' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."settlement_snapshots" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_finance' AND c.relname='source_amount_snapshots' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_finance"."source_amount_snapshots" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='plugin_wms' AND c.relname='purchase_order_snapshots' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "plugin_wms"."purchase_order_snapshots" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pm' AND c.relname='project_members' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "pm"."project_members" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_faqs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."core_faqs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_guide_lessons' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."core_guide_lessons" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_guide_progress' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."core_guide_progress" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='core_guides' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."core_guides" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_compensation_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_compensation_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_execution_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_execution_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_query_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_query_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_subgraphs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_subgraphs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_transaction_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_transaction_steps" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='federation_transactions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."federation_transactions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='gateway_degradation_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."gateway_degradation_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='gateway_health_metrics' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."gateway_health_metrics" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='gateway_protocols' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."gateway_protocols" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='gateway_routes' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."gateway_routes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_breaking_changes' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_breaking_changes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_execution_metrics' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_execution_metrics" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_execution_profiles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_execution_profiles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_optimization_history' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_optimization_history" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_schema_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_schema_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_stream_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_stream_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_stream_subscribers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_stream_subscribers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_streams' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_streams" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_suggestions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_suggestions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='graphql_version_negotiations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."graphql_version_negotiations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='intelligent_gw_affinities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."intelligent_gw_affinities" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='intelligent_gw_conflicts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."intelligent_gw_conflicts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='intelligent_gw_routing_table' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."intelligent_gw_routing_table" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='intelligent_gw_stitch_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."intelligent_gw_stitch_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='intelligent_gw_stitch_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."intelligent_gw_stitch_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_accel_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_accel_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_acceleration_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_acceleration_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_acceleration_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_acceleration_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_access_decisions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_access_decisions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_access_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_access_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_aggregation_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_aggregation_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_aggregation_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_aggregation_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_alert_thresholds' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_alert_thresholds" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_anomalies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_anomalies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_api_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_api_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_audit_entries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_audit_entries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_audit_exports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_audit_exports" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_auth_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_auth_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_backpressure_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_backpressure_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_backpressure_states' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_backpressure_states" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_cache_entries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_cache_entries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_cache_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_cache_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_cache_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_cache_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_canary_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_canary_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_canary_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_canary_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_compatibility_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_compatibility_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_compatibility_reports' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_compatibility_reports" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_compilation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_compilation_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_compiled_queries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_compiled_queries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_config_diffs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_config_diffs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_config_environments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_config_environments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_consistency_checks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_consistency_checks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_dead_letter_queue' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_dead_letter_queue" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_dedup_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_dedup_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_dedup_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_dedup_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_deployment_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_deployment_steps" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_deployments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_deployments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_detection_models' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_detection_models" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_distributed_queries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_distributed_queries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_edge_cache' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_edge_cache" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_edge_deployments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_edge_deployments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_edge_entries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_edge_entries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_edge_functions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_edge_functions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_edge_replication' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_edge_replication" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_execution_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_execution_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_execution_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_execution_steps" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_federated_identities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_federated_identities" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_gateway_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_gateway_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_healing_actions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_healing_actions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_health_checks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_health_checks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_identity_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_identity_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_invalidation_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_invalidation_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_latency_stats' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_latency_stats" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_masking_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_masking_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_metrics' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_metrics" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_orchestration_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_orchestration_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_persisted_queries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_persisted_queries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_persisted_query_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_persisted_query_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_plan_steps' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_plan_steps" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_push_stats' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_push_stats" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_queue_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_queue_configs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_queue_messages' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_queue_messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_recovery_plans' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_recovery_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_replay_requests' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_replay_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_replay_results' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_replay_results" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_resolver_timings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_resolver_timings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_rollback_actions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_rollback_actions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_rollback_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_rollback_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_route_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_route_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_routing_decisions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_routing_decisions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_routing_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_routing_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_security_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_security_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_security_incidents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_security_incidents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_security_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_security_policies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_service_descriptors' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_service_descriptors" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_service_heartbeats' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_service_heartbeats" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_service_loads' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_service_loads" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_stream_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_stream_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_streams' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_streams" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_sub_queries' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_sub_queries" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_subscribers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_subscribers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_subscription_channels' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_subscription_channels" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_subscription_events' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_subscription_events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_subscription_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_subscription_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_traces' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_traces" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_trust_decisions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_trust_decisions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_version_mappings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_version_mappings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='portal' AND c.relname='portal_version_vectors' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "portal"."portal_version_vectors" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "dict_type_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "extra_data" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "name" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "parent_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_items" ADD COLUMN IF NOT EXISTS "value" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "category" character varying(100) NOT NULL DEFAULT 'general'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "code" character varying(100) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "name" character varying(200) NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_dict_types" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_faqs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_faqs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_file_permissions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_file_permissions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_guide_lessons' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_guide_lessons" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_guide_progress' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_guide_progress" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_guides' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_guides" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_master_data_change_log' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_master_data_change_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_master_data_event_outbox' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_master_data_event_outbox" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_mdm_approvals' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_mdm_approvals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_mdm_reconciliation_log' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_mdm_reconciliation_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_modules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_usage' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='permission_audit_logs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='sys_db_changes' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."sys_db_changes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "auto_sync" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "language" character varying(50) NOT NULL DEFAULT 'zh-CN'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "notification_enabled" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "sound_enabled" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "sync_interval" integer NOT NULL DEFAULT 300;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "theme" character varying(50) NOT NULL DEFAULT 'light'::character varying;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='user_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."user_settings" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_alert_messages' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_alert_messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_alert_messages' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_alert_messages" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_apqp_approvals' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_apqp_approvals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_apqp_phases' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_apqp_phases" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_apqp_projects' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_apqp_projects" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_apqp_risks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_apqp_risks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_apqp_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_apqp_tasks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qms' AND c.relname='qa_ehs_hazards' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "qms"."qa_ehs_hazards" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rd' AND c.relname='bugs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rd"."bugs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rd' AND c.relname='builds' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rd"."builds" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rd' AND c.relname='deploys' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rd"."deploys" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rd' AND c.relname='test_cases' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rd"."test_cases" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='ai_analyses' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."ai_analyses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='change_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."change_orders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='document_relations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."document_relations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='experiment_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."experiment_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='formula_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."formula_versions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='material_tests' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."material_tests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='module_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."module_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='patents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."patents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='project_members' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."project_members" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='project_milestones' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."project_milestones" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rs' AND c.relname='research_costs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "rs"."research_costs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='demand_forecast' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."demand_forecast" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='incoming_inspections' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."incoming_inspections" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='incoming_notices' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."incoming_notices" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='inspection_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."inspection_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='module_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."module_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='price_comparison_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."price_comparison_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='price_comparison_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."price_comparison_items" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='price_comparisons' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."price_comparisons" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='price_comparisons' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."price_comparisons" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='purchase_inquiry_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."purchase_inquiry_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='sales_order_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."sales_order_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='supplier_products' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."supplier_products" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='supplier_quote_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."supplier_quote_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='sync_record_details' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."sync_record_details" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='sync_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "scm"."sync_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='srm' AND c.relname='bid_requests' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "srm"."bid_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='srm' AND c.relname='bidding_suppliers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "srm"."bidding_suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='srm' AND c.relname='bids' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "srm"."bids" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='srm' AND c.relname='scoring_dimensions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "srm"."scoring_dimensions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "action" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "from_value" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "ticket_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "to_value" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "user_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "content" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "is_internal" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "ticket_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_name" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalated_to" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalation_time" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "reason" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "ticket_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_end" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_start" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_1" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_2" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_3" double precision;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_levels" integer NOT NULL DEFAULT 3;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "resolution_hours" double precision NOT NULL DEFAULT 72;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "response_hours" double precision NOT NULL DEFAULT 8;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "severity" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "ticket_type" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "weekend_excluded" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "working_hours_only" boolean NOT NULL DEFAULT false;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "reporter_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "severity" text NOT NULL DEFAULT 'medium'::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "sla_due_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "source_business_id" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "source_service" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'open'::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "tags" text[];
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_no" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_type" text NOT NULL DEFAULT 'incident'::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT ''::text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "action_type" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "action_value" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "condition_field" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "condition_value" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "description" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "enabled" boolean NOT NULL DEFAULT true;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 100;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_automation_rules" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "category" text;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "content" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "keywords" text[] NOT NULL DEFAULT '{}'::text[];
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "title" text NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "ticket"."ticket_knowledge_articles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tms' AND c.relname='tms_carriers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "tms"."tms_carriers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tms' AND c.relname='tms_drivers' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "tms"."tms_drivers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tms' AND c.relname='tms_routes' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "tms"."tms_routes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tms' AND c.relname='tms_shipments' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "tms"."tms_shipments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tms' AND c.relname='tms_vehicles' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "tms"."tms_vehicles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='unified_core' AND c.relname='inter_module_sync' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "unified_core"."inter_module_sync" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='batches' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."batches" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='cycle_count_configs' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."cycle_count_configs" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='discrepancy_records' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."discrepancy_records" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='inventory' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."inventory" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='labor_shifts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."labor_shifts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='labor_shifts' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."labor_shifts" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='locations' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."locations" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_order_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_order_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_orders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_orders" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_rules' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_rules" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_suggestions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_suggestions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_suggestions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_suggestions" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='replenishment_suggestions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."replenishment_suggestions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='safety_stock_settings' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."safety_stock_settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='stock_take_items' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."stock_take_items" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='stock_takes' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."stock_takes" ADD COLUMN IF NOT EXISTS "org_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='warehouses' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "wms"."warehouses" ADD COLUMN IF NOT EXISTS "org_id" uuid;
    END IF;
END $$;
