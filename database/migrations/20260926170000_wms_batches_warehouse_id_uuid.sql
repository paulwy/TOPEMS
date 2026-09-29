-- TOPEMS database migration 20260926170000
-- wms.batches.warehouse_id 由 character varying 统一为 uuid
-- （全 wms schema 其余表 warehouse_id 均为 uuid，batches 为历史遗留异类；
--   表内 0 行数据，USING 转换空转安全；与代码 query! `warehouse_id = $1::uuid` 对齐；
--   空库重建路径的建表壳无此列，需列存在守卫）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'wms' AND table_name = 'batches' AND column_name = 'warehouse_id') THEN
    ALTER TABLE wms.batches ALTER COLUMN warehouse_id TYPE uuid USING warehouse_id::uuid;
  END IF;
END $$;
