-- 扩展模板管理系统表结构
-- 添加模板类型、AI支持、版本管理等新功能

-- 1. 扩展 templates 表，添加新字段
ALTER TABLE doc_service.templates ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'document';
ALTER TABLE doc_service.templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE doc_service.templates ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE doc_service.templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 添加注释
COMMENT ON COLUMN doc_service.templates.type IS '模板类型：workflow, document, form, report, notification';
COMMENT ON COLUMN doc_service.templates.is_public IS '是否公开可见';
COMMENT ON COLUMN doc_service.templates.ai_enabled IS '是否启用AI辅助';
COMMENT ON COLUMN doc_service.templates.version IS '模板版本号';

-- 2. 创建模板变量表（用于存储模板的变量定义）
CREATE TABLE IF NOT EXISTS doc_service.template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string',
    required BOOLEAN DEFAULT false,
    default_value JSONB,
    options JSONB,
    data_source VARCHAR(255),
    validation_rules JSONB,
    placeholder VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doc_service.template_variables IS '模板变量定义表';
COMMENT ON COLUMN doc_service.template_variables.type IS '变量类型：string, number, date, datetime, boolean, text, select, multiselect, user, now, context, lookup';
COMMENT ON COLUMN doc_service.template_variables.options IS '下拉选项：[{value, label}]';
COMMENT ON COLUMN doc_service.template_variables.data_source IS '动态数据源API路径';

-- 3. 创建模板实例表（记录模板的使用实例）
CREATE TABLE IF NOT EXISTS doc_service.template_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id) ON DELETE SET NULL,
    instance_type VARCHAR(50) NOT NULL,
    instance_id VARCHAR(100) NOT NULL,
    variables_values JSONB,
    rendered_content TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doc_service.template_instances IS '模板使用实例记录表';
COMMENT ON COLUMN doc_service.template_instances.instance_type IS '实例类型：workflow, document, form等';
COMMENT ON COLUMN doc_service.template_instances.instance_id IS '关联的业务实例ID';

-- 4. 创建模板版本表（支持版本管理和回滚）
CREATE TABLE IF NOT EXISTS doc_service.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    change_summary TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doc_service.template_versions IS '模板版本历史表';

-- 5. 创建模板审计日志表
CREATE TABLE IF NOT EXISTS doc_service.template_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doc_service.template_audit_log IS '模板操作审计日志表';
COMMENT ON COLUMN doc_service.template_audit_log.action IS '操作类型：create, update, delete, use, view, toggle_status';

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_type ON doc_service.templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON doc_service.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_ai_enabled ON doc_service.templates(ai_enabled);
CREATE INDEX IF NOT EXISTS idx_variables_template ON doc_service.template_variables(template_id);
CREATE INDEX IF NOT EXISTS idx_variables_key ON doc_service.template_variables(key);
CREATE INDEX IF NOT EXISTS idx_instances_template ON doc_service.template_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_instances_type ON doc_service.template_instances(instance_type);
CREATE INDEX IF NOT EXISTS idx_instances_created_at ON doc_service.template_instances(created_at);
CREATE INDEX IF NOT EXISTS idx_versions_template ON doc_service.template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_versions_version ON doc_service.template_versions(template_id, version);
CREATE INDEX IF NOT EXISTS idx_audit_template ON doc_service.template_audit_log(template_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON doc_service.template_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON doc_service.template_audit_log(created_at);

-- 7. 更新分类表，添加类型字段
ALTER TABLE doc_service.template_categories ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'document';

COMMENT ON COLUMN doc_service.template_categories.type IS '分类关联的模板类型';

-- 8. 插入默认分类（如果不存在）
INSERT INTO doc_service.template_categories (name, code, type, icon, description, sort_order, created_by)
VALUES 
    ('审批流程', 'approval', 'workflow', 'git-branch', '各类审批流程模板', 1, 'system'),
    ('合同协议', 'contract', 'document', 'file-text', '合同协议文档模板', 2, 'system'),
    ('数据表单', 'data_form', 'form', 'layout', '数据收集表单模板', 3, 'system'),
    ('分析报表', 'analysis_report', 'report', 'bar-chart', '数据报表模板', 4, 'system'),
    ('通知消息', 'notification', 'notification', 'bell', '通知消息模板', 5, 'system'),
    ('通用文档', 'general', 'document', 'file', '通用文档模板', 6, 'system')
ON CONFLICT (code) DO UPDATE SET 
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

-- 9. 更新现有模板的类型（根据module推断）
UPDATE doc_service.templates 
SET type = CASE 
    WHEN module = 'Flow' THEN 'workflow'
    WHEN module = 'Notification' THEN 'notification'
    ELSE 'document'
END
WHERE type = 'document' AND type IS NOT NULL;

-- 10. 触发器功能暂不实现（因为函数定义包含分号会被迁移脚本分割）
-- 后续可以通过单独的迁移脚本或直接在数据库中创建