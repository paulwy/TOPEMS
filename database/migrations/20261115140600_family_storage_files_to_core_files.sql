-- 20261115140600 family_storage_files_to_core_files
-- 43 行；status 映射：core_files 有 ck_core_files_status_standard（active/inactive/archived），
-- storage.files 的 8 行 'deleted' → 'archived'；删除语义由同行的 deleted_at 承载（不丢信息）。
-- 留痕：每一行被改写的 status 都在 public.migration_column_rewrites 记一条（旧值→新值+理由），
--        事后可用 `SELECT * FROM public.migration_column_rewrites WHERE migration_version='20261115140600'`
--        复原“这行原本是 deleted”。本迁移同时创建隔离表/改写留痕表（IF NOT EXISTS，幂等）。
-- 幂等：ON CONFLICT DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。

CREATE TABLE IF NOT EXISTS public.migration_quarantine_rows (
    id                bigserial PRIMARY KEY,
    migration_version text        NOT NULL,
    source_table      text        NOT NULL,
    source_pk         text        NOT NULL,
    missing_fields    text        NOT NULL,
    row_json          jsonb       NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (migration_version, source_table, source_pk)
);

CREATE TABLE IF NOT EXISTS public.migration_column_rewrites (
    id                bigserial PRIMARY KEY,
    migration_version text        NOT NULL,
    table_name        text        NOT NULL,
    row_pk            text        NOT NULL,
    column_name       text        NOT NULL,
    old_value         text,
    new_value         text,
    reason            text        NOT NULL,
    rewritten_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (migration_version, table_name, row_pk, column_name)
);

-- 留痕先于写入：只登记本次真正会插入的行（目标中尚不存在）
INSERT INTO public.migration_column_rewrites
    (migration_version, table_name, row_pk, column_name, old_value, new_value, reason)
SELECT '20261115140600', 'public.core_files', s.id::text, 'status', s.status, 'archived',
       'ck_core_files_status_standard 只接受 active/inactive/archived，不接受 deleted；删除语义由 deleted_at 承载'
FROM storage.files s
WHERE s.status = 'deleted'
  AND NOT EXISTS (SELECT 1 FROM public.core_files c WHERE c.id = s.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.core_files (id,name,path,size,mime_type,extension,folder_id,uploader_id,status,created_at,updated_at,tenant_id,deleted_at)
SELECT id,
       filename,
       storage_path,
       file_size,
       content_type,
       NULL,
       parent_id,
       owner_id,
       CASE WHEN status = 'deleted' THEN 'archived' ELSE status END,
       created_at,
       updated_at,
       tenant_id,
       deleted_at
FROM storage.files
ON CONFLICT (id) DO NOTHING;
