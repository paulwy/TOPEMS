-- 20261120235945: unified-core 27 张 public 运行期表收口（W2-D2 第十三个模块）
--
-- 背景：svc/unified-core/src/schema_defense.rs 的 TABLE_DEFS 声明 28 张表（274 列），
-- 启动时建骨架表并调用 shared-db 的 run_schema_defense 逐列补列。
-- 其中 public.core_file_folders 已被 20261119110000_drop_dead_tables_batch2 归档删除，
-- 但启动期 DDL 把它按旧定义复活；本迁移不纳入该死表。
-- public.core_mdm_reconciliation_log 虽也在 batch2 死表清单内，但
-- svc/unified-core/src/modules/master/handlers.rs 的 MasterDataService 仍将其作为
-- 对账日志权威表（with_tables("public.core_mdm_reconciliation_log", ...)），
-- 属活跃功能依赖，不能按死表删除；本迁移保留并固化其 live 形状，待业务确认后再评审。
-- 其余 27 张 public 表以真实形状固化。public schema 已存在，CREATE SCHEMA 仅幂等兜底。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS public.core_api_version_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    deprecated_since date,
    sunset_date date,
    message text,
    migration_guide text,
    changes text,
    is_current boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    folder_id uuid,
    template_id uuid,
    content text,
    content_type character varying(50) DEFAULT 'html'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    tags text[],
    description text,
    file_name character varying(200),
    file_path character varying(500),
    file_size bigint,
    mime_type character varying(100),
    published_at timestamp with time zone,
    published_by character varying(100),
    archived_at timestamp with time zone,
    archived_by character varying(100),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    parent_id uuid,
    description text,
    sort_order integer DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100),
    description text,
    content text NOT NULL,
    content_type character varying(50) DEFAULT 'html'::character varying,
    fields jsonb DEFAULT '[]'::jsonb,
    is_enabled boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.core_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    original_name character varying(256),
    path character varying(512) NOT NULL,
    size bigint NOT NULL,
    mime_type character varying(128),
    extension character varying(32),
    folder_id uuid,
    uploader_id uuid NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    username character varying(64) NOT NULL,
    ip_address character varying(128) NOT NULL,
    user_agent text,
    status character varying(32) NOT NULL,
    error_message text,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_master_data_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    action text NOT NULL,
    source_service text NOT NULL,
    operator text,
    changed_fields jsonb,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_master_data_refs (
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_service text NOT NULL,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.core_mdm_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    master_data_id text NOT NULL,
    domain text NOT NULL,
    action text NOT NULL,
    requested_by text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_comment text,
    payload jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_mdm_reconciliation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    master_data_id text NOT NULL,
    issue_type text NOT NULL,
    description text,
    detected_at timestamp without time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS public.core_menu_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    group_id uuid NOT NULL,
    parent_id uuid,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    path character varying(500),
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    permissions jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_migration_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    applied_at timestamp with time zone,
    duration_ms bigint,
    success boolean DEFAULT true,
    error_message text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    ip_address character varying(128),
    module character varying(64) NOT NULL,
    operation character varying(32) NOT NULL,
    request_data jsonb,
    resource_id character varying(128),
    resource_type character varying(64) NOT NULL,
    response_status integer,
    tenant_id uuid NOT NULL,
    trace_id character varying(64),
    user_agent text,
    user_id uuid,
    user_name character varying(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    level integer
);

CREATE TABLE IF NOT EXISTS public.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tier character varying(32) DEFAULT 'basic'::character varying
);

CREATE TABLE IF NOT EXISTS public.core_tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value text,
    is_public boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    users_count integer DEFAULT 0,
    storage_used_mb bigint DEFAULT 0,
    api_calls_count bigint DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_cost numeric(10,2) DEFAULT 0,
    overage_cost numeric(10,2) DEFAULT 0,
    plugin_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    code character varying(64) NOT NULL,
    tenant_type character varying(32) DEFAULT 'shared'::character varying,
    plan character varying(32) DEFAULT 'basic'::character varying,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    license_expires_at timestamp with time zone,
    database_host character varying(256),
    database_port integer DEFAULT 5432,
    database_name character varying(64),
    quota_users integer DEFAULT 20,
    quota_storage_gb bigint DEFAULT 10,
    quota_api_calls bigint DEFAULT 100000,
    quota_plugins text[],
    features jsonb DEFAULT '{}'::jsonb,
    status character varying(32) DEFAULT 'trial'::character varying,
    trial_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    suspended_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.core_workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid,
    title text,
    initiator_id uuid,
    current_node_id text,
    status text DEFAULT 'pending'::text,
    variables jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    priority text,
    due_time timestamp with time zone,
    claimed_at timestamp with time zone,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    definition jsonb NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    created_by uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name_en character varying(128),
    code character varying(128)
);

CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_status ON public.core_api_version_configs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_version ON public.core_api_version_configs USING btree (version);
CREATE INDEX IF NOT EXISTS idx_core_file_permissions_file ON public.core_file_permissions USING btree (file_id);
CREATE INDEX IF NOT EXISTS idx_core_file_permissions_tenant_id ON public.core_file_permissions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_file_permissions_user ON public.core_file_permissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_core_files_deleted_at ON public.core_files USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_core_files_folder ON public.core_files USING btree (folder_id);
CREATE INDEX IF NOT EXISTS idx_core_files_tenant ON public.core_files USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_files_uploader ON public.core_files USING btree (uploader_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON public.core_login_logs USING btree (login_time);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON public.core_login_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_login_logs_tenant_id ON public.core_login_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.core_login_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mdm_change_log_tenant_md ON public.core_master_data_change_log USING btree (tenant_id, master_data_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_code ON public.core_master_data_refs USING btree (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_domain ON public.core_master_data_refs USING btree (tenant_id, domain);
CREATE INDEX IF NOT EXISTS idx_mdm_approvals_tenant_md ON public.core_mdm_approvals USING btree (tenant_id, master_data_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_mdm_approvals_tenant_pending ON public.core_mdm_approvals USING btree (tenant_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_menu_groups_status ON public.core_menu_groups USING btree (status);
CREATE INDEX IF NOT EXISTS idx_core_menu_groups_tenant_id ON public.core_menu_groups USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_menus_group_id ON public.core_menus USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_core_menus_parent_id ON public.core_menus USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_core_menus_status ON public.core_menus USING btree (status);
CREATE INDEX IF NOT EXISTS idx_core_menus_tenant_id ON public.core_menus USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_migration_history_plugin ON public.core_migration_history USING btree (plugin_name);
CREATE INDEX IF NOT EXISTS idx_core_migration_history_tenant ON public.core_migration_history USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON public.core_operation_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON public.core_operation_logs USING btree (module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON public.core_operation_logs USING btree (operation);
CREATE INDEX IF NOT EXISTS idx_operation_logs_resource ON public.core_operation_logs USING btree (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant_id ON public.core_operation_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_trace_id ON public.core_operation_logs USING btree (trace_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON public.core_operation_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_core_role_permissions_permission_id ON public.core_role_permissions USING btree (permission_id);
CREATE INDEX IF NOT EXISTS idx_core_role_permissions_role_id ON public.core_role_permissions USING btree (role_id);
CREATE INDEX IF NOT EXISTS idx_core_roles_name ON public.core_roles USING btree (name);
CREATE INDEX IF NOT EXISTS idx_core_roles_tenant ON public.core_roles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_modules_tenant_id ON public.core_tenant_modules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_settings_tenant_id ON public.core_tenant_settings USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_usage_period ON public.core_tenant_usage USING btree (tenant_id, period_start);
CREATE INDEX IF NOT EXISTS idx_core_tenant_usage_tenant_id ON public.core_tenant_usage USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_users_email ON public.core_tenant_users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_core_tenant_users_tenant ON public.core_tenant_users USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenant_users_tenant_id ON public.core_tenant_users USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tenants_code ON public.core_tenants USING btree (code);
CREATE INDEX IF NOT EXISTS idx_core_tenants_status ON public.core_tenants USING btree (status);
CREATE INDEX IF NOT EXISTS idx_core_tenants_tenant ON public.core_tenants USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_user_roles_role_id ON public.core_user_roles USING btree (role_id);
CREATE INDEX IF NOT EXISTS idx_core_user_roles_user_id ON public.core_user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_core_tasks_instance ON public.core_workflow_tasks USING btree (instance_id);
CREATE INDEX IF NOT EXISTS idx_core_workflows_status ON public.core_workflows USING btree (status);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_api_version_configs'::regclass AND contype='p') THEN
        ALTER TABLE public.core_api_version_configs ADD CONSTRAINT "core_api_version_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_doc_documents'::regclass AND contype='p') THEN
        ALTER TABLE public.core_doc_documents ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_doc_folders'::regclass AND contype='p') THEN
        ALTER TABLE public.core_doc_folders ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_doc_templates'::regclass AND contype='p') THEN
        ALTER TABLE public.core_doc_templates ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_file_permissions'::regclass AND contype='p') THEN
        ALTER TABLE public.core_file_permissions ADD CONSTRAINT "core_file_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_files'::regclass AND contype='p') THEN
        ALTER TABLE public.core_files ADD CONSTRAINT "core_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_login_logs'::regclass AND contype='p') THEN
        ALTER TABLE public.core_login_logs ADD CONSTRAINT "core_login_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_master_data_change_log'::regclass AND contype='p') THEN
        ALTER TABLE public.core_master_data_change_log ADD CONSTRAINT "core_master_data_change_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_master_data_refs'::regclass AND contype='p') THEN
        ALTER TABLE public.core_master_data_refs ADD CONSTRAINT "core_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_mdm_approvals'::regclass AND contype='p') THEN
        ALTER TABLE public.core_mdm_approvals ADD CONSTRAINT "core_mdm_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_mdm_reconciliation_log'::regclass AND contype='p') THEN
        ALTER TABLE public.core_mdm_reconciliation_log ADD CONSTRAINT "core_mdm_reconciliation_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menu_groups'::regclass AND contype='p') THEN
        ALTER TABLE public.core_menu_groups ADD CONSTRAINT "core_menu_groups_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menus'::regclass AND contype='p') THEN
        ALTER TABLE public.core_menus ADD CONSTRAINT "core_menus_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_migration_history'::regclass AND contype='p') THEN
        ALTER TABLE public.core_migration_history ADD CONSTRAINT "core_migration_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_operation_logs'::regclass AND contype='p') THEN
        ALTER TABLE public.core_operation_logs ADD CONSTRAINT "core_operation_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_permissions'::regclass AND contype='p') THEN
        ALTER TABLE public.core_permissions ADD CONSTRAINT "core_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_role_permissions'::regclass AND contype='p') THEN
        ALTER TABLE public.core_role_permissions ADD CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY (role_id, permission_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_roles'::regclass AND contype='p') THEN
        ALTER TABLE public.core_roles ADD CONSTRAINT "core_roles_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_modules'::regclass AND contype='p') THEN
        ALTER TABLE public.core_tenant_modules ADD CONSTRAINT "core_tenant_modules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_settings'::regclass AND contype='p') THEN
        ALTER TABLE public.core_tenant_settings ADD CONSTRAINT "core_tenant_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_usage'::regclass AND contype='p') THEN
        ALTER TABLE public.core_tenant_usage ADD CONSTRAINT "core_tenant_usage_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_users'::regclass AND contype='p') THEN
        ALTER TABLE public.core_tenant_users ADD CONSTRAINT "core_tenant_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenants'::regclass AND contype='p') THEN
        ALTER TABLE public.core_tenants ADD CONSTRAINT "core_tenants_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_user_roles'::regclass AND contype='p') THEN
        ALTER TABLE public.core_user_roles ADD CONSTRAINT "core_user_roles_pkey" PRIMARY KEY (user_id, role_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_workflow_instances'::regclass AND conname='core_workflow_instances_pkey1') THEN
        ALTER TABLE public.core_workflow_instances ADD CONSTRAINT "core_workflow_instances_pkey1" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_workflow_tasks'::regclass AND conname='core_workflow_tasks_pkey1') THEN
        ALTER TABLE public.core_workflow_tasks ADD CONSTRAINT "core_workflow_tasks_pkey1" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_workflows'::regclass AND contype='p') THEN
        ALTER TABLE public.core_workflows ADD CONSTRAINT "core_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_file_permissions'::regclass AND conname='core_file_permissions_file_id_user_id_key') THEN
        ALTER TABLE public.core_file_permissions ADD CONSTRAINT "core_file_permissions_file_id_user_id_key" UNIQUE (file_id, user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_master_data_refs'::regclass AND conname='core_master_data_refs_tenant_id_domain_code_key') THEN
        ALTER TABLE public.core_master_data_refs ADD CONSTRAINT "core_master_data_refs_tenant_id_domain_code_key" UNIQUE (tenant_id, domain, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menu_groups'::regclass AND conname='core_menu_groups_tenant_id_code_key') THEN
        ALTER TABLE public.core_menu_groups ADD CONSTRAINT "core_menu_groups_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menus'::regclass AND conname='core_menus_tenant_id_code_key') THEN
        ALTER TABLE public.core_menus ADD CONSTRAINT "core_menus_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_migration_history'::regclass AND conname='core_migration_history_plugin_name_version_key') THEN
        ALTER TABLE public.core_migration_history ADD CONSTRAINT "core_migration_history_plugin_name_version_key" UNIQUE (plugin_name, version);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_permissions'::regclass AND conname='core_permissions_code_key') THEN
        ALTER TABLE public.core_permissions ADD CONSTRAINT "core_permissions_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_roles'::regclass AND conname='core_roles_name_key') THEN
        ALTER TABLE public.core_roles ADD CONSTRAINT "core_roles_name_key" UNIQUE (name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_modules'::regclass AND conname='core_tenant_modules_tenant_id_module_code_key') THEN
        ALTER TABLE public.core_tenant_modules ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_settings'::regclass AND conname='core_tenant_settings_tenant_id_setting_key_key') THEN
        ALTER TABLE public.core_tenant_settings ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_usage'::regclass AND conname='core_tenant_usage_tenant_id_period_start_key') THEN
        ALTER TABLE public.core_tenant_usage ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_users'::regclass AND conname='core_tenant_users_tenant_id_email_key') THEN
        ALTER TABLE public.core_tenant_users ADD CONSTRAINT "core_tenant_users_tenant_id_email_key" UNIQUE (tenant_id, email);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_users'::regclass AND conname='core_tenant_users_tenant_id_user_id_key') THEN
        ALTER TABLE public.core_tenant_users ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key" UNIQUE (tenant_id, user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenants'::regclass AND conname='core_tenants_code_key') THEN
        ALTER TABLE public.core_tenants ADD CONSTRAINT "core_tenants_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menus'::regclass AND conname='core_menus_group_id_fkey') THEN
        ALTER TABLE public.core_menus ADD CONSTRAINT "core_menus_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.core_menu_groups(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_menus'::regclass AND conname='core_menus_parent_id_fkey') THEN
        ALTER TABLE public.core_menus ADD CONSTRAINT "core_menus_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.core_menus(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_role_permissions'::regclass AND conname='core_role_permissions_permission_id_fkey') THEN
        ALTER TABLE public.core_role_permissions ADD CONSTRAINT "core_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_role_permissions'::regclass AND conname='core_role_permissions_role_id_fkey') THEN
        ALTER TABLE public.core_role_permissions ADD CONSTRAINT "core_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_modules'::regclass AND conname='core_tenant_modules_tenant_id_fkey') THEN
        ALTER TABLE public.core_tenant_modules ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_settings'::regclass AND conname='core_tenant_settings_tenant_id_fkey') THEN
        ALTER TABLE public.core_tenant_settings ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_usage'::regclass AND conname='core_tenant_usage_tenant_id_fkey') THEN
        ALTER TABLE public.core_tenant_usage ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_users'::regclass AND conname='core_tenant_users_tenant_id_fkey') THEN
        ALTER TABLE public.core_tenant_users ADD CONSTRAINT "core_tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_tenant_users'::regclass AND conname='core_tenant_users_tenant_id_fkey1') THEN
        ALTER TABLE public.core_tenant_users ADD CONSTRAINT "core_tenant_users_tenant_id_fkey1" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_user_roles'::regclass AND conname='core_user_roles_role_id_fkey') THEN
        ALTER TABLE public.core_user_roles ADD CONSTRAINT "core_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.core_user_roles'::regclass AND conname='core_user_roles_user_id_fkey') THEN
        ALTER TABLE public.core_user_roles ADD CONSTRAINT "core_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES iam.users(id);
    END IF;
END $$;


ALTER TABLE public.core_doc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_doc_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_doc_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_doc_folders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_doc_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_file_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_login_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_master_data_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_master_data_change_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_master_data_refs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_mdm_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_mdm_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_mdm_reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_mdm_reconciliation_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_menu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_menu_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_menus FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_migration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_migration_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_operation_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_doc_documents;
CREATE POLICY "rls_tenant_isolation" ON public.core_doc_documents AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_doc_folders;
CREATE POLICY "rls_tenant_isolation" ON public.core_doc_folders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_doc_templates;
CREATE POLICY "rls_tenant_isolation" ON public.core_doc_templates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_file_permissions;
CREATE POLICY "rls_tenant_isolation" ON public.core_file_permissions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_files;
CREATE POLICY "rls_tenant_isolation" ON public.core_files AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_system_only" ON public.core_login_logs;
CREATE POLICY "rls_system_only" ON public.core_login_logs AS PERMISSIVE FOR ALL USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)) WITH CHECK ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.core_login_logs;
CREATE POLICY "rls_tenant_read" ON public.core_login_logs AS PERMISSIVE FOR SELECT USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_master_data_change_log;
CREATE POLICY "rls_tenant_isolation" ON public.core_master_data_change_log AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_master_data_refs;
CREATE POLICY "rls_tenant_isolation" ON public.core_master_data_refs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_mdm_approvals;
CREATE POLICY "rls_tenant_isolation" ON public.core_mdm_approvals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_core_mdm_reconciliation_log" ON public.core_mdm_reconciliation_log;
CREATE POLICY "tenant_isolation_core_mdm_reconciliation_log" ON public.core_mdm_reconciliation_log AS PERMISSIVE FOR ALL USING ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_global_read" ON public.core_menu_groups;
CREATE POLICY "rls_global_read" ON public.core_menu_groups AS PERMISSIVE FOR SELECT USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_menu_groups;
CREATE POLICY "rls_tenant_isolation" ON public.core_menu_groups AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_global_read" ON public.core_menus;
CREATE POLICY "rls_global_read" ON public.core_menus AS PERMISSIVE FOR SELECT USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_menus;
CREATE POLICY "rls_tenant_isolation" ON public.core_menus AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_migration_history;
CREATE POLICY "rls_tenant_isolation" ON public.core_migration_history AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_operation_logs;
CREATE POLICY "rls_tenant_isolation" ON public.core_operation_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_platform_read" ON public.core_roles;
CREATE POLICY "rls_platform_read" ON public.core_roles AS PERMISSIVE FOR SELECT USING (((tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NOT NULL)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_roles;
CREATE POLICY "rls_tenant_isolation" ON public.core_roles AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_tenant_modules;
CREATE POLICY "rls_tenant_isolation" ON public.core_tenant_modules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_tenant_settings;
CREATE POLICY "rls_tenant_isolation" ON public.core_tenant_settings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_tenant_usage;
CREATE POLICY "rls_tenant_isolation" ON public.core_tenant_usage AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_tenant_users;
CREATE POLICY "rls_tenant_isolation" ON public.core_tenant_users AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_tenants;
CREATE POLICY "rls_tenant_isolation" ON public.core_tenants AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_workflow_instances;
CREATE POLICY "rls_tenant_isolation" ON public.core_workflow_instances AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_workflow_tasks;
CREATE POLICY "rls_tenant_isolation" ON public.core_workflow_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.core_workflows;
CREATE POLICY "rls_tenant_isolation" ON public.core_workflows AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
