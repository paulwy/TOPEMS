-- public.core_tenants 状态唯一集合候选 CHECK（W5-B B24）
-- 生成日期：2026-11-21
-- 依据：lib/shared-auth TenantStatus = active/suspended/trial/deleted；
--       svc/unified-core tenant handlers 以 status 作为过滤/写入口，表为 public.core_tenants。
-- 本地分布：active 794 / trial 3，无越界值；suspended/deleted 允许但当前无行。
-- 状态：候选，未在生产执行。

-- 0. 预检（必须 0 行）
SELECT status, count(*) FROM public.core_tenants
 WHERE status NOT IN ('active','suspended','trial','deleted') GROUP BY 1;

-- 1. 约束（事务内执行）
ALTER TABLE public.core_tenants
  ADD CONSTRAINT core_tenants_status_check
  CHECK (status IN ('active','suspended','trial','deleted')) NOT VALID;

-- 2. 回滚
-- ALTER TABLE public.core_tenants DROP CONSTRAINT IF EXISTS core_tenants_status_check;
