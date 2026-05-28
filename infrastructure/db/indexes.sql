
-- LIMS 服务索引优化
-- TOPEMS LIMS Database Index Optimization

-- 索引创建指南：
-- 1. 对经常用于 WHERE 子句的列创建索引
-- 2. 对经常 JOIN 的列创建索引
-- 3. 对经常 ORDER BY 的列创建索引
-- 4. 避免过度索引（影响写入性能）

-- ==== 样本表索引优化 ====

-- 按项目 ID 查询样本
CREATE INDEX IF NOT EXISTS idx_samples_project_id
ON samples (project_id);

-- 按状态查询样本
CREATE INDEX IF NOT EXISTS idx_samples_status
ON samples (status);

-- 复合索引：用于按项目和状态查询
CREATE INDEX IF NOT EXISTS idx_samples_project_status
ON samples (project_id, status);

-- 按样本名称查询（用于搜索）
CREATE INDEX IF NOT EXISTS idx_samples_name_gin
ON samples USING GIN (to_tsvector('english', name));

-- 按创建时间排序
CREATE INDEX IF NOT EXISTS idx_samples_created_at
ON samples (created_at DESC);

-- ==== 检测流程索引优化 ====

CREATE INDEX IF NOT EXISTS idx_inspection_processes_status
ON inspection_processes (status);

CREATE INDEX IF NOT EXISTS idx_inspection_processes_sample_id
ON inspection_processes (sample_id);

CREATE INDEX IF NOT EXISTS idx_inspection_processes_created_at
ON inspection_processes (created_at DESC);

-- ==== 检测任务索引优化 ====

CREATE INDEX IF NOT EXISTS idx_inspection_tasks_process_id
ON inspection_tasks (process_id);

CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status
ON inspection_tasks (status);

CREATE INDEX IF NOT EXISTS idx_inspection_tasks_assigned_to
ON inspection_tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_inspection_tasks_created_at
ON inspection_tasks (created_at DESC);

-- ==== 仪器表索引优化 ====

CREATE INDEX IF NOT EXISTS idx_instruments_status
ON instruments (status);

CREATE INDEX IF NOT EXISTS idx_instruments_laboratory_id
ON instruments (laboratory_id);

-- ==== 试剂表索引优化 ====

CREATE INDEX IF NOT EXISTS idx_reagents_expiry_date
ON reagents (expiry_date);

CREATE INDEX IF NOT EXISTS idx_reagents_status
ON reagents (status);

-- ==== 审计日志索引优化 ====

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
ON audit_logs (entity_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
ON audit_logs (entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs (user_id);

-- ==== 性能分析 ====

-- 分析当前索引使用情况（PostgreSQL）
-- SELECT 
--   schemaname || '.' || tablename as table,
--   indexrelname as index,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- ==== 索引维护 ====

-- 重建索引（碎片整理）
-- REINDEX INDEX CONCURRENTLY idx_samples_name_gin;
-- REINDEX INDEX CONCURRENTLY idx_samples_created_at;

-- 分析表统计信息（优化查询计划）
-- ANALYZE samples;
-- ANALYZE inspection_processes;
-- ANALYZE inspection_tasks;

-- ==== 性能监控 ====

-- 慢查询检测
-- SELECT 
--   query,
--   calls,
--   mean_time,
--   total_time,
--   min_time,
--   max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- ==== RS 服务索引优化 ====

-- 项目表索引
CREATE INDEX IF NOT EXISTS idx_projects_status
ON projects (status);

CREATE INDEX IF NOT EXISTS idx_projects_leader
ON projects (leader);

CREATE INDEX IF NOT EXISTS idx_projects_project_type
ON projects (project_type);

CREATE INDEX IF NOT EXISTS idx_projects_code
ON projects (code);

CREATE INDEX IF NOT EXISTS idx_projects_created_at
ON projects (created_at DESC);

-- 配方表索引
CREATE INDEX IF NOT EXISTS idx_formulas_project_id
ON formulas (project_id);

CREATE INDEX IF NOT EXISTS idx_formulas_version
ON formulas (version);

-- 实验表索引
CREATE INDEX IF NOT EXISTS idx_experiments_project_id
ON experiments (project_id);

CREATE INDEX IF NOT EXISTS idx_experiments_status
ON experiments (status);

CREATE INDEX IF NOT EXISTS idx_experiments_created_at
ON experiments (created_at DESC);

-- ==== IAM 服务索引优化 ====

CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users (username);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users (status);

-- ==== 索引使用建议 ====

/*
索引最佳实践：

1. 查询性能监控
   - 使用 pg_stat_user_indexes 监控索引使用情况
   - 删除未使用的索引（idx_scan = 0 的索引）

2. 索引维护
   - 定期运行 ANALYZE 更新统计信息
   - 定期重建碎片化索引
   - 监控索引膨胀

3. 复合索引顺序
   - 高选择性的列在前
   - 等查询列在前，范围查询在后

4. 避免过度索引
   - 每个索引都会增加写入操作的开销
   - 索引需要存储空间
   - 评估索引的收益成本比
*/
