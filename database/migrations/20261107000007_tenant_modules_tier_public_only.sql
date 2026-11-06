-- ============================================================
-- P4 tier 激活机制（补丁）：仅对权威副本 public.core_tenant_modules 补 tier 列
-- 版本：20261107000007（20261107000002 的 public-only 修正版；20261107000003~06 已由远端占用）
--
-- 背景：20261107000002_tenant_modules_tier_column.sql 同时 ALTER public 与 iam；
--   生产库 iam schema 存在（25 张无 core_ 前缀的表），但从未创建
--   iam.core_tenant_modules（与 database/init/06_iam_schema.sql:841 基线漂移），
--   导致该迁移在 relation "iam.core_tenant_modules" does not exist 处单事务整体回滚，
--   public 侧的 tier 补齐也随之失效。
--
--   BE 使用无限定名 core_tenant_modules（svc/unified-core/src/modules/tenant/handlers.rs），
--   经 search_path 解析到 public 副本；models.rs TenantModule.tier 为 String（非 Option），
--   activate_module 的 INSERT 未显式写 tier → 必须带默认值，故取
--   varchar(32) NOT NULL DEFAULT 'basic'（与 20261107000002 一致，保证不同环境收敛到同一结构）。
--
-- 本迁移只处理 public 侧，并带存在性守卫；表不存在则整条 no-op，不触碰 iam.*。
-- 幂等：to_regclass 守卫 + ADD COLUMN IF NOT EXISTS；重复执行为 0 变更。
--
-- down:
--   ALTER TABLE public.core_tenant_modules DROP COLUMN IF EXISTS tier;
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RAISE NOTICE 'public.core_tenant_modules 不存在，跳过 tier 列补丁';
        RETURN;
    END IF;

    ALTER TABLE public.core_tenant_modules
        ADD COLUMN IF NOT EXISTS tier varchar(32) NOT NULL DEFAULT 'basic';

    RAISE NOTICE 'public.core_tenant_modules.tier 已就绪（varchar(32) NOT NULL DEFAULT ''basic''）';
END $$;
