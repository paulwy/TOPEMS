-- ============================================================
-- 20261126180000: 去重 public.core_role_permissions 同 (role_id, permission_id) 重复授权
--
-- 背景（IAM 目录统一专项 L2）：
--   · 本机 dev 库种子重放残留：superadmin 3414 行/343 对（冗余 3071）、
--     admin 1048 行/345 对（冗余 703），同对最多重复 38 次；prod topems_prod
--     2923 行 = 2923 对、重复 0。
--   · 表仅有 pkey(id)，无 (role_id, permission_id) 业务唯一约束；种子重放缺少
--     幂等守卫时同一授权对被重复 INSERT，产生多行同对记录。
--
-- 范围：
--   · 每个 (role_id, permission_id) 分组保留一行（最早 created_at，并列取物理首行 ctid），
--     删除其余重复行；distinct 授权对一条不丢。
--   · prod 基线无重复 → 本迁移在 prod 幂等空跑（DELETE 0 行）。
--
-- 幂等：to_regclass 守卫；无重复对时 DELETE 0 行，可重复执行。
-- 回滚：去重删除的重复行无独立业务含义（同对等价），无需备份恢复；
--       如需追溯，窗口前超户 pg_dump -t public.core_role_permissions。
-- 备注：根治（种子 INSERT 幂等守卫 / (role_id, permission_id) 唯一约束）另议，
--       本迁移仅收敛存量重复，不改表结构、不新建角色、不新增/撤销授权。
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $$
BEGIN
  IF to_regclass('public.core_role_permissions') IS NULL THEN
    RAISE NOTICE 'skip: public.core_role_permissions 不存在，跳过授权去重';
    RETURN;
  END IF;

  -- destructive-gate: allow
  -- destructive-kind: DELETE
  -- destructive-reason: 收敛同 (role_id, permission_id) 重复授权行（prod 实测 0 重复，出现非 0 即人工核查）；保留每组最早一行，distinct 授权不丢
  -- destructive-owner: iam
  -- destructive-ticket: IAM-LEGACY-DEDUPE-20261126
  -- destructive-expires: 2027-05-25
  -- destructive-max-rows: 0
  -- destructive-backup: 窗口前超户 pg_dump -t public.core_role_permissions
  -- 锚点说明：prod 与迁移链终态均为复合主键 (role_id, permission_id)、无业务 `id` 列
  -- （dev 库的 id 单列主键属本地漂移，不纳入迁移口径）。去重定位改用 PostgreSQL 系统
  -- 列 ctid，兼容「有/无业务 id 列」两种形态；同对授权行等价，保留每组最早 created_at、
  -- 并列取物理首行即可，distinct 授权对一条不丢。
  DELETE FROM public.core_role_permissions rp
  USING (
    SELECT ctid,
           row_number() OVER (
             PARTITION BY role_id, permission_id
             ORDER BY created_at ASC, ctid ASC
           ) AS rn
    FROM public.core_role_permissions
  ) dup
  WHERE rp.ctid = dup.ctid
    AND dup.rn > 1;

  -- 收尾断言：不应再存在同 (role_id, permission_id) 重复对
  IF EXISTS (
    SELECT 1
    FROM public.core_role_permissions
    GROUP BY role_id, permission_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'core_role_permissions 仍存在重复授权对，请人工核查';
  END IF;
END $$;
