-- WMS 出库拣货顺序策略：设置页 /wms/setting/fifo-policy 的真实数据源，
-- 由 svc/wms 出库发货分配批次时消费（expiry_first / fifo / lifo）。
CREATE TABLE IF NOT EXISTS wms.picking_policy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    pick_strategy character varying(20) DEFAULT 'expiry_first'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wms.picking_policy'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE wms.picking_policy ADD CONSTRAINT "picking_policy_pkey" PRIMARY KEY (id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wms_picking_policy_tenant_key
    ON wms.picking_policy USING btree (tenant_id)
    WHERE deleted_at IS NULL;

ALTER TABLE wms.picking_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms.picking_policy FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON wms.picking_policy;
CREATE POLICY rls_tenant_isolation ON wms.picking_policy FOR ALL TO PUBLIC
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

COMMENT ON TABLE wms.picking_policy IS '出库拣货批次顺序策略（有效期优先/先入先出/后入先出）';
