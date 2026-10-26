-- core schema 补建（权威 = topems_test，14 表；幂等 CREATE TABLE IF NOT EXISTS）
CREATE SCHEMA IF NOT EXISTS core;
--
-- PostgreSQL database dump
--

\restrict erLzpfvgdG6aezrtrwsMZmVrtn3pDkPKIWnX2WLxQrjmh8MyfK3bELDh5htY7Z8

-- Dumped from database version 17.11 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: core_set_updated_at(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.core_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_conversations; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id character varying(128) NOT NULL,
    title character varying(200) DEFAULT '新对话'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    module character varying(64) DEFAULT 'erp'::character varying,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    selected_records jsonb DEFAULT '[]'::jsonb NOT NULL,
    context_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT ai_conversations_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.ai_conversations FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_categories; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_categories_code_key UNIQUE (code),
    CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id)
);


--
-- Name: core_plugin_instances; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url text NOT NULL,
    runtime_status character varying(50) DEFAULT 'stopped'::character varying,
    base_path character varying(255),
    last_heartbeat timestamp with time zone,
    stopped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    started_at timestamp with time zone,
    CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id)
);


--
-- Name: core_plugin_navigation; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_plugin_navigation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    nav_config jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_navigation_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_navigation_plugin_code_key UNIQUE (plugin_code)
);


--
-- Name: core_plugin_permissions; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(100) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255) NOT NULL,
    resource_type character varying(100),
    action character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id)
);


--
-- Name: core_plugin_reviews; Type: TABLE; Schema: core; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id)
);


--
-- Name: core_plugin_versions; Type: TABLE; Schema: core; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version)
);


--
-- Name: core_plugins; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    activated_at timestamp with time zone,
    author_name character varying(100),
    author_url character varying(255),
    category character varying(100),
    checksum character varying(255),
    code character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dependencies jsonb,
    description text,
    entry_point character varying(255),
    homepage_url character varying(255),
    install_count integer DEFAULT 0,
    installed_at timestamp with time zone,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    is_free boolean DEFAULT true,
    is_installed boolean DEFAULT false,
    is_published boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    name character varying(255),
    plugin_type character varying(50),
    price_cents integer DEFAULT 0,
    published_at timestamp with time zone,
    rating numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    remote_url character varying(255),
    screenshots jsonb,
    tags jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version character varying(50),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT core_plugins_code_key UNIQUE (code),
    CONSTRAINT core_plugins_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.core_plugins FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_plugins; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.core_tenant_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    installed_version character varying(50),
    is_active boolean DEFAULT true,
    license_type character varying(50) DEFAULT 'free'::character varying,
    license_expires_at timestamp with time zone,
    purchase_order_id uuid,
    activated_at timestamp with time zone,
    last_used_at timestamp with time zone,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.core_tenant_plugins FORCE ROW LEVEL SECURITY;


--
-- Name: knowledge_bases; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.knowledge_bases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    kb_type text,
    status text DEFAULT 'active'::text NOT NULL,
    document_count integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.knowledge_bases FORCE ROW LEVEL SECURITY;


--
-- Name: knowledge_chunks; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.knowledge_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_id uuid,
    kb_id uuid,
    chunk_index integer DEFAULT 0 NOT NULL,
    content text NOT NULL,
    token_count integer DEFAULT 0 NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.knowledge_chunks FORCE ROW LEVEL SECURITY;


--
-- Name: knowledge_documents; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.knowledge_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    kb_id uuid,
    title text NOT NULL,
    content text,
    doc_type text,
    file_path text,
    file_size bigint,
    chunk_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.knowledge_documents FORCE ROW LEVEL SECURITY;


--
-- Name: knowledge_qa_history; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.knowledge_qa_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    kb_id uuid,
    question text NOT NULL,
    answer text,
    sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    feedback integer,
    deleted_at timestamp with time zone,
    CONSTRAINT knowledge_qa_history_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY core.knowledge_qa_history FORCE ROW LEVEL SECURITY;


--
-- Name: user_preferences; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE IF NOT EXISTS core.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_preferences_user_id_preference_key_key UNIQUE (user_id, preference_key)
);

ALTER TABLE ONLY core.user_preferences FORCE ROW LEVEL SECURITY;


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_categories core_plugin_categories_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_code_key UNIQUE (code);


--
-- Name: core_plugin_categories core_plugin_categories_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_instances core_plugin_instances_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_instances core_plugin_instances_plugin_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id);


--
-- Name: core_plugin_navigation core_plugin_navigation_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_navigation
    ADD CONSTRAINT core_plugin_navigation_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_navigation core_plugin_navigation_plugin_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_navigation
    ADD CONSTRAINT core_plugin_navigation_plugin_code_key UNIQUE (plugin_code);


--
-- Name: core_plugin_permissions core_plugin_permissions_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_permissions core_plugin_permissions_plugin_code_permission_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code, permission_code);


--
-- Name: core_plugin_reviews core_plugin_reviews_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_versions core_plugin_versions_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_versions core_plugin_versions_plugin_id_version_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version);


--
-- Name: core_plugins core_plugins_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugins
    ADD CONSTRAINT core_plugins_code_key UNIQUE (code);


--
-- Name: core_plugins core_plugins_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugins
    ADD CONSTRAINT core_plugins_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_plugins core_tenant_plugins_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bases knowledge_bases_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.knowledge_bases
    ADD CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: knowledge_qa_history knowledge_qa_history_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.knowledge_qa_history
    ADD CONSTRAINT knowledge_qa_history_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_preference_key_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.user_preferences
    ADD CONSTRAINT user_preferences_user_id_preference_key_key UNIQUE (user_id, preference_key);


--
-- Name: idx_core_plugin_instances_status; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_status ON core.core_plugin_instances USING btree (runtime_status);


--
-- Name: idx_core_plugin_permissions_code; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_code ON core.core_plugin_permissions USING btree (plugin_code);


--
-- Name: idx_core_plugin_reviews_plugin_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_plugin_id ON core.core_plugin_reviews USING btree (plugin_id);


--
-- Name: idx_core_plugins_category; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugins_category ON core.core_plugins USING btree (category);


--
-- Name: idx_core_plugins_code; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugins_code ON core.core_plugins USING btree (code);


--
-- Name: idx_core_plugins_installed; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_plugins_installed ON core.core_plugins USING btree (is_installed);


--
-- Name: idx_kb_created_by; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kb_created_by ON core.knowledge_bases USING btree (created_by);


--
-- Name: idx_kb_kb_type; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kb_kb_type ON core.knowledge_bases USING btree (kb_type);


--
-- Name: idx_kb_status; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kb_status ON core.knowledge_bases USING btree (status);


--
-- Name: idx_kb_tenant_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kb_tenant_id ON core.knowledge_bases USING btree (tenant_id);


--
-- Name: idx_kc_document_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kc_document_id ON core.knowledge_chunks USING btree (document_id);


--
-- Name: idx_kc_embedding; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kc_embedding ON core.knowledge_chunks USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_kc_kb_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kc_kb_id ON core.knowledge_chunks USING btree (kb_id);


--
-- Name: idx_kc_tenant_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kc_tenant_id ON core.knowledge_chunks USING btree (tenant_id);


--
-- Name: idx_kd_created_by; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kd_created_by ON core.knowledge_documents USING btree (created_by);


--
-- Name: idx_kd_doc_type; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kd_doc_type ON core.knowledge_documents USING btree (doc_type);


--
-- Name: idx_kd_kb_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kd_kb_id ON core.knowledge_documents USING btree (kb_id);


--
-- Name: idx_kd_status; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kd_status ON core.knowledge_documents USING btree (status);


--
-- Name: idx_kd_tenant_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_kd_tenant_id ON core.knowledge_documents USING btree (tenant_id);


--
-- Name: idx_knowledge_qa_history_kb_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_knowledge_qa_history_kb_id ON core.knowledge_qa_history USING btree (kb_id);


--
-- Name: idx_qa_created_at; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_created_at ON core.knowledge_qa_history USING btree (created_at);


--
-- Name: idx_qa_kb_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_kb_id ON core.knowledge_qa_history USING btree (kb_id);


--
-- Name: idx_qa_tenant_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_tenant_id ON core.knowledge_qa_history USING btree (tenant_id);


--
-- Name: idx_qa_user_id; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_user_id ON core.knowledge_qa_history USING btree (user_id);


--
-- Name: knowledge_bases trg_kb_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_kb_updated_at BEFORE UPDATE ON core.knowledge_bases FOR EACH ROW EXECUTE FUNCTION core.core_set_updated_at();


--
-- Name: knowledge_documents trg_kd_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER trg_kd_updated_at BEFORE UPDATE ON core.knowledge_documents FOR EACH ROW EXECUTE FUNCTION core.core_set_updated_at();


--
-- Name: core_plugin_instances core_plugin_instances_plugin_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_plugin_reviews core_plugin_reviews_plugin_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_plugin_versions core_plugin_versions_plugin_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;


--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugins core_allow_all_core_plugins; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY core_allow_all_core_plugins ON core.core_plugins USING (true) WITH CHECK (true);


--
-- Name: core_tenant_plugins core_allow_all_core_tenant_plugins; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY core_allow_all_core_tenant_plugins ON core.core_tenant_plugins USING (true) WITH CHECK (true);


--
-- Name: core_plugins; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.core_plugins ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_plugins; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.core_tenant_plugins ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_bases; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.knowledge_bases ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_chunks; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.knowledge_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_documents; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.knowledge_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_qa_history; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.knowledge_qa_history ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations rls_tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY rls_tenant_isolation ON core.ai_conversations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: knowledge_bases rls_tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY rls_tenant_isolation ON core.knowledge_bases USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: knowledge_chunks rls_tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY rls_tenant_isolation ON core.knowledge_chunks USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: knowledge_documents rls_tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY rls_tenant_isolation ON core.knowledge_documents USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: knowledge_qa_history rls_tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY rls_tenant_isolation ON core.knowledge_qa_history USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: user_preferences tenant_isolation_user_preferences; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation_user_preferences ON core.user_preferences USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict erLzpfvgdG6aezrtrwsMZmVrtn3pDkPKIWnX2WLxQrjmh8MyfK3bELDh5htY7Z8

