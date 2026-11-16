-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch03
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 41   涉及表: 29   schema: crm, iam
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

-- [B03-001] crm.contacts | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."contacts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-002] crm.contacts | tenant_isolation_contacts
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_contacts" ON "crm"."contacts" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-003] crm.contracts | tenant_isolation_contracts
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_contracts" ON "crm"."contracts" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-004] crm.customer_finance | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."customer_finance" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-005] crm.customer_finance | tenant_isolation_customer_finance
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_customer_finance" ON "crm"."customer_finance" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-006] crm.customer_orders | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."customer_orders" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-007] crm.customer_recommendations | tenant_isolation_customer_recommendations
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_customer_recommendations" ON "crm"."customer_recommendations" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
--     WITH CHECK ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
--   ;

-- [B03-008] crm.customer_scores | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."customer_scores" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-009] crm.customer_segments | tenant_isolation_customer_segments
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_customer_segments" ON "crm"."customer_segments" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
--     WITH CHECK ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
--   ;

-- [B03-010] crm.customer_tags | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."customer_tags" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-011] crm.customer_tags | tenant_isolation_customer_tags
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_customer_tags" ON "crm"."customer_tags" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-012] crm.interactions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."interactions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-013] crm.interactions | tenant_isolation_interactions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_interactions" ON "crm"."interactions" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-014] crm.opportunities | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."opportunities" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-015] crm.opportunities | tenant_isolation_opportunities
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_opportunities" ON "crm"."opportunities" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-016] crm.return_items | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."return_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-017] crm.sales_forecasts | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."sales_forecasts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-018] crm.sales_orders | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."sales_orders" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-019] crm.tags | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "crm"."tags" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-020] crm.tags | tenant_isolation_tags
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_tags" ON "crm"."tags" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--     WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-021] iam.crm_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."crm_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-022] iam.data_permissions | tenant_isolation_data_permissions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_data_permissions" ON "iam"."data_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-023] iam.ehs_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."ehs_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-024] iam.hrm_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."hrm_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-025] iam.lims_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."lims_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-026] iam.pdm_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."pdm_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-027] iam.permission_audit_logs | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."permission_audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
--   ;

-- [B03-028] iam.permission_audit_logs | tenant_isolation_permission_audit_logs
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_permission_audit_logs" ON "iam"."permission_audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B03-029] iam.permission_templates | tenant_isolation_permission_templates
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_permission_templates" ON "iam"."permission_templates" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B03-030] iam.position_permissions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."position_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-031] iam.position_permissions | tenant_isolation_position_permissions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_position_permissions" ON "iam"."position_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-032] iam.position_roles | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."position_roles" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-033] iam.position_roles | tenant_isolation_position_roles
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_position_roles" ON "iam"."position_roles" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-034] iam.positions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."positions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-035] iam.positions | tenant_isolation_positions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_positions" ON "iam"."positions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-036] iam.resource_permissions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."resource_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-037] iam.resource_permissions | tenant_isolation_resource_permissions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_resource_permissions" ON "iam"."resource_permissions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-038] iam.tenant_users | tenant_isolation_tenant_users
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_tenant_users" ON "iam"."tenant_users" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B03-039] iam.user_positions | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."user_positions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B03-040] iam.user_positions | tenant_isolation_user_positions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_user_positions" ON "iam"."user_positions" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B03-041] iam.wms_dashboard_snapshots | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "iam"."wms_dashboard_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B03-001] 回滚 crm.contacts | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."contacts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-002] 回滚 crm.contacts | tenant_isolation_contacts
ALTER POLICY "tenant_isolation_contacts" ON "crm"."contacts" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-003] 回滚 crm.contracts | tenant_isolation_contracts
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_contracts" ON "crm"."contracts" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-004] 回滚 crm.customer_finance | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."customer_finance" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-005] 回滚 crm.customer_finance | tenant_isolation_customer_finance
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_customer_finance" ON "crm"."customer_finance" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-006] 回滚 crm.customer_orders | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."customer_orders" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-007] 回滚 crm.customer_recommendations | tenant_isolation_customer_recommendations
ALTER POLICY "tenant_isolation_customer_recommendations" ON "crm"."customer_recommendations" TO public
    USING ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
    WITH CHECK ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- [B03-008] 回滚 crm.customer_scores | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."customer_scores" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-009] 回滚 crm.customer_segments | tenant_isolation_customer_segments
ALTER POLICY "tenant_isolation_customer_segments" ON "crm"."customer_segments" TO public
    USING ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)))
    WITH CHECK ((tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- [B03-010] 回滚 crm.customer_tags | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."customer_tags" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-011] 回滚 crm.customer_tags | tenant_isolation_customer_tags
ALTER POLICY "tenant_isolation_customer_tags" ON "crm"."customer_tags" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-012] 回滚 crm.interactions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."interactions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-013] 回滚 crm.interactions | tenant_isolation_interactions
ALTER POLICY "tenant_isolation_interactions" ON "crm"."interactions" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-014] 回滚 crm.opportunities | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."opportunities" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-015] 回滚 crm.opportunities | tenant_isolation_opportunities
ALTER POLICY "tenant_isolation_opportunities" ON "crm"."opportunities" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-016] 回滚 crm.return_items | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."return_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-017] 回滚 crm.sales_forecasts | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."sales_forecasts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-018] 回滚 crm.sales_orders | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."sales_orders" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-019] 回滚 crm.tags | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "crm"."tags" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-020] 回滚 crm.tags | tenant_isolation_tags
ALTER POLICY "tenant_isolation_tags" ON "crm"."tags" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
    WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-021] 回滚 iam.crm_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."crm_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-022] 回滚 iam.data_permissions | tenant_isolation_data_permissions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_data_permissions" ON "iam"."data_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-023] 回滚 iam.ehs_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."ehs_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-024] 回滚 iam.hrm_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."hrm_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-025] 回滚 iam.lims_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."lims_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-026] 回滚 iam.pdm_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."pdm_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-027] 回滚 iam.permission_audit_logs | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "iam"."permission_audit_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));

-- [B03-028] 回滚 iam.permission_audit_logs | tenant_isolation_permission_audit_logs
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_permission_audit_logs" ON "iam"."permission_audit_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B03-029] 回滚 iam.permission_templates | tenant_isolation_permission_templates
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_permission_templates" ON "iam"."permission_templates" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B03-030] 回滚 iam.position_permissions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."position_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-031] 回滚 iam.position_permissions | tenant_isolation_position_permissions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_position_permissions" ON "iam"."position_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-032] 回滚 iam.position_roles | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."position_roles" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-033] 回滚 iam.position_roles | tenant_isolation_position_roles
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_position_roles" ON "iam"."position_roles" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-034] 回滚 iam.positions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."positions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-035] 回滚 iam.positions | tenant_isolation_positions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_positions" ON "iam"."positions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-036] 回滚 iam.resource_permissions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."resource_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-037] 回滚 iam.resource_permissions | tenant_isolation_resource_permissions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_resource_permissions" ON "iam"."resource_permissions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-038] 回滚 iam.tenant_users | tenant_isolation_tenant_users
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_tenant_users" ON "iam"."tenant_users" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B03-039] 回滚 iam.user_positions | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."user_positions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B03-040] 回滚 iam.user_positions | tenant_isolation_user_positions
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_user_positions" ON "iam"."user_positions" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B03-041] 回滚 iam.wms_dashboard_snapshots | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "iam"."wms_dashboard_snapshots" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 文件结束：batch03（41 条）
