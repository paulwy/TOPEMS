-- 20260908000011: 跨 schema 裸表名引用修复（第三轮）
-- 背景：unified-core flow 模块 search_path=public，裸表名 core_workflow_instances 等
--       在 public 不存在（flow schema 同名表列结构不匹配、且无服务）；finance forecast_v53
--       裸表名 vouchers/voucher_lines 在 finance/public/erp 均无匹配列集。
-- 按代码实际引用列建表（unified-core flow 模块 SQL 全集提取），幂等。

-- unified-core flow 模块四表（public，匹配 search_path='public' 语义）
-- 2026-09-18 防御化（空库重建链卡点）：若 public.core_workflow_instances 仅为 business_base_tables 建的 2 列裸骨架
-- （无 workflow_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='core_workflow_instances')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_workflow_instances' AND column_name='workflow_id')
  THEN
    DROP TABLE public.core_workflow_instances;
  END IF;
END $skel$;

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

-- 2026-09-18 防御化（空库重建链卡点）：若 public.core_workflow_tasks 仅为 business_base_tables 建的 2 列裸骨架
-- （无 instance_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='core_workflow_tasks')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_workflow_tasks' AND column_name='instance_id')
  THEN
    DROP TABLE public.core_workflow_tasks;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS public.core_workflow_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID,
    assignee_id UUID,
    status      TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- 2026-09-18 防御化（空库重建链卡点）：若 public.approvals 仅为 business_base_tables 建的 2 列裸骨架
-- （无 workflow_instance_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approvals')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='approvals' AND column_name='workflow_instance_id')
  THEN
    DROP TABLE public.approvals;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS public.approvals (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID,
    status               TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);

-- 2026-09-18 防御化（空库重建链卡点）：若 public.approval_records 仅为 business_base_tables 建的 2 列裸骨架
-- （无 approval_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approval_records')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='approval_records' AND column_name='approval_id')
  THEN
    DROP TABLE public.approval_records;
  END IF;
END $skel$;

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
-- 2026-09-18 防御化（空库重建链卡点）：若 finance.vouchers 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='finance' AND table_name='vouchers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='vouchers' AND column_name='tenant_id')
  THEN
    DROP TABLE finance.vouchers;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS finance.vouchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    voucher_no  TEXT,
    entity_id   TEXT,
    status      TEXT DEFAULT 'posted',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2026-09-18 防御化（空库重建链卡点）：若 finance.voucher_lines 仅为 business_base_tables 建的 2 列裸骨架
-- （无 voucher_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='finance' AND table_name='voucher_lines')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='voucher_lines' AND column_name='voucher_id')
  THEN
    DROP TABLE finance.voucher_lines;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS finance.voucher_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id  UUID,
    account_code TEXT,
    amount      NUMERIC(18, 2)
);

CREATE INDEX IF NOT EXISTS idx_fin_vouchers_tenant ON finance.vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_voucher_lines_vid ON finance.voucher_lines(voucher_id);
