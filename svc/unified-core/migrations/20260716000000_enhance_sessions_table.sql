-- 增强会话表：增加refresh_token独立过期时间、IP地址、User Agent
-- 提升安全性和多设备会话管理能力

DO $$
BEGIN
    -- 添加 refresh_expires_at 列（refresh token 独立过期时间）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'sessions'
          AND column_name = 'refresh_expires_at'
    ) THEN
        ALTER TABLE iam.sessions
        ADD COLUMN refresh_expires_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN iam.sessions.refresh_expires_at IS 'Refresh token 过期时间';
    END IF;

    -- 添加 ip_address 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'sessions'
          AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE iam.sessions
        ADD COLUMN ip_address INET;
        COMMENT ON COLUMN iam.sessions.ip_address IS '登录IP地址';
    END IF;

    -- 添加 user_agent 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'sessions'
          AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE iam.sessions
        ADD COLUMN user_agent TEXT;
        COMMENT ON COLUMN iam.sessions.user_agent IS '浏览器/客户端 User Agent';
    END IF;

    -- 添加 device_info 列（JSONB 格式，存储设备信息）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'sessions'
          AND column_name = 'device_info'
    ) THEN
        ALTER TABLE iam.sessions
        ADD COLUMN device_info JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN iam.sessions.device_info IS '设备信息（JSON）';
    END IF;

    -- 添加 last_active_at 列（最后活跃时间）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam'
          AND table_name = 'sessions'
          AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE iam.sessions
        ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        COMMENT ON COLUMN iam.sessions.last_active_at IS '最后活跃时间';
    END IF;

    -- 为 user_id 添加索引（加速用户会话查询）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'iam'
          AND tablename = 'sessions'
          AND indexname = 'idx_iam_sessions_user_id'
    ) THEN
        CREATE INDEX idx_iam_sessions_user_id
        ON iam.sessions (user_id);
    END IF;

    -- 为 expires_at 添加索引（加速过期会话清理）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'iam'
          AND tablename = 'sessions'
          AND indexname = 'idx_iam_sessions_expires_at'
    ) THEN
        CREATE INDEX idx_iam_sessions_expires_at
        ON iam.sessions (expires_at);
    END IF;

    -- 为 token_hash 添加唯一索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'iam'
          AND tablename = 'sessions'
          AND indexname = 'idx_iam_sessions_token_hash'
    ) THEN
        CREATE UNIQUE INDEX idx_iam_sessions_token_hash
        ON iam.sessions (token_hash);
    END IF;
END $$;
