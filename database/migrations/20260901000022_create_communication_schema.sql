-- 2026-09-01 communication 服务 schema 化：
-- 归位 communication 独占 4 张表（仅 communication 引用）到 communication schema：
--   core_emails / core_geofences / core_notification_templates / core_notifications
-- （core_users 多服务共享保留 public；core_chat_* 已在 im schema 由 im 服务管理）
CREATE SCHEMA IF NOT EXISTS communication;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_emails' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='communication' AND c.relname='core_emails' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_emails" SET SCHEMA communication';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_geofences' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='communication' AND c.relname='core_geofences' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_geofences" SET SCHEMA communication';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_notification_templates' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='communication' AND c.relname='core_notification_templates' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_notification_templates" SET SCHEMA communication';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_notifications' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='communication' AND c.relname='core_notifications' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_notifications" SET SCHEMA communication';
  END IF;
END $rehome$;
