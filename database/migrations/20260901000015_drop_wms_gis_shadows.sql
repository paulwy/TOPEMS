-- 2026-09-01 剩余影子收尾：
-- wms/gis 显式 schema 引用的 public 影子（0 行）：inbound_orders/outbound_orders/warehouses(wms)、business_locations(gis)
-- 纯死表（全代码 0 提及 + 0 行）：supply_chain_orders
DROP TABLE IF EXISTS public.business_locations CASCADE;
DROP TABLE IF EXISTS public.inbound_orders CASCADE;
DROP TABLE IF EXISTS public.outbound_orders CASCADE;
DROP TABLE IF EXISTS public.warehouses CASCADE;
DROP TABLE IF EXISTS public.supply_chain_orders CASCADE;
