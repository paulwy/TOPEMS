-- 2026-10-28: mes.production_processes 工序名租户维度唯一（P3 拍板：process_name 唯一性 + 409 语义）
-- 部分索引（deleted_at IS NULL）：软删记录不阻塞同名重建；tenant 维度：同租户内工序名唯一，跨租户互不影响
CREATE UNIQUE INDEX IF NOT EXISTS ux_mes_production_processes_tenant_name
    ON mes.production_processes (tenant_id, process_name)
    WHERE deleted_at IS NULL;
