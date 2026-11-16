-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch08
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 27   涉及表: 20   schema: erp
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

-- [B08-001] erp.announcements | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."announcements" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-002] erp.announcements | tenant_isolation_announcements
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_announcements" ON "erp"."announcements" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B08-003] erp.assets | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."assets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-004] erp.assets | tenant_isolation_assets
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_assets" ON "erp"."assets" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-005] erp.bank_accounts | tenant_isolation_bank_accounts
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_bank_accounts" ON "erp"."bank_accounts" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B08-006] erp.company_relations | tenant_isolation_company_relations
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_company_relations" ON "erp"."company_relations" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-007] erp.consolidation_report_lines | tenant_isolation_consolidation_report_lines
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_consolidation_report_lines" ON "erp"."consolidation_report_lines" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-008] erp.consolidation_reports | tenant_isolation_consolidation_reports
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_consolidation_reports" ON "erp"."consolidation_reports" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-009] erp.consolidation_scope_companies | tenant_isolation_consolidation_scope_companies
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_consolidation_scope_companies" ON "erp"."consolidation_scope_companies" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-010] erp.consolidation_scopes | tenant_isolation_consolidation_scopes
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_consolidation_scopes" ON "erp"."consolidation_scopes" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-011] erp.documents | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."documents" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-012] erp.elimination_candidates | tenant_isolation_elimination_candidates
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_elimination_candidates" ON "erp"."elimination_candidates" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-013] erp.elimination_rules | tenant_isolation_elimination_rules
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_elimination_rules" ON "erp"."elimination_rules" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-014] erp.erp_production_orders | tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation" ON "erp"."erp_production_orders" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
--     WITH CHECK ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
--   ;

-- [B08-015] erp.fin_reconciliations | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."fin_reconciliations" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-016] erp.fin_reconciliations | tenant_isolation_fin_reconciliations
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_fin_reconciliations" ON "erp"."fin_reconciliations" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-017] erp.internal_transactions | tenant_isolation_internal_transactions
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "tenant_isolation_internal_transactions" ON "erp"."internal_transactions" AS PERMISSIVE FOR ALL TO public
--     USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-018] erp.inventory | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."inventory" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-019] erp.inventory | tenant_isolation_inventory
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_inventory" ON "erp"."inventory" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-020] erp.inventory_items | tenant_isolation_inventory_items
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_inventory_items" ON "erp"."inventory_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B08-021] erp.materials | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."materials" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-022] erp.materials | tenant_isolation_materials
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_materials" ON "erp"."materials" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-023] erp.purchase_orders | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."purchase_orders" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-024] erp.purchase_orders | tenant_isolation_purchase_orders
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_purchase_orders" ON "erp"."purchase_orders" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-025] erp.voucher_items | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."voucher_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B08-026] erp.voucher_items | tenant_isolation_voucher_items
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_voucher_items" ON "erp"."voucher_items" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B08-027] erp.vouchers | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "erp"."vouchers" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B08-001] 回滚 erp.announcements | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."announcements" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-002] 回滚 erp.announcements | tenant_isolation_announcements
ALTER POLICY "tenant_isolation_announcements" ON "erp"."announcements" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B08-003] 回滚 erp.assets | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."assets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-004] 回滚 erp.assets | tenant_isolation_assets
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_assets" ON "erp"."assets" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-005] 回滚 erp.bank_accounts | tenant_isolation_bank_accounts
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_bank_accounts" ON "erp"."bank_accounts" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B08-006] 回滚 erp.company_relations | tenant_isolation_company_relations
ALTER POLICY "tenant_isolation_company_relations" ON "erp"."company_relations" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-007] 回滚 erp.consolidation_report_lines | tenant_isolation_consolidation_report_lines
ALTER POLICY "tenant_isolation_consolidation_report_lines" ON "erp"."consolidation_report_lines" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-008] 回滚 erp.consolidation_reports | tenant_isolation_consolidation_reports
ALTER POLICY "tenant_isolation_consolidation_reports" ON "erp"."consolidation_reports" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-009] 回滚 erp.consolidation_scope_companies | tenant_isolation_consolidation_scope_companies
ALTER POLICY "tenant_isolation_consolidation_scope_companies" ON "erp"."consolidation_scope_companies" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-010] 回滚 erp.consolidation_scopes | tenant_isolation_consolidation_scopes
ALTER POLICY "tenant_isolation_consolidation_scopes" ON "erp"."consolidation_scopes" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-011] 回滚 erp.documents | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."documents" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-012] 回滚 erp.elimination_candidates | tenant_isolation_elimination_candidates
ALTER POLICY "tenant_isolation_elimination_candidates" ON "erp"."elimination_candidates" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-013] 回滚 erp.elimination_rules | tenant_isolation_elimination_rules
ALTER POLICY "tenant_isolation_elimination_rules" ON "erp"."elimination_rules" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-014] 回滚 erp.erp_production_orders | tenant_isolation
ALTER POLICY "tenant_isolation" ON "erp"."erp_production_orders" TO public
    USING ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
    WITH CHECK ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid));

-- [B08-015] 回滚 erp.fin_reconciliations | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."fin_reconciliations" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-016] 回滚 erp.fin_reconciliations | tenant_isolation_fin_reconciliations
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_fin_reconciliations" ON "erp"."fin_reconciliations" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-017] 回滚 erp.internal_transactions | tenant_isolation_internal_transactions
ALTER POLICY "tenant_isolation_internal_transactions" ON "erp"."internal_transactions" TO public
    USING ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK ((tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-018] 回滚 erp.inventory | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."inventory" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-019] 回滚 erp.inventory | tenant_isolation_inventory
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_inventory" ON "erp"."inventory" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-020] 回滚 erp.inventory_items | tenant_isolation_inventory_items
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_inventory_items" ON "erp"."inventory_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B08-021] 回滚 erp.materials | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."materials" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-022] 回滚 erp.materials | tenant_isolation_materials
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_materials" ON "erp"."materials" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-023] 回滚 erp.purchase_orders | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."purchase_orders" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-024] 回滚 erp.purchase_orders | tenant_isolation_purchase_orders
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_purchase_orders" ON "erp"."purchase_orders" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-025] 回滚 erp.voucher_items | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."voucher_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B08-026] 回滚 erp.voucher_items | tenant_isolation_voucher_items
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_voucher_items" ON "erp"."voucher_items" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B08-027] 回滚 erp.vouchers | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "erp"."vouchers" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 文件结束：batch08（27 条）
