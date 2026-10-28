-- =============================================================================
-- [2026-10-29] 初始化路径防复发整改：将 3 张"仅自建 DDL 提供"的表纳入权威迁移 DDL
--
-- 背景（TOPEMS-20261028 B 类清单更正说明 · 初始化路径整改）：
--   core_comments / core_favorites / core_doc_document_versions 此前只存在于
--   unified-core 自建 DDL（init_database / try_init 路径），整个迁移 DDL 体系
--   从未创建过它们——形成"迁移缺表、依赖自建兜底"的隐式双源依赖：
--     * 仅跑迁移建库（不启动应用 init）的环境将缺表，B 类"服务代码引用缺列/缺表"
--     * 自建 DDL 与迁移权威不同步时静默漂移
--   （迁移 20260908000012 曾 DROP 的是 doc_service.core_doc_document_versions，
--    与本迁移创建的 public.core_doc_document_versions 为不同 schema，无冲突；
--    20260924110000 对 public.core_doc_document_versions 的索引创建即为条件存在式。）
--
-- 本迁移从自建 DDL 原样提取（unified-core modules/engagement/mod.rs 与
-- modules/doc/services/document.rs），保持结构、约束、索引完全一致，幂等可重放；
-- 此后这 3 张表由迁移 DDL 提供，自建路径的隐性依赖消除。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.core_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    content TEXT NOT NULL,
    author_id VARCHAR(128) NOT NULL DEFAULT '',
    author_name VARCHAR(128) NOT NULL DEFAULT '',
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    parent_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.core_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    user_id VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    entity_name VARCHAR(256) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS public.core_doc_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES core_doc_documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    summary VARCHAR(500),
    created_by VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_core_comments_entity ON public.core_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_comments_parent ON public.core_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_core_favorites_user ON public.core_favorites(tenant_id, user_id);
