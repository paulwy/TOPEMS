-- [功能半成品收口] core.core_plugin_categories 分类字典种子
--
-- 背景：插件市场 `GET /marketplace/summary`、`GET /marketplace/categories`
-- 均从 core.core_plugin_categories 读取分类（见
-- svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs），但全仓无任何
-- 写入方，生产/本地该表 0 行，市场分类接口恒返回空数组。
--
-- 本迁移按 svc/plugin-registry/.../marketplace.rs 的 PLUGIN_CATEGORIES 常量
-- 灌入 9 个分类字典，作为全局字典（该表无 tenant_id 列）。
--
-- 幂等：按 code 做 NOT EXISTS 判断，二次执行 INSERT 0 0。
-- 注意：迁移文件不写事务控制，由外层 --single-transaction 统一包裹。
--
-- ROLLBACK：见 database/rollback/20261119170000_seed_core_plugin_categories.rollback.sql

DO $$
BEGIN
  IF to_regclass('core.core_plugin_categories') IS NULL THEN
    RAISE NOTICE 'core.core_plugin_categories 不存在，跳过种子';
    RETURN;
  END IF;

  INSERT INTO core.core_plugin_categories (name, code, description, sort_order, is_active)
  SELECT v.name, v.code, v.description, v.sort_order, true
  FROM (VALUES
    ('manufacturing', '制造',   '生产制造、工艺与排程相关插件',   10),
    ('quality',       '质量',   '质检、SPC 与质量追溯相关插件',   20),
    ('analytics',     '分析',   '报表、看板与数据分析相关插件',   30),
    ('supply-chain',  '供应链', '采购、库存与物流相关插件',       40),
    ('hr',            '人力',   '人事、考勤与薪酬相关插件',       50),
    ('crm',           '客户',   '客户关系与销售相关插件',         60),
    ('ai',            '智能',   'AI 模型、推理与智能应用插件',    70),
    ('gis',           '地理',   '地图、定位与轨迹相关插件',       80),
    ('devtools',      '开发工具','开发者工具与集成插件',          90)
  ) AS v(code, name, description, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM core.core_plugin_categories c WHERE c.code = v.code
  );
END $$;
