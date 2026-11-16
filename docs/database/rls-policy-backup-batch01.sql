-- ==========================================================================
-- RLS 宽松策略现状快照 + 回滚脚本 —— B3/B4 收口批次 batch01
-- 仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）
--
-- 生成时间: 2026-11-16   数据源: topems_prod（只读：pg_policies / pg_class / pg_namespace）
-- 本批策略条数: 21   涉及表: 20   schema: communication, plugin_finance, plugin_mes, portal, ticket, tms, unified_core
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

-- [B01-001] communication.core_email_templates | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "communication"."core_email_templates" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-002] communication.core_notification_deliveries | notification_deliveries_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "notification_deliveries_tenant_isolation" ON "communication"."core_notification_deliveries" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)))
--   ;

-- [B01-003] communication.core_notification_preferences | notification_preferences_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "notification_preferences_tenant_isolation" ON "communication"."core_notification_preferences" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)))
--   ;

-- [B01-004] communication.core_notification_subscriptions | notification_subscriptions_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "notification_subscriptions_tenant_isolation" ON "communication"."core_notification_subscriptions" AS PERMISSIVE FOR ALL TO public
--     USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)))
--   ;

-- [B01-005] communication.notification_channels | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "communication"."notification_channels" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-006] communication.notification_channels | tenant_isolation_notification_channels
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_notification_channels" ON "communication"."notification_channels" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B01-007] plugin_finance.accounting_subjects | tenant_isolation_accounting_subjects
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_accounting_subjects" ON "plugin_finance"."accounting_subjects" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))))
--   ;

-- [B01-008] plugin_finance.difference_adjustments | tenant_isolation_difference_adjustments
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_difference_adjustments" ON "plugin_finance"."difference_adjustments" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B01-009] plugin_finance.reconciliation_item_snapshots | tenant_isolation_reconciliation_item_snapshots
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_reconciliation_item_snapshots" ON "plugin_finance"."reconciliation_item_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B01-010] plugin_finance.reconciliation_settlement_links | tenant_isolation_reconciliation_settlement_links
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_reconciliation_settlement_links" ON "plugin_finance"."reconciliation_settlement_links" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B01-011] plugin_finance.reconciliation_snapshots | tenant_isolation_reconciliation_snapshots
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_reconciliation_snapshots" ON "plugin_finance"."reconciliation_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B01-012] plugin_finance.settlement_snapshots | tenant_isolation_settlement_snapshots
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_settlement_snapshots" ON "plugin_finance"."settlement_snapshots" AS PERMISSIVE FOR ALL TO public
--     USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))
--   ;

-- [B01-013] plugin_mes.audit_logs | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "plugin_mes"."audit_logs" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-014] portal.portal_dashboard_stats | tenant_isolation_portal_dashboard_stats
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_portal_dashboard_stats" ON "portal"."portal_dashboard_stats" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B01-015] portal.portal_notifications | tenant_isolation_portal_notifications
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_portal_notifications" ON "portal"."portal_notifications" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B01-016] ticket.ticket_attachments | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "rls_tenant_isolation" ON "ticket"."ticket_attachments" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-017] tms.carriers | tenant_isolation_carriers
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_carriers" ON "tms"."carriers" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B01-018] tms.drivers | tenant_isolation_drivers
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 无（ALL 策略沿用 USING 表达式）
-- CREATE POLICY "tenant_isolation_drivers" ON "tms"."drivers" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))))
--   ;

-- [B01-019] tms.tms_routes | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "tms"."tms_routes" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-020] tms.tms_shipments | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "tms"."tms_shipments" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;

-- [B01-021] unified_core.inter_module_sync | rls_tenant_isolation
--   cmd=ALL  permissive=PERMISSIVE  roles={public}  RLS=on  FORCE=on  reltuples=-1
--   WITH CHECK: 有（原文见下）
-- CREATE POLICY "rls_tenant_isolation" ON "unified_core"."inter_module_sync" AS PERMISSIVE FOR ALL TO public
--     USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--     WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
--   ;


-- --------------------------------------------------------------------------
-- 二、回滚脚本（恢复本批策略到上述原文；需 M-2 窗口与审批，勿直接执行）
-- --------------------------------------------------------------------------

-- [B01-001] 回滚 communication.core_email_templates | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "communication"."core_email_templates" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-002] 回滚 communication.core_notification_deliveries | notification_deliveries_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "notification_deliveries_tenant_isolation" ON "communication"."core_notification_deliveries" TO public
    USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));

-- [B01-003] 回滚 communication.core_notification_preferences | notification_preferences_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "notification_preferences_tenant_isolation" ON "communication"."core_notification_preferences" TO public
    USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));

-- [B01-004] 回滚 communication.core_notification_subscriptions | notification_subscriptions_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "notification_subscriptions_tenant_isolation" ON "communication"."core_notification_subscriptions" TO public
    USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));

-- [B01-005] 回滚 communication.notification_channels | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "communication"."notification_channels" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-006] 回滚 communication.notification_channels | tenant_isolation_notification_channels
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_notification_channels" ON "communication"."notification_channels" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B01-007] 回滚 plugin_finance.accounting_subjects | tenant_isolation_accounting_subjects
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_accounting_subjects" ON "plugin_finance"."accounting_subjects" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))));

-- [B01-008] 回滚 plugin_finance.difference_adjustments | tenant_isolation_difference_adjustments
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_difference_adjustments" ON "plugin_finance"."difference_adjustments" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B01-009] 回滚 plugin_finance.reconciliation_item_snapshots | tenant_isolation_reconciliation_item_snapshots
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_reconciliation_item_snapshots" ON "plugin_finance"."reconciliation_item_snapshots" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B01-010] 回滚 plugin_finance.reconciliation_settlement_links | tenant_isolation_reconciliation_settlement_links
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_reconciliation_settlement_links" ON "plugin_finance"."reconciliation_settlement_links" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B01-011] 回滚 plugin_finance.reconciliation_snapshots | tenant_isolation_reconciliation_snapshots
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_reconciliation_snapshots" ON "plugin_finance"."reconciliation_snapshots" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B01-012] 回滚 plugin_finance.settlement_snapshots | tenant_isolation_settlement_snapshots
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_settlement_snapshots" ON "plugin_finance"."settlement_snapshots" TO public
    USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));

-- [B01-013] 回滚 plugin_mes.audit_logs | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "plugin_mes"."audit_logs" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-014] 回滚 portal.portal_dashboard_stats | tenant_isolation_portal_dashboard_stats
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_portal_dashboard_stats" ON "portal"."portal_dashboard_stats" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B01-015] 回滚 portal.portal_notifications | tenant_isolation_portal_notifications
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_portal_notifications" ON "portal"."portal_notifications" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B01-016] 回滚 ticket.ticket_attachments | rls_tenant_isolation
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "rls_tenant_isolation" ON "ticket"."ticket_attachments" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-017] 回滚 tms.carriers | tenant_isolation_carriers
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_carriers" ON "tms"."carriers" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B01-018] 回滚 tms.drivers | tenant_isolation_drivers
-- 原策略无 WITH CHECK（ALL），按 PostgreSQL 语义沿用 USING 表达式；回滚只需回到 USING 原文。
ALTER POLICY "tenant_isolation_drivers" ON "tms"."drivers" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));

-- [B01-019] 回滚 tms.tms_routes | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "tms"."tms_routes" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-020] 回滚 tms.tms_shipments | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "tms"."tms_shipments" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- [B01-021] 回滚 unified_core.inter_module_sync | rls_tenant_isolation
ALTER POLICY "rls_tenant_isolation" ON "unified_core"."inter_module_sync" TO public
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 文件结束：batch01（21 条）
