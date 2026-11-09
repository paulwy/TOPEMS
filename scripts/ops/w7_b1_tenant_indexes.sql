-- ============================================================
-- W7 · B1 索引补齐：11 张有数据表的 tenant 前导索引
--
-- ⚠️ 本文件不是迁移链文件，不参与 sqlx / apply-forward.sh 的迁移链。
--    原因：CREATE INDEX CONCURRENTLY 不允许出现在事务块内，而迁移入口统一
--    使用 psql --single-transaction。请在窗口内单独执行：
--      psql -v ON_ERROR_STOP=1 -f scripts/ops/w7_b1_tenant_indexes.sql
--    （不要加 --single-transaction / -1）
--
-- 依据：设计 §9.2（2026-11-09 生产复核：34 张非空租户表中 11 张缺 tenant
--       前导索引）。全部 idempotent（IF NOT EXISTS），可重复执行。
-- 回滚：DROP INDEX CONCURRENTLY IF EXISTS <索引名>;（逐条，见各段注释）
-- ============================================================

\echo 'W7-B1 索引补齐开始（CONCURRENTLY，非事务）'

-- 菜单/字典热路径：迁 NULL 后按 tenant_id 前导 + 业务列取行
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_dict_items_tenant_type
    ON public.core_dict_items (tenant_id, dict_type_id, sort_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_dict_types_tenant_code
    ON public.core_dict_types (tenant_id, code);

-- 会话/刷新令牌：tenant 前导服务于租户侧列表，token_hash/expires_at 为热路径
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_sessions_tenant_token
    ON public.core_sessions (tenant_id, token_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_sessions_expires
    ON public.core_sessions (expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_refresh_tokens_tenant_token
    ON public.core_refresh_tokens (tenant_id, token_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_refresh_tokens_expires
    ON public.core_refresh_tokens (expires_at);

-- 报表行映射（48 行全 NULL 全局模板）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fin_report_line_map_tenant_type
    ON finance.core_finance_report_line_map (tenant_id, report_type, sort_no);

-- 帮助内容（全局 nil 行）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_faqs_tenant_cat
    ON public.core_faqs (tenant_id, category, sort_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_guides_tenant_cat
    ON public.core_guides (tenant_id, category, sort_order);

-- 组织树递归
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hrm_departments_tenant_parent
    ON hrm.departments (tenant_id, parent_id);

-- 移动端同步策略（1 行 NULL 全局默认）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mobile_sync_policies_tenant_user
    ON mobile.sync_policies (tenant_id, user_id);

-- BI 报表列表（状态 + 时间）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_reports_tenant_status
    ON bi.reports (tenant_id, status, created_at DESC);

-- 租户登记表（行数 1，零成本一致性）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_tenants_tenant
    ON public.core_tenants (tenant_id);

\echo 'W7-B1 索引补齐完成'
