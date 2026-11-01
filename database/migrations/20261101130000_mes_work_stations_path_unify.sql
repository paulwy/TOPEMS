-- ============================================================
-- 审计整改批 1：mes 工站路径统一（/mes/work-stations → /mes/workstations）
-- 背景：前端 navItem/路由原用 MES_PATHS.workStations='/mes/work-stations'，
--       而模块注册表 modules/registry/core-modules.ts 与 lib/plugin-loader/pluginManager.ts
--       均引用 '/mes/workstations'（同一 WorkStationPage）。收敛方向：注册表路径为权威。
-- 配套前端改动：apps/web/src/modules/mes/config.ts MES_PATHS.workStations 改为
--       '/mes/workstations'，删除重复路由块 code=mes-workstations（config.ts:1024）。
-- 本迁移仅同步 DB 种子 path（code 保持 mes-work-stations 不变，维持 FE/DB 对齐）。
-- 幂等：按 code 定位更新，可重复执行。
-- ============================================================
UPDATE core_menus
SET path = '/mes/workstations',
    updated_at = NOW()
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND code = 'mes-work-stations'
  AND path = '/mes/work-stations';
