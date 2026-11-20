-- 20261120160000: plugin-registry 7 张运行期表收口（W2-D2 第五个模块）
--
-- 背景：svc/plugin-registry/src/schema_defense.rs 在启动时为 8 张 core 表建骨架、
-- 逐列补列。本迁移以 baseline+forward 库真实形状固化其中被运行代码使用的 7 张表：
--   core.core_plugins / core_plugin_versions / core_plugin_reviews /
--   core_plugin_categories / core_plugin_instances /
--   core_plugin_permissions / core_plugin_navigation
--
-- 不纳入的 1 张表：core.core_tenant_plugins。
--   运行代码（runtime.rs / simple_api.rs / tenant_plugins.rs）实际读写的是
--   iam.core_tenant_plugins（14 列，含 deleted_at），core 下这张只剩 id/deleted_at
--   两列的孤儿表没有任何调用点；不在本迁移重建、也不删除（留待单独评审）。
--
-- 与旧 TABLE_DEFS 的差异（以 live 为准）：
--   * core_plugins 有 37 列，含 tenant_id / owner_tenant_id / last_owner_tenant_id /
--     unpublished_at / name_en，code 与 name 线上可空；
--   * 7 张表都有 deleted_at；类型统一为 text/varchar(n)/timestamptz；
--   * core_plugins 启用 ENABLE + FORCE RLS，并有 rls_platform_read(SELECT) 与
--     rls_tenant_isolation(ALL) 两条策略；其余 6 张表不启用 RLS、无策略。
--
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS；策略先 DROP IF EXISTS 再建。
-- 不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.core_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    name_en character varying(255),
    activated_at timestamptz,
    author_name character varying(100),
    author_url character varying(255),
    category character varying(100),
    checksum character varying(255),
    code character varying(100),
    created_at timestamptz DEFAULT now() NOT NULL,
    dependencies jsonb,
    description text,
    entry_point character varying(255),
    homepage_url character varying(255),
    install_count integer DEFAULT 0,
    installed_at timestamptz,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    is_free boolean DEFAULT true,
    is_installed boolean DEFAULT false,
    is_published boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    name character varying(255),
    plugin_type character varying(50),
    price_cents integer DEFAULT 0,
    published_at timestamptz,
    rating numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    remote_url character varying(255),
    screenshots jsonb,
    tags text[],
    updated_at timestamptz DEFAULT now() NOT NULL,
    version character varying(50),
    tenant_id uuid,
    owner_tenant_id uuid,
    last_owner_tenant_id uuid,
    unpublished_at timestamptz,
    CONSTRAINT core_plugins_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugins_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    release_notes text,
    is_stable boolean DEFAULT true,
    is_latest boolean DEFAULT false,
    download_url character varying(512),
    checksum character varying(64),
    file_size bigint,
    min_app_version character varying(32),
    created_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version),
    CONSTRAINT core_plugin_versions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name character varying(128),
    rating integer,
    title character varying(256),
    content text,
    is_verified_purchase boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_reviews_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url character varying(512),
    runtime_status character varying(32) DEFAULT 'stopped'::character varying,
    base_path character varying(128) DEFAULT '/api/plugins/{code}'::character varying,
    last_heartbeat timestamptz,
    started_at timestamptz,
    stopped_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id),
    CONSTRAINT core_plugin_instances_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_categories_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255),
    resource_type character varying(50),
    action character varying(50),
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code, permission_code)
);

CREATE TABLE IF NOT EXISTS core.core_plugin_navigation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    nav_config jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT core_plugin_navigation_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_navigation_plugin_code_key UNIQUE (plugin_code)
);

-- 二级索引（主键/唯一索引由约束自动创建，不重复建）
CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_plugin_id ON core.core_plugin_instances (plugin_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_status ON core.core_plugin_instances (runtime_status);
CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_code ON core.core_plugin_permissions (plugin_code);
CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_plugin_id ON core.core_plugin_reviews (plugin_id);
CREATE INDEX IF NOT EXISTS idx_core_plugin_versions_plugin_id ON core.core_plugin_versions (plugin_id);
CREATE INDEX IF NOT EXISTS idx_core_plugins_category ON core.core_plugins (category);
CREATE INDEX IF NOT EXISTS idx_core_plugins_code ON core.core_plugins (code);
CREATE INDEX IF NOT EXISTS idx_core_plugins_installed ON core.core_plugins (is_installed);
CREATE INDEX IF NOT EXISTS idx_core_plugins_owner_tenant ON core.core_plugins (owner_tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_plugins_platform_tenant ON core.core_plugins (tenant_id) WHERE (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid);
CREATE UNIQUE INDEX IF NOT EXISTS core_plugins_platform_name_key ON core.core_plugins (name) WHERE ((tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (deleted_at IS NULL));

-- core_plugins 是唯一启用 RLS 的表（平台行 + 租户行）
ALTER TABLE core.core_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.core_plugins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_platform_read ON core.core_plugins;
CREATE POLICY rls_platform_read ON core.core_plugins
    FOR SELECT
    USING ((tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NOT NULL));

DROP POLICY IF EXISTS rls_tenant_isolation ON core.core_plugins;
CREATE POLICY rls_tenant_isolation ON core.core_plugins
    FOR ALL
    USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
    WITH CHECK ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid));
