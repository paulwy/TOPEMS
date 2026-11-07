-- mdm 域 81 表补建（权威 = topems_test master_data，幂等 CREATE TABLE IF NOT EXISTS）
-- master_data schema 已存在（主库既有 schema_registry/dynamic_data 等），无需 CREATE SCHEMA
--
-- PostgreSQL database dump
--

\restrict LSJBR6W12waJrTIzyncA3flVreoGJ8XaUkpryHPpbkfYIqpdC82aDbGOVobASED

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: mdm_ai_models; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_ai_models (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    domain text NOT NULL,
    accuracy double precision NOT NULL,
    last_trained text,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT mdm_ai_models_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_ai_models FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_ai_suggestions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_ai_suggestions (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    description text NOT NULL,
    confidence double precision NOT NULL,
    action text NOT NULL,
    created_at text NOT NULL,
    CONSTRAINT mdm_ai_suggestions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_ai_suggestions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_api_exposures; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_api_exposures (
    id text NOT NULL,
    product_id text NOT NULL,
    endpoint text NOT NULL,
    auth_type text NOT NULL,
    rate_limit text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_api_exposures_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_api_exposures FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_api_products; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_api_products (
    id text NOT NULL,
    name text NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    rate_limit_per_min bigint DEFAULT 100 NOT NULL,
    rate_limit_per_day bigint DEFAULT 10000 NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_monthly double precision DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_api_products_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_api_products FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_data_asset_categories; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_data_asset_categories (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    parent_id text,
    asset_count bigint DEFAULT 0 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_data_asset_categories_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_data_asset_categories FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_assets; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_assets (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    asset_type text DEFAULT 'entity'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    owner text DEFAULT ''::text NOT NULL,
    domain text DEFAULT ''::text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    lineage_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    quality_score double precision DEFAULT 0 NOT NULL,
    access_level text DEFAULT 'internal'::text NOT NULL,
    updated_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_assets_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_assets FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_audit_events; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_audit_events (
    id text NOT NULL,
    event_type text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    user_id text DEFAULT ''::text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    ip_address text DEFAULT ''::text NOT NULL,
    "timestamp" text DEFAULT ''::text NOT NULL,
    session_id text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_audit_events_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_audit_events FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_audit_export_logs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_audit_export_logs (
    id text NOT NULL,
    user_id text DEFAULT ''::text NOT NULL,
    export_type text DEFAULT 'json'::text NOT NULL,
    record_count bigint DEFAULT 0 NOT NULL,
    exported_at text DEFAULT ''::text NOT NULL,
    ip_address text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_audit_export_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_audit_export_logs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_auto_fix_actions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_auto_fix_actions (
    id text NOT NULL,
    rule_id text DEFAULT ''::text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    action_type text DEFAULT 'normalize'::text NOT NULL,
    before_value jsonb,
    after_value jsonb,
    confidence double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    applied_at text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_auto_fix_actions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_auto_fix_actions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_bc_tests; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_bc_tests (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    plan_id text NOT NULL,
    tested_at text DEFAULT ''::text NOT NULL,
    result text DEFAULT ''::text NOT NULL,
    duration_minutes bigint DEFAULT 0 NOT NULL,
    issues_found jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT mdm_bc_tests_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_bc_tests FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_billing_records; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_billing_records (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    period_start text DEFAULT ''::text NOT NULL,
    period_end text DEFAULT ''::text NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    usage_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT mdm_billing_records_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_billing_records FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_change_events; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_change_events (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    change_type text DEFAULT 'create'::text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    triggered_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_change_events_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_change_events FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_classification_models; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_classification_models (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    entity_type text NOT NULL,
    categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    algorithm text NOT NULL,
    accuracy double precision NOT NULL,
    status text NOT NULL,
    CONSTRAINT mdm_classification_models_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_classification_models FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_classification_results; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_classification_results (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    entity_id text NOT NULL,
    category text NOT NULL,
    confidence double precision NOT NULL,
    alternatives jsonb DEFAULT '[]'::jsonb NOT NULL,
    classified_at text NOT NULL,
    CONSTRAINT mdm_classification_results_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_classification_results FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_classifier_rules; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_classifier_rules (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT mdm_classifier_rules_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_classifier_rules FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_collections; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_collections (
    module text NOT NULL,
    entity text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_collections_pkey PRIMARY KEY (module, entity)
);


--
-- Name: mdm_continuity_plans; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_continuity_plans (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    critical_functions jsonb DEFAULT '[]'::jsonb NOT NULL,
    recovery_strategy text DEFAULT 'hot_standby'::text NOT NULL,
    test_frequency text DEFAULT ''::text NOT NULL,
    last_tested text,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT mdm_continuity_plans_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_continuity_plans FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_critical_functions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_critical_functions (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    dependencies jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_downtime_minutes bigint DEFAULT 0 NOT NULL,
    recovery_procedure text DEFAULT ''::text NOT NULL,
    CONSTRAINT mdm_critical_functions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_critical_functions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_data_contracts; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_data_contracts (
    product_id text NOT NULL,
    schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    quality_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    freshness_sla text NOT NULL,
    security_level text NOT NULL,
    version text NOT NULL,
    updated_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_data_contracts_pkey PRIMARY KEY (product_id)
);

ALTER TABLE ONLY master_data.mdm_data_contracts FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_data_permissions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_data_permissions (
    id text NOT NULL,
    role_id text NOT NULL,
    resource_type text DEFAULT ''::text NOT NULL,
    resource_id text DEFAULT ''::text NOT NULL,
    action text DEFAULT 'read'::text NOT NULL,
    condition jsonb,
    inherited boolean DEFAULT false NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_data_permissions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_data_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_data_products; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_data_products (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    owner text NOT NULL,
    domain text NOT NULL,
    consumers jsonb DEFAULT '[]'::jsonb NOT NULL,
    data_contract jsonb,
    sla_level text NOT NULL,
    status text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_data_products_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_data_products FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_dimension_scores; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_dimension_scores (
    dimension text NOT NULL,
    score double precision NOT NULL,
    weight double precision DEFAULT 0 NOT NULL,
    maturity_level text NOT NULL,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_dimension_scores_pkey PRIMARY KEY (dimension)
);

ALTER TABLE ONLY master_data.mdm_dimension_scores FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_failover_records; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_failover_records (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    from_region text NOT NULL,
    to_region text NOT NULL,
    trigger text DEFAULT 'manual'::text NOT NULL,
    started_at text DEFAULT ''::text NOT NULL,
    completed_at text,
    reason text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'initiated'::text NOT NULL,
    CONSTRAINT mdm_failover_records_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_failover_records FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_fix_strategies; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_fix_strategies (
    key text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_fix_strategies_pkey PRIMARY KEY (key)
);

ALTER TABLE ONLY master_data.mdm_fix_strategies FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_governance_insights; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_governance_insights (
    insight_type text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    affected_records bigint DEFAULT 0 NOT NULL,
    trend_analysis text DEFAULT ''::text NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_governance_insights_pkey PRIMARY KEY (insight_type)
);

ALTER TABLE ONLY master_data.mdm_governance_insights FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_governance_suggestions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_governance_suggestions (
    id text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    suggestion_type text DEFAULT 'standardize'::text NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    rationale text DEFAULT ''::text NOT NULL,
    suggested_action text DEFAULT ''::text NOT NULL,
    ai_model_version text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_governance_suggestions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_governance_suggestions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_graph_communities; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_communities (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    node_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    algorithm text DEFAULT 'label_propagation'::text NOT NULL,
    modularity double precision DEFAULT 0.0 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_graph_communities_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_graph_communities FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_graph_edges; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_edges (
    source_id text NOT NULL,
    target_id text NOT NULL,
    relation_type text DEFAULT 'related'::text NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    confidence double precision DEFAULT 1.0 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_graph_edges_pkey PRIMARY KEY (source_id, target_id, relation_type)
);

ALTER TABLE ONLY master_data.mdm_graph_edges FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_graph_nodes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_graph_nodes (
    id text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    node_type text DEFAULT ''::text NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    embeddings jsonb DEFAULT '[]'::jsonb NOT NULL,
    degree bigint DEFAULT 0 NOT NULL,
    community_id text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_graph_nodes_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_graph_nodes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_impact_analyses; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_impact_analyses (
    id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    analyzed_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_impact_analyses_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_impact_analyses FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_impact_simulations; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_impact_simulations (
    id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_impact_simulations_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_impact_simulations FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_improvement_plans; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_improvement_plans (
    id text NOT NULL,
    dimension text NOT NULL,
    target_level text NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    priority text NOT NULL,
    due_date text,
    status text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_improvement_plans_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_improvement_plans FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_interactions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_interactions (
    id text NOT NULL,
    user_id text DEFAULT ''::text NOT NULL,
    item_id text DEFAULT ''::text NOT NULL,
    interaction_type text DEFAULT 'view'::text NOT NULL,
    "timestamp" text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_interactions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_interactions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_kg_edges; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_kg_edges (
    id text NOT NULL,
    source_id text NOT NULL,
    target_id text NOT NULL,
    relation_type text DEFAULT 'derived_from'::text NOT NULL,
    weight double precision DEFAULT 1 NOT NULL,
    confidence double precision DEFAULT 1 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_kg_edges_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_kg_edges FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_kg_graphs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_kg_graphs (
    id text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    last_updated text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_kg_graphs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_kg_graphs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_kg_nodes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_kg_nodes (
    id text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    node_type text DEFAULT 'entity'::text NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    embeddings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_kg_nodes_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_kg_nodes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lifecycle_history; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_history (
    id text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    stage text DEFAULT 'created'::text NOT NULL,
    from_stage text,
    reason text DEFAULT ''::text NOT NULL,
    changed_at text DEFAULT ''::text NOT NULL,
    changed_by text DEFAULT ''::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lifecycle_history_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_lifecycle_history FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lifecycle_policies; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_policies (
    id text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    transitions jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_days bigint DEFAULT 0 NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lifecycle_policies_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_lifecycle_policies FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lifecycle_stages; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lifecycle_stages (
    entity_id text NOT NULL,
    stage text DEFAULT 'created'::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lifecycle_stages_pkey PRIMARY KEY (entity_id)
);

ALTER TABLE ONLY master_data.mdm_lifecycle_stages FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lineage_edges; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_edges (
    id text NOT NULL,
    from_node_id text NOT NULL,
    to_node_id text NOT NULL,
    edge_type text DEFAULT 'derives_from'::text NOT NULL,
    transformation_description text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lineage_edges_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_lineage_edges FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lineage_graphs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_graphs (
    id text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    last_updated text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lineage_graphs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_lineage_graphs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_lineage_nodes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_lineage_nodes (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_lineage_nodes_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_lineage_nodes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_match_results; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_match_results (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    source_id text NOT NULL,
    target_id text NOT NULL,
    match_score double precision NOT NULL,
    match_type text NOT NULL,
    confidence double precision NOT NULL,
    status text NOT NULL,
    matched_at text NOT NULL,
    CONSTRAINT mdm_match_results_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_match_results FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_match_rules; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_match_rules (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    rule_type text NOT NULL,
    field_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    threshold double precision NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT mdm_match_rules_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_match_rules FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_maturity_assessments; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_maturity_assessments (
    id text NOT NULL,
    dimension text NOT NULL,
    current_level text NOT NULL,
    target_level text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    assessed_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_maturity_assessments_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_maturity_assessments FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_maturity_history; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_maturity_history (
    id text NOT NULL,
    dimension text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    level text NOT NULL,
    recorded_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_maturity_history_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_maturity_history FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_metadata_attributes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_attributes (
    id text NOT NULL,
    object_id text DEFAULT ''::text NOT NULL,
    key text DEFAULT ''::text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    data_type text DEFAULT 'string'::text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_metadata_attributes_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_metadata_attributes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_metadata_objects; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_objects (
    id text NOT NULL,
    name text NOT NULL,
    object_type text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    owner text DEFAULT ''::text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    updated_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_metadata_objects_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_metadata_objects FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_metadata_tags; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_tags (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    color text DEFAULT '#95a5a6'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    usage_count bigint DEFAULT 0 NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_metadata_tags_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_metadata_tags FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_permission_roles; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_permission_roles (
    id text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    inherited_from text,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_permission_roles_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_permission_roles FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_propagation_logs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_propagation_logs (
    id text NOT NULL,
    change_event_id text NOT NULL,
    rule_id text NOT NULL,
    source_entity_id text NOT NULL,
    target_entity_id text NOT NULL,
    action text DEFAULT 'cascade_update'::text NOT NULL,
    status text DEFAULT 'propagated'::text NOT NULL,
    propagated_at text DEFAULT ''::text NOT NULL,
    rollback_id text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_propagation_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_propagation_logs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_propagation_rules; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_propagation_rules (
    id text NOT NULL,
    source_entity_type text NOT NULL,
    target_entity_type text NOT NULL,
    condition text DEFAULT ''::text NOT NULL,
    action text DEFAULT 'cascade_update'::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_propagation_rules_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_propagation_rules FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_quality_checks; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_quality_checks (
    id text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    rule_id text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'passed'::text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    details jsonb,
    checked_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_quality_checks_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_quality_checks FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_quality_loop_configs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_quality_loop_configs (
    entity_type text NOT NULL,
    enabled_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    auto_fix_enabled boolean DEFAULT false NOT NULL,
    notification_channels jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_quality_loop_configs_pkey PRIMARY KEY (entity_type)
);

ALTER TABLE ONLY master_data.mdm_quality_loop_configs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_quality_rules; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_quality_rules (
    id uuid NOT NULL,
    name text NOT NULL,
    entity_type text NOT NULL,
    rule_type text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_quality_rules_pkey PRIMARY KEY (id)
);


--
-- Name: mdm_rate_cards; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_rate_cards (
    id text NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    cost_per_request double precision DEFAULT 0 NOT NULL,
    cost_per_mb double precision DEFAULT 0 NOT NULL,
    overage_multiplier double precision DEFAULT 1 NOT NULL,
    currency text DEFAULT 'CNY'::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_rate_cards_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_rate_cards FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_recommendations; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_recommendations (
    id text NOT NULL,
    target_id text DEFAULT ''::text NOT NULL,
    item_id text DEFAULT ''::text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    reason jsonb DEFAULT '{}'::jsonb NOT NULL,
    source text DEFAULT 'hybrid'::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_recommendations_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_recommendations FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_recovery_plans; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_recovery_plans (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name text NOT NULL,
    priority text DEFAULT 'critical'::text NOT NULL,
    rto_minutes bigint DEFAULT 0 NOT NULL,
    rpo_minutes bigint DEFAULT 0 NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT mdm_recovery_plans_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_recovery_plans FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_recovery_points; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_recovery_points (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    snapshot_type text DEFAULT 'full'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    checksum text DEFAULT ''::text NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    CONSTRAINT mdm_recovery_points_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_recovery_points FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_region_configs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_region_configs (
    region_id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    primary_flag boolean DEFAULT false NOT NULL,
    endpoint text DEFAULT ''::text NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'online'::text NOT NULL,
    CONSTRAINT mdm_region_configs_pkey PRIMARY KEY (region_id)
);

ALTER TABLE ONLY master_data.mdm_region_configs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_replication_configs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_replication_configs (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    source_region text NOT NULL,
    target_region text NOT NULL,
    replication_mode text DEFAULT 'asynchronous'::text NOT NULL,
    lag_max_ms bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'stopped'::text NOT NULL,
    CONSTRAINT mdm_replication_configs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_replication_configs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_search_history; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_search_history (
    id text NOT NULL,
    query text DEFAULT ''::text NOT NULL,
    results_count bigint DEFAULT 0 NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT mdm_search_history_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_search_history FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_search_indexes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_search_indexes (
    key text NOT NULL,
    value jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_search_indexes_pkey PRIMARY KEY (key)
);

ALTER TABLE ONLY master_data.mdm_search_indexes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_semantic_search_indexes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_semantic_search_indexes (
    id text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    embeddings jsonb DEFAULT '[]'::jsonb NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_semantic_search_indexes_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_semantic_search_indexes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_sla_configs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_sla_configs (
    id text NOT NULL,
    metric text DEFAULT 'availability'::text NOT NULL,
    target_value double precision DEFAULT 0 NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    penalty_per_min double precision DEFAULT 0 NOT NULL,
    measurement_window bigint DEFAULT 30 NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_sla_configs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_sla_configs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_sla_incidents; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_sla_incidents (
    id text NOT NULL,
    config_id text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    incident_type text DEFAULT 'downtime'::text NOT NULL,
    duration_min bigint DEFAULT 0 NOT NULL,
    impact_severity text DEFAULT 'medium'::text NOT NULL,
    compensation_amount double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT mdm_sla_incidents_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_sla_incidents FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_sla_measurements; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_sla_measurements (
    id text NOT NULL,
    config_id text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    measured_value double precision DEFAULT 0 NOT NULL,
    target_value double precision DEFAULT 0 NOT NULL,
    met boolean DEFAULT false NOT NULL,
    measured_at text DEFAULT ''::text NOT NULL,
    window_start text DEFAULT ''::text NOT NULL,
    window_end text DEFAULT ''::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT mdm_sla_measurements_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_sla_measurements FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_subscriptions; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_subscriptions (
    id text NOT NULL,
    api_product_id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    starts_at text DEFAULT ''::text NOT NULL,
    expires_at text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    db_tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_mdm_subscriptions_status_standard CHECK (((status IS NULL) OR (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))),
    CONSTRAINT mdm_subscriptions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_tag_rules; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_tag_rules (
    id text NOT NULL,
    tag_id text DEFAULT ''::text NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    auto_apply boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_tag_rules_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_tag_rules FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_tagged_entities; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_tagged_entities (
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    tag_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence double precision DEFAULT 1.0 NOT NULL,
    applied_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_tagged_entities_pkey PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE ONLY master_data.mdm_tagged_entities FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_tags; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_tags (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    color text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    usage_count bigint DEFAULT 0 NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_tags_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_tags FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_usage_records; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_usage_records (
    id text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    api_product_id text DEFAULT ''::text NOT NULL,
    endpoint text DEFAULT ''::text NOT NULL,
    requests bigint DEFAULT 0 NOT NULL,
    errors bigint DEFAULT 0 NOT NULL,
    data_transferred double precision DEFAULT 0 NOT NULL,
    recorded_at text DEFAULT ''::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT mdm_usage_records_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_usage_records FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_user_role_assignments; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_user_role_assignments (
    id text NOT NULL,
    user_id text NOT NULL,
    role_id text NOT NULL,
    assigned_at text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_user_role_assignments_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_user_role_assignments FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_v60_lineage_edges; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_edges (
    id text NOT NULL,
    source_id text DEFAULT ''::text NOT NULL,
    target_id text DEFAULT ''::text NOT NULL,
    transformation_type text DEFAULT 'transform'::text NOT NULL,
    transformation_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence double precision DEFAULT 1 NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ONLY master_data.mdm_v60_lineage_edges FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_v60_lineage_graphs; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_graphs (
    id text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    root_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at text DEFAULT ''::text NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ONLY master_data.mdm_v60_lineage_graphs FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_v60_lineage_nodes; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_v60_lineage_nodes (
    id text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    entity_type text DEFAULT ''::text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    level bigint DEFAULT 0 NOT NULL,
    "position" jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_uid uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ONLY master_data.mdm_v60_lineage_nodes FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_version_branches; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_version_branches (
    id text NOT NULL,
    name text NOT NULL,
    branch_type text DEFAULT 'feature'::text NOT NULL,
    parent_branch text,
    created_at text DEFAULT ''::text NOT NULL,
    created_by text DEFAULT ''::text NOT NULL,
    merged_at text,
    merged_by text,
    status text DEFAULT 'active'::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_version_branches_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_version_branches FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_version_snapshots; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_version_snapshots (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    version text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    hash text DEFAULT ''::text NOT NULL,
    created_by text DEFAULT ''::text NOT NULL,
    created_at text DEFAULT ''::text NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_version_snapshots_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_version_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_workflow_history; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_workflow_history (
    id text NOT NULL,
    workflow_id text NOT NULL,
    action text NOT NULL,
    step_id text,
    actor text NOT NULL,
    comment text,
    recorded_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_workflow_history_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_workflow_history FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_workflow_templates; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_workflow_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    workflow_type text NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_workflow_templates_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_workflow_templates FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_workflows; Type: TABLE; Schema: master_data; Owner: -
--

CREATE TABLE IF NOT EXISTS master_data.mdm_workflows (
    id text NOT NULL,
    name text NOT NULL,
    workflow_type text NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    triggers jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT mdm_workflows_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY master_data.mdm_workflows FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_ai_models mdm_ai_models_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_ai_models
    ADD CONSTRAINT mdm_ai_models_pkey PRIMARY KEY (id);


--
-- Name: mdm_ai_suggestions mdm_ai_suggestions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_ai_suggestions
    ADD CONSTRAINT mdm_ai_suggestions_pkey PRIMARY KEY (id);


--
-- Name: mdm_api_exposures mdm_api_exposures_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_api_exposures
    ADD CONSTRAINT mdm_api_exposures_pkey PRIMARY KEY (id);


--
-- Name: mdm_api_products mdm_api_products_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_api_products
    ADD CONSTRAINT mdm_api_products_pkey PRIMARY KEY (id);


--
-- Name: mdm_data_asset_categories mdm_data_asset_categories_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_data_asset_categories
    ADD CONSTRAINT mdm_data_asset_categories_pkey PRIMARY KEY (id);


--
-- Name: mdm_assets mdm_assets_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_assets
    ADD CONSTRAINT mdm_assets_pkey PRIMARY KEY (id);


--
-- Name: mdm_audit_events mdm_audit_events_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_audit_events
    ADD CONSTRAINT mdm_audit_events_pkey PRIMARY KEY (id);


--
-- Name: mdm_audit_export_logs mdm_audit_export_logs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_audit_export_logs
    ADD CONSTRAINT mdm_audit_export_logs_pkey PRIMARY KEY (id);


--
-- Name: mdm_auto_fix_actions mdm_auto_fix_actions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_auto_fix_actions
    ADD CONSTRAINT mdm_auto_fix_actions_pkey PRIMARY KEY (id);


--
-- Name: mdm_bc_tests mdm_bc_tests_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_bc_tests
    ADD CONSTRAINT mdm_bc_tests_pkey PRIMARY KEY (id);


--
-- Name: mdm_billing_records mdm_billing_records_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_billing_records
    ADD CONSTRAINT mdm_billing_records_pkey PRIMARY KEY (id);


--
-- Name: mdm_change_events mdm_change_events_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_change_events
    ADD CONSTRAINT mdm_change_events_pkey PRIMARY KEY (id);


--
-- Name: mdm_classification_models mdm_classification_models_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_classification_models
    ADD CONSTRAINT mdm_classification_models_pkey PRIMARY KEY (id);


--
-- Name: mdm_classification_results mdm_classification_results_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_classification_results
    ADD CONSTRAINT mdm_classification_results_pkey PRIMARY KEY (id);


--
-- Name: mdm_classifier_rules mdm_classifier_rules_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_classifier_rules
    ADD CONSTRAINT mdm_classifier_rules_pkey PRIMARY KEY (id);


--
-- Name: mdm_collections mdm_collections_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
-- 注: 内嵌 PRIMARY KEY (module, entity) 已在 CREATE TABLE 定义，外部 ALTER ADD CONSTRAINT 重复
-- 会报 "multiple primary keys"；已移除（2026-10-22 修复）
--


--
-- Name: mdm_continuity_plans mdm_continuity_plans_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_continuity_plans
    ADD CONSTRAINT mdm_continuity_plans_pkey PRIMARY KEY (id);


--
-- Name: mdm_critical_functions mdm_critical_functions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_critical_functions
    ADD CONSTRAINT mdm_critical_functions_pkey PRIMARY KEY (id);


--
-- Name: mdm_data_contracts mdm_data_contracts_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_data_contracts
    ADD CONSTRAINT mdm_data_contracts_pkey PRIMARY KEY (product_id);


--
-- Name: mdm_data_permissions mdm_data_permissions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_data_permissions
    ADD CONSTRAINT mdm_data_permissions_pkey PRIMARY KEY (id);


--
-- Name: mdm_data_products mdm_data_products_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_data_products
    ADD CONSTRAINT mdm_data_products_pkey PRIMARY KEY (id);


--
-- Name: mdm_dimension_scores mdm_dimension_scores_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_dimension_scores
    ADD CONSTRAINT mdm_dimension_scores_pkey PRIMARY KEY (dimension);


--
-- Name: mdm_failover_records mdm_failover_records_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_failover_records
    ADD CONSTRAINT mdm_failover_records_pkey PRIMARY KEY (id);


--
-- Name: mdm_fix_strategies mdm_fix_strategies_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_fix_strategies
    ADD CONSTRAINT mdm_fix_strategies_pkey PRIMARY KEY (key);


--
-- Name: mdm_governance_insights mdm_governance_insights_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_governance_insights
    ADD CONSTRAINT mdm_governance_insights_pkey PRIMARY KEY (insight_type);


--
-- Name: mdm_governance_suggestions mdm_governance_suggestions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_governance_suggestions
    ADD CONSTRAINT mdm_governance_suggestions_pkey PRIMARY KEY (id);


--
-- Name: mdm_graph_communities mdm_graph_communities_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_graph_communities
    ADD CONSTRAINT mdm_graph_communities_pkey PRIMARY KEY (id);


--
-- Name: mdm_graph_edges mdm_graph_edges_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_graph_edges
    ADD CONSTRAINT mdm_graph_edges_pkey PRIMARY KEY (source_id, target_id, relation_type);


--
-- Name: mdm_graph_nodes mdm_graph_nodes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_graph_nodes
    ADD CONSTRAINT mdm_graph_nodes_pkey PRIMARY KEY (id);


--
-- Name: mdm_impact_analyses mdm_impact_analyses_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_impact_analyses
    ADD CONSTRAINT mdm_impact_analyses_pkey PRIMARY KEY (id);


--
-- Name: mdm_impact_simulations mdm_impact_simulations_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_impact_simulations
    ADD CONSTRAINT mdm_impact_simulations_pkey PRIMARY KEY (id);


--
-- Name: mdm_improvement_plans mdm_improvement_plans_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_improvement_plans
    ADD CONSTRAINT mdm_improvement_plans_pkey PRIMARY KEY (id);


--
-- Name: mdm_interactions mdm_interactions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_interactions
    ADD CONSTRAINT mdm_interactions_pkey PRIMARY KEY (id);


--
-- Name: mdm_kg_edges mdm_kg_edges_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_kg_edges
    ADD CONSTRAINT mdm_kg_edges_pkey PRIMARY KEY (id);


--
-- Name: mdm_kg_graphs mdm_kg_graphs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_kg_graphs
    ADD CONSTRAINT mdm_kg_graphs_pkey PRIMARY KEY (id);


--
-- Name: mdm_kg_nodes mdm_kg_nodes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_kg_nodes
    ADD CONSTRAINT mdm_kg_nodes_pkey PRIMARY KEY (id);


--
-- Name: mdm_lifecycle_history mdm_lifecycle_history_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lifecycle_history
    ADD CONSTRAINT mdm_lifecycle_history_pkey PRIMARY KEY (id);


--
-- Name: mdm_lifecycle_policies mdm_lifecycle_policies_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lifecycle_policies
    ADD CONSTRAINT mdm_lifecycle_policies_pkey PRIMARY KEY (id);


--
-- Name: mdm_lifecycle_stages mdm_lifecycle_stages_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lifecycle_stages
    ADD CONSTRAINT mdm_lifecycle_stages_pkey PRIMARY KEY (entity_id);


--
-- Name: mdm_lineage_edges mdm_lineage_edges_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lineage_edges
    ADD CONSTRAINT mdm_lineage_edges_pkey PRIMARY KEY (id);


--
-- Name: mdm_lineage_graphs mdm_lineage_graphs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lineage_graphs
    ADD CONSTRAINT mdm_lineage_graphs_pkey PRIMARY KEY (id);


--
-- Name: mdm_lineage_nodes mdm_lineage_nodes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_lineage_nodes
    ADD CONSTRAINT mdm_lineage_nodes_pkey PRIMARY KEY (id);


--
-- Name: mdm_match_results mdm_match_results_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_match_results
    ADD CONSTRAINT mdm_match_results_pkey PRIMARY KEY (id);


--
-- Name: mdm_match_rules mdm_match_rules_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_match_rules
    ADD CONSTRAINT mdm_match_rules_pkey PRIMARY KEY (id);


--
-- Name: mdm_maturity_assessments mdm_maturity_assessments_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_maturity_assessments
    ADD CONSTRAINT mdm_maturity_assessments_pkey PRIMARY KEY (id);


--
-- Name: mdm_maturity_history mdm_maturity_history_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_maturity_history
    ADD CONSTRAINT mdm_maturity_history_pkey PRIMARY KEY (id);


--
-- Name: mdm_metadata_attributes mdm_metadata_attributes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_metadata_attributes
    ADD CONSTRAINT mdm_metadata_attributes_pkey PRIMARY KEY (id);


--
-- Name: mdm_metadata_objects mdm_metadata_objects_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_metadata_objects
    ADD CONSTRAINT mdm_metadata_objects_pkey PRIMARY KEY (id);


--
-- Name: mdm_metadata_tags mdm_metadata_tags_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_metadata_tags
    ADD CONSTRAINT mdm_metadata_tags_pkey PRIMARY KEY (id);


--
-- Name: mdm_permission_roles mdm_permission_roles_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_permission_roles
    ADD CONSTRAINT mdm_permission_roles_pkey PRIMARY KEY (id);


--
-- Name: mdm_propagation_logs mdm_propagation_logs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_propagation_logs
    ADD CONSTRAINT mdm_propagation_logs_pkey PRIMARY KEY (id);


--
-- Name: mdm_propagation_rules mdm_propagation_rules_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_propagation_rules
    ADD CONSTRAINT mdm_propagation_rules_pkey PRIMARY KEY (id);


--
-- Name: mdm_quality_checks mdm_quality_checks_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_quality_checks
    ADD CONSTRAINT mdm_quality_checks_pkey PRIMARY KEY (id);


--
-- Name: mdm_quality_loop_configs mdm_quality_loop_configs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_quality_loop_configs
    ADD CONSTRAINT mdm_quality_loop_configs_pkey PRIMARY KEY (entity_type);


--
-- Name: mdm_quality_rules mdm_quality_rules_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_quality_rules
    ADD CONSTRAINT mdm_quality_rules_pkey PRIMARY KEY (id);


--
-- Name: mdm_rate_cards mdm_rate_cards_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_rate_cards
    ADD CONSTRAINT mdm_rate_cards_pkey PRIMARY KEY (id);


--
-- Name: mdm_recommendations mdm_recommendations_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_recommendations
    ADD CONSTRAINT mdm_recommendations_pkey PRIMARY KEY (id);


--
-- Name: mdm_recovery_plans mdm_recovery_plans_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_recovery_plans
    ADD CONSTRAINT mdm_recovery_plans_pkey PRIMARY KEY (id);


--
-- Name: mdm_recovery_points mdm_recovery_points_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_recovery_points
    ADD CONSTRAINT mdm_recovery_points_pkey PRIMARY KEY (id);


--
-- Name: mdm_region_configs mdm_region_configs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_region_configs
    ADD CONSTRAINT mdm_region_configs_pkey PRIMARY KEY (region_id);


--
-- Name: mdm_replication_configs mdm_replication_configs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_replication_configs
    ADD CONSTRAINT mdm_replication_configs_pkey PRIMARY KEY (id);


--
-- Name: mdm_search_history mdm_search_history_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_search_history
    ADD CONSTRAINT mdm_search_history_pkey PRIMARY KEY (id);


--
-- Name: mdm_search_indexes mdm_search_indexes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_search_indexes
    ADD CONSTRAINT mdm_search_indexes_pkey PRIMARY KEY (key);


--
-- Name: mdm_semantic_search_indexes mdm_semantic_search_indexes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_semantic_search_indexes
    ADD CONSTRAINT mdm_semantic_search_indexes_pkey PRIMARY KEY (id);


--
-- Name: mdm_sla_configs mdm_sla_configs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_sla_configs
    ADD CONSTRAINT mdm_sla_configs_pkey PRIMARY KEY (id);


--
-- Name: mdm_sla_incidents mdm_sla_incidents_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_sla_incidents
    ADD CONSTRAINT mdm_sla_incidents_pkey PRIMARY KEY (id);


--
-- Name: mdm_sla_measurements mdm_sla_measurements_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_sla_measurements
    ADD CONSTRAINT mdm_sla_measurements_pkey PRIMARY KEY (id);


--
-- Name: mdm_subscriptions mdm_subscriptions_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_subscriptions
    ADD CONSTRAINT mdm_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: mdm_tag_rules mdm_tag_rules_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_tag_rules
    ADD CONSTRAINT mdm_tag_rules_pkey PRIMARY KEY (id);


--
-- Name: mdm_tagged_entities mdm_tagged_entities_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_tagged_entities
    ADD CONSTRAINT mdm_tagged_entities_pkey PRIMARY KEY (entity_type, entity_id);


--
-- Name: mdm_tags mdm_tags_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_tags
    ADD CONSTRAINT mdm_tags_pkey PRIMARY KEY (id);


--
-- Name: mdm_usage_records mdm_usage_records_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_usage_records
    ADD CONSTRAINT mdm_usage_records_pkey PRIMARY KEY (id);


--
-- Name: mdm_user_role_assignments mdm_user_role_assignments_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_user_role_assignments
    ADD CONSTRAINT mdm_user_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: mdm_v60_lineage_edges mdm_v60_lineage_edges_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_v60_lineage_edges
    ADD CONSTRAINT mdm_v60_lineage_edges_pkey PRIMARY KEY (id);


--
-- Name: mdm_v60_lineage_graphs mdm_v60_lineage_graphs_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_v60_lineage_graphs
    ADD CONSTRAINT mdm_v60_lineage_graphs_pkey PRIMARY KEY (id);


--
-- Name: mdm_v60_lineage_nodes mdm_v60_lineage_nodes_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_v60_lineage_nodes
    ADD CONSTRAINT mdm_v60_lineage_nodes_pkey PRIMARY KEY (id);


--
-- Name: mdm_version_branches mdm_version_branches_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_version_branches
    ADD CONSTRAINT mdm_version_branches_pkey PRIMARY KEY (id);


--
-- Name: mdm_version_snapshots mdm_version_snapshots_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_version_snapshots
    ADD CONSTRAINT mdm_version_snapshots_pkey PRIMARY KEY (id);


--
-- Name: mdm_workflow_history mdm_workflow_history_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_workflow_history
    ADD CONSTRAINT mdm_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: mdm_workflow_templates mdm_workflow_templates_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_workflow_templates
    ADD CONSTRAINT mdm_workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: mdm_workflows mdm_workflows_pkey; Type: CONSTRAINT; Schema: master_data; Owner: -
--

ALTER TABLE ONLY master_data.mdm_workflows
    ADD CONSTRAINT mdm_workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_mdm_ai_models_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_ai_models_tenant ON master_data.mdm_ai_models USING btree (tenant_id);


--
-- Name: idx_mdm_ai_suggestions_entity; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_ai_suggestions_entity ON master_data.mdm_ai_suggestions USING btree (entity_type, entity_id);


--
-- Name: idx_mdm_ai_suggestions_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_ai_suggestions_tenant ON master_data.mdm_ai_suggestions USING btree (tenant_id);


--
-- Name: idx_mdm_api_exposures_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_api_exposures_tenant ON master_data.mdm_api_exposures USING btree (tenant_id);


--
-- Name: idx_mdm_bc_tests_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_bc_tests_tenant ON master_data.mdm_bc_tests USING btree (tenant_id);


--
-- Name: idx_mdm_classification_models_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_classification_models_tenant ON master_data.mdm_classification_models USING btree (tenant_id);


--
-- Name: idx_mdm_classification_results_entity; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_classification_results_entity ON master_data.mdm_classification_results USING btree (entity_id);


--
-- Name: idx_mdm_classification_results_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_classification_results_tenant ON master_data.mdm_classification_results USING btree (tenant_id);


--
-- Name: idx_mdm_classifier_rules_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_classifier_rules_tenant ON master_data.mdm_classifier_rules USING btree (tenant_id);


--
-- Name: idx_mdm_continuity_plans_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_continuity_plans_tenant ON master_data.mdm_continuity_plans USING btree (tenant_id);


--
-- Name: idx_mdm_critical_functions_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_critical_functions_tenant ON master_data.mdm_critical_functions USING btree (tenant_id);


--
-- Name: idx_mdm_data_contracts_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_data_contracts_tenant ON master_data.mdm_data_contracts USING btree (tenant_id);


--
-- Name: idx_mdm_data_products_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_data_products_tenant ON master_data.mdm_data_products USING btree (tenant_id);


--
-- Name: idx_mdm_dimension_scores_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_dimension_scores_tenant ON master_data.mdm_dimension_scores USING btree (tenant_id);


--
-- Name: idx_mdm_failover_records_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_failover_records_tenant ON master_data.mdm_failover_records USING btree (tenant_id);


--
-- Name: idx_mdm_graph_communities_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_graph_communities_tenant ON master_data.mdm_graph_communities USING btree (tenant_id);


--
-- Name: idx_mdm_graph_edges_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_graph_edges_tenant ON master_data.mdm_graph_edges USING btree (tenant_id);


--
-- Name: idx_mdm_graph_nodes_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_graph_nodes_tenant ON master_data.mdm_graph_nodes USING btree (tenant_id);


--
-- Name: idx_mdm_improvement_plans_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_improvement_plans_tenant ON master_data.mdm_improvement_plans USING btree (tenant_id);


--
-- Name: idx_mdm_match_results_pair; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_match_results_pair ON master_data.mdm_match_results USING btree (source_id, target_id);


--
-- Name: idx_mdm_match_results_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_match_results_tenant ON master_data.mdm_match_results USING btree (tenant_id);


--
-- Name: idx_mdm_match_rules_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_match_rules_tenant ON master_data.mdm_match_rules USING btree (tenant_id);


--
-- Name: idx_mdm_maturity_assessments_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_maturity_assessments_tenant ON master_data.mdm_maturity_assessments USING btree (tenant_id);


--
-- Name: idx_mdm_maturity_history_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_maturity_history_tenant ON master_data.mdm_maturity_history USING btree (tenant_id);


--
-- Name: idx_mdm_recovery_plans_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_recovery_plans_tenant ON master_data.mdm_recovery_plans USING btree (tenant_id);


--
-- Name: idx_mdm_recovery_points_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_recovery_points_tenant ON master_data.mdm_recovery_points USING btree (tenant_id);


--
-- Name: idx_mdm_region_configs_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_region_configs_tenant ON master_data.mdm_region_configs USING btree (tenant_id);


--
-- Name: idx_mdm_replication_configs_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_replication_configs_tenant ON master_data.mdm_replication_configs USING btree (tenant_id);


--
-- Name: idx_mdm_search_history_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_search_history_tenant ON master_data.mdm_search_history USING btree (tenant_id);


--
-- Name: idx_mdm_semantic_search_indexes_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_semantic_search_indexes_tenant ON master_data.mdm_semantic_search_indexes USING btree (tenant_id);


--
-- Name: idx_mdm_tag_rules_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_tag_rules_tenant ON master_data.mdm_tag_rules USING btree (tenant_id);


--
-- Name: idx_mdm_tagged_entities_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_tagged_entities_tenant ON master_data.mdm_tagged_entities USING btree (tenant_id);


--
-- Name: idx_mdm_tags_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_tags_tenant ON master_data.mdm_tags USING btree (tenant_id);


--
-- Name: idx_mdm_workflow_history_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_workflow_history_tenant ON master_data.mdm_workflow_history USING btree (tenant_id);


--
-- Name: idx_mdm_workflow_templates_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_workflow_templates_tenant ON master_data.mdm_workflow_templates USING btree (tenant_id);


--
-- Name: idx_mdm_workflows_tenant; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mdm_workflows_tenant ON master_data.mdm_workflows USING btree (tenant_id);


--
-- Name: mdm_assets_domain_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_assets_domain_idx ON master_data.mdm_assets USING btree (domain);


--
-- Name: mdm_assets_type_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_assets_type_idx ON master_data.mdm_assets USING btree (asset_type);


--
-- Name: mdm_audit_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_audit_entity_idx ON master_data.mdm_audit_events USING btree (entity_type, entity_id);


--
-- Name: mdm_audit_user_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_audit_user_idx ON master_data.mdm_audit_events USING btree (user_id);


--
-- Name: mdm_auto_fix_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_auto_fix_entity_idx ON master_data.mdm_auto_fix_actions USING btree (entity_type, entity_id);


--
-- Name: mdm_billing_tenant_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_billing_tenant_idx ON master_data.mdm_billing_records USING btree (tenant_id);


--
-- Name: mdm_change_events_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_change_events_entity_idx ON master_data.mdm_change_events USING btree (entity_type, entity_id);


--
-- Name: mdm_collections_module_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_collections_module_idx ON master_data.mdm_collections USING btree (module);


--
-- Name: mdm_data_permissions_role_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_data_permissions_role_idx ON master_data.mdm_data_permissions USING btree (role_id);


--
-- Name: mdm_gov_sugg_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_gov_sugg_entity_idx ON master_data.mdm_governance_suggestions USING btree (entity_type, entity_id);


--
-- Name: mdm_impact_analyses_time_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_impact_analyses_time_idx ON master_data.mdm_impact_analyses USING btree (analyzed_at);


--
-- Name: mdm_interactions_item_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_interactions_item_idx ON master_data.mdm_interactions USING btree (item_id);


--
-- Name: mdm_interactions_user_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_interactions_user_idx ON master_data.mdm_interactions USING btree (user_id);


--
-- Name: mdm_kg_edges_source_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_kg_edges_source_idx ON master_data.mdm_kg_edges USING btree (source_id);


--
-- Name: mdm_kg_edges_target_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_kg_edges_target_idx ON master_data.mdm_kg_edges USING btree (target_id);


--
-- Name: mdm_lhist_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_lhist_entity_idx ON master_data.mdm_lifecycle_history USING btree (entity_id);


--
-- Name: mdm_lineage_edges_from_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_lineage_edges_from_idx ON master_data.mdm_lineage_edges USING btree (from_node_id);


--
-- Name: mdm_lineage_edges_to_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_lineage_edges_to_idx ON master_data.mdm_lineage_edges USING btree (to_node_id);


--
-- Name: mdm_lineage_nodes_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_lineage_nodes_entity_idx ON master_data.mdm_lineage_nodes USING btree (entity_type, entity_id);


--
-- Name: mdm_mattr_object_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_mattr_object_idx ON master_data.mdm_metadata_attributes USING btree (object_id);


--
-- Name: mdm_metaobj_type_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_metaobj_type_idx ON master_data.mdm_metadata_objects USING btree (object_type);


--
-- Name: mdm_permission_roles_name_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_permission_roles_name_idx ON master_data.mdm_permission_roles USING btree (name);


--
-- Name: mdm_propagation_logs_event_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_propagation_logs_event_idx ON master_data.mdm_propagation_logs USING btree (change_event_id);


--
-- Name: mdm_propagation_rules_src_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_propagation_rules_src_idx ON master_data.mdm_propagation_rules USING btree (source_entity_type);


--
-- Name: mdm_quality_checks_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_quality_checks_entity_idx ON master_data.mdm_quality_checks USING btree (entity_type, entity_id);


--
-- Name: mdm_quality_rules_enabled_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_quality_rules_enabled_idx ON master_data.mdm_quality_rules USING btree (enabled) WHERE (enabled = true);


--
-- Name: mdm_quality_rules_entity_type_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_quality_rules_entity_type_idx ON master_data.mdm_quality_rules USING btree (entity_type);


--
-- Name: mdm_recommendations_target_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_recommendations_target_idx ON master_data.mdm_recommendations USING btree (target_id);


--
-- Name: mdm_sla_incident_config_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_sla_incident_config_idx ON master_data.mdm_sla_incidents USING btree (config_id);


--
-- Name: mdm_sla_meas_config_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_sla_meas_config_idx ON master_data.mdm_sla_measurements USING btree (config_id);


--
-- Name: mdm_subscriptions_product_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_subscriptions_product_idx ON master_data.mdm_subscriptions USING btree (api_product_id);


--
-- Name: mdm_usage_tenant_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_usage_tenant_idx ON master_data.mdm_usage_records USING btree (tenant_id);


--
-- Name: mdm_user_role_user_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_user_role_user_idx ON master_data.mdm_user_role_assignments USING btree (user_id);


--
-- Name: mdm_v60_ledge_source_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_v60_ledge_source_idx ON master_data.mdm_v60_lineage_edges USING btree (source_id);


--
-- Name: mdm_v60_ledge_target_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_v60_ledge_target_idx ON master_data.mdm_v60_lineage_edges USING btree (target_id);


--
-- Name: mdm_v60_lnode_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_v60_lnode_entity_idx ON master_data.mdm_v60_lineage_nodes USING btree (entity_id);


--
-- Name: mdm_vbranch_name_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_vbranch_name_idx ON master_data.mdm_version_branches USING btree (name);


--
-- Name: mdm_vsnap_entity_idx; Type: INDEX; Schema: master_data; Owner: -
--

CREATE INDEX IF NOT EXISTS mdm_vsnap_entity_idx ON master_data.mdm_version_snapshots USING btree (entity_type, entity_id);


--
-- Name: mdm_ai_models; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_ai_models ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_ai_suggestions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_ai_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_api_exposures; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_api_exposures ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_api_products; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_api_products ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_api_products mdm_api_products_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_api_products_tenant_policy ON master_data.mdm_api_products USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_data_asset_categories; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_data_asset_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_data_asset_categories mdm_data_asset_categories_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_data_asset_categories_tenant_policy ON master_data.mdm_data_asset_categories USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_assets; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_assets mdm_assets_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_assets_tenant_policy ON master_data.mdm_assets USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_audit_events; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_audit_export_logs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_audit_export_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_auto_fix_actions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_auto_fix_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_bc_tests; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_bc_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_billing_records; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_billing_records ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_change_events; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_change_events ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_change_events mdm_change_events_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_change_events_tenant_policy ON master_data.mdm_change_events USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_classification_models; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_classification_models ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_classification_results; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_classification_results ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_classifier_rules; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_classifier_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_continuity_plans; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_continuity_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_critical_functions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_critical_functions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_data_contracts; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_data_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_data_permissions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_data_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_data_products; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_data_products ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_dimension_scores; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_dimension_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_failover_records; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_failover_records ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_fix_strategies; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_fix_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_governance_insights; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_governance_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_governance_suggestions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_governance_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_graph_communities; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_graph_communities ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_graph_edges; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_graph_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_graph_nodes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_graph_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_impact_analyses; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_impact_analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_impact_analyses mdm_impact_analyses_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_impact_analyses_tenant_policy ON master_data.mdm_impact_analyses USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_impact_simulations; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_impact_simulations ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_impact_simulations mdm_impact_simulations_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_impact_simulations_tenant_policy ON master_data.mdm_impact_simulations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_improvement_plans; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_improvement_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_interactions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_interactions mdm_interactions_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_interactions_tenant_policy ON master_data.mdm_interactions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_kg_edges; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_kg_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_kg_edges mdm_kg_edges_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_kg_edges_tenant_policy ON master_data.mdm_kg_edges USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_kg_graphs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_kg_graphs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_kg_graphs mdm_kg_graphs_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_kg_graphs_tenant_policy ON master_data.mdm_kg_graphs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_kg_nodes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_kg_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_kg_nodes mdm_kg_nodes_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_kg_nodes_tenant_policy ON master_data.mdm_kg_nodes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_lifecycle_history; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lifecycle_history ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lifecycle_policies; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lifecycle_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lifecycle_stages; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lifecycle_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lineage_edges; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lineage_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lineage_edges mdm_lineage_edges_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_lineage_edges_tenant_policy ON master_data.mdm_lineage_edges USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_lineage_graphs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lineage_graphs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lineage_graphs mdm_lineage_graphs_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_lineage_graphs_tenant_policy ON master_data.mdm_lineage_graphs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_lineage_nodes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_lineage_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_lineage_nodes mdm_lineage_nodes_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_lineage_nodes_tenant_policy ON master_data.mdm_lineage_nodes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_match_results; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_match_results ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_match_rules; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_match_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_maturity_assessments; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_maturity_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_maturity_history; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_maturity_history ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_metadata_attributes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_metadata_attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_metadata_objects; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_metadata_objects ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_metadata_objects mdm_metadata_objects_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_metadata_objects_tenant_policy ON master_data.mdm_metadata_objects USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_metadata_tags; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_metadata_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_permission_roles; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_permission_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_propagation_logs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_propagation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_propagation_logs mdm_propagation_logs_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_propagation_logs_tenant_policy ON master_data.mdm_propagation_logs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_propagation_rules; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_propagation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_propagation_rules mdm_propagation_rules_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_propagation_rules_tenant_policy ON master_data.mdm_propagation_rules USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_quality_checks; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_quality_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_quality_loop_configs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_quality_loop_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_rate_cards; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_rate_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_recommendations; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_recommendations mdm_recommendations_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_recommendations_tenant_policy ON master_data.mdm_recommendations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_recovery_plans; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_recovery_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_recovery_points; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_recovery_points ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_region_configs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_region_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_replication_configs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_replication_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_search_history; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_search_indexes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_search_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_search_indexes mdm_search_indexes_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_search_indexes_tenant_policy ON master_data.mdm_search_indexes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_semantic_search_indexes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_semantic_search_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_sla_configs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_sla_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_sla_incidents; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_sla_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_sla_measurements; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_sla_measurements ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_subscriptions; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_subscriptions mdm_subscriptions_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_subscriptions_tenant_policy ON master_data.mdm_subscriptions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (db_tenant_id IS NULL) OR (db_tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (db_tenant_id IS NULL) OR (db_tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_tag_rules; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_tag_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_tagged_entities; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_tagged_entities ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_tags; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_usage_records; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_usage_records ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_user_role_assignments; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_user_role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_v60_lineage_edges; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_v60_lineage_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_v60_lineage_graphs; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_v60_lineage_graphs ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_v60_lineage_nodes; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_v60_lineage_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_version_branches; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_version_branches ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_version_snapshots; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_version_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_version_snapshots mdm_version_snapshots_tenant_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY mdm_version_snapshots_tenant_policy ON master_data.mdm_version_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: mdm_workflow_history; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_workflow_history ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_workflow_templates; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_workflow_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_workflows; Type: ROW SECURITY; Schema: master_data; Owner: -
--

ALTER TABLE master_data.mdm_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_ai_models tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_ai_models USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_ai_suggestions tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_ai_suggestions USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_api_exposures tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_api_exposures USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_audit_events tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_audit_events USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_audit_export_logs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_audit_export_logs USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_auto_fix_actions tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_auto_fix_actions USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_bc_tests tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_bc_tests USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_billing_records tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_billing_records USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_classification_models tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_classification_models USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_classification_results tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_classification_results USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_classifier_rules tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_classifier_rules USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_continuity_plans tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_continuity_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_critical_functions tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_critical_functions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_data_contracts tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_data_contracts USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_data_permissions tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_data_permissions USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_data_products tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_data_products USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_dimension_scores tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_dimension_scores USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_failover_records tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_failover_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_fix_strategies tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_fix_strategies USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_governance_insights tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_governance_insights USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_governance_suggestions tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_governance_suggestions USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_graph_communities tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_graph_communities USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_graph_edges tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_graph_edges USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_graph_nodes tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_graph_nodes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_improvement_plans tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_improvement_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_lifecycle_history tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_lifecycle_history USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_lifecycle_policies tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_lifecycle_policies USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_lifecycle_stages tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_lifecycle_stages USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_match_results tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_match_results USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_match_rules tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_match_rules USING (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid))) WITH CHECK (((tenant_id IS NULL) OR (tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (tenant_id = (current_setting('app.tenant_id'::text))::uuid)));


--
-- Name: mdm_maturity_assessments tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_maturity_assessments USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_maturity_history tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_maturity_history USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_metadata_attributes tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_metadata_attributes USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_metadata_tags tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_metadata_tags USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_permission_roles tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_permission_roles USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_quality_checks tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_quality_checks USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_quality_loop_configs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_quality_loop_configs USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_rate_cards tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_rate_cards USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_recovery_plans tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_recovery_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_recovery_points tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_recovery_points USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_region_configs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_region_configs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_replication_configs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_replication_configs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_search_history tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_search_history USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_semantic_search_indexes tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_semantic_search_indexes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_sla_configs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_sla_configs USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_sla_incidents tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_sla_incidents USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_sla_measurements tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_sla_measurements USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_tag_rules tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_tag_rules USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_tagged_entities tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_tagged_entities USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_tags tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_tags USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_usage_records tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_usage_records USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_user_role_assignments tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_user_role_assignments USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_v60_lineage_edges tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_edges USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_v60_lineage_graphs tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_graphs USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_v60_lineage_nodes tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_nodes USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_version_branches tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_version_branches USING (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK (((tenant_id IS NULL) OR ((tenant_id)::text = ''::text) OR (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: mdm_workflow_history tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_workflow_history USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_workflow_templates tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_workflow_templates USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- Name: mdm_workflows tenant_isolation_policy; Type: POLICY; Schema: master_data; Owner: -
--

CREATE POLICY tenant_isolation_policy ON master_data.mdm_workflows USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true))));


--
-- PostgreSQL database dump complete
--

\unrestrict LSJBR6W12waJrTIzyncA3flVreoGJ8XaUkpryHPpbkfYIqpdC82aDbGOVobASED

