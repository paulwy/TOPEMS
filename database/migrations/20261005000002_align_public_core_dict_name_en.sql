-- P4-3 实测抽查发现修复（二）：public core_dict 影子表 name_en 补齐
--
-- 背景：master-data dict 模块查询（dict/handlers.rs）用
-- COALESCE(name_en, name) 做中英字段回退，但 monolith SEARCH_PATH 解析到
-- public.core_dict_types/core_dict_items（影子表缺 name_en 列）→ 查询 500
-- "column name_en does not exist"。
--
-- 方案：显式 public. 前缀补齐 name_en 列（与 master_data 全量结构一致，
-- IF NOT EXISTS 幂等，对已完整表零副作用）。

ALTER TABLE public.core_dict_types ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE public.core_dict_items ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
