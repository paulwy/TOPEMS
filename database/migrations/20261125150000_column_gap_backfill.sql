-- 2026-11-26 · 代码在用、而 anchor/prod 血缘里缺的列（一次性补齐）
--
-- 来源：docs/database/table-lag-audit-20261126.md 的「风险项」。
-- 判据：schema-health [2b] 逐表列差 + 代码 SQL 字面量核对，确认这些列在运行期语句里被
-- 真实引用（不是别名、不是别的表），而现库（anchor 血缘）没有。这些路径都会在解析期报
-- `column ... does not exist`，属"待引爆 500"。
--
-- 全部 ADD COLUMN IF NOT EXISTS，非破坏、可重复执行；不删列、不改类型、不动既有数据。
-- 新列一律可空、不带默认值，避免回填整表；需要过滤的走代码侧显式条件。

-- 1) erp 订单头的 company 维度（svc/erp/src/modules/{sales_order,purchase_order}.rs 的 INSERT 带 company_id）
ALTER TABLE erp.sales_orders
    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE erp.purchase_orders
    ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2) iam.resource_permissions：svc/unified-core/src/modules/iam/resource_permission.rs
--    按 effect='allow' / scope / role_id 读写
ALTER TABLE iam.resource_permissions
    ADD COLUMN IF NOT EXISTS effect text,
    ADD COLUMN IF NOT EXISTS scope text,
    ADD COLUMN IF NOT EXISTS role_id uuid;

-- 3) core.core_plugins：svc/plugin-registry/.../tenant_plugins.rs 的 INSERT/UPDATE 带
--    owner_tenant_id / last_owner_tenant_id / unpublished_at
ALTER TABLE core.core_plugins
    ADD COLUMN IF NOT EXISTS owner_tenant_id uuid,
    ADD COLUMN IF NOT EXISTS last_owner_tenant_id uuid,
    ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

-- 4) mobile.oa_announcement_reads：svc/mobile/src/modules/oa.rs 的 INSERT 带 tenant_id
ALTER TABLE mobile.oa_announcement_reads
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 5) pm.project_type_configs：svc/pm/src/modules/project_type_config.rs 用 name_en 参与搜索
ALTER TABLE pm.project_type_configs
    ADD COLUMN IF NOT EXISTS name_en text;

-- 6) public.core_flow_*：svc/unified-core/src/modules/flow/{rule,delegate,variable}.rs
--    全部按 (NULLIF(current_setting('app.tenant_id'),''))::uuid 写 tenant_id
ALTER TABLE public.core_flow_rules
    ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.core_flow_delegates
    ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.core_flow_variables
    ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.core_flow_variable_history
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 7) public.core_tenant_modules：svc/unified-core/src/modules/tenant/handlers.rs 写 company_id
ALTER TABLE public.core_tenant_modules
    ADD COLUMN IF NOT EXISTS company_id uuid;

-- 8) 主数据元模型：svc/master-data/src/modules/schema_registry.rs 写 tenant_id
ALTER TABLE public.schema_registry
    ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.dynamic_data
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 9) 参数分级：svc/erp/src/modules/settings.rs 与 svc/monitor/.../settings.rs
--    SELECT override_policy ... WHERE company_id IS NULL AND key = $2 AND (tenant_id = $1 OR tenant_id IS NULL)
ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS company_id uuid,
    ADD COLUMN IF NOT EXISTS override_policy text;
ALTER TABLE public.monitor_settings
    ADD COLUMN IF NOT EXISTS company_id uuid,
    ADD COLUMN IF NOT EXISTS override_policy text;

-- 索引：只给会按租户/公司过滤且行数可能变大的表加，且都 IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_public_core_flow_rules_tenant
    ON public.core_flow_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_public_core_flow_delegates_tenant
    ON public.core_flow_delegates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_public_schema_registry_tenant
    ON public.schema_registry (tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_sales_orders_company
    ON erp.sales_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_erp_purchase_orders_company
    ON erp.purchase_orders (company_id);
