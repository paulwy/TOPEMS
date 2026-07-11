-- Add tenant_id to PM tables for multi-tenant support
-- Data initialization and RLS policies

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'projects' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.projects ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_phases' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_phases ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_milestones' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_milestones ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_members' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_members ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_resources' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_resources ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_expenses' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_expenses ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_benefits' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_benefits ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'budgets' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.budgets ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'risks' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.risks ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_approvals' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_approvals ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'contracts' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.contracts ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'quality_checks' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.quality_checks ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'acceptances' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.acceptances ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'settlements' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.settlements ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'documents' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.documents ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'notifications' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.notifications ADD COLUMN tenant_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pm' AND table_name = 'project_type_configs' AND column_name = 'tenant_id') THEN
        ALTER TABLE pm.project_type_configs ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Data initialization: populate tenant_id from organization_id or parent tables
UPDATE pm.projects SET tenant_id = organization_id WHERE tenant_id IS NULL;
UPDATE pm.project_phases pp SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pp.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_milestones pm SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pm.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_members pm SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pm.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_resources pr SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pr.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_expenses pe SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pe.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_benefits pb SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pb.project_id) WHERE tenant_id IS NULL;
UPDATE pm.budgets b SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = b.project_id) WHERE tenant_id IS NULL;
UPDATE pm.risks r SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = r.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_approvals pa SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = pa.project_id) WHERE tenant_id IS NULL;
UPDATE pm.contracts c SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = c.project_id) WHERE tenant_id IS NULL;
UPDATE pm.quality_checks qc SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = qc.project_id) WHERE tenant_id IS NULL;
UPDATE pm.acceptances a SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = a.project_id) WHERE tenant_id IS NULL;
UPDATE pm.settlements s SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = s.project_id) WHERE tenant_id IS NULL;
UPDATE pm.documents d SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = d.project_id) WHERE tenant_id IS NULL;
UPDATE pm.notifications n SET tenant_id = (SELECT p.tenant_id FROM pm.projects p WHERE p.id = n.project_id) WHERE tenant_id IS NULL;
UPDATE pm.project_type_configs SET tenant_id = organization_id WHERE tenant_id IS NULL;

-- Set NOT NULL constraints
ALTER TABLE pm.projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_phases ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_milestones ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_members ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_resources ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_benefits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.budgets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.risks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_approvals ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.contracts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.quality_checks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.acceptances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.settlements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pm.project_type_configs ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'projects' AND indexname = 'idx_projects_tenant') THEN
        CREATE INDEX idx_projects_tenant ON pm.projects(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_phases' AND indexname = 'idx_project_phases_tenant') THEN
        CREATE INDEX idx_project_phases_tenant ON pm.project_phases(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_milestones' AND indexname = 'idx_project_milestones_tenant') THEN
        CREATE INDEX idx_project_milestones_tenant ON pm.project_milestones(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_members' AND indexname = 'idx_project_members_tenant') THEN
        CREATE INDEX idx_project_members_tenant ON pm.project_members(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_resources' AND indexname = 'idx_project_resources_tenant') THEN
        CREATE INDEX idx_project_resources_tenant ON pm.project_resources(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_expenses' AND indexname = 'idx_project_expenses_tenant') THEN
        CREATE INDEX idx_project_expenses_tenant ON pm.project_expenses(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_benefits' AND indexname = 'idx_project_benefits_tenant') THEN
        CREATE INDEX idx_project_benefits_tenant ON pm.project_benefits(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'budgets' AND indexname = 'idx_budgets_tenant') THEN
        CREATE INDEX idx_budgets_tenant ON pm.budgets(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'risks' AND indexname = 'idx_risks_tenant') THEN
        CREATE INDEX idx_risks_tenant ON pm.risks(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_approvals' AND indexname = 'idx_project_approvals_tenant') THEN
        CREATE INDEX idx_project_approvals_tenant ON pm.project_approvals(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'contracts' AND indexname = 'idx_contracts_tenant') THEN
        CREATE INDEX idx_contracts_tenant ON pm.contracts(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'quality_checks' AND indexname = 'idx_quality_checks_tenant') THEN
        CREATE INDEX idx_quality_checks_tenant ON pm.quality_checks(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'acceptances' AND indexname = 'idx_acceptances_tenant') THEN
        CREATE INDEX idx_acceptances_tenant ON pm.acceptances(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'settlements' AND indexname = 'idx_settlements_tenant') THEN
        CREATE INDEX idx_settlements_tenant ON pm.settlements(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'documents' AND indexname = 'idx_documents_tenant') THEN
        CREATE INDEX idx_documents_tenant ON pm.documents(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'notifications' AND indexname = 'idx_notifications_tenant') THEN
        CREATE INDEX idx_notifications_tenant ON pm.notifications(tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'pm' AND tablename = 'project_type_configs' AND indexname = 'idx_project_type_configs_tenant') THEN
        CREATE INDEX idx_project_type_configs_tenant ON pm.project_type_configs(tenant_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE pm.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_type_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "projects_tenant_isolation" ON pm.projects
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_phases_tenant_isolation" ON pm.project_phases
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_milestones_tenant_isolation" ON pm.project_milestones
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_members_tenant_isolation" ON pm.project_members
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_resources_tenant_isolation" ON pm.project_resources
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_expenses_tenant_isolation" ON pm.project_expenses
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_benefits_tenant_isolation" ON pm.project_benefits
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "budgets_tenant_isolation" ON pm.budgets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "risks_tenant_isolation" ON pm.risks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_approvals_tenant_isolation" ON pm.project_approvals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "contracts_tenant_isolation" ON pm.contracts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "quality_checks_tenant_isolation" ON pm.quality_checks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "acceptances_tenant_isolation" ON pm.acceptances
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "settlements_tenant_isolation" ON pm.settlements
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "documents_tenant_isolation" ON pm.documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "notifications_tenant_isolation" ON pm.notifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "project_type_configs_tenant_isolation" ON pm.project_type_configs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
