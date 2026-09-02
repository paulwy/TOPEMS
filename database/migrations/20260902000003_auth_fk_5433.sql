-- 2026-09-02 运行库(5433) auth FK 对齐：refresh_tokens/sessions FK → core_users（唯一权威源）
-- 5433 无 iam.user_roles/password_reset_tokens/user_access_logs（新服务启动自建），仅处理现存两表
-- 幂等：DROP IF EXISTS + ADD 命名一致可重跑
ALTER TABLE iam.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE iam.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
UPDATE iam.refresh_tokens rt SET user_id = c.id
FROM iam.users i, core_users c
WHERE rt.user_id = i.id AND i.username = c.username AND i.id <> c.id;
UPDATE iam.sessions s SET user_id = c.id
FROM iam.users i, core_users c
WHERE s.user_id = i.id AND i.username = c.username AND i.id <> c.id;
ALTER TABLE iam.refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.sessions ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE;
