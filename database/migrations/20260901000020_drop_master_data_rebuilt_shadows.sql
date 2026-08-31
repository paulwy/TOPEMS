-- 2026-09-01 清理 master-data 服务旧二进制测试重建的 public 空影子表（0 行）：
-- 正式表已在 master_data schema（core_dict_types 38 / core_dict_items 189 / schema_registry / dynamic_data）
DROP TABLE IF EXISTS public.dynamic_data CASCADE;
DROP TABLE IF EXISTS public.schema_registry CASCADE;
DROP TABLE IF EXISTS public.core_dict_types CASCADE;
DROP TABLE IF EXISTS public.core_dict_items CASCADE;
