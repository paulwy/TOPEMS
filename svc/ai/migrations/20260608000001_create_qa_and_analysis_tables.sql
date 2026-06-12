-- =============================================================
-- TOPEMS-AI QA and Analysis Tables Migration
-- Schema: ai (统一命名空间)
-- =============================================================

CREATE SCHEMA IF NOT EXISTS ai;

-- =============================================================
-- QA History Table: 存储问答历史
-- Table: ai.qa_history
-- =============================================================
CREATE TABLE IF NOT EXISTS ai.qa_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    sources JSONB DEFAULT '[]',
    feedback TEXT,
    rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QA History indexes
CREATE INDEX IF NOT EXISTS idx_qa_history_organization_id ON ai.qa_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_qa_history_created_at ON ai.qa_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_rating ON ai.qa_history(rating);

-- =============================================================
-- Analysis Results Table: 存储分析结果
-- Table: ai.analysis_results
-- =============================================================
CREATE TABLE IF NOT EXISTS ai.analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(50) NOT NULL,
    input_text TEXT NOT NULL,
    result JSONB NOT NULL,
    confidence DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Results indexes
CREATE INDEX IF NOT EXISTS idx_analysis_results_organization_id ON ai.analysis_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON ai.analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON ai.analysis_results(created_at DESC);

-- =============================================================
-- Comments for documentation
-- =============================================================
COMMENT ON TABLE ai.qa_history IS 'TOPEMS-AI 问答历史记录';
COMMENT ON TABLE ai.analysis_results IS 'TOPEMS-AI 智能分析结果';
COMMENT ON COLUMN ai.qa_history.sources IS '答案来源文档列表';
COMMENT ON COLUMN ai.qa_history.rating IS '用户评分（1-5分）';
COMMENT ON COLUMN ai.analysis_results.analysis_type IS '分析类型：sentiment, classify, entities, keywords';
