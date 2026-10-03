-- ============================================================
-- U3b 步骤2：qa_lab_* 空骨架表清理（方案 B 迁移收敛）
-- ============================================================
-- 背景（TODO.md U3b，归属用户已拍板选 B）：
--   * public.qa_lab_samples / public.qa_lab_tasks 为唯一事实标准表
--     （20260921000100_lims_samples_cleanup.sql:22 补建 public.qa_lab_samples
--       14 列标准结构；lims 业务代码 55 处显式 public.qa_lab_* 引用；
--       U3b 步骤1 已将 lims 18 处无前缀引用改为显式 public.qa_lab_*）。
--   * 以下四张均为零业务消费方的空骨架表（实测 5432 全部 0 行）：
--       - qms.qa_lab_samples / qms.qa_lab_tasks
--         （20260725000000_business_base_tables.sql:3398-3399 裸 2 列骨架；
--           20260908000009_missing_tables.sql:190-224 曾防御式重建为窄骨架，
--           但无任何业务读写方）
--       - lims.qa_lab_samples / lims.qa_lab_tasks
--         （20260725000000_business_base_tables.sql:1274-1306 全列骨架；
--           20260903000001_rehome_5433_remaining_public.sql:691 rehome 副本）
--   * RLS force 清单（20260908000018_rls_force.sql:206,296）中的
--     'lims.qa_lab_samples'/'lims.qa_lab_tasks'/'qms.qa_lab_samples'/
--     'qms.qa_lab_tasks' 条目随对应表 DROP 自动失效（DROP TABLE 连带删除
--     policy 与 force 设置），无需也不得修改该已应用迁移文件。
--   * 本迁移幂等：四张表均 IF EXISTS，可安全重放多次。
--   * 约束：不得修改任何已应用迁移文件（防 sqlx checksum 破坏）。
-- ============================================================

DROP TABLE IF EXISTS qms.qa_lab_samples;
DROP TABLE IF EXISTS qms.qa_lab_tasks;
DROP TABLE IF EXISTS lims.qa_lab_samples;
DROP TABLE IF EXISTS lims.qa_lab_tasks;
