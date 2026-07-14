-- =============================================================
-- TOPEMS {{service_name}} 索引创建模板
-- 迁移版本: {{version}}
-- 生成时间: {{timestamp}}
-- =============================================================

{% for table in tables %}
-- -----------------------------------------------------------------
-- 表: {{table.name}} 的索引
-- -----------------------------------------------------------------
{% if table.indexes %}
{% for index in table.indexes %}
CREATE INDEX IF NOT EXISTS idx_{{table.name}}_{{index.name}}
    ON {{table.name}} ({{index.columns | join(', ')}});
{% endfor %}
{% endif %}

{% if table.unique_indexes %}
{% for index in table.unique_indexes %}
CREATE UNIQUE INDEX IF NOT EXISTS uidx_{{table.name}}_{{index.name}}
    ON {{table.name}} ({{index.columns | join(', ')}});
{% endfor %}
{% endif %}

{% endfor %}
-- =============================================================
-- 迁移结束
-- =============================================================
