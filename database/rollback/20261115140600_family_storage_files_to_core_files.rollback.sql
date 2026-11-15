-- 回滚 20261115140600 family_storage_files_to_core_files
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM public.core_files WHERE id IN (SELECT id FROM storage.files);
-- 一并删除本迁移写入的 status 改写留痕
DELETE FROM public.migration_column_rewrites WHERE migration_version = '20261115140600';
