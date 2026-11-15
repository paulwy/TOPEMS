-- 20261115141100 family_flow_workflows_to_public
-- 18 行 id 全部已被 flow.core_workflows 覆盖且更旧 → 对外层去重后无可插入行。
-- 操作人口径（owner 裁决 ③）：不兜底 admin。created_by 为 NULL 且目标列 NOT NULL 的行写入隔离表；
--   有真实 created_by 的行按真实值迁移。
-- 幂等：ON CONFLICT DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。

INSERT INTO public.migration_quarantine_rows
    (migration_version, source_table, source_pk, missing_fields, row_json)
SELECT '20261115141100', 'flow.workflows', s.id::text, 'created_by', to_jsonb(s)
FROM flow.workflows s
WHERE NOT EXISTS (SELECT 1 FROM public.core_workflows t WHERE t.id = s.id)
  AND s.created_by IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.core_workflows (id,name,description,definition,status,version,created_by,created_at,updated_at,published_at,code,name_en,deleted_at,tenant_id)
SELECT s.id,
       s.name,
       s.description,
       s.definition,
       CASE WHEN s.is_active THEN 'active' ELSE 'inactive' END,
       1,
       s.created_by,
       s.created_at,
       s.updated_at,
       NULL,
       NULL,
       NULL,
       s.deleted_at,
       s.tenant_id
FROM flow.workflows s
WHERE NOT EXISTS (SELECT 1 FROM public.core_workflows t WHERE t.id = s.id)
  AND s.created_by IS NOT NULL
ON CONFLICT (id) DO NOTHING;
