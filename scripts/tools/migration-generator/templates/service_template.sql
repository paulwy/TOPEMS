-- =============================================================
-- TOPEMS {{service_name}} 服务表结构模板
-- 迁移版本: {{version}}
-- 生成时间: {{timestamp}}
-- =============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- Schema 定义
-- =============================================================
CREATE SCHEMA IF NOT EXISTS {{schema}};

SET search_path TO {{schema}}, public;

-- =============================================================
-- 基础表结构
-- =============================================================
{% for table in tables %}
-- -----------------------------------------------------------------
-- 表: {{table.name}}
-- 描述: {{table.description}}
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {{table.name}} (
{% for column in table.columns %}
    {{column.name}} {{column.type}}{% if column.primary_key %} PRIMARY KEY{% endif %}{% if column.unique %} UNIQUE{% endif %}{% if column.not_null %} NOT NULL{% endif %}{% if column.default %} DEFAULT {{column.default}}{% endif %}{% if column.reference %} REFERENCES {{column.reference}}{% endif %}{% if not loop.last %},{% endif %}
{% endfor %}
);

{% endfor %}
-- =============================================================
-- 更新时间戳触发器函数
-- =============================================================
CREATE OR REPLACE FUNCTION {{schema}}.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

{% for table in tables %}
-- 表 {{table.name}} 的更新触发器
DROP TRIGGER IF EXISTS update_{{table.name}}_updated_at ON {{table.name}};
CREATE TRIGGER update_{{table.name}}_updated_at
    BEFORE UPDATE ON {{table.name}}
    FOR EACH ROW
    EXECUTE FUNCTION {{schema}}.update_updated_at_column();

{% endfor %}
-- =============================================================
-- 迁移结束
-- =============================================================
