CREATE TABLE IF NOT EXISTS core_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    views BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    duration VARCHAR(50) NOT NULL DEFAULT '10min',
    lessons_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_guide_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    duration VARCHAR(50) NOT NULL DEFAULT '5min',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_guide_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    completed_lessons UUID[] NOT NULL DEFAULT '{}',
    progress INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guide_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_faqs_category ON core_faqs(category);
CREATE INDEX IF NOT EXISTS idx_core_faqs_active ON core_faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_core_faqs_sort ON core_faqs(sort_order);
CREATE INDEX IF NOT EXISTS idx_core_faqs_tenant ON core_faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_guides_category ON core_guides(category);
CREATE INDEX IF NOT EXISTS idx_core_guides_active ON core_guides(is_active);
CREATE INDEX IF NOT EXISTS idx_core_guides_sort ON core_guides(sort_order);
CREATE INDEX IF NOT EXISTS idx_core_guides_tenant ON core_guides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_guide_id ON core_guide_lessons(guide_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_active ON core_guide_lessons(is_active);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_sort ON core_guide_lessons(sort_order);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_tenant ON core_guide_lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_user ON core_guide_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_guide ON core_guide_progress(guide_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_tenant ON core_guide_progress(tenant_id);