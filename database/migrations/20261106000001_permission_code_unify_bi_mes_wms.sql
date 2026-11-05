-- 批 6（P3-2）：三组同义权限码统一
-- 统一目标（DB 种子与前端现行拼写）：
--   bi:data_source:*   （原 BE 误拼 bi:datasource:*）
--   mes:work_order:*   （原 BE 误拼 mes:workorder:*）
--   wms:stocktake:*    （原 BE 误拼 wms:stock_take:*）
-- 幂等性：
--   改名仅当目标码不存在（NOT EXISTS），补种仅当码不存在；
--   不 DELETE 既有码，不触碰 core_role_permissions（改名保留 permission id，授权关系不变）。
-- 回滚：见文件末尾 ROLLBACK 段（人工执行）。
BEGIN;

-- 1) 历史环境旧拼写改名（当前库 0 行命中，防御性保留）
UPDATE core_permissions
SET code = 'bi:data_source:read', resource = 'bi:data_source', action = 'read'
WHERE code = 'bi:datasource:read'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'bi:data_source:read');

UPDATE core_permissions
SET code = 'bi:data_source:write', resource = 'bi:data_source', action = 'write'
WHERE code = 'bi:datasource:write'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'bi:data_source:write');

UPDATE core_permissions
SET code = 'mes:work_order:read', resource = 'mes:work_order', action = 'read'
WHERE code = 'mes:workorder:read'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'mes:work_order:read');

UPDATE core_permissions
SET code = 'mes:work_order:write', resource = 'mes:work_order', action = 'write'
WHERE code = 'mes:workorder:write'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'mes:work_order:write');

UPDATE core_permissions
SET code = 'wms:stocktake:read', resource = 'wms:stocktake', action = 'read'
WHERE code = 'wms:stock_take:read'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'wms:stocktake:read');

UPDATE core_permissions
SET code = 'wms:stocktake:write', resource = 'wms:stocktake', action = 'write'
WHERE code = 'wms:stock_take:write'
  AND NOT EXISTS (SELECT 1 FROM core_permissions t WHERE t.code = 'wms:stocktake:write');

-- 2) 补种缺失码（不依赖 level 列，兼容未应用历史 ALTER 的库）
INSERT INTO core_permissions (code, name, description, resource, action)
SELECT v.code, v.name, v.description, v.resource, v.action
FROM (VALUES
  ('bi:data_source:read',   '数据源读取',   'BI 数据源查看（批6统一）', 'bi:data_source', 'read'),
  ('bi:data_source:write',  '数据源管理',   'BI 数据源维护（批6统一）', 'bi:data_source', 'write'),
  ('mes:work_order:write',  '工单更新',     'MES 工单写权限（批6统一）', 'mes:work_order', 'write'),
  ('wms:stocktake:read',    '盘点读取',     'WMS 盘点查看（批6统一）',   'wms:stocktake', 'read'),
  ('wms:stocktake:write',   '盘点管理',     'WMS 盘点维护（批6统一）',   'wms:stocktake', 'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM core_permissions p WHERE p.code = v.code);

COMMIT;

-- ===== ROLLBACK（人工执行，按需）=====
-- 说明：仅回滚本迁移新增的码；改名项按"目标码改回旧码"处理，且旧码不存在时才改。
-- BEGIN;
-- DELETE FROM public.core_permissions
--  WHERE code IN ('bi:data_source:read','bi:data_source:write','mes:work_order:write','wms:stocktake:read','wms:stocktake:write')
--    AND NOT EXISTS (
--      SELECT 1 FROM public.core_role_permissions rp
--      JOIN public.core_permissions p2 ON p2.id = rp.permission_id
--      WHERE p2.code = core_permissions.code
--    );
-- UPDATE public.core_permissions SET code='bi:datasource:read', resource='bi:datasource', action='read'
--  WHERE code='bi:data_source:read' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='bi:datasource:read');
-- UPDATE public.core_permissions SET code='bi:datasource:write', resource='bi:datasource', action='write'
--  WHERE code='bi:data_source:write' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='bi:datasource:write');
-- UPDATE public.core_permissions SET code='mes:workorder:read', resource='mes:workorder', action='read'
--  WHERE code='mes:work_order:read' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='mes:workorder:read');
-- UPDATE public.core_permissions SET code='mes:workorder:write', resource='mes:workorder', action='write'
--  WHERE code='mes:work_order:write' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='mes:workorder:write');
-- UPDATE public.core_permissions SET code='wms:stock_take:read', resource='wms:stock_take', action='read'
--  WHERE code='wms:stocktake:read' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='wms:stock_take:read');
-- UPDATE public.core_permissions SET code='wms:stock_take:write', resource='wms:stock_take', action='write'
--  WHERE code='wms:stocktake:write' AND NOT EXISTS (SELECT 1 FROM public.core_permissions t WHERE t.code='wms:stock_take:write');
-- COMMIT;
