-- 回滚：B352 仅收紧列约束，不写业务数据；恢复可空即可。
-- 注意：回滚前应确认没有依赖“非空”假设的写入逻辑仍在跑。
ALTER TABLE mes.workshops ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE mes.production_lines ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE mes.shifts ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE mes.work_calendars ALTER COLUMN tenant_id DROP NOT NULL;
