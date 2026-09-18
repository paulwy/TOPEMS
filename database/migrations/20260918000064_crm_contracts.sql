-- TOPEMS database migration 20260918000064
-- 补建 crm.contracts（5433 已有、5432 缺失；远端 crm 解码改动暴露 list 500）
-- DDL 对齐 5433，幂等且双库安全。

CREATE TABLE IF NOT EXISTS crm.contracts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL,
    org_id        uuid,
    contract_no   text NOT NULL,
    title         text NOT NULL,
    customer_name text,
    amount        numeric(15,2),
    status        text DEFAULT 'draft',
    sign_date     date,
    start_date    date,
    end_date      date,
    owner         text,
    type          text,
    remark        text,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now(),
    deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_customer ON crm.contracts (customer_name);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_no ON crm.contracts (contract_no);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_status ON crm.contracts (status);
