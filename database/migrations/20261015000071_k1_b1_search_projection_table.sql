-- 2026-10-15 B1 固化：search 实体投影表版本化（建表 + 检索索引 + GRANT）。
--
-- 背景：投影表 `public.search_entity_projections` 原由 search 运行时自举
--       CREATE TABLE IF NOT EXISTS（owner 随首次建表连接角色漂移，曾出现
--       owner=air、topems_app 0 权限 → 订阅写投影 permission denied，事件
--       重试 3 次进 DLQ；CREATE INDEX 亦报 must be owner）。本轮固化进
--       migrations：DDL 由迁移 owner 池（topems，MIGRATE_URL）执行，再显式
--       授权 topems_app，消除自举 owner 漂移与权限缺口。
-- 幂等：IF NOT EXISTS / CREATE INDEX IF NOT EXISTS 对齐原自举 DDL；
--       GRANT 重复执行无副作用（PostgreSQL 授权幂等）。

CREATE TABLE IF NOT EXISTS public.search_entity_projections (
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    name TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT,
    remark TEXT,
    source_updated_at TIMESTAMPTZ,
    projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, entity_type, entity_id)
);

-- 检索索引：按实体类型 + 名称 ILIKE（对齐原自举 idx_sep_type_name）
CREATE INDEX IF NOT EXISTS idx_sep_type_name
    ON public.search_entity_projections(entity_type, name);

-- 授权：search 服务（topems_app）读写投影表（订阅 UPSERT/DELETE + 查询读）
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_entity_projections TO topems_app;
