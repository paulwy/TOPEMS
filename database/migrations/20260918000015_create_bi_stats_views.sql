-- 遗留 C 收尾：bi 统计视图恢复（2026-09-18）
-- 依据：svc/bi/migrations/001_init.sql（git 8eedba1eb，2024-01 历史 DDL）389-421 行
-- 三视图：active_datasource_stats / report_stats / visualization_stats
-- 处置决策（用户拍板 D1 轻量重建）：
--   - 新建正式迁移，按历史 DDL 幂等重建（CREATE OR REPLACE VIEW）
--   - 每个视图前做依赖检查：依赖表存在且含所需列才创建
--     · 5432（活跃库）：bi.data_sources/reports/visualizations 完整（13/17/16 列）→ 三视图建成
--     · 5433（空库重建验证场）：bi 仅 4 张骨架表 → 依赖检查跳过，全链保持通过
--   - 不连带重建 data_sources/visualizations 等依赖表（代码不消费，避免扩大范围）

-- ============================================================
-- 1) active_datasource_stats：活跃数据源统计
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='bi' AND table_name='data_sources')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='data_sources' AND column_name='datasource_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='data_sources' AND column_name='status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='data_sources' AND column_name='is_active') THEN
    EXECUTE $v$CREATE OR REPLACE VIEW bi.active_datasource_stats AS
    SELECT
        datasource_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_count,
        COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnected_count,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
    FROM bi.data_sources
    WHERE is_active = true
    GROUP BY datasource_type$v$;
  END IF;
END $$;

-- ============================================================
-- 2) report_stats：报表统计
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='bi' AND table_name='reports')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='reports' AND column_name='report_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='reports' AND column_name='status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='reports' AND column_name='last_generated_at')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='reports' AND column_name='is_active') THEN
    EXECUTE $v$CREATE OR REPLACE VIEW bi.report_stats AS
    SELECT
        report_type,
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN last_generated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as recently_generated
    FROM bi.reports
    WHERE is_active = true
    GROUP BY report_type, status$v$;
  END IF;
END $$;

-- ============================================================
-- 3) visualization_stats：可视化图表统计
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='bi' AND table_name='visualizations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='visualizations' AND column_name='visualization_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='visualizations' AND column_name='is_public')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='visualizations' AND column_name='is_active') THEN
    EXECUTE $v$CREATE OR REPLACE VIEW bi.visualization_stats AS
    SELECT
        visualization_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_count,
        COUNT(CASE WHEN is_public = false THEN 1 END) as private_count
    FROM bi.visualizations
    WHERE is_active = true
    GROUP BY visualization_type$v$;
  END IF;
END $$;
