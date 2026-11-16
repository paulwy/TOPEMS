-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch07
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 95   涉及表: 85   schema: master_data
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

-- [B07-001] master_data.materials | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."materials" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-002] master_data.materials | tenant_isolation_materials
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_materials" ON "master_data"."materials" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-003] master_data.mdm_ai_models | tenant_isolation_mdm_ai_models
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_ai_models" ON "master_data"."mdm_ai_models" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-004] master_data.mdm_ai_models | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_models" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-005] master_data.mdm_ai_suggestions | tenant_isolation_mdm_ai_suggestions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_ai_suggestions" ON "master_data"."mdm_ai_suggestions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-006] master_data.mdm_ai_suggestions | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_suggestions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-007] master_data.mdm_api_exposures | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_api_exposures" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-008] master_data.mdm_api_products | mdm_api_products_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_api_products_tenant_policy" ON "master_data"."mdm_api_products" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-009] master_data.mdm_assets | mdm_assets_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_assets_tenant_policy" ON "master_data"."mdm_assets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-010] master_data.mdm_audit_events | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_events" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-011] master_data.mdm_audit_export_logs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=7
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_export_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-012] master_data.mdm_auto_fix_actions | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_auto_fix_actions" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-013] master_data.mdm_bc_tests | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_bc_tests" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-014] master_data.mdm_billing_records | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."mdm_billing_records" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-015] master_data.mdm_change_events | mdm_change_events_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_change_events_tenant_policy" ON "master_data"."mdm_change_events" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-016] master_data.mdm_classification_models | tenant_isolation_mdm_classification_models
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_classification_models" ON "master_data"."mdm_classification_models" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-017] master_data.mdm_classification_models | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_models" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-018] master_data.mdm_classification_results | tenant_isolation_mdm_classification_results
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=4
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_classification_results" ON "master_data"."mdm_classification_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-019] master_data.mdm_classification_results | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=4
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-020] master_data.mdm_classifier_rules | tenant_isolation_mdm_classifier_rules
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_classifier_rules" ON "master_data"."mdm_classifier_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-021] master_data.mdm_classifier_rules | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classifier_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-022] master_data.mdm_continuity_plans | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_continuity_plans" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-023] master_data.mdm_critical_functions | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_critical_functions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-024] master_data.mdm_data_asset_categories | mdm_data_asset_categories_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_data_asset_categories_tenant_policy" ON "master_data"."mdm_data_asset_categories" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-025] master_data.mdm_data_contracts | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_contracts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-026] master_data.mdm_data_permissions | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-027] master_data.mdm_data_products | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=2
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_products" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-028] master_data.mdm_dimension_scores | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_dimension_scores" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-029] master_data.mdm_failover_records | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_failover_records" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-030] master_data.mdm_fix_strategies | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_fix_strategies" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-031] master_data.mdm_governance_insights | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_insights" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-032] master_data.mdm_governance_suggestions | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_suggestions" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-033] master_data.mdm_graph_communities | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_communities" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-034] master_data.mdm_graph_edges | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_edges" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-035] master_data.mdm_graph_nodes | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_nodes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-036] master_data.mdm_impact_analyses | mdm_impact_analyses_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_impact_analyses_tenant_policy" ON "master_data"."mdm_impact_analyses" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-037] master_data.mdm_impact_simulations | mdm_impact_simulations_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_impact_simulations_tenant_policy" ON "master_data"."mdm_impact_simulations" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-038] master_data.mdm_improvement_plans | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_improvement_plans" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-039] master_data.mdm_interactions | mdm_interactions_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_interactions_tenant_policy" ON "master_data"."mdm_interactions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-040] master_data.mdm_kg_edges | mdm_kg_edges_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_kg_edges_tenant_policy" ON "master_data"."mdm_kg_edges" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-041] master_data.mdm_kg_graphs | mdm_kg_graphs_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_kg_graphs_tenant_policy" ON "master_data"."mdm_kg_graphs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-042] master_data.mdm_kg_nodes | mdm_kg_nodes_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_kg_nodes_tenant_policy" ON "master_data"."mdm_kg_nodes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-043] master_data.mdm_lifecycle_history | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_history" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-044] master_data.mdm_lifecycle_policies | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_policies" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-045] master_data.mdm_lifecycle_stages | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_stages" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-046] master_data.mdm_lineage_edges | mdm_lineage_edges_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_lineage_edges_tenant_policy" ON "master_data"."mdm_lineage_edges" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-047] master_data.mdm_lineage_graphs | mdm_lineage_graphs_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_lineage_graphs_tenant_policy" ON "master_data"."mdm_lineage_graphs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-048] master_data.mdm_lineage_nodes | mdm_lineage_nodes_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_lineage_nodes_tenant_policy" ON "master_data"."mdm_lineage_nodes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-049] master_data.mdm_match_results | tenant_isolation_mdm_match_results
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_match_results" ON "master_data"."mdm_match_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-050] master_data.mdm_match_results | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-051] master_data.mdm_match_rules | tenant_isolation_mdm_match_rules
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_mdm_match_rules" ON "master_data"."mdm_match_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B07-052] master_data.mdm_match_rules | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
--   ;

-- [B07-053] master_data.mdm_maturity_assessments | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_assessments" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-054] master_data.mdm_maturity_history | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_history" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-055] master_data.mdm_metadata_attributes | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_attributes" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-056] master_data.mdm_metadata_objects | mdm_metadata_objects_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=2
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_metadata_objects_tenant_policy" ON "master_data"."mdm_metadata_objects" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-057] master_data.mdm_metadata_tags | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_tags" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-058] master_data.mdm_permission_roles | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_permission_roles" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-059] master_data.mdm_propagation_logs | mdm_propagation_logs_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_propagation_logs_tenant_policy" ON "master_data"."mdm_propagation_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-060] master_data.mdm_propagation_rules | mdm_propagation_rules_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_propagation_rules_tenant_policy" ON "master_data"."mdm_propagation_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-061] master_data.mdm_quality_checks | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_checks" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-062] master_data.mdm_quality_loop_configs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_loop_configs" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-063] master_data.mdm_rate_cards | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_rate_cards" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-064] master_data.mdm_recommendations | mdm_recommendations_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_recommendations_tenant_policy" ON "master_data"."mdm_recommendations" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-065] master_data.mdm_recovery_plans | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_plans" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-066] master_data.mdm_recovery_points | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_points" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-067] master_data.mdm_region_configs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_region_configs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-068] master_data.mdm_replication_configs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_replication_configs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-069] master_data.mdm_search_history | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_search_history" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-070] master_data.mdm_search_indexes | mdm_search_indexes_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_search_indexes_tenant_policy" ON "master_data"."mdm_search_indexes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-071] master_data.mdm_semantic_search_indexes | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_semantic_search_indexes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-072] master_data.mdm_sla_configs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_sla_configs" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-073] master_data.mdm_sla_incidents | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."mdm_sla_incidents" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-074] master_data.mdm_sla_measurements | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."mdm_sla_measurements" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-075] master_data.mdm_subscriptions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."mdm_subscriptions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-076] master_data.mdm_supplier_categories | tenant_isolation_mdm_supplier_categories
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_mdm_supplier_categories" ON "master_data"."mdm_supplier_categories" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-077] master_data.mdm_suppliers | tenant_isolation_mdm_suppliers
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_mdm_suppliers" ON "master_data"."mdm_suppliers" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-078] master_data.mdm_sync_dead_letter | tenant_isolation_mdm_sync_dead_letter
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_mdm_sync_dead_letter" ON "master_data"."mdm_sync_dead_letter" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-079] master_data.mdm_tag_rules | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_tag_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-080] master_data.mdm_tagged_entities | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_tagged_entities" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-081] master_data.mdm_tags | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_tags" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-082] master_data.mdm_usage_records | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."mdm_usage_records" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-083] master_data.mdm_user_role_assignments | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_user_role_assignments" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-084] master_data.mdm_v60_lineage_edges | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_edges" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-085] master_data.mdm_v60_lineage_graphs | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_graphs" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-086] master_data.mdm_v60_lineage_nodes | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_nodes" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-087] master_data.mdm_version_branches | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_version_branches" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B07-088] master_data.mdm_version_snapshots | mdm_version_snapshots_tenant_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "mdm_version_snapshots_tenant_policy" ON "master_data"."mdm_version_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-089] master_data.mdm_workflow_history | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_history" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-090] master_data.mdm_workflow_templates | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_templates" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-091] master_data.mdm_workflows | tenant_isolation_policy
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflows" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B07-092] master_data.samples | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."samples" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-093] master_data.samples | tenant_isolation_samples
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_samples" ON "master_data"."samples" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-094] master_data.uoms | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "master_data"."uoms" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B07-095] master_data.uoms | tenant_isolation_uoms
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_uoms" ON "master_data"."uoms" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B07-001] 回滚 master_data.materials | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "master_data"."materials" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-002] 回滚 master_data.materials | tenant_isolation_materials
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_materials" ON "master_data"."materials" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-003] 回滚 master_data.mdm_ai_models | tenant_isolation_mdm_ai_models
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_ai_models" ON "master_data"."mdm_ai_models" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-004] 回滚 master_data.mdm_ai_models | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_models" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-005] 回滚 master_data.mdm_ai_suggestions | tenant_isolation_mdm_ai_suggestions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_ai_suggestions" ON "master_data"."mdm_ai_suggestions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-006] 回滚 master_data.mdm_ai_suggestions | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_suggestions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-007] 回滚 master_data.mdm_api_exposures | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_api_exposures" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-008] 回滚 master_data.mdm_api_products | mdm_api_products_tenant_policy
ALTER POLICY "mdm_api_products_tenant_policy" ON "master_data"."mdm_api_products" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-009] 回滚 master_data.mdm_assets | mdm_assets_tenant_policy
ALTER POLICY "mdm_assets_tenant_policy" ON "master_data"."mdm_assets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-010] 回滚 master_data.mdm_audit_events | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_events" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-011] 回滚 master_data.mdm_audit_export_logs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_export_logs" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-012] 回滚 master_data.mdm_auto_fix_actions | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_auto_fix_actions" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-013] 回滚 master_data.mdm_bc_tests | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_bc_tests" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-014] 回滚 master_data.mdm_billing_records | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "master_data"."mdm_billing_records" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-015] 回滚 master_data.mdm_change_events | mdm_change_events_tenant_policy
ALTER POLICY "mdm_change_events_tenant_policy" ON "master_data"."mdm_change_events" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-016] 回滚 master_data.mdm_classification_models | tenant_isolation_mdm_classification_models
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_classification_models" ON "master_data"."mdm_classification_models" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-017] 回滚 master_data.mdm_classification_models | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_models" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-018] 回滚 master_data.mdm_classification_results | tenant_isolation_mdm_classification_results
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_classification_results" ON "master_data"."mdm_classification_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-019] 回滚 master_data.mdm_classification_results | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-020] 回滚 master_data.mdm_classifier_rules | tenant_isolation_mdm_classifier_rules
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_classifier_rules" ON "master_data"."mdm_classifier_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-021] 回滚 master_data.mdm_classifier_rules | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_classifier_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-022] 回滚 master_data.mdm_continuity_plans | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_continuity_plans" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-023] 回滚 master_data.mdm_critical_functions | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_critical_functions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-024] 回滚 master_data.mdm_data_asset_categories | mdm_data_asset_categories_tenant_policy
ALTER POLICY "mdm_data_asset_categories_tenant_policy" ON "master_data"."mdm_data_asset_categories" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-025] 回滚 master_data.mdm_data_contracts | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_contracts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-026] 回滚 master_data.mdm_data_permissions | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_permissions" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-027] 回滚 master_data.mdm_data_products | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_products" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-028] 回滚 master_data.mdm_dimension_scores | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_dimension_scores" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-029] 回滚 master_data.mdm_failover_records | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_failover_records" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-030] 回滚 master_data.mdm_fix_strategies | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_fix_strategies" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-031] 回滚 master_data.mdm_governance_insights | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_insights" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-032] 回滚 master_data.mdm_governance_suggestions | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_suggestions" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-033] 回滚 master_data.mdm_graph_communities | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_communities" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-034] 回滚 master_data.mdm_graph_edges | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_edges" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-035] 回滚 master_data.mdm_graph_nodes | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_nodes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-036] 回滚 master_data.mdm_impact_analyses | mdm_impact_analyses_tenant_policy
ALTER POLICY "mdm_impact_analyses_tenant_policy" ON "master_data"."mdm_impact_analyses" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-037] 回滚 master_data.mdm_impact_simulations | mdm_impact_simulations_tenant_policy
ALTER POLICY "mdm_impact_simulations_tenant_policy" ON "master_data"."mdm_impact_simulations" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-038] 回滚 master_data.mdm_improvement_plans | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_improvement_plans" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-039] 回滚 master_data.mdm_interactions | mdm_interactions_tenant_policy
ALTER POLICY "mdm_interactions_tenant_policy" ON "master_data"."mdm_interactions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-040] 回滚 master_data.mdm_kg_edges | mdm_kg_edges_tenant_policy
ALTER POLICY "mdm_kg_edges_tenant_policy" ON "master_data"."mdm_kg_edges" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-041] 回滚 master_data.mdm_kg_graphs | mdm_kg_graphs_tenant_policy
ALTER POLICY "mdm_kg_graphs_tenant_policy" ON "master_data"."mdm_kg_graphs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-042] 回滚 master_data.mdm_kg_nodes | mdm_kg_nodes_tenant_policy
ALTER POLICY "mdm_kg_nodes_tenant_policy" ON "master_data"."mdm_kg_nodes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-043] 回滚 master_data.mdm_lifecycle_history | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_history" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-044] 回滚 master_data.mdm_lifecycle_policies | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_policies" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-045] 回滚 master_data.mdm_lifecycle_stages | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_stages" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-046] 回滚 master_data.mdm_lineage_edges | mdm_lineage_edges_tenant_policy
ALTER POLICY "mdm_lineage_edges_tenant_policy" ON "master_data"."mdm_lineage_edges" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-047] 回滚 master_data.mdm_lineage_graphs | mdm_lineage_graphs_tenant_policy
ALTER POLICY "mdm_lineage_graphs_tenant_policy" ON "master_data"."mdm_lineage_graphs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-048] 回滚 master_data.mdm_lineage_nodes | mdm_lineage_nodes_tenant_policy
ALTER POLICY "mdm_lineage_nodes_tenant_policy" ON "master_data"."mdm_lineage_nodes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-049] 回滚 master_data.mdm_match_results | tenant_isolation_mdm_match_results
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_match_results" ON "master_data"."mdm_match_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-050] 回滚 master_data.mdm_match_results | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-051] 回滚 master_data.mdm_match_rules | tenant_isolation_mdm_match_rules
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_mdm_match_rules" ON "master_data"."mdm_match_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B07-052] 回滚 master_data.mdm_match_rules | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))));

-- [B07-053] 回滚 master_data.mdm_maturity_assessments | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_assessments" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-054] 回滚 master_data.mdm_maturity_history | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_history" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-055] 回滚 master_data.mdm_metadata_attributes | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_attributes" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-056] 回滚 master_data.mdm_metadata_objects | mdm_metadata_objects_tenant_policy
ALTER POLICY "mdm_metadata_objects_tenant_policy" ON "master_data"."mdm_metadata_objects" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-057] 回滚 master_data.mdm_metadata_tags | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_tags" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-058] 回滚 master_data.mdm_permission_roles | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_permission_roles" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-059] 回滚 master_data.mdm_propagation_logs | mdm_propagation_logs_tenant_policy
ALTER POLICY "mdm_propagation_logs_tenant_policy" ON "master_data"."mdm_propagation_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-060] 回滚 master_data.mdm_propagation_rules | mdm_propagation_rules_tenant_policy
ALTER POLICY "mdm_propagation_rules_tenant_policy" ON "master_data"."mdm_propagation_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-061] 回滚 master_data.mdm_quality_checks | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_checks" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-062] 回滚 master_data.mdm_quality_loop_configs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_loop_configs" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-063] 回滚 master_data.mdm_rate_cards | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_rate_cards" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-064] 回滚 master_data.mdm_recommendations | mdm_recommendations_tenant_policy
ALTER POLICY "mdm_recommendations_tenant_policy" ON "master_data"."mdm_recommendations" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-065] 回滚 master_data.mdm_recovery_plans | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_plans" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-066] 回滚 master_data.mdm_recovery_points | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_points" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-067] 回滚 master_data.mdm_region_configs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_region_configs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-068] 回滚 master_data.mdm_replication_configs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_replication_configs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-069] 回滚 master_data.mdm_search_history | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_search_history" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-070] 回滚 master_data.mdm_search_indexes | mdm_search_indexes_tenant_policy
ALTER POLICY "mdm_search_indexes_tenant_policy" ON "master_data"."mdm_search_indexes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-071] 回滚 master_data.mdm_semantic_search_indexes | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_semantic_search_indexes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-072] 回滚 master_data.mdm_sla_configs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_sla_configs" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-073] 回滚 master_data.mdm_sla_incidents | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "master_data"."mdm_sla_incidents" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-074] 回滚 master_data.mdm_sla_measurements | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "master_data"."mdm_sla_measurements" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-075] 回滚 master_data.mdm_subscriptions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "master_data"."mdm_subscriptions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-076] 回滚 master_data.mdm_supplier_categories | tenant_isolation_mdm_supplier_categories
ALTER POLICY "tenant_isolation_mdm_supplier_categories" ON "master_data"."mdm_supplier_categories" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-077] 回滚 master_data.mdm_suppliers | tenant_isolation_mdm_suppliers
ALTER POLICY "tenant_isolation_mdm_suppliers" ON "master_data"."mdm_suppliers" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-078] 回滚 master_data.mdm_sync_dead_letter | tenant_isolation_mdm_sync_dead_letter
ALTER POLICY "tenant_isolation_mdm_sync_dead_letter" ON "master_data"."mdm_sync_dead_letter" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-079] 回滚 master_data.mdm_tag_rules | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tag_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-080] 回滚 master_data.mdm_tagged_entities | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tagged_entities" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-081] 回滚 master_data.mdm_tags | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tags" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-082] 回滚 master_data.mdm_usage_records | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "master_data"."mdm_usage_records" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-083] 回滚 master_data.mdm_user_role_assignments | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_user_role_assignments" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-084] 回滚 master_data.mdm_v60_lineage_edges | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_edges" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-085] 回滚 master_data.mdm_v60_lineage_graphs | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_graphs" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-086] 回滚 master_data.mdm_v60_lineage_nodes | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_nodes" TO public
    USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-087] 回滚 master_data.mdm_version_branches | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_version_branches" TO public
    USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B07-088] 回滚 master_data.mdm_version_snapshots | mdm_version_snapshots_tenant_policy
ALTER POLICY "mdm_version_snapshots_tenant_policy" ON "master_data"."mdm_version_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-089] 回滚 master_data.mdm_workflow_history | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_history" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-090] 回滚 master_data.mdm_workflow_templates | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_templates" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-091] 回滚 master_data.mdm_workflows | tenant_isolation_policy
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflows" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B07-092] 回滚 master_data.samples | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "master_data"."samples" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-093] 回滚 master_data.samples | tenant_isolation_samples
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_samples" ON "master_data"."samples" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-094] 回滚 master_data.uoms | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "master_data"."uoms" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B07-095] 回滚 master_data.uoms | tenant_isolation_uoms
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_uoms" ON "master_data"."uoms" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 文件结束：batch07（95 条）
