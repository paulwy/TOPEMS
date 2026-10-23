-- ============================================================================
-- 20261023000006_monitor_thresholds_table.sql
--
-- P1-20 monitor 告警阈值持久化：补建 `public.monitor_thresholds` 表。
--
-- 背景：alert_evaluator.rs 的阈值 CRUD 此前不落库——list/get/create/update/
-- delete 全部返回/伪造硬编码快照（如 CPU 80%、内存 85% 等 6 条假阈值），
-- evaluate 用空内存 Evaluator。monitor 服务仅有 public.monitor_settings
-- （KV 设置表），无任何阈值/告警规则表可挂载。本迁移补建最小阈值表，
-- 对齐 AlertThreshold 模型（metric_type/operator 以短码字符串存储）。
--
-- 租户隔离：与 public.monitor_settings 一致，tenant_id 可空，由查询层
-- （WHERE tenant_id IS NULL OR tenant_id = $1）过滤，RLS 由后续批次统一治理。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重放。
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monitor_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(200) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    severity VARCHAR(50) NOT NULL DEFAULT 'warning',
    service_name VARCHAR(200),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_thresholds_tenant ON public.monitor_thresholds (tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitor_thresholds_enabled ON public.monitor_thresholds (enabled);
