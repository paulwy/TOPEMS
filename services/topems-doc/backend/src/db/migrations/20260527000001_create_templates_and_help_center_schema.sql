-- 模板和帮助中心 Schema
-- 扩展 doc_service 架构

-- 模板分类表
CREATE TABLE IF NOT EXISTS doc_service.template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100),
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 模板表
CREATE TABLE IF NOT EXISTS doc_service.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    category_id UUID REFERENCES doc_service.template_categories(id) ON DELETE SET NULL,
    module VARCHAR(100) NOT NULL, -- 所属模块：ERP, HRM, CRM, QMS, LIMS等
    description TEXT,
    content TEXT NOT NULL, -- 模板内容（支持变量替换）
    variables JSONB, -- 模板变量定义：[{key, label, type, required, options, default_value}]
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- 是否系统内置模板
    sort_order INT DEFAULT 0,
    view_count INT DEFAULT 0,
    use_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 帮助文档分类表
CREATE TABLE IF NOT EXISTS doc_service.help_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100),
    description TEXT,
    module VARCHAR(100),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 帮助文档表
CREATE TABLE IF NOT EXISTS doc_service.help_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    category_id UUID REFERENCES doc_service.help_categories(id) ON DELETE SET NULL,
    module VARCHAR(100),
    summary TEXT,
    content TEXT NOT NULL, -- Markdown格式
    tags TEXT[],
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 视频教程表
CREATE TABLE IF NOT EXISTS doc_service.video_tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    duration VARCHAR(50), -- 如：10:30
    module VARCHAR(100),
    tags TEXT[],
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 常见问题表
CREATE TABLE IF NOT EXISTS doc_service.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON doc_service.templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_module ON doc_service.templates(module);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON doc_service.templates(is_active);
CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON doc_service.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_module ON doc_service.help_articles(module);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON doc_service.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON doc_service.help_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_module ON doc_service.video_tutorials(module);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON doc_service.faqs(category);
