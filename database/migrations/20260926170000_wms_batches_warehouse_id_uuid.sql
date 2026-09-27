-- TOPEMS database migration 20260926170000
-- wms.batches.warehouse_id 由 character varying 统一为 uuid
-- （全 wms schema 其余表 warehouse_id 均为 uuid，batches 为历史遗留异类；
--   表内 0 行数据，USING 转换空转安全；与代码 query! `warehouse_id = $1::uuid` 对齐）
ALTER TABLE wms.batches ALTER COLUMN warehouse_id TYPE uuid USING warehouse_id::uuid;
