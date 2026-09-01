-- 2026-09-01 inventory_items 跨域 API 化收尾：
-- public.inventory_items 为废弃旧库存表（0 行）：
--   - wms.transfer 已改操作真实主表 wms.inventory（消除 wms→public 直连写）
--   - erp.dashboard 库存统计已改走 WMS statistics API（消除 erp→public 直连读）
-- 无写者无读者 → DROP
DROP TABLE IF EXISTS public.inventory_items CASCADE;
