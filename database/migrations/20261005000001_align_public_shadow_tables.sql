-- P4-3 实测抽查发现修复：public 影子表对齐
--
-- 背景：monolith SEARCH_PATH 含 public（flow/mobile/rs/erp/public/iam/shared），
-- master-data schema_registry/dynamic_data 查询无 schema 前缀时解析到 public 影子表；
-- 该影子表由 schema_defense 阶段 0 创建（仅 id/deleted_at 裸骨架），
-- 迁移 20260725000001 的防御化 ALTER 仅在迁移连接 search_path 覆盖到的 schema 生效，
-- public 影子表未被补齐 → 查询报 "column name/tenant_id does not exist"。
--
-- 方案：显式 public. 前缀补齐两表结构（列/索引/触发器），与 20260725000001 全量结构一致；
-- 对已完整表零副作用（IF NOT EXISTS），对裸骨架影子表自动补齐。

-- ============ public.schema_registry 补齐 ============
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS schema_json JSONB NOT NULL;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS table_name VARCHAR(100) NOT NULL;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.schema_registry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS schema_registry_name_key ON public.schema_registry(name);
CREATE INDEX IF NOT EXISTS idx_schema_registry_name ON public.schema_registry(name);
CREATE INDEX IF NOT EXISTS idx_schema_registry_active ON public.schema_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_schema_registry_created_at ON public.schema_registry(created_at DESC);

DROP TRIGGER IF EXISTS trigger_schema_registry_updated_at ON public.schema_registry;
CREATE TRIGGER trigger_schema_registry_updated_at
    BEFORE UPDATE ON public.schema_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============ public.dynamic_data 补齐 ============
ALTER TABLE public.dynamic_data ADD COLUMN IF NOT EXISTS schema_id UUID NOT NULL;
ALTER TABLE public.dynamic_data ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL;
ALTER TABLE public.dynamic_data ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.dynamic_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dynamic_data_schema_id ON public.dynamic_data(schema_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_created_at ON public.dynamic_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_data_json_gin ON public.dynamic_data USING GIN(data_json);

DROP TRIGGER IF EXISTS trigger_dynamic_data_updated_at ON public.dynamic_data;
CREATE TRIGGER trigger_dynamic_data_updated_at
    BEFORE UPDATE ON public.dynamic_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
