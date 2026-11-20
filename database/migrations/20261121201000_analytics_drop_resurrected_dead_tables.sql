-- 20261121201000: 清理 analytics 启动期复活的死表（W2-D2 配套）
--
-- 背景：bi.audit_logs 在 table-disposition-2026-11-19 清单 3 中为删除候选，
--   仅因 svc/analytics 的 schema-defense 启动即 CREATE TABLE IF NOT EXISTS
--   而被移出 20261119110000_drop_dead_tables_batch2（见 migration-exemptions.json
--   B20261119-batch2-bi-audit-logs-keep）。该表 live 行数 0、全仓无任何读写
--   （代码只读写 public.audit_logs）。启动期 DDL 移除后已无复活源，本迁移
--   幂等收尾：仅在确认行数为 0 时 DROP；非空即中止整条迁移。
--
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理清单 3 已判死、仅因启动期 DDL 复活而豁免的 0 行死表
-- destructive-owner: analytics
-- destructive-ticket: W2-D2-ANALYTICS-20261121
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: 删除前核验 0 行、无数据可备份；表结构由 database/rollback/20261121201000_analytics_drop_resurrected_dead_tables.rollback.sql 重建
DO $cleanup$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('bi.audit_logs') IS NULL THEN
        RAISE NOTICE 'bi.audit_logs 不存在，跳过';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM bi.audit_logs' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION 'bi.audit_logs 仍有 % 行数据，拒绝自动 DROP；请人工复核后处理', n;
    END IF;

    EXECUTE 'DROP TABLE bi.audit_logs';
    RAISE NOTICE '已删除复活的死表 bi.audit_logs';
END $cleanup$;
