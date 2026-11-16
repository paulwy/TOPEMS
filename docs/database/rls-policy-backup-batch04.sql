-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch04
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 46   涉及表: 27   schema: qms
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

-- [B04-001] qms.qa_alert_messages | tenant_isolation_qa_alert_messages
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_qa_alert_messages" ON "qms"."qa_alert_messages" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B04-002] qms.qa_alert_rules | tenant_isolation_qa_alert_rules
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_alert_rules" ON "qms"."qa_alert_rules" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B04-003] qms.qa_approval_events | tenant_isolation_qa_approval_events
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_approval_events" ON "qms"."qa_approval_events" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B04-004] qms.qa_apqp_phases | tenant_isolation_qa_apqp_phases
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_apqp_phases" ON "qms"."qa_apqp_phases" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B04-005] qms.qa_apqp_projects | tenant_isolation_qa_apqp_projects
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_qa_apqp_projects" ON "qms"."qa_apqp_projects" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))))
--   ;

-- [B04-006] qms.qa_apqp_risks | tenant_isolation_qa_apqp_risks
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_apqp_risks" ON "qms"."qa_apqp_risks" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B04-007] qms.qa_apqp_tasks | tenant_isolation_qa_apqp_tasks
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_apqp_tasks" ON "qms"."qa_apqp_tasks" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B04-008] qms.qa_audit_findings | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_audit_findings" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-009] qms.qa_audit_findings | tenant_isolation_qa_audit_findings
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_audit_findings" ON "qms"."qa_audit_findings" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-010] qms.qa_audit_plans | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_audit_plans" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-011] qms.qa_audit_plans | tenant_isolation_qa_audit_plans
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_audit_plans" ON "qms"."qa_audit_plans" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-012] qms.qa_audit_tasks | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_audit_tasks" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-013] qms.qa_audit_tasks | tenant_isolation_qa_audit_tasks
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_audit_tasks" ON "qms"."qa_audit_tasks" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-014] qms.qa_corrective_action_items | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_corrective_action_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-015] qms.qa_corrective_action_items | tenant_isolation_qa_corrective_action_items
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_corrective_action_items" ON "qms"."qa_corrective_action_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-016] qms.qa_corrective_actions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_corrective_actions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-017] qms.qa_corrective_actions | tenant_isolation_qa_corrective_actions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_corrective_actions" ON "qms"."qa_corrective_actions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-018] qms.qa_ehs_hazards | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_ehs_hazards" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B04-019] qms.qa_eightd_audit_logs | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=0
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_eightd_audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-020] qms.qa_eightd_audit_logs | tenant_isolation_qa_eightd_audit_logs
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=0
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_eightd_audit_logs" ON "qms"."qa_eightd_audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-021] qms.qa_eightd_reports | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_eightd_reports" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-022] qms.qa_eightd_reports | tenant_isolation_qa_eightd_reports
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_eightd_reports" ON "qms"."qa_eightd_reports" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-023] qms.qa_fmea_analyses | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_fmea_analyses" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-024] qms.qa_fmea_analyses | tenant_isolation_qa_fmea_analyses
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_fmea_analyses" ON "qms"."qa_fmea_analyses" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-025] qms.qa_fmea_items | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_fmea_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-026] qms.qa_fmea_items | tenant_isolation_qa_fmea_items
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_fmea_items" ON "qms"."qa_fmea_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-027] qms.qa_inspection_audits | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_inspection_audits" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-028] qms.qa_inspection_audits | tenant_isolation_qa_inspection_audits
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_inspection_audits" ON "qms"."qa_inspection_audits" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-029] qms.qa_inspection_results | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_inspection_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-030] qms.qa_inspection_results | tenant_isolation_qa_inspection_results
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_inspection_results" ON "qms"."qa_inspection_results" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-031] qms.qa_qms_sync_records | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_qms_sync_records" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-032] qms.qa_qms_sync_records | tenant_isolation_qa_qms_sync_records
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_qms_sync_records" ON "qms"."qa_qms_sync_records" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-033] qms.qa_quality_costs | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_quality_costs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-034] qms.qa_quality_costs | tenant_isolation_qa_quality_costs
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_quality_costs" ON "qms"."qa_quality_costs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-035] qms.qa_quality_inspections | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_quality_inspections" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-036] qms.qa_quality_inspections | tenant_isolation_qa_quality_inspections
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_quality_inspections" ON "qms"."qa_quality_inspections" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-037] qms.qa_quality_issues | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_quality_issues" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-038] qms.qa_quality_issues | tenant_isolation_qa_quality_issues
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_quality_issues" ON "qms"."qa_quality_issues" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-039] qms.qa_spc_charts | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_spc_charts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-040] qms.qa_spc_charts | tenant_isolation_qa_spc_charts
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_spc_charts" ON "qms"."qa_spc_charts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-041] qms.qa_spc_data_points | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_spc_data_points" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-042] qms.qa_spc_data_points | tenant_isolation_qa_spc_data_points
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_spc_data_points" ON "qms"."qa_spc_data_points" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-043] qms.qa_standard_revisions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_standard_revisions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-044] qms.qa_standard_revisions | tenant_isolation_qa_standard_revisions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_standard_revisions" ON "qms"."qa_standard_revisions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B04-045] qms.qa_standards | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "qms"."qa_standards" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B04-046] qms.qa_standards | tenant_isolation_qa_standards
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_qa_standards" ON "qms"."qa_standards" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B04-001] 回滚 qms.qa_alert_messages | tenant_isolation_qa_alert_messages
ALTER POLICY "tenant_isolation_qa_alert_messages" ON "qms"."qa_alert_messages" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B04-002] 回滚 qms.qa_alert_rules | tenant_isolation_qa_alert_rules
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_alert_rules" ON "qms"."qa_alert_rules" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B04-003] 回滚 qms.qa_approval_events | tenant_isolation_qa_approval_events
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_approval_events" ON "qms"."qa_approval_events" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B04-004] 回滚 qms.qa_apqp_phases | tenant_isolation_qa_apqp_phases
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_apqp_phases" ON "qms"."qa_apqp_phases" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B04-005] 回滚 qms.qa_apqp_projects | tenant_isolation_qa_apqp_projects
ALTER POLICY "tenant_isolation_qa_apqp_projects" ON "qms"."qa_apqp_projects" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))));

-- [B04-006] 回滚 qms.qa_apqp_risks | tenant_isolation_qa_apqp_risks
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_apqp_risks" ON "qms"."qa_apqp_risks" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B04-007] 回滚 qms.qa_apqp_tasks | tenant_isolation_qa_apqp_tasks
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_apqp_tasks" ON "qms"."qa_apqp_tasks" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B04-008] 回滚 qms.qa_audit_findings | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_audit_findings" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-009] 回滚 qms.qa_audit_findings | tenant_isolation_qa_audit_findings
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_audit_findings" ON "qms"."qa_audit_findings" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-010] 回滚 qms.qa_audit_plans | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_audit_plans" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-011] 回滚 qms.qa_audit_plans | tenant_isolation_qa_audit_plans
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_audit_plans" ON "qms"."qa_audit_plans" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-012] 回滚 qms.qa_audit_tasks | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_audit_tasks" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-013] 回滚 qms.qa_audit_tasks | tenant_isolation_qa_audit_tasks
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_audit_tasks" ON "qms"."qa_audit_tasks" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-014] 回滚 qms.qa_corrective_action_items | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_corrective_action_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-015] 回滚 qms.qa_corrective_action_items | tenant_isolation_qa_corrective_action_items
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_corrective_action_items" ON "qms"."qa_corrective_action_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-016] 回滚 qms.qa_corrective_actions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_corrective_actions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-017] 回滚 qms.qa_corrective_actions | tenant_isolation_qa_corrective_actions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_corrective_actions" ON "qms"."qa_corrective_actions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-018] 回滚 qms.qa_ehs_hazards | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_ehs_hazards" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B04-019] 回滚 qms.qa_eightd_audit_logs | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_eightd_audit_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-020] 回滚 qms.qa_eightd_audit_logs | tenant_isolation_qa_eightd_audit_logs
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_eightd_audit_logs" ON "qms"."qa_eightd_audit_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-021] 回滚 qms.qa_eightd_reports | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_eightd_reports" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-022] 回滚 qms.qa_eightd_reports | tenant_isolation_qa_eightd_reports
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_eightd_reports" ON "qms"."qa_eightd_reports" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-023] 回滚 qms.qa_fmea_analyses | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_fmea_analyses" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-024] 回滚 qms.qa_fmea_analyses | tenant_isolation_qa_fmea_analyses
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_fmea_analyses" ON "qms"."qa_fmea_analyses" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-025] 回滚 qms.qa_fmea_items | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_fmea_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-026] 回滚 qms.qa_fmea_items | tenant_isolation_qa_fmea_items
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_fmea_items" ON "qms"."qa_fmea_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-027] 回滚 qms.qa_inspection_audits | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_inspection_audits" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-028] 回滚 qms.qa_inspection_audits | tenant_isolation_qa_inspection_audits
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_inspection_audits" ON "qms"."qa_inspection_audits" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-029] 回滚 qms.qa_inspection_results | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_inspection_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-030] 回滚 qms.qa_inspection_results | tenant_isolation_qa_inspection_results
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_inspection_results" ON "qms"."qa_inspection_results" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-031] 回滚 qms.qa_qms_sync_records | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_qms_sync_records" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-032] 回滚 qms.qa_qms_sync_records | tenant_isolation_qa_qms_sync_records
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_qms_sync_records" ON "qms"."qa_qms_sync_records" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-033] 回滚 qms.qa_quality_costs | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_quality_costs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-034] 回滚 qms.qa_quality_costs | tenant_isolation_qa_quality_costs
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_quality_costs" ON "qms"."qa_quality_costs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-035] 回滚 qms.qa_quality_inspections | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_quality_inspections" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-036] 回滚 qms.qa_quality_inspections | tenant_isolation_qa_quality_inspections
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_quality_inspections" ON "qms"."qa_quality_inspections" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-037] 回滚 qms.qa_quality_issues | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_quality_issues" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-038] 回滚 qms.qa_quality_issues | tenant_isolation_qa_quality_issues
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_quality_issues" ON "qms"."qa_quality_issues" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-039] 回滚 qms.qa_spc_charts | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_spc_charts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-040] 回滚 qms.qa_spc_charts | tenant_isolation_qa_spc_charts
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_spc_charts" ON "qms"."qa_spc_charts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-041] 回滚 qms.qa_spc_data_points | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_spc_data_points" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-042] 回滚 qms.qa_spc_data_points | tenant_isolation_qa_spc_data_points
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_spc_data_points" ON "qms"."qa_spc_data_points" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-043] 回滚 qms.qa_standard_revisions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_standard_revisions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-044] 回滚 qms.qa_standard_revisions | tenant_isolation_qa_standard_revisions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_standard_revisions" ON "qms"."qa_standard_revisions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B04-045] 回滚 qms.qa_standards | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "qms"."qa_standards" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B04-046] 回滚 qms.qa_standards | tenant_isolation_qa_standards
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_qa_standards" ON "qms"."qa_standards" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- 文件结束：batch04（46 条）
