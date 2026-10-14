-- 4.6：DROP outbox 死表。
--
-- 背景：
--   * crm.return_event_outbox（20261007000001 建）全仓 .rs 0 引用，补偿已由 Redis ZSET
--     commit_retry::push_retry_typed 接管（aftersales.rs），无 replay 端点。
--   * core_master_data_event_outbox 为多 schema 表族（master_data/public/flow 三副本），
--     曾被 unified-core 运行时 CREATE TABLE IF NOT EXISTS 重建——该运行时 DDL 与
--     schema_defense 白名单已在本决策批同步摘除，此处 DROP 才不会被启动逻辑重建。
--
-- 幂等：全部 IF EXISTS。Redis Stream 本身即持久化通道，不依赖本 outbox 表。

DROP TABLE IF EXISTS "crm"."return_event_outbox";
DROP TABLE IF EXISTS "master_data"."core_master_data_event_outbox";
DROP TABLE IF EXISTS "public"."core_master_data_event_outbox";
DROP TABLE IF EXISTS "flow"."core_master_data_event_outbox";
