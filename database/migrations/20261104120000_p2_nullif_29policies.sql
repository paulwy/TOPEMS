-- ============================================================
-- P2: master_data 29 条 RLS 策略 NULLIF 统一
--
-- 依据：prod 只读导出 2026-11-04（topems_prod pg_policies）。原文逐条存档于
--   /tmp/p2_policies.psv（执行前请转存至受控位置，作为回滚依据）。
--   判定口径：qual LIKE '%::text = current_setting%' AND qual NOT LIKE '%NULLIF%'，
--   实测命中 29 条，全部在 master_data，策略名均为 tenant_isolation_policy。
--
-- 写法：按 20261102210000_fix_tenant_policy_nullif.sql 的成对 USING / WITH CHECK 重建，
--   仅把比较右侧 current_setting(...) 包成 NULLIF(current_setting(...), '')，
--   其余 OR 分支（IS NULL / = '' / 全零 UUID / tenant NULL）原样保留。
--   每种原表达式只有 3 种形态（见下），已逐条显式展开，未使用字符串替换函数。
--
-- 形态（原始 → 目标）：
--   形态A/ B: ... OR ((tenant_id)::text = current_setting(...)) 
--             → ... OR ((tenant_id)::text = NULLIF(current_setting(...), ''))
--   形态C  : ... OR ((tenant_uid)::text = current_setting(...))
--             → ... OR ((tenant_uid)::text = NULLIF(current_setting(...), ''))
--
-- 幂等：每条先判策略存在（schema+table+policy），再 ALTER POLICY 重设同一表达式；
--   重复执行不新增策略，策略条数不变。
-- 回滚：用存档 TSV 中的原始 qual/with_check 重新 ALTER POLICY（不改角色、不改策略数量）。
-- 严禁在 prod 直接执行：本文件仅随发布窗口由 sqlx 执行。
-- ============================================================

SET lock_timeout = '5s';

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_api_exposures' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_api_exposures
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_bc_tests' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_bc_tests
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_continuity_plans' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_continuity_plans
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_critical_functions' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_critical_functions
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_data_contracts' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_data_contracts
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_data_products' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_data_products
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_dimension_scores' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_dimension_scores
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_failover_records' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_failover_records
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_graph_communities' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_graph_communities
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_graph_edges' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_graph_edges
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_graph_nodes' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_graph_nodes
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_improvement_plans' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_improvement_plans
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_maturity_assessments' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_maturity_assessments
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_maturity_history' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_maturity_history
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_recovery_plans' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_recovery_plans
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_recovery_points' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_recovery_points
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_region_configs' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_region_configs
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_replication_configs' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_replication_configs
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_search_history' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_search_history
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_semantic_search_indexes' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_semantic_search_indexes
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_tag_rules' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_tag_rules
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_tagged_entities' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_tagged_entities
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_tags' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_tags
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_v60_lineage_edges' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_edges
      USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_v60_lineage_graphs' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_graphs
      USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_v60_lineage_nodes' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_v60_lineage_nodes
      USING (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_workflow_history' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_workflow_history
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_workflow_templates' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_workflow_templates
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;

-- 原始 qual（回滚依据）: ((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = current_setting('app.tenant_id'::text, true)))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data' AND tablename = 'mdm_workflows' AND policyname = 'tenant_isolation_policy'
  ) THEN
    ALTER POLICY tenant_isolation_policy ON master_data.mdm_workflows
      USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))))
      WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
  END IF;
END $$;
