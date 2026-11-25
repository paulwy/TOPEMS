-- 20261121210000: communication 1 张运行期表收口（W2-D2 第二十六个模块）
--
-- 背景：svc/communication/src/schema_defense.rs 的 TABLE_DEFS 只声明 1 张表
-- communication.core_location_messages（IM 位置消息），启动时由 schema_defense 建表/补列。
-- live 该表比 TABLE_DEFS 多 deleted_at（运行时补列结果），以 live 真实形状固化。
-- live communication 另有 core_notification_deliveries/preferences/subscriptions、
-- notification_channels 等由既有迁移维护，不在 TABLE_DEFS 内，不纳入。本表无 RLS。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS communication.core_location_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(255),
    location_type character varying(50) NOT NULL,
    coordinates jsonb NOT NULL,
    address text,
    place_name character varying(255),
    place_id character varying(255),
    gis_location_id uuid,
    gis_location_code character varying(100),
    gis_map_id uuid,
    gis_map_name character varying(255),
    map_provider character varying(50) DEFAULT 'osm'::character varying NOT NULL,
    static_map_url text,
    map_zoom integer DEFAULT 15,
    map_bearing double precision,
    map_tilt double precision,
    poi_types jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_core_location_messages_chat ON communication.core_location_messages USING btree (chat_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='communication.core_location_messages'::regclass AND contype='p') THEN
        ALTER TABLE communication.core_location_messages ADD CONSTRAINT "core_location_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;


