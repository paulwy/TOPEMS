-- crm contracts 表（2026-09-16）
-- 背景：CrmContractRedesignPage 前端页面在役（apiClient.crm GET/POST/PUT /contracts），
--       此前后端 crm 未实现（页面带 mock 降级，api-boundary allowlist 登记 known_gap），
--       本迁移补齐后端落点并转 matched。
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.contracts 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='contracts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='contracts' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.contracts;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.contracts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL,
    org_id         UUID,
    contract_no    TEXT NOT NULL,
    title          TEXT NOT NULL,
    customer_name  TEXT,
    amount         NUMERIC(15,2),
    status         TEXT DEFAULT 'draft',
    sign_date      DATE,
    start_date     DATE,
    end_date       DATE,
    owner          TEXT,
    type           TEXT,
    remark         TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_tenant   ON crm.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_no       ON crm.contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_customer ON crm.contracts(customer_name);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_status   ON crm.contracts(status);

-- RLS（对齐 crm 现有表：app.tenant_id 归一 + tenant_isolation 兼容策略）
ALTER TABLE crm.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_tenant_policy ON crm.contracts;
CREATE POLICY contracts_tenant_policy ON crm.contracts
    USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)
        OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));

DROP POLICY IF EXISTS tenant_isolation_contracts ON crm.contracts;
CREATE POLICY tenant_isolation_contracts ON crm.contracts
    USING (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL));
