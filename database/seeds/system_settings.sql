-- ============================================================================
-- database/seeds/system_settings.sql
--
-- 系统默认参数 seed（P2 挂账）：密码策略 / 会话超时 / 文件上传大小限制
--
-- 设计：
--   - 键值对写入 core_tenant_settings（tenant_id = 默认租户
--     00000000-0000-0000-0000-000000000001，与 20261021000005 迁移一致）
--   - 参数键按域前缀分组：security.* / file.*，应用读取该表作默认配置
--   - 会话超时 60 分钟与代码默认（lib/shared-auth/src/tenant.rs
--     SecuritySettings::default）保持一致
--
-- 用法：
--   psql -U topems_prod -d topems_prod -f database/seeds/system_settings.sql
--
-- 幂等：INSERT ... ON CONFLICT (tenant_id, setting_key) DO NOTHING
-- ============================================================================

INSERT INTO public.core_tenant_settings
    (tenant_id, setting_key, setting_value, is_public, updated_at)
VALUES
    -- 密码策略：最小 8 位，需含大小写字母 + 数字 + 特殊字符
    ('00000000-0000-0000-0000-000000000001', 'security.password_min_length', '8', true, NOW()),
    ('00000000-0000-0000-0000-000000000001', 'security.password_require_complexity', 'true', true, NOW()),
    -- 会话超时：60 分钟（与 SecuritySettings 代码默认一致）
    ('00000000-0000-0000-0000-000000000001', 'security.session_timeout_minutes', '60', true, NOW()),
    -- 文件上传大小限制：50MB
    ('00000000-0000-0000-0000-000000000001', 'file.upload_max_size_mb', '50', true, NOW())
ON CONFLICT (tenant_id, setting_key) DO NOTHING;
