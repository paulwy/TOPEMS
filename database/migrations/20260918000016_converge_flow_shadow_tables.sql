-- 同名多 schema 表收敛收尾：flow 骨架影子表消除 + public.core_workflow_tasks 补列（2026-09-18）
-- 决策依据（代码 + 双库实证）：
--   · embedded 模式 SEARCH_PATH=flow, public（svc/unified-core/src/embedded.rs:49），
--     独立服务 SEARCH_PATH=public（main.rs:309）
--   · 5432（活跃库/运行基准）：flow schema 无 core_workflow_tasks/approvals 等表，
--     查询自然解析到 public 完整表；5433 空库重建却由 business_base_tables 在 flow 侧
--     建了 2 列裸骨架（core_workflow_tasks 5 列）——骨架"抢占"解析位但结构不全 → 500
--   · 代码无前缀查询（svc/unified-core/src/modules/flow/*.rs）：core_workflow_tasks
--     （需 12 列）、core_workflow_instances（需 12 列）、approvals（需 id/
--     workflow_instance_id/deleted_at/assignee_id/approved_by）、approval_records
--     （需 id/approval_id/actor_id/deleted_at）
-- 处理（幂等）：
--   1) DROP flow 侧 4 张骨架影子表（approvals/approval_records/core_workflow_instances/
--      core_workflow_tasks）——仅当表存在、0 行、列数 < 8（骨架特征）时 DROP；
--      5432 无这些表 → 无操作；核心语义：消除分裂，查询统一落 public 单份
--   2) public.core_workflow_tasks 补列（5432 缺 priority/due_time/claimed_at；
--      5433 缺 node_id/comment/priority/due_time/completed_at/claimed_at），
--      类型对齐 core.core_workflow_tasks 权威（12 列）
--   · flow.core_workflows（13 列完整，000008 权威化产物）保留不动
--   · public.approvals(14)/approval_records(10)/core_workflow_instances(12) 已满足代码需求

-- ============================================================
-- 1) DROP flow 骨架影子表
-- ============================================================
DO $$
DECLARE
  t text;
  n int;
BEGIN
  FOREACH t IN ARRAY ARRAY['approvals','approval_records','core_workflow_instances','core_workflow_tasks']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='flow' AND table_name=t) THEN
      EXECUTE format('SELECT count(*) FROM flow.%I', t) INTO n;
      IF n = 0 AND (SELECT count(*) FROM information_schema.columns
                    WHERE table_schema='flow' AND table_name=t) < 8 THEN
        EXECUTE format('DROP TABLE flow.%I', t);
        RAISE NOTICE 'flow.% 骨架影子表已 DROP（收敛至 public 单份）', t;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2) public.core_workflow_tasks 补列（对齐 core 权威 12 列）
-- ============================================================
-- 2026-09-21 防御化（空库重建链卡点）：000007 已 DROP public 影子表（5433 空库重建真实生效，
-- 5432 因历史迁移记录回填未删），第 1 部分 DROP flow 骨架后若无 public 表则查询无表可解析；
-- 此处按 5432 权威 DDL 重建 public.core_workflow_tasks（5432 已存在 → IF NOT EXISTS 跳过），
-- 补列段表存在守卫（幂等可重放）。
CREATE TABLE IF NOT EXISTS "public"."core_workflow_tasks" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  node_id varchar NOT NULL,
  assignee_id uuid NOT NULL,
  status varchar DEFAULT 'pending',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  priority varchar,
  due_time timestamptz,
  claimed_at timestamptz,
  PRIMARY KEY (id)
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='core_workflow_tasks') THEN
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS node_id varchar(255)$x$;
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS comment text$x$;
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS priority varchar(50)$x$;
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS due_time timestamptz$x$;
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz$x$;
    EXECUTE $x$ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS claimed_at timestamptz$x$;
  END IF;
END $$;

-- ============================================================
-- 3) 空库重建补齐（2026-09-25 空库验证卡点）：000007 已 DROP public 影子表，
--    flow 骨架影子表在本迁移第 1 部分 DROP 后，空库将无任何实例/版本/审批表可解析；
--    此处按 20260908000011 同源权威结构 + unified-core flow 模块引用列补齐（幂等）。
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."core_workflow_instances" (
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
CREATE TABLE IF NOT EXISTS "public"."core_workflow_versions" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID,
    version     INTEGER,
    definition  JSONB,
    isactive    BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS "public"."approvals" (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID,
    status               TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,
    node_id              UUID,
    task_name            TEXT,
    assignee_id          UUID,
    approved_by          UUID,
    approval_type        TEXT,
    comment              TEXT,
    approved_at          TIMESTAMPTZ,
    timeout_at           TIMESTAMPTZ,
    tenant_id            UUID
);
CREATE TABLE IF NOT EXISTS "public"."approval_records" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id     UUID,
    action          TEXT,
    actor_name      TEXT,
    comment         TEXT,
    previous_status TEXT,
    new_status      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    actor_id        UUID,
    tenant_id       UUID,
    deleted_at      TIMESTAMPTZ
);
