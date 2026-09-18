-- ticket.core_tickets 补齐 RLS 租户隔离（V514 安全修复）
-- 背景：ticket 其余 6 张表（comments/activities/sla_policies/sla_escalations/
-- automation_rules/knowledge_articles）均已在 20260908000016/17/18 启用 RLS
-- 并 FORCE + rls_tenant_isolation 策略，唯独主表 core_tickets 遗漏，
-- 存在跨租户工单数据泄露风险。本迁移幂等补齐。
-- 策略语义与既有表一致：无租户上下文/空/nil → 放行（管理通道）；
-- tenant_id IS NULL → 共享行；其余按 app.tenant_id 隔离。

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'ticket' AND table_name = 'core_tickets'
    ) AND EXISTS (
        -- 2026-09-18 防御化（空库重建链卡点）：骨架表无 tenant_id 列时跳过策略
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'ticket' AND table_name = 'core_tickets'
          AND column_name = 'tenant_id'
    ) THEN
        EXECUTE 'ALTER TABLE ticket.core_tickets ENABLE ROW LEVEL SECURITY';
        EXECUTE 'ALTER TABLE ticket.core_tickets FORCE ROW LEVEL SECURITY';

        EXECUTE $policy$DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_tickets$policy$;
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON ticket.core_tickets USING (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
