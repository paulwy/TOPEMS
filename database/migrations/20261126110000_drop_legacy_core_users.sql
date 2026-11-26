-- ============================================================
-- 20261126110000: 删除身份表的历史副本（public.core_users / iam.core_users / iam.core_user_roles）
--
-- 背景：20260926 迁移把用户表迁入 iam.users，2026-10-28 双身份表收敛后
--   iam.users 是唯一身份权威表（svc/unified-core/src/modules/iam/auth.rs 直接读它）。
--   但两处副本一直留在库里，成为「改了但没生效」的陷阱源：
--     · public.core_users  —— 裸 core_users 按 search_path 会落到这张表；
--                            2026-11-26 本机 47 行旧镜像、生产 0 行，密码重置脚本曾写错到此。
--     · iam.core_users     —— init/06 IAM 快照遗留，0 行；仅被 iam.core_user_roles 的 FK 指向。
--     · iam.core_user_roles—— 空表；运行期代码用的是 public.core_user_roles，此表无读无写。
--
-- 依赖核查（2026-11-26 本机 + 生产两库实测）：
--   · 指向 public.core_users 的入向外键：0（生产 0，本机 0）
--   · 引用 core_users 的视图 / 物化视图 / 存储过程：0
--   · iam.core_users 的唯一入向外键来自 iam.core_user_roles（本表随本迁移一并删除）
--   · 运行期代码（*.rs/*.py/*.ts）对三张表零引用，仅历史脚本与 database/init 快照提及
--
-- 幂等性：IF EXISTS，新库/已清理库自动跳过。
-- 回滚：public.core_users 数据在 2026-11-26 已备份至
--       backups/db-legacy-core-users/public.core_users-20261126.sql（口令哈希已置失效标记）。
-- ============================================================

DROP TABLE IF EXISTS iam.core_user_roles CASCADE;
DROP TABLE IF EXISTS iam.core_users CASCADE;
DROP TABLE IF EXISTS public.core_users CASCADE;

DO $$
BEGIN
  IF to_regclass('public.core_users') IS NOT NULL
     OR to_regclass('iam.core_users') IS NOT NULL
     OR to_regclass('iam.core_user_roles') IS NOT NULL THEN
    RAISE EXCEPTION '身份副本表仍存在，删除未生效，请人工核查';
  END IF;
  RAISE NOTICE '身份副本表已清理：public.core_users / iam.core_users / iam.core_user_roles 均不存在';
END $$;
