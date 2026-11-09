-- P5 B1：创建 finance.cqrs_snapshots（事件溯源快照存储）
--
-- 依据：svc/finance/src/domain/pg_event_store.rs
--       - save_snapshot   : INSERT ... ON CONFLICT (aggregate_id) DO UPDATE
--       - get_latest_snapshot / get_snapshot_count : SELECT ... WHERE aggregate_id = $1
-- 生产现状：finance schema 无该对象，快照读写路径直接 500。
-- 类型来源：从上述 SQL 反推（aggregate_id text / aggregate_type text / state jsonb /
--           version bigint / created_at timestamptz），2026-11-09。
--
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS；owner/grant 幂等。
-- 回滚：DROP TABLE IF EXISTS finance.cqrs_snapshots;

CREATE TABLE IF NOT EXISTS finance.cqrs_snapshots (
    aggregate_id   text PRIMARY KEY,
    aggregate_type text NOT NULL,
    state          jsonb NOT NULL,
    version        bigint NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cqrs_snapshots_type_created
    ON finance.cqrs_snapshots (aggregate_type, created_at DESC);

DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('finance.cqrs_snapshots') IS NULL THEN
        RAISE NOTICE 'P5 B1：finance.cqrs_snapshots 不存在，跳过 owner/GRANT';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P5 B1：未找到服务运行角色（topems_prod/topems_app），跳过 owner/GRANT';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE finance.cqrs_snapshots OWNER TO %I', svc_role);
    EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON finance.cqrs_snapshots TO %I', svc_role);
    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON finance.cqrs_snapshots TO topems_app;
    END IF;
END $$;
