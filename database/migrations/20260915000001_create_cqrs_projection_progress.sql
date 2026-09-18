-- CQRS 异步投影进度表（finance schema）
-- 由 svc/finance/src/domain/async_projector.rs 使用：
--   SELECT/INSERT/UPDATE 均通过 only_own_schema_query!("finance", ...) 限定在 finance schema
-- 列类型与 Rust 模型严格对应：
--   last_event_id   -> Option<Uuid>          (uuid)
--   last_event_time -> Option<DateTime<Utc>> (timestamptz)
--   processed_count / error_count -> i64      (bigint)
--   updated_at      -> DateTime<Utc>         (timestamptz, 默认 NOW())
-- 2026-09-18 防御化（空库重建链卡点）：若 finance.cqrs_projection_progress 仅为 business_base_tables 建的 2 列裸骨架
-- （无 view_name 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='finance' AND table_name='cqrs_projection_progress')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='cqrs_projection_progress' AND column_name='view_name')
  THEN
    DROP TABLE finance.cqrs_projection_progress;
  END IF;
END $skel$;

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
-- 2026-09-18 防御化（空库重建链卡点）：若 finance.cqrs_events 仅为 business_base_tables 建的 2 列裸骨架
-- （无 aggregate_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='finance' AND table_name='cqrs_events')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='cqrs_events' AND column_name='aggregate_id')
  THEN
    DROP TABLE finance.cqrs_events;
  END IF;
END $skel$;

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
