-- 2026-09-01 IoT/GIS/Mobile 影子 + 死表清理：代码用显式 gis./mobile. schema 或带前缀表名，public 版无 SQL 引用
-- 影子：audio_recordings/video_recordings/patrol_records/photo_evidences(mobile)、location_photos/map_markers/warehouse_locations(gis)
-- 死表：anomaly_records/product_boms（0 引用）
DROP TABLE IF EXISTS public.anomaly_records CASCADE;
DROP TABLE IF EXISTS public.product_boms CASCADE;
DROP TABLE IF EXISTS public.audio_recordings CASCADE;
DROP TABLE IF EXISTS public.location_photos CASCADE;
DROP TABLE IF EXISTS public.map_markers CASCADE;
DROP TABLE IF EXISTS public.patrol_records CASCADE;
DROP TABLE IF EXISTS public.photo_evidences CASCADE;
DROP TABLE IF EXISTS public.scan_records CASCADE;
DROP TABLE IF EXISTS public.video_recordings CASCADE;
DROP TABLE IF EXISTS public.warehouse_locations CASCADE;
