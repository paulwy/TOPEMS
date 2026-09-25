-- TOPEMS database migration 20260918000051
-- 1) 补建 finance.accounting_subjects（双库均缺；DDL 按 AccountingSubject 模型 + create INSERT 列）
-- 2) mes.equipment ADD COLUMN description text（create INSERT 绑定该列）
-- 3) hrm.companies.tenant_id NOT NULL 无默认，create INSERT 不绑定 → 设默认单租户
-- DO 块动态判断，幂等且双库安全。

CREATE TABLE IF NOT EXISTS finance.accounting_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    code varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    category varchar(64),
    level integer DEFAULT 1 NOT NULL,
    parent_code varchar(64),
    description text,
    is_cash_flow boolean DEFAULT false NOT NULL,
    status varchar(32) DEFAULT 'active' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    tenant_id uuid
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'finance.accounting_subjects'::regclass AND conname = 'accounting_subjects_pkey') THEN
        ALTER TABLE ONLY finance.accounting_subjects ADD CONSTRAINT accounting_subjects_pkey PRIMARY KEY (id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='mes' AND table_name='equipment')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='mes' AND table_name='equipment' AND column_name='description') THEN
        ALTER TABLE mes.equipment ADD COLUMN description text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='hrm' AND table_name='companies' AND column_name='tenant_id'
                 AND is_nullable='NO' AND column_default IS NULL) THEN
        ALTER TABLE hrm.companies
            ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;
