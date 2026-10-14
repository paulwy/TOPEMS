-- 2026-10-14 K1：MDM 核心 3 模块（versioning_v54 / commercial_v55 / metadata_v60）接真表。
--
-- 背景：v52-v60 原为 LazyLock<Mutex<Vec<T>>> 内存 Store，经 persist 层整体快照为
--       master_data.mdm_collections（JSONB）。本迁移挑 3 模块的核心实体建关系型真表，
--       对齐 quality_v51 试点（20261014000010）与 ehs 域表（20261014000040）风格：
--         * master_data schema；
--         * tenant_id 列 + RLS FORCE + nil/空/全零豁免（GUC 未设置时放行，语义对齐 shared-db）；
--         * 幂等 IF NOT EXISTS / DROP POLICY IF EXISTS；
--         * 回填走 mdm_collections JSONB，ON CONFLICT DO NOTHING。
-- 其余实体（分支/权限/角色/审计/计量/SLA/血缘/生命周期等）暂保留内存 Store，见 TODO.md K1 backlog。

CREATE SCHEMA IF NOT EXISTS master_data;

-- ---------- versioning_v54：版本快照（主数据根基） ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_version_snapshots (
    id            TEXT PRIMARY KEY,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    version       TEXT NOT NULL,
    data          JSONB NOT NULL DEFAULT '{}'::jsonb,
    hash          TEXT NOT NULL DEFAULT '',
    created_by    TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT '',
    comment       TEXT NOT NULL DEFAULT '',
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_vsnap_entity_idx
    ON master_data.mdm_version_snapshots (entity_type, entity_id);

-- ---------- commercial_v55：API 产品 + 租户订阅 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_api_products (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    tier                 TEXT NOT NULL DEFAULT 'free',
    rate_limit_per_min   BIGINT NOT NULL DEFAULT 100,
    rate_limit_per_day   BIGINT NOT NULL DEFAULT 10000,
    features             JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_monthly        DOUBLE PRECISION NOT NULL DEFAULT 0,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id            UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS master_data.mdm_subscriptions (
    id              TEXT PRIMARY KEY,
    api_product_id  TEXT NOT NULL,
    tenant_id       TEXT NOT NULL DEFAULT '',
    tier            TEXT NOT NULL DEFAULT 'free',
    starts_at       TEXT NOT NULL DEFAULT '',
    expires_at      TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'active',
    db_tenant_id    UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_subscriptions_product_idx
    ON master_data.mdm_subscriptions (api_product_id);

-- ---------- metadata_v60：元数据对象 ----------
CREATE TABLE IF NOT EXISTS master_data.mdm_metadata_objects (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    object_type   TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    owner         TEXT NOT NULL DEFAULT '',
    tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL DEFAULT '',
    tenant_id     UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE INDEX IF NOT EXISTS mdm_metaobj_type_idx
    ON master_data.mdm_metadata_objects (object_type);

-- ---------- RLS：4 表统一开启 + FORCE + tenant 策略（nil/空豁免，对齐 ehs/shared-db） ----------
DO $$
DECLARE
    t text;
    tenant_col text;
BEGIN
    FOR t, tenant_col IN
        SELECT * FROM (VALUES
            ('master_data.mdm_version_snapshots', 'tenant_id'),
            ('master_data.mdm_api_products', 'tenant_id'),
            ('master_data.mdm_subscriptions', 'db_tenant_id'),
            ('master_data.mdm_metadata_objects', 'tenant_id')
        ) AS v(tbl, tcol)
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
                       split_part(t, '.', 2) || '_tenant_policy', t);
        EXECUTE format($f$
            CREATE POLICY %I ON %s
            USING (
                current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR %s IS NULL
                OR %s = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
            WITH CHECK (
                current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR %s IS NULL
                OR %s = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
        $f$, split_part(t, '.', 2) || '_tenant_policy', t,
            tenant_col, tenant_col, tenant_col, tenant_col);
    END LOOP;
END $$;

-- ---------- 回填：从 mdm_collections JSONB 快照抽取核心实体（ON CONFLICT DO NOTHING） ----------
INSERT INTO master_data.mdm_version_snapshots
    (id, entity_type, entity_id, version, data, hash, created_by, created_at, comment)
SELECT e->>'id', e->>'entity_type', e->>'entity_id', e->>'version',
       COALESCE((e->'data')::jsonb, '{}'::jsonb),
       COALESCE(e->>'hash', ''), COALESCE(e->>'created_by', ''),
       COALESCE(e->>'created_at', ''), COALESCE(e->>'comment', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'versioning_v54' AND c.entity = 'version_snapshots'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_api_products
    (id, name, tier, rate_limit_per_min, rate_limit_per_day, features, price_monthly, active)
SELECT e->>'id', e->>'name', COALESCE(e->>'tier', 'free'),
       COALESCE((e->>'rate_limit_per_min')::bigint, 100),
       COALESCE((e->>'rate_limit_per_day')::bigint, 10000),
       COALESCE((e->'features')::jsonb, '[]'::jsonb),
       COALESCE((e->>'price_monthly')::double precision, 0),
       COALESCE((e->>'active')::boolean, TRUE)
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'commercial_v55' AND c.entity = 'api_products'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_subscriptions
    (id, api_product_id, tenant_id, tier, starts_at, expires_at, status)
SELECT e->>'id', e->>'api_product_id', COALESCE(e->>'tenant_id', ''),
       COALESCE(e->>'tier', 'free'),
       COALESCE(e->>'starts_at', ''), COALESCE(e->>'expires_at', ''),
       COALESCE(e->>'status', 'active')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'commercial_v55' AND c.entity = 'subscriptions'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_data.mdm_metadata_objects
    (id, name, object_type, description, owner, tags, attributes, created_at, updated_at)
SELECT e->>'id', e->>'name', COALESCE(e->>'object_type', ''),
       COALESCE(e->>'description', ''), COALESCE(e->>'owner', ''),
       COALESCE((e->'tags')::jsonb, '[]'::jsonb),
       COALESCE((e->'attributes')::jsonb, '{}'::jsonb),
       COALESCE(e->>'created_at', ''), COALESCE(e->>'updated_at', '')
FROM master_data.mdm_collections c
CROSS JOIN LATERAL jsonb_array_elements(c.data) AS e
WHERE c.module = 'metadata_v60' AND c.entity = 'objects'
  AND jsonb_typeof(c.data) = 'array'
ON CONFLICT (id) DO NOTHING;
