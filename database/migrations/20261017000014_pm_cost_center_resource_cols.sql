-- 2026-10-17 pm 域：字段级对拍补列（cost_center + project_resources 前端契约字段）
-- 背景：字段对拍（/tmp/diff_fields.py pm）发现 pm 前端 Project 类型 30+ 字段（基础+财务混合），
--       PmProjectDetailPage 实调 project.cost_center_id/cost_center_name（:983/:1000 显示 '-'）——
--       后端 Project struct 与 pm.projects 表均无 cost_center 列 = 撒谎面；ProjectResource 前端类型
--       （resource_id/role/actual_hours/actual_cost）与后端 pm.project_resources 表（resource_name/
--       quantity/cost）语义错位，PmResourcePage（CrudPage + resourceSchema :46-117 用 resource_id/
--       role/actual_hours/actual_cost 列/表单）实调 r.resource_id（:99 过滤）= 撒谎面。
-- 方案（后端宽容零回归）：pm.projects 补 cost_center_id/cost_center_name 2 列、pm.project_resources
--       补 resource_id/role/actual_hours/actual_cost 4 列；struct/handler 同步对齐（旧列保留不删兼容）。
-- 幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE pm.projects
    ADD COLUMN IF NOT EXISTS cost_center_id varchar(64),
    ADD COLUMN IF NOT EXISTS cost_center_name varchar(256);

ALTER TABLE pm.project_resources
    ADD COLUMN IF NOT EXISTS resource_id varchar(64),
    ADD COLUMN IF NOT EXISTS role varchar(64),
    ADD COLUMN IF NOT EXISTS actual_hours numeric(12,2),
    ADD COLUMN IF NOT EXISTS actual_cost numeric(14,2);
