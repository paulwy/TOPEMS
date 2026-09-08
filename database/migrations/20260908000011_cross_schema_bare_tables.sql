-- 20260908000011: 跨 schema 裸表名引用修复（第三轮）
-- 背景：unified-core flow 模块 search_path=public，裸表名 core_workflow_instances 等
--       在 public 不存在（flow schema 同名表列结构不匹配、且无服务）；finance forecast_v53
--       裸表名 vouchers/voucher_lines 在 finance/public/erp 均无匹配列集。
-- 按代码实际引用列建表（unified-core flow 模块 SQL 全集提取），幂等。

-- unified-core flow 模块四表（public，匹配 search_path='public' 语义）
CREATE TABLE IF NOT EXISTS public.core_workflow_instances (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id      UUID,
    title            TEXT,
    initiator_id     UUID,
    current_node_id  TEXT,
    status           TEXT DEFAULT 'pending',
    variables        JSONB DEFAULT '{}'::jsonb,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.core_workflow_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID,
    assignee_id UUID,
    status      TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.approvals (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID,
    status               TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.approval_records (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id    UUID,
    action         TEXT,
    actor_name     TEXT,
    comment        TEXT,
    previous_status TEXT,
    new_status     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cwi_initiator ON public.core_workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_cwt_instance ON public.core_workflow_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_approvals_wfi ON public.approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_aid ON public.approval_records(approval_id);

-- finance forecast_v53 预测表（裸名 vouchers/voucher_lines，search_path=finance,public）
CREATE TABLE IF NOT EXISTS finance.vouchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    voucher_no  TEXT,
    entity_id   TEXT,
    status      TEXT DEFAULT 'posted',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.voucher_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id  UUID,
    account_code TEXT,
    amount      NUMERIC(18, 2)
);

CREATE INDEX IF NOT EXISTS idx_fin_vouchers_tenant ON finance.vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_voucher_lines_vid ON finance.voucher_lines(voucher_id);
