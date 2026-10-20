-- ============================================================================
-- 20261020000024_iam_seed_missing_gate_permissions.sql
--
-- P0-4 权限 scope 方言对齐（非破坏·字典补缺，第一批）。
--
-- 背景：仓内存在三套权限 scope 方言，本轮只做"字典空洞补缺"，不删除、不重命名、
-- 不改变任何已挂载端点的 200/403 行为：
--   A. 细粒度种子（20260724000004 / 20260908000014）：`module:resource:action`（3 段）
--   B. 路由中间件 require_permission 实际挂载码（本迁移补齐的对象）
--   C. shared-auth 内存目录 get_permissions()：`iam:users_read` 下划线风格（测试锁定，不动）
--
-- 本迁移只把"中间件已经在用、但 core_permissions 字典里缺失"的 code 补进字典，
-- 使权限目录与运行时检查码一致（避免字典空洞 / 权限管理页查不到被保护的码）。
--
-- 非破坏保证：
--   1. 仅 INSERT 字典行，ON CONFLICT (code) DO NOTHING，干净重放与存量库都幂等；
--   2. 不向 core_role_permissions 绑定任何角色（不新增任何授权），因此不改变任何
--      现有用户的有效权限，不会把现有 403 改成 200，也不会把 200 改成 403；
--      角色绑定属授权变更，留待 MainAgent 统一决策（见 onboarding 活文档 P0-4 草案）；
--   3. 不引用 level 列（001_iam.sql 原始建表无此列，仅 20260908000014 防御性补过），
--      保证空库重建链与存量库都能执行。
--
-- 命名口径（本轮约定，供后续统一参考，不在本批改名）：
--   · 细粒度规范码 = `module:resource:action`（冒号分隔、小写蛇形，末段 action ∈
--     read/write/delete/approve/admin）；
--   · `<module>:admin` 为历史模块级管理伞码，作为兼容字典条目保留，不改名；
--   · `admin:<domain>:<action>` 为管理域前缀码，与 20260908000014 已登记的
--     admin:* 系列保持同形。
-- ============================================================================

-- A. 模块级管理伞码（<module>:admin）：中间件整组保护使用，字典原本缺失
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('analytics:admin',      '数据分析-管理',   'P0-4 补缺：analytics 服务 require_permission 挂载的模块级管理伞码', 'analytics', 'admin'),
  ('communication:admin',   '通信通知-管理',   'P0-4 补缺：communication 服务 require_permission 挂载的模块级管理伞码', 'communication', 'admin'),
  ('lims:admin',            '实验室管理-管理', 'P0-4 补缺：lims 服务 require_permission 挂载的模块级管理伞码', 'lims', 'admin'),
  ('master-data:admin',     '主数据-管理',     'P0-4 补缺：master-data 服务 require_permission 挂载的模块级管理伞码', 'master-data', 'admin'),
  ('mobile:admin',          '移动端-管理',     'P0-4 补缺：mobile 服务 require_permission 挂载的模块级管理伞码', 'mobile', 'admin'),
  ('monitor:admin',         '监控-管理',       'P0-4 补缺：monitor 服务 require_permission 挂载的模块级管理伞码', 'monitor', 'admin'),
  ('pdm:admin',             '产品数据-管理',   'P0-4 补缺：pdm 服务 require_permission 挂载的模块级管理伞码', 'pdm', 'admin'),
  ('portal:admin',          '门户-管理',       'P0-4 补缺：portal 服务 require_permission 挂载的模块级管理伞码', 'portal', 'admin'),
  ('rd:admin',              '研发-管理',       'P0-4 补缺：rd 服务 require_permission 挂载的模块级管理伞码', 'rd', 'admin'),
  ('search:admin',          '搜索-管理',       'P0-4 补缺：search 服务 require_permission 挂载的模块级管理伞码', 'search', 'admin'),
  ('srm:admin',             '供应商关系-管理', 'P0-4 补缺：srm 服务 require_permission 挂载的模块级管理伞码', 'srm', 'admin'),
  ('ticket:admin',          '工单-管理',       'P0-4 补缺：ticket 服务 require_permission 挂载的模块级管理伞码', 'ticket', 'admin'),
  ('tms:admin',             '运输管理-管理',   'P0-4 补缺：tms 服务 require_permission 挂载的模块级管理伞码', 'tms', 'admin'),
  ('subscription:admin',     '订阅-管理',       'P0-4 补缺：subscription 模块 require_permission 挂载的管理伞码', 'subscription', 'admin'),
  ('subscription:read',     '订阅-只读',       'P0-4 补缺：subscription 模块 GET /current require_permission 挂载的只读码', 'subscription', 'read')
ON CONFLICT (code) DO NOTHING;

-- B. 系统 / IAM 管理域码：unified-core 路由层 require_permission 已挂载，字典原本缺失
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('system:write',              '系统设置-写入',   'P0-4 补缺：system 配置/特性开关/DLQ 回放 require_permission("system:write")', 'system', 'write'),
  ('admin:iam:write',           '身份管理-写入',   'P0-4 补缺：routes/iam.rs 写路由组 require_permission("admin:iam:write")', 'admin:iam', 'write'),
  ('admin:iam:delete',          '身份管理-删除',   'P0-4 补缺：routes/iam.rs 删除路由组 require_permission("admin:iam:delete")', 'admin:iam', 'delete'),
  ('admin:iam:tenant:write',   '租户管理-写入',   'P0-4 补缺：routes/master.rs require_permission("admin:iam:tenant:write")', 'admin:iam:tenant', 'write'),
  ('iam:tenant:read',           '租户-只读',       'P0-4 补缺：routes/master.rs require_permission("iam:tenant:read")', 'iam:tenant', 'read')
ON CONFLICT (code) DO NOTHING;

-- C. 细粒度补缺：3 段 module:resource:action，与既有细粒度种子同形
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('ai:dashboard:write',              'AI 仪表盘-写入',   'P0-4 补缺：ai_knowledge require_permission("ai:dashboard:write")（read/admin 已存在）', 'ai:dashboard', 'write'),
  ('finance:settlement:read',         '结算中心-只读',    'P0-4 补缺：settlement_center require_permission("finance:settlement:read")', 'finance:settlement', 'read'),
  ('finance:settlement:write',        '结算中心-写入',    'P0-4 补缺：settlement_center require_permission("finance:settlement:write")（approve 已存在）', 'finance:settlement', 'write')
ON CONFLICT (code) DO NOTHING;

-- 注：本迁移刻意不执行 core_role_permissions 绑定。
-- 是否把上述码授予 admin/superadmin 角色属"有效授权变更"，需 MainAgent 结合前端
-- 权限声明与灰度策略统一决策，避免在非破坏批次内擅自放宽现有 403。
