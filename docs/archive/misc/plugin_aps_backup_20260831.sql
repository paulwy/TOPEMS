--
-- PostgreSQL database dump
--

\restrict xy2RZsKxxIiczCMzGsTq3naoJNOjeRgF7KVZLxlWXIPNfjIAdFEZ0U8WnqUYEkc

-- Dumped from database version 18.4 (Homebrew)
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
-- Name: plugin_aps; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA plugin_aps;


ALTER SCHEMA plugin_aps OWNER TO topems;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aps_capacities; Type: TABLE; Schema: plugin_aps; Owner: topems
--

CREATE TABLE plugin_aps.aps_capacities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_center_id uuid NOT NULL,
    work_center_name character varying(128),
    capacity_date date,
    available_hours numeric(10,2),
    used_hours numeric(10,2) DEFAULT 0,
    utilization_rate numeric(5,4) DEFAULT 0,
    status character varying(32) DEFAULT 'available'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE plugin_aps.aps_capacities OWNER TO topems;

--
-- Name: aps_demand_forecasts; Type: TABLE; Schema: plugin_aps; Owner: topems
--

CREATE TABLE plugin_aps.aps_demand_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    forecast_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    forecast_period character varying(32),
    forecast_date date,
    forecast_quantity numeric(12,2),
    actual_quantity numeric(12,2) DEFAULT 0,
    accuracy_rate numeric(5,4) DEFAULT 0,
    method character varying(32) DEFAULT 'moving_average'::character varying,
    confidence_level numeric(5,4) DEFAULT 0.95,
    notes text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE plugin_aps.aps_demand_forecasts OWNER TO topems;

--
-- Name: aps_material_plans; Type: TABLE; Schema: plugin_aps; Owner: topems
--

CREATE TABLE plugin_aps.aps_material_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    plan_id uuid,
    material_id uuid,
    material_code character varying(64),
    material_name character varying(256),
    required_quantity numeric(12,4),
    available_quantity numeric(12,4) DEFAULT 0,
    shortfall_quantity numeric(12,4) DEFAULT 0,
    required_date date,
    supply_type character varying(32) DEFAULT 'purchase'::character varying,
    status character varying(32) DEFAULT 'pending'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE plugin_aps.aps_material_plans OWNER TO topems;

--
-- Name: aps_production_plans; Type: TABLE; Schema: plugin_aps; Owner: topems
--

CREATE TABLE plugin_aps.aps_production_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    plan_name character varying(128) NOT NULL,
    plan_type character varying(32) DEFAULT 'monthly'::character varying,
    start_date date,
    end_date date,
    status character varying(32) DEFAULT 'draft'::character varying,
    product_id uuid,
    product_name character varying(256),
    target_quantity numeric(12,2),
    notes text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE plugin_aps.aps_production_plans OWNER TO topems;

--
-- Name: aps_schedules; Type: TABLE; Schema: plugin_aps; Owner: topems
--

CREATE TABLE plugin_aps.aps_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_no character varying(64) NOT NULL,
    plan_id uuid,
    work_order_id uuid,
    product_id uuid,
    product_name character varying(256),
    work_center_id uuid,
    work_center_name character varying(128),
    planned_start timestamp with time zone,
    planned_end timestamp with time zone,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    quantity numeric(12,2),
    priority integer DEFAULT 0,
    status character varying(32) DEFAULT 'pending'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE plugin_aps.aps_schedules OWNER TO topems;

--
-- Data for Name: aps_capacities; Type: TABLE DATA; Schema: plugin_aps; Owner: topems
--

COPY plugin_aps.aps_capacities (id, work_center_id, work_center_name, capacity_date, available_hours, used_hours, utilization_rate, status, tenant_id, created_at, updated_at) FROM stdin;
7898e8f5-5ef0-4a95-8f2b-2f6b5820e6c3	00000000-0000-0000-0000-000000000011	机加工车间-01	2026-08-29	16.00	0.00	0.0000	available	00000000-0000-0000-0000-000000000001	2026-08-29 16:00:05.629664+08	2026-08-29 16:00:05.629664+08
\.


--
-- Data for Name: aps_demand_forecasts; Type: TABLE DATA; Schema: plugin_aps; Owner: topems
--

COPY plugin_aps.aps_demand_forecasts (id, forecast_no, product_id, product_name, forecast_period, forecast_date, forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level, notes, tenant_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aps_material_plans; Type: TABLE DATA; Schema: plugin_aps; Owner: topems
--

COPY plugin_aps.aps_material_plans (id, plan_no, plan_id, material_id, material_code, material_name, required_quantity, available_quantity, shortfall_quantity, required_date, supply_type, status, tenant_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aps_production_plans; Type: TABLE DATA; Schema: plugin_aps; Owner: topems
--

COPY plugin_aps.aps_production_plans (id, plan_no, plan_name, plan_type, start_date, end_date, status, product_id, product_name, target_quantity, notes, tenant_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: aps_schedules; Type: TABLE DATA; Schema: plugin_aps; Owner: topems
--

COPY plugin_aps.aps_schedules (id, schedule_no, plan_id, work_order_id, product_id, product_name, work_center_id, work_center_name, planned_start, planned_end, actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at) FROM stdin;
8c5529a3-b229-4000-9afa-2e15346cc4df	APS-MCP-0001	\N	\N	\N	CNC-车削件	\N	机加工车间-01	2026-08-29 16:00:05.606011+08	2026-08-30 00:00:05.606011+08	\N	\N	120.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-29 16:00:05.606011+08	2026-08-29 16:00:05.606011+08
f90ad998-9b0b-4d8a-a916-8bd7c9b194bf	CURL-TEST-001	\N	\N	\N	测试件	\N	车间-02	\N	\N	\N	\N	5.00	3	pending	00000000-0000-0000-0000-000000000001	2026-08-29 16:04:34.653907+08	2026-08-29 16:04:34.653907+08
5035abf9-edc5-46ac-82ba-4a0b95bd232a	APS-MCP-20260829080607	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-29 16:06:07.719143+08	2026-08-29 16:06:07.719143+08
41ddf101-fccc-4412-ab62-8130b73a199f	APS-MCP-20260829214938	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-30 05:49:38.101211+08	2026-08-30 05:49:38.101211+08
19d50e38-f65c-4e15-aa1b-cc87a6018426	APS-MCP-20260829214944	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-30 05:49:44.799117+08	2026-08-30 05:49:44.799117+08
73e3c8df-c817-4f9a-8397-0df881f5de88	APS-MCP-20260829215022	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-30 05:50:22.245366+08	2026-08-30 05:50:22.245366+08
a175fcc7-9994-42b8-ab38-454629f3775f	APS-MCP-20260829215133	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-30 05:51:33.04282+08	2026-08-30 05:51:33.04282+08
dd86c93f-87ee-4af8-90fc-13c2b3537fa9	APS-MCP-20260829215200	\N	\N	\N	e2e-aps-创建	\N	机加工车间-01	2026-08-30 16:00:00+08	\N	\N	\N	10.00	5	pending	00000000-0000-0000-0000-000000000001	2026-08-30 05:52:00.841885+08	2026-08-30 05:52:00.841885+08
\.


--
-- Name: aps_capacities aps_capacities_pkey; Type: CONSTRAINT; Schema: plugin_aps; Owner: topems
--

ALTER TABLE ONLY plugin_aps.aps_capacities
    ADD CONSTRAINT aps_capacities_pkey PRIMARY KEY (id);


--
-- Name: aps_demand_forecasts aps_demand_forecasts_pkey; Type: CONSTRAINT; Schema: plugin_aps; Owner: topems
--

ALTER TABLE ONLY plugin_aps.aps_demand_forecasts
    ADD CONSTRAINT aps_demand_forecasts_pkey PRIMARY KEY (id);


--
-- Name: aps_material_plans aps_material_plans_pkey; Type: CONSTRAINT; Schema: plugin_aps; Owner: topems
--

ALTER TABLE ONLY plugin_aps.aps_material_plans
    ADD CONSTRAINT aps_material_plans_pkey PRIMARY KEY (id);


--
-- Name: aps_production_plans aps_production_plans_pkey; Type: CONSTRAINT; Schema: plugin_aps; Owner: topems
--

ALTER TABLE ONLY plugin_aps.aps_production_plans
    ADD CONSTRAINT aps_production_plans_pkey PRIMARY KEY (id);


--
-- Name: aps_schedules aps_schedules_pkey; Type: CONSTRAINT; Schema: plugin_aps; Owner: topems
--

ALTER TABLE ONLY plugin_aps.aps_schedules
    ADD CONSTRAINT aps_schedules_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict xy2RZsKxxIiczCMzGsTq3naoJNOjeRgF7KVZLxlWXIPNfjIAdFEZ0U8WnqUYEkc

