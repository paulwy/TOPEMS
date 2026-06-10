-- 档案管理模块数据库 Schema

-- 档案分类表
CREATE TABLE IF NOT EXISTS doc_service.archive_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- 分类编码
    name VARCHAR(100) NOT NULL,                -- 分类名称
    parent_id UUID REFERENCES doc_service.archive_categories(id) ON DELETE SET NULL,
    description TEXT,
    retention_period INT,                      -- 保管期限(年)，null表示永久
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 档案表
CREATE TABLE IF NOT EXISTS doc_service.archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_no VARCHAR(100) UNIQUE NOT NULL,   -- 档号
    title VARCHAR(255) NOT NULL,               -- 题名
    category_id UUID NOT NULL REFERENCES doc_service.archive_categories(id),
    file_id UUID REFERENCES doc_service.files(id) ON DELETE SET NULL,  -- 关联文档中心文件
    summary TEXT,                              -- 摘要
    keywords TEXT[],                           -- 关键词
    creator VARCHAR(255),                      -- 责任人
    created_date DATE,                         -- 形成日期
    retention_period INT,                      -- 保管期限(年)，覆盖分类默认值
    status VARCHAR(20) DEFAULT 'active',       -- active, archived, to_destroy, destroyed
    security_level VARCHAR(20) DEFAULT 'internal',  -- internal, confidential, secret, top_secret
    department_id UUID,                        -- 归属部门
    source_module VARCHAR(50),                 -- 来源模块(erp, hrm, pm等)
    source_id UUID,                            -- 来源业务ID
    archived_at TIMESTAMPTZ,                   -- 归档时间
    archived_by VARCHAR(255),                  -- 归档人
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 档案借阅表
CREATE TABLE IF NOT EXISTS doc_service.archive_borrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_id UUID NOT NULL REFERENCES doc_service.archives(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL,                 -- 借阅人ID
    borrower_name VARCHAR(255) NOT NULL,       -- 借阅人姓名
    borrow_reason TEXT NOT NULL,               -- 借阅原因
    borrow_type VARCHAR(20) NOT NULL,          -- view, download, physical
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,                    -- 应还日期
    return_date DATE,                          -- 实际归还日期
    status VARCHAR(20) DEFAULT 'pending',      -- pending, approved, rejected, borrowed, returned
    approver_id UUID,                          -- 审批人ID
    approval_comment TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 档案销毁表
CREATE TABLE IF NOT EXISTS doc_service.archive_destructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_id UUID NOT NULL REFERENCES doc_service.archives(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,                      -- 销毁原因
    approver_id UUID NOT NULL,
    approved_at TIMESTAMPTZ,
    destroyed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',      -- pending, approved, executed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- 档案元数据表
CREATE TABLE IF NOT EXISTS doc_service.archive_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_id UUID NOT NULL REFERENCES doc_service.archives(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_archive_categories_parent_id ON doc_service.archive_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_archive_categories_code ON doc_service.archive_categories(code);
CREATE INDEX IF NOT EXISTS idx_archives_category_id ON doc_service.archives(category_id);
CREATE INDEX IF NOT EXISTS idx_archives_archive_no ON doc_service.archives(archive_no);
CREATE INDEX IF NOT EXISTS idx_archives_status ON doc_service.archives(status);
CREATE INDEX IF NOT EXISTS idx_archives_source ON doc_service.archives(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_archives_file_id ON doc_service.archives(file_id);
CREATE INDEX IF NOT EXISTS idx_borrows_archive_id ON doc_service.archive_borrows(archive_id);
CREATE INDEX IF NOT EXISTS idx_borrows_borrower_id ON doc_service.archive_borrows(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON doc_service.archive_borrows(status);
CREATE INDEX IF NOT EXISTS idx_destructions_archive_id ON doc_service.archive_destructions(archive_id);
CREATE INDEX IF NOT EXISTS idx_destructions_status ON doc_service.archive_destructions(status);
CREATE INDEX IF NOT EXISTS idx_archive_metadata_archive_id ON doc_service.archive_metadata(archive_id);
