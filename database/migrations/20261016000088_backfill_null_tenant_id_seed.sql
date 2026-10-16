-- 20261016000088: 回填历史 NULL tenant_id（种子/冒烟数据归属主租户 0001）
-- 背景：srm.suppliers 92 / hrm.initialization_status 5 / mobile 4 表 59 行 tenant_id 为 NULL
-- （RLS `tenant_id IS NULL` 分支放行，全部租户可见）。核实均为 2026-06 种子/冒烟测试数据
-- （"测试供应商"/"冒烟模板"/测试用户 e91e2228 的移动数据/初始化向导步骤），归属主租户 0001。
-- 回填后按 RLS 主分支（tenant_id = current_setting）收敛为 0001 可见，其他租户不可见。

UPDATE srm.suppliers
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

UPDATE hrm.initialization_status
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

UPDATE mobile.push_templates
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

UPDATE mobile.push_notifications
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

UPDATE mobile.sync_policies
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

UPDATE mobile.barcode_scans
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;
