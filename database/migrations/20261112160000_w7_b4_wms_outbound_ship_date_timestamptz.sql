-- ============================================================
-- W7-B4 WMS：出库发货日期列类型对齐（date → timestamptz）
--
-- 背景：
--   20260725000000_business_base_tables.sql 与 svc/wms/src/schema_defense.rs
--   将 wms.outbound_orders.expected_ship_date / actual_ship_date 定义为 DATE，
--   但 Rust 模型（svc/wms/src/models/outbound_order.rs）声明为 Option<DateTime<Utc>>。
--   sqlx 以 TIMESTAMPTZ 解码 DATE 会返回类型错误，列表/详情/创建/更新/发货读回均 500。
--
-- 口径：
--   1. 只纠正「按迁移重建」链路的类型漂移，不改写已推送的历史迁移；
--   2. 幂等：仅当 information_schema.columns.data_type = 'date' 时执行 ALTER；
--      已是 timestamptz 的环境（生产如已是）为 no-op；
--   3. 时区不依赖会话默认：显式 AT TIME ZONE 'Asia/Shanghai'，
--      日期语义统一归一为当日 00:00:00+08；两种初始状态都可重复执行。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $w7b4wms_ship_date_tz$
DECLARE
    v_type text;
BEGIN
    -- outbound_orders.expected_ship_date
    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_orders' AND c.column_name = 'expected_ship_date';
    IF v_type = 'date' THEN
        ALTER TABLE wms.outbound_orders ALTER COLUMN expected_ship_date TYPE timestamptz USING (expected_ship_date::timestamp AT TIME ZONE 'Asia/Shanghai');
        RAISE NOTICE 'wms.outbound_orders.expected_ship_date: date -> timestamptz (Asia/Shanghai)';
    ELSE
        RAISE NOTICE 'wms.outbound_orders.expected_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    -- outbound_orders.actual_ship_date
    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_orders' AND c.column_name = 'actual_ship_date';
    IF v_type = 'date' THEN
        ALTER TABLE wms.outbound_orders ALTER COLUMN actual_ship_date TYPE timestamptz USING (actual_ship_date::timestamp AT TIME ZONE 'Asia/Shanghai');
        RAISE NOTICE 'wms.outbound_orders.actual_ship_date: date -> timestamptz (Asia/Shanghai)';
    ELSE
        RAISE NOTICE 'wms.outbound_orders.actual_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    -- outbound_order_items.expected_ship_date（若存在）
    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_order_items' AND c.column_name = 'expected_ship_date';
    IF v_type = 'date' THEN
        ALTER TABLE wms.outbound_order_items ALTER COLUMN expected_ship_date TYPE timestamptz USING (expected_ship_date::timestamp AT TIME ZONE 'Asia/Shanghai');
        RAISE NOTICE 'wms.outbound_order_items.expected_ship_date: date -> timestamptz (Asia/Shanghai)';
    ELSE
        RAISE NOTICE 'wms.outbound_order_items.expected_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    -- outbound_order_items.actual_ship_date（若存在）
    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_order_items' AND c.column_name = 'actual_ship_date';
    IF v_type = 'date' THEN
        ALTER TABLE wms.outbound_order_items ALTER COLUMN actual_ship_date TYPE timestamptz USING (actual_ship_date::timestamp AT TIME ZONE 'Asia/Shanghai');
        RAISE NOTICE 'wms.outbound_order_items.actual_ship_date: date -> timestamptz (Asia/Shanghai)';
    ELSE
        RAISE NOTICE 'wms.outbound_order_items.actual_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;
END
$w7b4wms_ship_date_tz$;
