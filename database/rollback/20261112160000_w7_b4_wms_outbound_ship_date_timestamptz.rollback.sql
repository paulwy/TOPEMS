-- ============================================================
-- 回滚：20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.sql
--
-- 口径：
--   1. 仅当列类型为 timestamptz 时改回 date；已是 date 的环境为 no-op；
--   2. 转换显式使用 AT TIME ZONE 'Asia/Shanghai'，不依赖会话默认时区；
--   3. 数据影响：时分秒被截断。按当前写入口径（见迁移与 outbound_order.rs）
--      两列恒为 Asia/Shanghai 当日 00:00:00，截断不丢业务信息；
--      若有人绕过应用直接写入非 0 时分秒，回滚后这些时间会丢失。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $w7b4wms_ship_date_tz_rb$
DECLARE
    v_type text;
BEGIN
    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_orders' AND c.column_name = 'expected_ship_date';
    IF v_type = 'timestamp with time zone' THEN
        ALTER TABLE wms.outbound_orders ALTER COLUMN expected_ship_date TYPE date USING ((expected_ship_date AT TIME ZONE 'Asia/Shanghai')::date);
        RAISE NOTICE 'wms.outbound_orders.expected_ship_date: timestamptz -> date';
    ELSE
        RAISE NOTICE 'wms.outbound_orders.expected_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_orders' AND c.column_name = 'actual_ship_date';
    IF v_type = 'timestamp with time zone' THEN
        ALTER TABLE wms.outbound_orders ALTER COLUMN actual_ship_date TYPE date USING ((actual_ship_date AT TIME ZONE 'Asia/Shanghai')::date);
        RAISE NOTICE 'wms.outbound_orders.actual_ship_date: timestamptz -> date';
    ELSE
        RAISE NOTICE 'wms.outbound_orders.actual_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_order_items' AND c.column_name = 'expected_ship_date';
    IF v_type = 'timestamp with time zone' THEN
        ALTER TABLE wms.outbound_order_items ALTER COLUMN expected_ship_date TYPE date USING ((expected_ship_date AT TIME ZONE 'Asia/Shanghai')::date);
        RAISE NOTICE 'wms.outbound_order_items.expected_ship_date: timestamptz -> date';
    ELSE
        RAISE NOTICE 'wms.outbound_order_items.expected_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;

    SELECT c.data_type INTO v_type FROM information_schema.columns c
     WHERE c.table_schema = 'wms' AND c.table_name = 'outbound_order_items' AND c.column_name = 'actual_ship_date';
    IF v_type = 'timestamp with time zone' THEN
        ALTER TABLE wms.outbound_order_items ALTER COLUMN actual_ship_date TYPE date USING ((actual_ship_date AT TIME ZONE 'Asia/Shanghai')::date);
        RAISE NOTICE 'wms.outbound_order_items.actual_ship_date: timestamptz -> date';
    ELSE
        RAISE NOTICE 'wms.outbound_order_items.actual_ship_date: 当前=%，跳过', coalesce(v_type, '<不存在>');
    END IF;
END
$w7b4wms_ship_date_tz_rb$;
