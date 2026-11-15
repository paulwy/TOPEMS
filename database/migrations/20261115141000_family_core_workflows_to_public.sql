-- 20261115141000 family_core_workflows_to_public
-- 14 列同名；name_en 255→128 实测 0 长；同 id 行 updated_at 全部新于 flow.workflows → 以本表为准
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO public.core_workflows (id,name,description,definition,status,version,created_by,created_at,updated_at,published_at,deleted_at,tenant_id,code,name_en)
SELECT id,
       name,
       description,
       definition,
       status,
       version,
       created_by,
       created_at,
       updated_at,
       published_at,
       deleted_at,
       tenant_id,
       code,
       name_en
FROM flow.core_workflows
ON CONFLICT (id) DO NOTHING;
