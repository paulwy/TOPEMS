-- BI商业智能服务数据库迁移脚本
-- 创建时间: 2024-01-01
-- 版本: 001

-- 创建枚举类型
CREATE TYPE analysis_type AS ENUM ('query', 'aggregation', 'comparison', 'trend');
CREATE TYPE report_type AS ENUM ('table', 'chart', 'dashboard', 'pdf', 'excel', 'custom');
CREATE TYPE report_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE schedule_type AS ENUM ('cron', 'interval', 'once');
CREATE TYPE widget_type AS ENUM (
    'chart', 'table', 'metric', 'text', 'image', 'map', 'gauge', 
    'pie', 'bar', 'line', 'scatter', 'heatmap', 'treemap', 'funnel', 'radar'
);
CREATE TYPE datasource_type AS ENUM (
    'postgresql', 'mysql', 'mongodb', 'oracle', 'sqlserver', 
    'redis', 'elasticsearch', 'kafka', 'httpapi', 'file', 'custom'
);
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error', 'testing');
CREATE TYPE visualization_type AS ENUM (
    'line', 'bar', 'pie', 'scatter', 'area', 'radar', 'gauge',
    'heatmap', 'treemap', 'funnel', 'sankey', 'boxplot', 'candlestick',
    'map', 'graph', 'table', 'metric', 'custom'
);
CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'read', 'execute', 'export',
    'import', 'login', 'logout', 'access', 'modify'
);

-- 1. 数据源管理表
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    datasource_type datasource_type NOT NULL,
    connection_config JSONB NOT NULL,
    status connection_status DEFAULT 'disconnected',
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_datasources_name ON data_sources(name);
CREATE INDEX idx_datasources_type ON data_sources(datasource_type);
CREATE INDEX idx_datasources_status ON data_sources(status);

-- 2. 数据源表信息表
CREATE TABLE datasource_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datasource_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    table_schema VARCHAR(255),
    table_type VARCHAR(50) DEFAULT 'BASE TABLE',
    row_count BIGINT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_datasource_tables_datasource ON datasource_tables(datasource_id);
CREATE INDEX idx_datasource_tables_name ON datasource_tables(table_name);

-- 3. 数据源字段信息表
CREATE TABLE datasource_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datasource_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(255) NOT NULL,
    is_nullable BOOLEAN DEFAULT true,
    is_primary_key BOOLEAN DEFAULT false,
    default_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_datasource_fields_datasource ON datasource_fields(datasource_id);
CREATE INDEX idx_datasource_fields_table ON datasource_fields(table_name);

-- 4. 分析查询表
CREATE TABLE analysis_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_type analysis_type NOT NULL,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    sql_query TEXT,
    filters JSONB,
    group_by JSONB,
    aggregations JSONB,
    time_range JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_analysis_queries_name ON analysis_queries(name);
CREATE INDEX idx_analysis_queries_type ON analysis_queries(query_type);
CREATE INDEX idx_analysis_queries_datasource ON analysis_queries(data_source_id);

-- 5. 分析结果表
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES analysis_queries(id) ON DELETE CASCADE,
    result_data JSONB NOT NULL,
    metadata JSONB,
    execution_time_ms BIGINT,
    row_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cached BOOLEAN DEFAULT false
);

CREATE INDEX idx_analysis_results_query ON analysis_results(query_id);
CREATE INDEX idx_analysis_results_created ON analysis_results(created_at);

-- 6. 分析历史记录表
CREATE TABLE analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES analysis_queries(id) ON DELETE CASCADE,
    user_id UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms BIGINT,
    row_count BIGINT,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT
);

CREATE INDEX idx_analysis_history_query ON analysis_history(query_id);
CREATE INDEX idx_analysis_history_user ON analysis_history(user_id);
CREATE INDEX idx_analysis_history_executed ON analysis_history(executed_at);

-- 7. 保存的分析结果表
CREATE TABLE saved_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES analysis_queries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    result_data JSONB NOT NULL,
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_analysis_results_query ON saved_analysis_results(query_id);
CREATE INDEX idx_saved_analysis_results_name ON saved_analysis_results(name);

-- 8. 可视化图表表
CREATE TABLE visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    visualization_type visualization_type NOT NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    query_config JSONB NOT NULL,
    chart_config JSONB NOT NULL,
    style_config JSONB,
    interaction_config JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false
);

CREATE INDEX idx_visualizations_name ON visualizations(name);
CREATE INDEX idx_visualizations_type ON visualizations(visualization_type);
CREATE INDEX idx_visualizations_datasource ON visualizations(data_source_id);
CREATE INDEX idx_visualizations_public ON visualizations(is_public);

-- 9. 可视化数据表
CREATE TABLE visualization_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visualization_id UUID NOT NULL REFERENCES visualizations(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cached BOOLEAN DEFAULT false,
    cache_expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_visualization_data_visualization ON visualization_data(visualization_id);
CREATE INDEX idx_visualization_data_cache ON visualization_data(cached, cache_expires_at);

-- 10. 仪表盘表
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL,
    filters JSONB,
    refresh_interval INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false
);

CREATE INDEX idx_dashboards_name ON dashboards(name);
CREATE INDEX idx_dashboards_public ON dashboards(is_public);
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);

-- 11. 仪表盘组件表
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type widget_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position JSONB NOT NULL,
    size JSONB NOT NULL,
    config JSONB NOT NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    visualization_id UUID REFERENCES visualizations(id) ON DELETE SET NULL,
    refresh_interval INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX idx_dashboard_widgets_visualization ON dashboard_widgets(visualization_id);

-- 12. 报表模板表
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type report_type NOT NULL,
    template_content JSONB NOT NULL,
    default_config JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_report_templates_name ON report_templates(name);
CREATE INDEX idx_report_templates_type ON report_templates(template_type);

-- 13. 报表表
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type report_type NOT NULL,
    status report_status DEFAULT 'draft',
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    config JSONB NOT NULL,
    layout JSONB,
    schedule_config JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_reports_name ON reports(name);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_template ON reports(template_id);
CREATE INDEX idx_reports_datasource ON reports(data_source_id);

-- 14. 报表数据表
CREATE TABLE report_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID,
    version INTEGER DEFAULT 1,
    file_path TEXT,
    file_size BIGINT,
    format VARCHAR(50)
);

CREATE INDEX idx_report_data_report ON report_data(report_id);
CREATE INDEX idx_report_data_generated ON report_data(generated_at);
CREATE INDEX idx_report_data_version ON report_data(report_id, version);

-- 15. 报表定时任务表
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID UNIQUE NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    schedule_type schedule_type NOT NULL,
    cron_expression TEXT,
    interval_minutes INTEGER,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at);

-- 16. 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name VARCHAR(255),
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    response_status INTEGER,
    execution_time_ms BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasource_tables_updated_at BEFORE UPDATE ON datasource_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasource_fields_updated_at BEFORE UPDATE ON datasource_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_queries_updated_at BEFORE UPDATE ON analysis_queries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visualizations_updated_at BEFORE UPDATE ON visualizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at BEFORE UPDATE ON report_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认报表模板
INSERT INTO report_templates (id, name, description, template_type, template_content, default_config, is_active) VALUES
(gen_random_uuid(), '标准表格报表', '标准表格报表模板', 'table', 
 '{"columns": [], "style": {"headerBg": "#3B82F6", "headerColor": "#FFFFFF"}}',
 '{"pageSize": 20, "sortable": true, "filterable": true}', true),
(gen_random_uuid(), '柱状图报表', '柱状图报表模板', 'chart',
 '{"chartType": "bar", "colors": ["#3B82F6", "#10B981", "#F59E0B"]}',
 '{"legend": {"show": true}, "tooltip": {"show": true}}', true),
(gen_random_uuid(), '折线图报表', '折线图报表模板', 'chart',
 '{"chartType": "line", "smooth": true}',
 '{"legend": {"show": true}, "tooltip": {"show": true}}', true),
(gen_random_uuid(), '仪表盘报表', '仪表盘报表模板', 'dashboard',
 '{"layout": {"columns": 3, "rows": 2}}',
 '{"refreshInterval": 300}', true);

-- 创建视图：活跃数据源统计
CREATE VIEW active_datasource_stats AS
SELECT 
    datasource_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_count,
    COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnected_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM data_sources
WHERE is_active = true
GROUP BY datasource_type;

-- 创建视图：报表统计
CREATE VIEW report_stats AS
SELECT 
    report_type,
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN last_generated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as recently_generated
FROM reports
WHERE is_active = true
GROUP BY report_type, status;

-- 创建视图：可视化图表统计
CREATE VIEW visualization_stats AS
SELECT 
    visualization_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_count,
    COUNT(CASE WHEN is_public = false THEN 1 END) as private_count
FROM visualizations
WHERE is_active = true
GROUP BY visualization_type;

-- 注释表和字段
COMMENT ON TABLE data_sources IS '数据源配置表';
COMMENT ON TABLE datasource_tables IS '数据源表信息表';
COMMENT ON TABLE datasource_fields IS '数据源字段信息表';
COMMENT ON TABLE analysis_queries IS '分析查询配置表';
COMMENT ON TABLE analysis_results IS '分析结果表';
COMMENT ON TABLE analysis_history IS '分析历史记录表';
COMMENT ON TABLE saved_analysis_results IS '保存的分析结果表';
COMMENT ON TABLE visualizations IS '可视化图表配置表';
COMMENT ON TABLE visualization_data IS '可视化数据缓存表';
COMMENT ON TABLE dashboards IS '仪表盘配置表';
COMMENT ON TABLE dashboard_widgets IS '仪表盘组件表';
COMMENT ON TABLE report_templates IS '报表模板表';
COMMENT ON TABLE reports IS '报表配置表';
COMMENT ON TABLE report_data IS '报表数据表';
COMMENT ON TABLE report_schedules IS '报表定时任务表';
COMMENT ON TABLE audit_logs IS '审计日志表';