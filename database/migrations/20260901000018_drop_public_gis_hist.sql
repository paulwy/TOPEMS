-- 2026-09-01 清理 public gis 旧测试数据表：
-- public.device_locations(170)/factory_maps(512)/pipelines(170) 为 2026-06-13~07-08 批量测试数据（"测试设备"/"测试管道"/2d）
-- gis 服务用 gis.* 同名活表（真实数据 2/10 行），public 三表无 SQL 引用（前端经 gis API 调用）
-- 已备份（topems_pre_gis_hist_drop / topems_pre_gis_pipelines_drop）→ DROP
DROP TABLE IF EXISTS public.device_locations CASCADE;
DROP TABLE IF EXISTS public.factory_maps CASCADE;
DROP TABLE IF EXISTS public.pipelines CASCADE;
