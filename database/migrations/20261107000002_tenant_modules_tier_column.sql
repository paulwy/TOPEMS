-- P4 tier 激活机制：补齐 core_tenant_modules 的 tier 列
-- 批 11 / 2026-11-06
--
-- 背景：BE `svc/unified-core/src/modules/tenant/handlers.rs:402,727` 已引用 tier
-- （activate_basic_modules 写入 'basic'，list 查询返回 tier），`TenantModule.tier`
-- 注释约定 'basic' | 'advanced' | 'infrastructure'，但建表
-- （database/init/06_iam_schema.sql:841）从未定义该列 → 相关接口一旦调用即 500。
--
-- 本迁移：为权威副本 public 与规范定义 iam 各补 tier 列（幂等）。
-- 同时 06_iam_schema.sql 建表定义已同步加列，保证空库重建一致。
--
-- 幂等：ADD COLUMN IF NOT EXISTS；重复执行无变更
--
-- ROLLBACK：
--   ALTER TABLE public.core_tenant_modules DROP COLUMN IF EXISTS tier;
--   ALTER TABLE iam.core_tenant_modules DROP COLUMN IF EXISTS tier;

ALTER TABLE public.core_tenant_modules
    ADD COLUMN IF NOT EXISTS tier varchar(32) NOT NULL DEFAULT 'basic';

ALTER TABLE iam.core_tenant_modules
    ADD COLUMN IF NOT EXISTS tier varchar(32) NOT NULL DEFAULT 'basic';
