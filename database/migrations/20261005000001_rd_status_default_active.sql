-- 方向③ DB 根因修复落盘：rd.builds/rd.deploys status 默认值对齐 CHECK 约束
-- 背景：两表 status 为 NOT NULL + CHECK (status IN ('active','inactive','archived'))，
-- 原默认 'pending' 违反 CHECK，前端 createBuild/createDeploy POST 500（INSERT 必违反约束）。
-- 已 live ALTER 生效（2026-10-04），本迁移将其固化进迁移链，幂等可重复应用。
ALTER TABLE rd.builds ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE rd.deploys ALTER COLUMN status SET DEFAULT 'active';
