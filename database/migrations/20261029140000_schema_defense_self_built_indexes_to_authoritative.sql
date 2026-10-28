-- =============================================================================
-- [2026-10-29] 初始化路径防复发整改（C 方案前置）：自建独有索引纳入权威迁移 DDL
--
-- 背景：svc/unified-core/src/middleware/versioning.rs 自建
--   idx_core_api_version_configs_status / idx_core_api_version_configs_version
--   两索引仅存在于自建 DDL（init_database 路径），迁移 DDL 体系未创建。
--   本次 C 方案（废弃自建 DDL 路径）前置核对：除本 2 个索引外，其余自建索引
--   均已在迁移 DDL 有等价物（audit_logs×4: 20261012000000；core_tenants×2、
--   core_tenant_usage×1: 002_tenant / 20261007000029 保留等价索引）。
-- 本迁移将这两索引纳入权威 DDL，幂等可重放；此后自建路径不再有独有 DDL 元素。
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_status ON public.core_api_version_configs(status);
CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_version ON public.core_api_version_configs(version);
