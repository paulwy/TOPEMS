-- CQRS 异步投影进度表（finance schema）
-- 由 svc/finance/src/domain/async_projector.rs 使用：
--   SELECT/INSERT/UPDATE 均通过 only_own_schema_query!("finance", ...) 限定在 finance schema
-- 列类型与 Rust 模型严格对应：
--   last_event_id   -> Option<Uuid>          (uuid)
--   last_event_time -> Option<DateTime<Utc>> (timestamptz)
--   processed_count / error_count -> i64      (bigint)
--   updated_at      -> DateTime<Utc>         (timestamptz, 默认 NOW())
CREATE TABLE IF NOT EXISTS finance.cqrs_projection_progress (
    view_name        TEXT PRIMARY KEY,
    last_event_id    UUID,
    last_event_time  TIMESTAMPTZ,
    processed_count  BIGINT NOT NULL DEFAULT 0,
    error_count      BIGINT NOT NULL DEFAULT 0,
    last_error       TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CQRS 事件存储表（finance schema）
-- 由 svc/finance/src/domain/pg_event_store.rs 使用（only_own_schema_query!("finance", ...)）
-- 列类型与 Rust 模型严格对应：
--   id / aggregate_id      -> Uuid                  (uuid)
--   aggregate_type/event_type -> String             (text)
--   version                -> i64                   (bigint)
--   payload / metadata     -> serde_json::Value     (jsonb)
--   occurred_at            -> DateTime<Utc>         (timestamptz)
CREATE TABLE IF NOT EXISTS finance.cqrs_events (
    id              UUID PRIMARY KEY,
    aggregate_id    UUID NOT NULL,
    aggregate_type  TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    version         BIGINT NOT NULL,
    payload         JSONB NOT NULL,
    metadata        JSONB NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_aggregate ON finance.cqrs_events (aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_occurred  ON finance.cqrs_events (occurred_at, id);
