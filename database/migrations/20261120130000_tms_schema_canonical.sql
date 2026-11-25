-- 20261120130000: TMS 5 张运行期表收口（W2-D2 第二个模块）
--
-- 背景：tms.tms_vehicles / tms_drivers / tms_carriers / tms_routes / tms_shipments
-- 由 svc/tms/src/models/schema_defense.rs 在启动时 CREATE SCHEMA + CREATE TABLE 骨架、
-- 再逐列 ADD COLUMN 维护。迁移链虽然已建过这 5 张表，但线上还有 schema_defense
-- 补出的列（name_en / deleted_at / actual_arrival / actual_departure 等），
-- 且代码 TABLE_DEFS 写 VARCHAR，线上实际为 text。
--
-- 本迁移以当前 baseline+forward 库真实形状固化，供空库和既有库统一使用。
-- 幂等：CREATE TABLE / INDEX IF NOT EXISTS；策略先 DROP IF EXISTS 再建。
-- 不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS tms.tms_carriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrier_no text NOT NULL,
    name text NOT NULL,
    contact_person text,
    contact_phone text,
    status text DEFAULT 'active'::text NOT NULL,
    service_area text,
    tenant_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    name_en varchar,
    deleted_at timestamptz,
    CONSTRAINT tms_carriers_pkey PRIMARY KEY (id),
    CONSTRAINT tms_carriers_carrier_no_key UNIQUE (carrier_no),
    CONSTRAINT ck_tms_carriers_status_standard CHECK (
        status IS NULL OR status = ANY ('{active,inactive,archived,pending_review,suspended,blacklisted,rejected}'::text[])
    )
);

CREATE TABLE IF NOT EXISTS tms.tms_drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_no text NOT NULL,
    name text NOT NULL,
    phone text,
    license_no text,
    license_type text,
    status text DEFAULT 'active'::text NOT NULL,
    carrier_id uuid,
    tenant_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT tms_drivers_pkey PRIMARY KEY (id),
    CONSTRAINT tms_drivers_driver_no_key UNIQUE (driver_no),
    CONSTRAINT ck_tms_drivers_status_standard CHECK (
        status IS NULL OR status = ANY ('{active,inactive,archived,suspended}'::text[])
    )
);

CREATE TABLE IF NOT EXISTS tms.tms_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_no text NOT NULL,
    name text,
    origin text NOT NULL,
    destination text NOT NULL,
    distance_km numeric,
    estimated_hours numeric,
    status text DEFAULT 'active'::text NOT NULL,
    tenant_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    name_en varchar,
    deleted_at timestamptz,
    CONSTRAINT tms_routes_pkey PRIMARY KEY (id),
    CONSTRAINT tms_routes_route_no_key UNIQUE (route_no)
);

CREATE TABLE IF NOT EXISTS tms.tms_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_no text NOT NULL,
    order_id uuid,
    carrier_id uuid,
    vehicle_id uuid,
    driver_id uuid,
    route_id uuid,
    origin text NOT NULL,
    destination text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    freight_amount numeric,
    planned_departure timestamptz,
    planned_arrival timestamptz,
    notes text,
    tenant_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    actual_arrival timestamptz,
    actual_departure timestamptz,
    CONSTRAINT tms_shipments_pkey PRIMARY KEY (id),
    CONSTRAINT tms_shipments_shipment_no_key UNIQUE (shipment_no)
);

CREATE TABLE IF NOT EXISTS tms.tms_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_no text NOT NULL,
    plate_number text,
    vehicle_type text,
    capacity numeric,
    status text DEFAULT 'active'::text NOT NULL,
    carrier_id uuid,
    notes text,
    tenant_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT tms_vehicles_pkey PRIMARY KEY (id),
    CONSTRAINT tms_vehicles_vehicle_no_key UNIQUE (vehicle_no),
    CONSTRAINT ck_tms_vehicles_status_standard CHECK (
        status IS NULL OR status = ANY ('{active,inactive,archived,maintenance}'::text[])
    )
);

CREATE INDEX IF NOT EXISTS idx_tms_carriers_tenant ON tms.tms_carriers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tms_drivers_tenant ON tms.tms_drivers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_carrier ON tms.tms_shipments USING btree (carrier_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_driver ON tms.tms_shipments USING btree (driver_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_route ON tms.tms_shipments USING btree (route_id);
CREATE INDEX IF NOT EXISTS idx_tms_shipments_vehicle ON tms.tms_shipments USING btree (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tms_vehicles_tenant ON tms.tms_vehicles USING btree (tenant_id);

ALTER TABLE tms.tms_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_drivers FORCE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_carriers FORCE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_routes FORCE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms.tms_shipments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_vehicles;
CREATE POLICY rls_tenant_isolation ON tms.tms_vehicles
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_drivers;
CREATE POLICY rls_tenant_isolation ON tms.tms_drivers
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_carriers;
CREATE POLICY rls_tenant_isolation ON tms.tms_carriers
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_routes;
CREATE POLICY rls_tenant_isolation ON tms.tms_routes
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON tms.tms_shipments;
CREATE POLICY rls_tenant_isolation ON tms.tms_shipments
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);
