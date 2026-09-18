-- ============================================================================
-- 补齐 bi/rs schema 的 analytics 表 tenant_id 列（幂等，表存在守卫）
-- 背景：远端代码修复 101 处 INSERT 缺 tenant_id，暴露 analytics 表结构缺口；
--       analytics 服务 SEARCH_PATH=bi,public、embedded 含 rs → 运行时解析到 bi/rs 表。
-- 守卫：5433 重建库无 analytics 表（应用自建）→ DO 块整体跳过；5432 补列生效。
-- 幂等：ADD COLUMN IF NOT EXISTS。
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_comparison_analyses' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_comparison_analyses ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_comparison_results' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_comparison_results ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_dashboard_shares' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_dashboard_shares ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_dashboard_templates' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_dashboard_templates ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_dashboards' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_dashboards ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_datasources' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_datasources ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_drilldown_history' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_drilldown_history ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_drilldown_paths' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_drilldown_paths ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_row_level_permissions' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_row_level_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_self_service_reports' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_self_service_reports ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='analytics_widgets' AND c.relkind='r') THEN
    ALTER TABLE bi.analytics_widgets ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_comparison_analyses' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_comparison_analyses ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_comparison_results' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_comparison_results ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_dashboard_shares' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_dashboard_shares ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_dashboard_templates' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_dashboard_templates ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_dashboards' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_dashboards ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_datasources' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_datasources ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_drilldown_history' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_drilldown_history ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_drilldown_paths' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_drilldown_paths ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_row_level_permissions' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_row_level_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_self_service_reports' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_self_service_reports ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='analytics_widgets' AND c.relkind='r') THEN
    ALTER TABLE rs.analytics_widgets ADD COLUMN IF NOT EXISTS tenant_id uuid;
  END IF;
END $$;
