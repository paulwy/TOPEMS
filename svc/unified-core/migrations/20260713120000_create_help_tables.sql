-- Help Center - 帮助中心模块表结构
-- 包含 FAQ 和操作指南两大功能

-- 1. FAQ 表
CREATE TABLE IF NOT EXISTS core_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    views BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_faqs_category ON core_faqs(category);
CREATE INDEX IF NOT EXISTS idx_core_faqs_active ON core_faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_core_faqs_sort ON core_faqs(sort_order);

-- 2. 操作指南表
CREATE TABLE IF NOT EXISTS core_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    duration VARCHAR(50) NOT NULL DEFAULT '10min',
    lessons_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_guides_category ON core_guides(category);
CREATE INDEX IF NOT EXISTS idx_core_guides_active ON core_guides(is_active);
CREATE INDEX IF NOT EXISTS idx_core_guides_sort ON core_guides(sort_order);

-- 3. 操作指南课程表
CREATE TABLE IF NOT EXISTS core_guide_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    duration VARCHAR(50) NOT NULL DEFAULT '5min',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_guide_id ON core_guide_lessons(guide_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_active ON core_guide_lessons(is_active);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_sort ON core_guide_lessons(sort_order);

-- 4. 学习进度表
CREATE TABLE IF NOT EXISTS core_guide_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    completed_lessons UUID[] NOT NULL DEFAULT '{}',
    progress INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guide_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_core_guide_progress_user ON core_guide_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_guide ON core_guide_progress(guide_id);

-- 5. 插入初始 FAQ 数据
INSERT INTO core_faqs (question, answer, category, sort_order) VALUES
    ('如何创建新用户？', '进入系统管理 > 用户管理，点击"新建用户"按钮，填写用户信息并分配角色即可。', 'account', 1),
    ('忘记密码怎么办？', '在登录页面点击"忘记密码"，输入注册邮箱，系统将发送密码重置链接。', 'account', 2),
    ('如何切换租户？', '点击右上角用户头像，选择"切换租户"，从列表中选择目标租户即可。', 'tenant', 1),
    ('如何配置工作流？', '进入工作流模块，在设计器中拖拽节点创建流程，配置审批人和条件后发布即可。', 'workflow', 1),
    ('系统支持哪些浏览器？', '推荐使用 Chrome 90+、Firefox 88+、Safari 14+ 或 Edge 90+。', 'system', 1)
ON CONFLICT DO NOTHING;

-- 6. 插入初始指南数据
INSERT INTO core_guides (title, description, category, duration, lessons_count, sort_order) VALUES
    ('快速入门指南', '了解 TOPEMS 平台的基本功能和操作流程', 'getting-started', '15min', 3, 1),
    ('用户权限管理', '学习如何管理用户、角色和权限', 'administration', '20min', 4, 2),
    ('工作流设计教程', '从零开始设计一个完整的审批工作流', 'workflow', '30min', 5, 3),
    ('数据导出与报表', '掌握数据导出功能和报表配置方法', 'data', '15min', 3, 4),
    ('移动端使用指南', '了解移动端 App 的功能和使用方法', 'mobile', '10min', 2, 5)
ON CONFLICT DO NOTHING;

-- 7. 插入初始课程数据
INSERT INTO core_guide_lessons (guide_id, title, content, duration, sort_order) VALUES
    (SELECT id FROM core_guides WHERE title = '快速入门指南' LIMIT 1, '系统登录', '打开浏览器访问系统地址，输入用户名和密码登录。', '3min', 1),
    (SELECT id FROM core_guides WHERE title = '快速入门指南' LIMIT 1, '界面导航', '了解左侧导航栏、顶部工具栏和主内容区的布局。', '5min', 2),
    (SELECT id FROM core_guides WHERE title = '快速入门指南' LIMIT 1, '基本操作', '学习创建、编辑、删除和搜索等基本操作。', '7min', 3)
ON CONFLICT DO NOTHING;
