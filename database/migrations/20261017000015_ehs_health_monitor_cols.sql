-- ehs healthMonitoringApi 契约对齐：health_records 补 check_type/check_date/result/remarks 4 列
-- 前端 healthMonitoring.ts HealthRecordItem 契约（/health 路径）与后端 health.rs handler 零补列对齐
ALTER TABLE ehs.health_records
    ADD COLUMN IF NOT EXISTS check_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS check_date DATE,
    ADD COLUMN IF NOT EXISTS result VARCHAR(50),
    ADD COLUMN IF NOT EXISTS remarks TEXT;
