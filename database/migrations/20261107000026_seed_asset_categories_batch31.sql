-- [batch31] erp.asset_categories 固定资产分类种子数据（GB/T 14885 国标大类两级树）
--
-- 背景：erp.asset_categories 自建表以来从未灌过种子（grep "INSERT INTO erp.asset_categories"
-- database/migrations/ 无命中），当前 0 行。该表是固定资产/设备分类治理主表，
-- code 有唯一约束、parent_id 自引用树。本批按 GB/T 14885《固定资产分类与代码》
-- 的六大类建一棵两级树（大类 + 代表性中类），供资产台账/折旧/盘点等模块引用。
--
-- 列结构（已用 information_schema.columns 实测确认，共 10 列）：
--   id          uuid      NOT NULL DEFAULT gen_random_uuid()  → INSERT 省略
--   name        text      NOT NULL
--   code        text      NOT NULL UNIQUE (asset_categories_code_key)
--   parent_id   uuid      NULL REFERENCES erp.asset_categories(id) ON DELETE SET NULL
--   description text      NULL
--   status      text      NOT NULL DEFAULT 'active' CHECK IN ('active','inactive','archived')
--   created_at  timestamptz NOT NULL DEFAULT now()
--   updated_at  timestamptz NOT NULL DEFAULT now()
--   deleted_at  timestamptz NULL
--   name_en     varchar   NULL
-- 注意：该表无 tenant_id 列（批 30 发现的 latent bug 根因），无 sort_order 列。
--
-- 幂等：全部 INSERT 用 ON CONFLICT (code) DO NOTHING；二次执行 INSERT 0 0。
-- 树结构靠 code 关联：先插大类（parent_id=NULL），再插子类时通过
--   parent_id = (SELECT id FROM erp.asset_categories WHERE code = '<父code>')
-- 建立父子关系，不写死 uuid。
--
-- ROLLBACK（如需回滚本批种子，在 psql 中执行）：
--   BEGIN;
--   DELETE FROM erp.asset_categories
--    WHERE code IN (
--      '01','0101','0102','0103','0104','0105',
--      '02','0201','0202','0203','0204',
--      '03','0301','0302','0303','0304','0305',
--      '04','0401','0402',
--      '05','0501','0502',
--      '06','0601','0602','0603','0604'
--    );
--   COMMIT;
-- （仅删除本批插入的 28 行；不影响其他并行会话写入的数据。）

BEGIN;

-- 1) 六大类顶级节点（parent_id = NULL）
INSERT INTO erp.asset_categories (code, name, name_en, description, status) VALUES
  ('01', '房屋及构筑物',           'Buildings and Structures',     'GB/T 14885 第 1 类：房屋、建筑物及附属构筑物', 'active'),
  ('02', '通用设备',               'General Equipment',            'GB/T 14885 第 2 类：各行业通用的设备、装置',     'active'),
  ('03', '专用设备',               'Specialized Equipment',        'GB/T 14885 第 3 类：特定行业专用生产/检测设备', 'active'),
  ('04', '文物和陈列品',           'Cultural Relics and Exhibits', 'GB/T 14885 第 4 类：文物藏品与陈列展品',       'active'),
  ('05', '图书、档案',             'Books and Archives',           'GB/T 14885 第 5 类：图书资料与档案资料',       'active'),
  ('06', '家具、用具、装具及动植物','Furniture, Utensils and Living Things', 'GB/T 14885 第 6 类：家具、用具、装具及动植物', 'active')
ON CONFLICT (code) DO NOTHING;

-- 2) 子类中节点（parent_id 通过 code 反查父 id）
-- 01 房屋及构筑物
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0101', '生产用房',     'Production Buildings',    (SELECT id FROM erp.asset_categories WHERE code='01'), '厂房、车间、库房等生产性房屋', 'active'),
  ('0102', '办公用房',     'Office Buildings',        (SELECT id FROM erp.asset_categories WHERE code='01'), '办公楼、会议室等办公性房屋',   'active'),
  ('0103', '仓储用房',     'Warehouse Buildings',     (SELECT id FROM erp.asset_categories WHERE code='01'), '仓库、冷库、储罐区等仓储房屋', 'active'),
  ('0104', '附属构筑物',   'Ancillary Structures',    (SELECT id FROM erp.asset_categories WHERE code='01'), '道路、围墙、水塔、烟囱等构筑物', 'active'),
  ('0105', '给排水及暖通构筑物','HVAC and Plumbing Structures', (SELECT id FROM erp.asset_categories WHERE code='01'), '给排水管网、暖通管道、冷却塔等', 'active')
ON CONFLICT (code) DO NOTHING;

-- 02 通用设备
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0201', '计算机及办公设备','Computers and Office Equipment', (SELECT id FROM erp.asset_categories WHERE code='02'), '服务器、PC、打印机、复印机等', 'active'),
  ('0202', '电气设备',       'Electrical Equipment',           (SELECT id FROM erp.asset_categories WHERE code='02'), '变压器、配电柜、发电机等',     'active'),
  ('0203', '机械设备',       'Machinery',                      (SELECT id FROM erp.asset_categories WHERE code='02'), '泵、风机、压缩机、机床等通用机械', 'active'),
  ('0204', '运输设备',       'Transport Equipment',            (SELECT id FROM erp.asset_categories WHERE code='02'), '车辆、叉车、搬运设备等',       'active')
ON CONFLICT (code) DO NOTHING;

-- 03 专用设备
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0301', '研发专用设备',   'R&D Equipment',          (SELECT id FROM erp.asset_categories WHERE code='03'), '实验台、测试仪器、研发专用装置', 'active'),
  ('0302', '生产专用设备',   'Production Equipment',   (SELECT id FROM erp.asset_categories WHERE code='03'), '产线专用机床、装配线、焊接设备', 'active'),
  ('0303', '检测专用设备',   'Inspection Equipment',   (SELECT id FROM erp.asset_categories WHERE code='03'), '质检仪器、测量设备、检测装置',   'active'),
  ('0304', '安全消防设备',   'Safety and Fire Equipment', (SELECT id FROM erp.asset_categories WHERE code='03'), '消防系统、安防监控、应急设备',   'active'),
  ('0305', '环保设备',       'Environmental Equipment', (SELECT id FROM erp.asset_categories WHERE code='03'), '废水/废气处理、除尘、降噪设备',   'active')
ON CONFLICT (code) DO NOTHING;

-- 04 文物和陈列品
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0401', '文物藏品',       'Cultural Relics',       (SELECT id FROM erp.asset_categories WHERE code='04'), '可移动文物、藏品',           'active'),
  ('0402', '陈列展品',       'Exhibits',              (SELECT id FROM erp.asset_categories WHERE code='04'), '展厅陈列品、标本、模型',     'active')
ON CONFLICT (code) DO NOTHING;

-- 05 图书、档案
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0501', '图书资料',       'Books and Publications', (SELECT id FROM erp.asset_categories WHERE code='05'), '专业图书、期刊、资料汇编',   'active'),
  ('0502', '档案资料',       'Archives',              (SELECT id FROM erp.asset_categories WHERE code='05'), '文书档案、技术档案、会计档案', 'active')
ON CONFLICT (code) DO NOTHING;

-- 06 家具、用具、装具及动植物
INSERT INTO erp.asset_categories (code, name, name_en, parent_id, description, status) VALUES
  ('0601', '办公家具',       'Office Furniture',       (SELECT id FROM erp.asset_categories WHERE code='06'), '办公桌、椅、柜、沙发等',     'active'),
  ('0602', '生活用具',       'Living Utensils',        (SELECT id FROM erp.asset_categories WHERE code='06'), '厨房设备、保洁用具等',       'active'),
  ('0603', '装具及包装物',   'Fixtures and Packaging', (SELECT id FROM erp.asset_categories WHERE code='06'), '货架、托盘、包装箱、容器',   'active'),
  ('0604', '动植物',         'Plants and Animals',     (SELECT id FROM erp.asset_categories WHERE code='06'), '绿化植物、观赏动物等',       'active')
ON CONFLICT (code) DO NOTHING;

COMMIT;
