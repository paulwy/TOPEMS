-- P5 IAM 核心表归一到 public（唯一权威副本）
-- 批 10 / 2026-11-06
--
-- 背景：core_permissions 在 public / mes / iam / flow 多份副本并存。
--   - public 1033 条（内容最全，角色/授权也在此）
--   - mes 647 条（历史种子按 search_path 落盘）
--   - iam / flow 均 0 条
-- 差集：mes 有 4 条 public 缺失（均由 20261106000001_permission_code_unify_bi_mes_wms.sql
--   按 search_path 落入 mes 造成）：bi:data_source:write、mes:work_order:write、
--   wms:stocktake:read、wms:stocktake:write
--
-- 本迁移只做"补齐 public"，不删除任何副本（副本清理见 scripts/p5/cleanup_iam_replicas_20261106.sql）
-- 幂等：NOT EXISTS(code) 判重；重复执行为 0 行
--
-- ROLLBACK：
--   DELETE FROM public.core_permissions
--    WHERE code IN ('bi:data_source:write','mes:work_order:write',
--                   'wms:stocktake:read','wms:stocktake:write')
--      AND created_at >= '2026-11-06';

INSERT INTO public.core_permissions (id, code, name, description, resource, action, created_at)
SELECT gen_random_uuid(), v.code, v.name, v.description, v.resource, v.action, now()
FROM (
    VALUES
        ('bi:data_source:write',   'BI 数据源写入', '创建/修改/删除 BI 数据源', 'bi',  'write'),
        ('mes:work_order:write',   'MES 工单写入', '创建/修改/删除 MES 工单', 'mes', 'write'),
        ('wms:stocktake:read',     'WMS 盘点读取', '查看盘点单',              'wms', 'read'),
        ('wms:stocktake:write',    'WMS 盘点写入', '录入/完成盘点',           'wms', 'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);
