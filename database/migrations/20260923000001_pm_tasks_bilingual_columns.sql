-- pm.pm_tasks 双语文案列补齐（代码引用 title_en/description_en，表结构缺失导致 INSERT 报错）
-- 本地已手工 ALTER，此迁移保证新环境一致性（幂等）
ALTER TABLE pm.pm_tasks
    ADD COLUMN IF NOT EXISTS title_en varchar(200),
    ADD COLUMN IF NOT EXISTS description_en text;
