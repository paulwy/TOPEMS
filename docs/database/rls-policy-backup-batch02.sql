-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch02
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 44   涉及表: 40   schema: analytics, bi, core, rs
--
-- 使用说明:
--   1) 上半段为「现状快照」，即本次盘点时点的等效 DDL，全部以注释形式记录，不执行。
--   2) 下半段每条的「回滚段」为可执行语句：把该策略的 USING / WITH CHECK 恢复为下方原文。
--   3) 表达式取自 pg_policies.qual / with_check；换行已折叠为单空格，语义与原文一致。
--   4) ALTER POLICY 只能改 USING / WITH CHECK / roles；permissive 与 cmd 不可变更。
--      本批收口只动 USING / WITH CHECK，故 ALTER 足够回滚；若 M-2 动作涉及 cmd/permissive，
--      回滚必须 DROP POLICY + CREATE POLICY，届时另出脚本。
--   5) 所有策略当前均为 PERMISSIVE、roles=public、relkind=普通表（见每条头注释）。
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 一、现状快照（等效 DDL，仅注释，勿执行）
-- --------------------------------------------------------------------------

-- [B02-001] analytics.analytics_comparison_analyses | tenant_isolation_analytics_comparison_analyses
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_comparison_analyses" ON "analytics"."analytics_comparison_analyses" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-002] analytics.analytics_comparison_results | tenant_isolation_analytics_comparison_results
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_comparison_results" ON "analytics"."analytics_comparison_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-003] analytics.analytics_dashboard_shares | tenant_isolation_analytics_dashboard_shares
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_dashboard_shares" ON "analytics"."analytics_dashboard_shares" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-004] analytics.analytics_dashboard_templates | tenant_isolation_analytics_dashboard_templates
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_dashboard_templates" ON "analytics"."analytics_dashboard_templates" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-005] analytics.analytics_dashboards | tenant_isolation_analytics_dashboards
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_dashboards" ON "analytics"."analytics_dashboards" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-006] analytics.analytics_datasources | tenant_isolation_analytics_datasources
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_datasources" ON "analytics"."analytics_datasources" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-007] analytics.analytics_drilldown_history | tenant_isolation_analytics_drilldown_history
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_drilldown_history" ON "analytics"."analytics_drilldown_history" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-008] analytics.analytics_drilldown_paths | tenant_isolation_analytics_drilldown_paths
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_drilldown_paths" ON "analytics"."analytics_drilldown_paths" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-009] analytics.analytics_row_level_permissions | tenant_isolation_analytics_row_level_permissions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_row_level_permissions" ON "analytics"."analytics_row_level_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-010] analytics.analytics_self_service_reports | tenant_isolation_analytics_self_service_reports
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_self_service_reports" ON "analytics"."analytics_self_service_reports" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-011] analytics.analytics_widgets | tenant_isolation_analytics_widgets
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_analytics_widgets" ON "analytics"."analytics_widgets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B02-012] bi.analytics_dashboards | tenant_isolation_analytics_dashboards
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_analytics_dashboards" ON "bi"."analytics_dashboards" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-013] bi.analytics_datasets | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "bi"."analytics_datasets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-014] bi.analytics_datasets | tenant_isolation_analytics_datasets
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_analytics_datasets" ON "bi"."analytics_datasets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-015] bi.analytics_datasources | tenant_isolation_analytics_datasources
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_analytics_datasources" ON "bi"."analytics_datasources" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-016] bi.analytics_widgets | tenant_isolation_analytics_widgets
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_analytics_widgets" ON "bi"."analytics_widgets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-017] bi.report_schedules | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "bi"."report_schedules" AS PERMISSIVE FOR ALL TO public
--     USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B02-018] bi.report_templates | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "bi"."report_templates" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B02-019] bi.report_templates | tenant_isolation_report_templates
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_report_templates" ON "bi"."report_templates" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B02-020] bi.reports | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "bi"."reports" AS PERMISSIVE FOR ALL TO public
--     USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B02-021] core.ai_conversations | ai_conversations_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=18
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "ai_conversations_tenant_isolation" ON "core"."ai_conversations" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR ((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid)))
--     WITH CHECK (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR ((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid)))
--   ;

-- [B02-022] core.ai_conversations | tenant_isolation_ai_conversations
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=18
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_ai_conversations" ON "core"."ai_conversations" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-023] core.ai_faqs | tenant_isolation_core_ai_faqs
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=15
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_core_ai_faqs" ON "core"."ai_faqs" AS PERMISSIVE FOR ALL TO public
--     USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B02-024] core.knowledge_bases | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "core"."knowledge_bases" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-025] core.knowledge_chunks | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "core"."knowledge_chunks" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-026] core.knowledge_documents | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "core"."knowledge_documents" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-027] core.knowledge_qa_history | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "core"."knowledge_qa_history" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-028] core.user_preferences | tenant_isolation_user_preferences
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_user_preferences" ON "core"."user_preferences" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-029] rs.audit_logs | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B02-030] rs.change_orders | tenant_isolation_change_orders
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_change_orders" ON "rs"."change_orders" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-031] rs.change_requests | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."change_requests" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-032] rs.change_requests | tenant_isolation_change_requests
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_change_requests" ON "rs"."change_requests" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B02-033] rs.experiments | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."experiments" AS PERMISSIVE FOR ALL TO public
--     USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B02-034] rs.formula_versions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."formula_versions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-035] rs.formulas | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."formulas" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B02-036] rs.material_tests | tenant_isolation_material_tests
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_material_tests" ON "rs"."material_tests" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-037] rs.module_settings | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "rs"."module_settings" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B02-038] rs.project_members | tenant_isolation_project_members
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_project_members" ON "rs"."project_members" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-039] rs.project_milestones | tenant_isolation_project_milestones
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_project_milestones" ON "rs"."project_milestones" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-040] rs.project_phases | tenant_isolation_project_phases
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_project_phases" ON "rs"."project_phases" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-041] rs.projects | tenant_isolation_projects
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_projects" ON "rs"."projects" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-042] rs.rs_experiments | tenant_isolation_rs_experiments
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_rs_experiments" ON "rs"."rs_experiments" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-043] rs.rs_formulas | tenant_isolation_rs_formulas
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_rs_formulas" ON "rs"."rs_formulas" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B02-044] rs.rs_projects | tenant_isolation_rs_projects
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_rs_projects" ON "rs"."rs_projects" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B02-001] 回滚 analytics.analytics_comparison_analyses | tenant_isolation_analytics_comparison_analyses
ALTER POLICY "tenant_isolation_analytics_comparison_analyses" ON "analytics"."analytics_comparison_analyses" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-002] 回滚 analytics.analytics_comparison_results | tenant_isolation_analytics_comparison_results
ALTER POLICY "tenant_isolation_analytics_comparison_results" ON "analytics"."analytics_comparison_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-003] 回滚 analytics.analytics_dashboard_shares | tenant_isolation_analytics_dashboard_shares
ALTER POLICY "tenant_isolation_analytics_dashboard_shares" ON "analytics"."analytics_dashboard_shares" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-004] 回滚 analytics.analytics_dashboard_templates | tenant_isolation_analytics_dashboard_templates
ALTER POLICY "tenant_isolation_analytics_dashboard_templates" ON "analytics"."analytics_dashboard_templates" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-005] 回滚 analytics.analytics_dashboards | tenant_isolation_analytics_dashboards
ALTER POLICY "tenant_isolation_analytics_dashboards" ON "analytics"."analytics_dashboards" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-006] 回滚 analytics.analytics_datasources | tenant_isolation_analytics_datasources
ALTER POLICY "tenant_isolation_analytics_datasources" ON "analytics"."analytics_datasources" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-007] 回滚 analytics.analytics_drilldown_history | tenant_isolation_analytics_drilldown_history
ALTER POLICY "tenant_isolation_analytics_drilldown_history" ON "analytics"."analytics_drilldown_history" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-008] 回滚 analytics.analytics_drilldown_paths | tenant_isolation_analytics_drilldown_paths
ALTER POLICY "tenant_isolation_analytics_drilldown_paths" ON "analytics"."analytics_drilldown_paths" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-009] 回滚 analytics.analytics_row_level_permissions | tenant_isolation_analytics_row_level_permissions
ALTER POLICY "tenant_isolation_analytics_row_level_permissions" ON "analytics"."analytics_row_level_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-010] 回滚 analytics.analytics_self_service_reports | tenant_isolation_analytics_self_service_reports
ALTER POLICY "tenant_isolation_analytics_self_service_reports" ON "analytics"."analytics_self_service_reports" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-011] 回滚 analytics.analytics_widgets | tenant_isolation_analytics_widgets
ALTER POLICY "tenant_isolation_analytics_widgets" ON "analytics"."analytics_widgets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B02-012] 回滚 bi.analytics_dashboards | tenant_isolation_analytics_dashboards
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_analytics_dashboards" ON "bi"."analytics_dashboards" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-013] 回滚 bi.analytics_datasets | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "bi"."analytics_datasets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-014] 回滚 bi.analytics_datasets | tenant_isolation_analytics_datasets
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_analytics_datasets" ON "bi"."analytics_datasets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-015] 回滚 bi.analytics_datasources | tenant_isolation_analytics_datasources
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_analytics_datasources" ON "bi"."analytics_datasources" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-016] 回滚 bi.analytics_widgets | tenant_isolation_analytics_widgets
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_analytics_widgets" ON "bi"."analytics_widgets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-017] 回滚 bi.report_schedules | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "bi"."report_schedules" TO public
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B02-018] 回滚 bi.report_templates | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "bi"."report_templates" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B02-019] 回滚 bi.report_templates | tenant_isolation_report_templates
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_report_templates" ON "bi"."report_templates" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B02-020] 回滚 bi.reports | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "bi"."reports" TO public
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B02-021] 回滚 core.ai_conversations | ai_conversations_tenant_isolation
ALTER POLICY "ai_conversations_tenant_isolation" ON "core"."ai_conversations" TO public
    USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR ((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid)))
    WITH CHECK (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR ((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid)));

-- [B02-022] 回滚 core.ai_conversations | tenant_isolation_ai_conversations
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_ai_conversations" ON "core"."ai_conversations" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-023] 回滚 core.ai_faqs | tenant_isolation_core_ai_faqs
ALTER POLICY "tenant_isolation_core_ai_faqs" ON "core"."ai_faqs" TO public
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B02-024] 回滚 core.knowledge_bases | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "core"."knowledge_bases" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-025] 回滚 core.knowledge_chunks | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "core"."knowledge_chunks" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-026] 回滚 core.knowledge_documents | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "core"."knowledge_documents" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-027] 回滚 core.knowledge_qa_history | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "core"."knowledge_qa_history" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-028] 回滚 core.user_preferences | tenant_isolation_user_preferences
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_user_preferences" ON "core"."user_preferences" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-029] 回滚 rs.audit_logs | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "rs"."audit_logs" TO public
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B02-030] 回滚 rs.change_orders | tenant_isolation_change_orders
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_change_orders" ON "rs"."change_orders" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-031] 回滚 rs.change_requests | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "rs"."change_requests" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-032] 回滚 rs.change_requests | tenant_isolation_change_requests
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_change_requests" ON "rs"."change_requests" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B02-033] 回滚 rs.experiments | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "rs"."experiments" TO public
    USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B02-034] 回滚 rs.formula_versions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "rs"."formula_versions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-035] 回滚 rs.formulas | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "rs"."formulas" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B02-036] 回滚 rs.material_tests | tenant_isolation_material_tests
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_material_tests" ON "rs"."material_tests" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-037] 回滚 rs.module_settings | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "rs"."module_settings" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B02-038] 回滚 rs.project_members | tenant_isolation_project_members
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_project_members" ON "rs"."project_members" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-039] 回滚 rs.project_milestones | tenant_isolation_project_milestones
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_project_milestones" ON "rs"."project_milestones" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-040] 回滚 rs.project_phases | tenant_isolation_project_phases
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_project_phases" ON "rs"."project_phases" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-041] 回滚 rs.projects | tenant_isolation_projects
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_projects" ON "rs"."projects" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-042] 回滚 rs.rs_experiments | tenant_isolation_rs_experiments
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_rs_experiments" ON "rs"."rs_experiments" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-043] 回滚 rs.rs_formulas | tenant_isolation_rs_formulas
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_rs_formulas" ON "rs"."rs_formulas" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B02-044] 回滚 rs.rs_projects | tenant_isolation_rs_projects
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_rs_projects" ON "rs"."rs_projects" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- 文件结束：batch02（44 条）
