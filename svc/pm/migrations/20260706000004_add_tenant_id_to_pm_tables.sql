-- Add tenant_id to PM tables for multi-tenant support

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