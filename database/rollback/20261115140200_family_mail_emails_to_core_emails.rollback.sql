-- 回滚 20261115140200 family_mail_emails_to_core_emails
-- 只删除本迁移插入的行：这些 id 在源表存在；执行前已核验目标侧无同 id 既有行。
DELETE FROM public.core_emails WHERE id IN (SELECT id FROM mail.emails);
