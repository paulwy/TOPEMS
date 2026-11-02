-- RLS 工程 batch2：盘点外增量业务表 2 张补启 RLS（2026-11-02，幂等 DO 块，列类型适配）
-- 依据：docs/security/rls-gap-inventory-20261102.md 复核（batch1 遗漏 + 实时核对增量）
-- 覆盖：mes.work_orders、mobile.documents（tenant_id 均为 uuid，标准比较形态）

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='work_orders' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON mes.work_orders USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE mes.work_orders ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mobile' AND tablename='documents' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON mobile.documents USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE mobile.documents ENABLE ROW LEVEL SECURITY;
