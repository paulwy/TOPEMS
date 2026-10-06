-- ============================================================
-- R-4：补齐 core.core_plugin_instances 心跳实例表
-- ============================================================
-- 背景（go-live-checklist R-4 必修 #4 / regression-baseline-r2 链路⑤）：
--   * plugin-registry 运行时注册/心跳链路写 core.core_plugin_instances：
--       - register_plugin: INSERT ... ON CONFLICT (plugin_id) DO UPDATE
--         （svc/plugin-registry/src/modules/plugin/handlers/runtime.rs）
--       - update_plugin_status: UPDATE ... SET runtime_status, last_heartbeat=NOW()
--       - unregister_plugin: UPDATE ... SET runtime_status='stopped', stopped_at=NOW()
--       - list_plugins_with_status: LEFT JOIN core_plugin_instances 读运行态
--   * unified-core 心跳评估扫 core.core_plugin_instances（svc/unified-core/src/embedded.rs
--     evaluate_stale_plugin_heartbeats）：running 且 last_heartbeat 早于 NOW()-90s → offline；
--     running 且 last_heartbeat IS NULL 且 created_at 早于 NOW()-2min → offline。
--   * 实测 5432：core.core_plugin_instances 不存在（仅 iam./mes./public. 三个零行变体），
--     致 register 时 ON CONFLICT (plugin_id) 无唯一约束可匹配、心跳评估扫不到表。
--   * 本表结构与 svc/plugin-registry/src/modules/plugin/mod.rs::init_database 内联 DDL
--     （CREATE TABLE IF NOT EXISTS core.core_plugin_instances）逐列对齐，
--     plugin_id 唯一约束既满足 ON CONFLICT (plugin_id) 幂等重注册，也是心跳评估的写入前提。
--   * 本迁移幂等（IF NOT EXISTS），可安全重放；不修改任何已应用迁移文件。
-- ============================================================

CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core.core_plugins(id) ON DELETE CASCADE,
    runtime_url VARCHAR(512),
    runtime_status VARCHAR(32) DEFAULT 'stopped',  -- stopped | starting | running | error | offline
    base_path VARCHAR(128) DEFAULT '/api/plugins/{code}',
    -- 注意：用 TIMESTAMPTZ 与 Rust 端 DateTime<Utc> 解码对齐（list/get status 的
    -- query_as 映射 last_heartbeat: Option<DateTime<Utc>>；TIMESTAMP 无时区会解码失败）。
    last_heartbeat TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plugin_id)
);

-- 幂等纠正：若表已由早期 init_database 内联 DDL（TIMESTAMP 无时区）建好，
-- 将心跳相关列升级为 TIMESTAMPTZ，与 Rust 端 DateTime<Utc> 解码一致。
ALTER TABLE core.core_plugin_instances
    ALTER COLUMN last_heartbeat TYPE TIMESTAMPTZ USING last_heartbeat AT TIME ZONE 'UTC',
    ALTER COLUMN started_at     TYPE TIMESTAMPTZ USING started_at AT TIME ZONE 'UTC',
    ALTER COLUMN stopped_at     TYPE TIMESTAMPTZ USING stopped_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_status
    ON core.core_plugin_instances(runtime_status);

-- ============================================================
-- R-4 补充：register 链路 ON CONFLICT 唯一约束/依赖表补齐
-- ============================================================
-- 实测 5432：core.core_plugins 由早期迁移建立，code 仅非唯一索引 idx_core_plugins_code，
--   缺 UNIQUE(code)；register_plugin 首条 INSERT ... ON CONFLICT (code) DO UPDATE
--   （svc/plugin-registry/.../runtime.rs）因此报「no unique or exclusion constraint
--   matching the ON CONFLICT specification」，整个注册事务回滚。
--   live 表 0 行，加唯一约束安全。
-- core.core_plugin_permissions 表缺失（register 循环按 ON CONFLICT (plugin_code,
--   permission_code) 写权限注册）；按 init_database 内联 DDL 幂等补齐。
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'core_plugins_code_key'
    ) AND EXISTS (
        -- 空库重建链中 core.core_plugins 可能是 id 骨架（003 的表被后续 drop 重建），
        -- 无 code 列时 ADD UNIQUE(code) 会 column does not exist——列缺失则跳过
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name = 'core_plugins' AND column_name = 'code'
    ) THEN
        ALTER TABLE core.core_plugins
            ADD CONSTRAINT core_plugins_code_key UNIQUE (code);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(64) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255),
    resource_type VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_code, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_core_plugin_permissions_code
    ON core.core_plugin_permissions(plugin_code);
