-- 20261115140200 family_mail_emails_to_core_emails
-- 收件人 jsonb 数组拼为文本；cc/bcc 转 text[]；status/priority/retry 等 14 列丢弃
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO public.core_emails (id,from_email,to_email,subject,body,html_body,cc,bcc,is_read,sent_at,deleted_at,created_at,tenant_id)
SELECT id,
       from_address,
       COALESCE((SELECT string_agg(x, ',') FROM jsonb_array_elements_text(to_addresses) x), ''),
       subject,
       body,
       body_html,
       CASE WHEN cc_addresses IS NULL THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(cc_addresses)) END,
       CASE WHEN bcc_addresses IS NULL THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(bcc_addresses)) END,
       false,
       sent_at,
       deleted_at,
       created_at,
       tenant_id
FROM mail.emails
ON CONFLICT (id) DO NOTHING;
