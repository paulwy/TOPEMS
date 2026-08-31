-- 2026-09-01 portal 死表清理：4 张全 svc+lib+apps 无任何代码提及（连建表 DDL 都没有）+ 0 行
-- 与其余 108 张"建表无查询"设计预留表区分（后者 DROP 会被服务启动重建，保留）
DROP TABLE IF EXISTS portal.portal_access_logs CASCADE;
DROP TABLE IF EXISTS portal.portal_configs CASCADE;
DROP TABLE IF EXISTS portal.portal_layouts CASCADE;
DROP TABLE IF EXISTS portal.portal_menus CASCADE;
