-- ============================================================
-- 20261122090000_core_user_company_scopes_is_default.sql
--
-- 背景（2026-11-21）：公司上下文缺省解析链第二段。
--   * 请求不带 x-company-id 时，先看用户在当前租户的默认公司（is_default = true）；
--   * 没有默认公司的多成员用户维持 fail-closed（下游 0 行），不猜。
--
-- 变更：
--   1) 新增 is_default boolean NOT NULL DEFAULT false；
--   2) 部分唯一索引 uq_user_company_scopes_default：同一 (tenant_id, user_id)
--      最多一条 true；
--   3) 回填：原本没有任何 true 的用户，取其最早的一条成员记录置 true
--      （用户只有一条记录时同样置 true，与中间件「唯一成员推断」结果一致）；
--      已有 true 的用户不动。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS /
--         回填带 NOT EXISTS 守卫，可重复执行。
-- 回滚：database/rollback/20261122090000_core_user_company_scopes_is_default.rollback.sql
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1) 默认公司标记
-- ------------------------------------------------------------
ALTER TABLE public.core_user_company_scopes
    ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.core_user_company_scopes.is_default IS
    '用户在当前租户的默认公司。同一 (tenant_id, user_id) 最多一条 true（部分唯一索引）；请求未带 x-company-id 时优先采用。';

-- ------------------------------------------------------------
-- 2) 部分唯一索引：同租户同用户最多一个默认公司
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_company_scopes_default
    ON public.core_user_company_scopes (tenant_id, user_id)
    WHERE is_default;

-- ------------------------------------------------------------
-- 3) 回填：每个用户把最早的一条成员记录设为默认
--    「最早」= created_at 升序，同刻按 id 稳定排序；已有 true 的用户整体跳过。
-- ------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 为无默认公司的用户回填其最早一条成员记录为默认公司（公司上下文缺省解析兜底）
-- destructive-owner: shared-auth
-- destructive-ticket: COMPANY-DEFAULT-20261121
-- destructive-expires: 2027-05-20
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t public.core_user_company_scopes
WITH first_scope AS (
    SELECT DISTINCT ON (s.tenant_id, s.user_id) s.id
      FROM public.core_user_company_scopes s
     WHERE NOT EXISTS (
           SELECT 1
             FROM public.core_user_company_scopes d
            WHERE d.tenant_id = s.tenant_id
              AND d.user_id = s.user_id
              AND d.is_default
       )
     ORDER BY s.tenant_id, s.user_id, s.created_at, s.id
)
UPDATE public.core_user_company_scopes s
   SET is_default = true,
       updated_at = now()
  FROM first_scope f
 WHERE s.id = f.id;
