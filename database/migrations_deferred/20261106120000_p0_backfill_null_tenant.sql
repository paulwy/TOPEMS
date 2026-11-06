-- ⚠️ 未应用至 prod，需在 pool 租户上下文收敛完成后执行。
-- 当前状态：仅在演练库 `topems_p0_rehearsal` 验证通过（DELETE 8 + 回填 47 行）。
-- 存放位置：`database/migrations_deferred/`，不在 `database/migrations/`，避免 migrate 时被自动应用。
--
-- P0 前置数据清理：全库 tenant_id / tenant_uid 为 NULL 的行统一回填默认租户 0001。
-- 依据：P0 决策 3（不设 core_tenants 特例，实际 55 行：8 行删除 + 47 行回填）。
-- 必须在 fail-closed 策略迁移（20261106120100）之前执行：
--   迁移以应用角色运行，收紧后未设 GUC 的连接对租户表将不可见，届时无法再扫描到这些行。
-- 幂等：再次执行时 WHERE tenant_id IS NULL 命中 0 行。
--
-- 特例：finance.core_finance_currencies 的 8 条 NULL 行与 0001 行完全重复
-- （同 code/name/symbol/rate，唯一键 uk_core_finance_currencies_tenant_code 冲突），
-- 无法回填，直接删除 NULL 副本；删除前已确认 0001 侧存在同 code 同值行。

DELETE FROM finance.core_finance_currencies c
WHERE c.tenant_id IS NULL
  AND EXISTS (
      SELECT 1 FROM finance.core_finance_currencies d
      WHERE d.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND d.code = c.code
  );

DO $$
DECLARE
    r record;
    v_rows bigint;
    v_total bigint := 0;
BEGIN
    FOR r IN
        SELECT n.nspname AS sch, c.relname AS tbl, a.attname AS col
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND a.attname IN ('tenant_id', 'tenant_uid')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY 1, 2
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = %L::uuid WHERE %I IS NULL',
            r.sch, r.tbl, r.col, '00000000-0000-0000-0000-000000000001', r.col
        );
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows > 0 THEN
            RAISE NOTICE 'P0 backfill %.%: % row(s)', r.sch, r.tbl, v_rows;
            v_total := v_total + v_rows;
        END IF;
    END LOOP;
    RAISE NOTICE 'P0 backfill total: % row(s)', v_total;
END $$;
