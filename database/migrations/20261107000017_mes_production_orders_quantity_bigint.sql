-- ============================================================
-- P10：mes.production_orders 数量列对齐 prod 的 BIGINT
-- 版本：20261107000017
-- ============================================================
-- 事实（2026-11-06 实测）：
--   prod  : quantity = bigint, completed_quantity = bigint（22 行，全部整数，max=0）
--   本地  : quantity = integer, completed_quantity = numeric(12,2)（127 行，全部整数）
--   test  : quantity = integer, completed_quantity = numeric(12,2)（0 行）
-- 原因：本地/test 的 _sqlx_migrations 账本声称已执行
--   20261029200000（numeric → integer）与 20261104040000，但 DDL 实际未落地；
--   20261105140000 只处理 integer/smallint，遇到 numeric 直接跳过，于是本地/test
--   停在 numeric(12,2)。生产看板与集成测试按 i64 读取该列 → ColumnDecode 失败。
--
-- 语义依据：
--   * 生产订单数量是“计划/完成件数”，为整数计数；prod 基线已是 bigint；
--   * 允许小数的数量在 mes.production_records.completed_quantity（prod 为
--     numeric(12,2)，20261105160000 明确改回 numeric），本迁移不触碰；
--   * 数据分布：三处环境小数行均为 0（prod 22 行、本地 127 行、test 0 行）。
--
-- 安全与幂等：
--   * 先断言无小数行，有则 RAISE EXCEPTION（不做静默 ROUND 丢精度）；
--   * 已是 bigint 的列跳过；重复执行 = 0 列操作；
--   * 仅改类型，保留 NOT NULL / DEFAULT。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

DO $$
DECLARE
  v_frac bigint;
  v_type text;
  v_old  text;
  v_n    int := 0;
  v_col  text;
  v_tbl  regclass;
BEGIN
  v_tbl := to_regclass('mes.production_orders');
  IF v_tbl IS NULL THEN
    RAISE NOTICE 'P10：mes.production_orders 不存在，跳过';
    RETURN;
  END IF;

  SELECT count(*) INTO v_frac
  FROM mes.production_orders
  WHERE (quantity IS NOT NULL AND quantity::numeric <> trunc(quantity::numeric))
     OR (completed_quantity IS NOT NULL AND completed_quantity::numeric <> trunc(completed_quantity::numeric));
  IF v_frac > 0 THEN
    RAISE EXCEPTION 'P10：mes.production_orders 有 % 行数量含小数，拒绝转 bigint（需人工确认语义）', v_frac;
  END IF;

  FOREACH v_col IN ARRAY ARRAY['quantity', 'completed_quantity'] LOOP
    SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_attribute a
    WHERE a.attrelid = v_tbl
      AND a.attname = v_col
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF v_type IS NULL THEN
      RAISE NOTICE 'P10：mes.production_orders.% 列不存在，跳过', v_col;
    ELSIF v_type <> 'bigint' THEN
      v_old := v_type;
      EXECUTE format(
        'ALTER TABLE mes.production_orders ALTER COLUMN %I TYPE bigint USING ROUND(%I::numeric)::bigint',
        v_col, v_col
      );
      v_n := v_n + 1;
      RAISE NOTICE 'P10：mes.production_orders.% % → bigint', v_col, v_old;
    ELSE
      RAISE NOTICE 'P10：mes.production_orders.% 已是 bigint，跳过', v_col;
    END IF;
  END LOOP;

  RAISE NOTICE 'P10：mes.production_orders 数量列对齐完成，转换 % 列', v_n;
END $$;

-- 终态断言：两列必须都是 bigint
DO $$
DECLARE
  v_bad int;
  v_tbl regclass;
BEGIN
  v_tbl := to_regclass('mes.production_orders');
  IF v_tbl IS NULL THEN
    RETURN;
  END IF;
  SELECT count(*) INTO v_bad
  FROM pg_attribute
  WHERE attrelid = v_tbl
    AND attname IN ('quantity', 'completed_quantity')
    AND attnum > 0
    AND NOT attisdropped
    AND atttypid <> 'int8'::regtype;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'P10：mes.production_orders 仍有 % 列不是 bigint', v_bad;
  END IF;
END $$;
