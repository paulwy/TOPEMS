-- 20261115140700 family_doc_service_files_to_core_files
-- 9 行 id 全部已被 storage.files 覆盖且 storage 更新更晚 → 对外层去重后无可插入行。
-- 操作人口径（owner 裁决 ③）：doc_service.files.created_by 是自由文本 varchar，不是 uuid，也不兜底 admin。
--   仅当 created_by 本身是合法 UUID 文本时才按真实值写入 uploader_id；
--   其余行若在目标中尚不存在，则写入 public.migration_quarantine_rows 等人工补，不伪造操作人。
-- 幂等：ON CONFLICT DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。

INSERT INTO public.migration_quarantine_rows
    (migration_version, source_table, source_pk, missing_fields, row_json)
SELECT '20261115140700', 'doc_service.files', s.id::text, 'uploader_id', to_jsonb(s)
FROM doc_service.files s
WHERE NOT EXISTS (SELECT 1 FROM public.core_files c WHERE c.id = s.id)
  AND NOT pg_input_is_valid(s.created_by, 'uuid')
ON CONFLICT DO NOTHING;

INSERT INTO public.core_files (id,name,path,size,mime_type,extension,folder_id,uploader_id,status,created_at,updated_at,tenant_id,deleted_at)
SELECT s.id,
       s.name,
       s.storage_path,
       s.size,
       s.content_type,
       NULL,
       s.folder_id,
       s.created_by::uuid,
       NULL,
       s.created_at,
       s.updated_at,
       s.tenant_id,
       s.deleted_at
FROM doc_service.files s
WHERE NOT EXISTS (SELECT 1 FROM public.core_files c WHERE c.id = s.id)
  AND pg_input_is_valid(s.created_by, 'uuid')
ON CONFLICT (id) DO NOTHING;
