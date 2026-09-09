-- 20260910000001: scm 来料检验明细记录表（缺口 #18）
-- 背景：前端 inspectionRecord.ts 调用 /incoming-inspections/{id}/records，
--       后端 incoming_inspection.rs 无此子资源端点，且无对应表。
-- 幂等创建，GRANT topems_app。

CREATE TABLE IF NOT EXISTS scm.inspection_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    inspection_id UUID NOT NULL REFERENCES scm.incoming_inspections(id) ON DELETE CASCADE,
    item_code TEXT,
    item_name TEXT NOT NULL,
    specification TEXT,
    unit TEXT,
    batch_no TEXT,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    samplesize NUMERIC(15,3),
    inspectionitems TEXT,
    inspection_method TEXT,
    inspection_standard TEXT,
    result TEXT NOT NULL,
    defect_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scm_inspection_records_inspection ON scm.inspection_records(inspection_id);
CREATE INDEX IF NOT EXISTS idx_scm_inspection_records_tenant ON scm.inspection_records(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON scm.inspection_records TO topems_app;
