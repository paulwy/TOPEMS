-- P3 第二批：补齐报表行映射表对应用账号的授权
--
-- 20261109110100_p3_report_line_map.sql 建表时只建了 RLS 策略，未补 GRANT，
-- 导致报表生成路径以 topems_app 身份查询时报
--   permission denied for table core_finance_report_line_map
-- 这里按同 schema 既有表惯例补齐 DML 授权（幂等）。
--
-- ROLLBACK（人工评估后执行）：
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON finance.core_finance_report_line_map FROM topems_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON finance.core_finance_report_line_map TO topems_app;
