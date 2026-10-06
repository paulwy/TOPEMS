-- ============================================================================
-- F-54 连带发现：V252（20260821000001）"DROP ALL ck_*_status_standard" 实际未生效
--
-- 根因：该迁移以 DO 块遍历 pg_constraint 执行 DROP，所有 ALTER 均被
-- EXCEPTION WHEN OTHERS 捕获（执行连接无 ALTER 权限），DO 块正常结束
-- → sqlx 标记 success=t，但 400+ 约束（全 schema）实际残留至今。
--
-- 影响：业务状态值（pending/processing/completed/draft 等）写入即被
-- CHECK(status IN ('active','inactive','archived')) 拒绝 → 运行时 500
-- （方向③ 已实测 rd.builds/deploys 同类问题）。
--
-- 修复：以表 owner 连接补执行 V252 的既定决策——DROP 全部残留约束。
-- 约束数量以迁移执行前的 pg_constraint 实际扫描为准，不预设数字。
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    dropped_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE conname LIKE 'ck_%_status_standard'
          AND contype = 'c'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                r.table_name, r.conname);
            dropped_count := dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            skipped_count := skipped_count + 1;
            RAISE NOTICE 'Skipped % on %: %', r.conname, r.table_name, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'F-54 residual cleanup: dropped % status CHECK constraints, skipped %',
        dropped_count, skipped_count;
END $$;
