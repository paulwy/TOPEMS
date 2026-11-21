-- ============================================================
-- mes.production_orders 数量列语义定稿：quantity / completed_quantity 同为 BIGINT
-- 版本：20261122100000
-- ============================================================
-- 背景（两条已应用迁移互相反转）：
--   * 20261107000017：依 prod 事实把 quantity / completed_quantity 统一为 bigint，
--     并记录 prod 两列本就是 bigint（2026-11-06 实测，22 行全整数）。
--   * 20261120090000：为实现production_records.completed_quantity 的 numeric(12,2)
--     typmod 对齐，沿用了 20260928120000 的「同 4 列」清单；该清单写于 1107 之前，
--     其中仍含 production_orders.completed_quantity，于是把它又改回 numeric(12,2)。
--     ≈范围抄错，不是新的业务意图。
--
-- 定稿依据（2026-11-21）：
--   * 生产只读镜像实测：mes.production_orders.quantity = bigint、completed_quantity = bigint；
--   * 通常规则：同一张表的 quantity 与 completed_quantity 必须同类型同精度；
--   * 生产订单数量是「计划/完成件数」，为整数计数；允许小数的产量记录在
--     mes.production_records.completed_quantity（prod 为 numeric(12,2)，本迁移不触碰）；
--   * 生产事实优先：prod 两列一致，按 prod 统一为 bigint。
--
-- 为什么不改旧迁移：20261107000017 / 20261120090000 已在多环境记账并执行，
--   改写会造成 checksums 与账本语义漂移；这里用新迁移把终态拉回定稿语义。
--
-- 安全与幂等：
--   * 先断言无小数行，有则 RAISE EXCEPTION（不静默 ROUND 丢精度）；
--   * 已是 bigint 的列跳过；重复执行 = 0 列操作；
--   * 仅改类型，保留 NOT NULL / DEFAULT；
--   * 终态断言两列必须都是 bigint。
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
    RAISE NOTICE 'P10B：mes.production_orders 不存在，跳过';
    RETURN;
  END IF;

  SELECT count(*) INTO v_frac
  FROM mes.production_orders
  WHERE (quantity IS NOT NULL AND quantity::numeric <> trunc(quantity::numeric))
     OR (completed_quantity IS NOT NULL AND completed_quantity::numeric <> trunc(completed_quantity::numeric));
  IF v_frac > 0 THEN
    RAISE EXCEPTION 'P10B：mes.production_orders 有 % 行数量含小数，拒绝转 bigint（与定稿语义冲突，需人工确认）', v_frac;
  END IF;

  FOREACH v_col IN ARRAY ARRAY['quantity', 'completed_quantity'] LOOP
    SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_attribute a
    WHERE a.attrelid = v_tbl
      AND a.attname = v_col
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF v_type IS NULL THEN
      RAISE NOTICE 'P10B：mes.production_orders.% 列不存在，跳过', v_col;
    ELSIF v_type <> 'bigint' THEN
      v_old := v_type;
      EXECUTE format(
        'ALTER TABLE mes.production_orders ALTER COLUMN %I TYPE bigint USING ROUND(%I::numeric)::bigint',
        v_col, v_col
      );
      v_n := v_n + 1;
      RAISE NOTICE 'P10B：mes.production_orders.% % → bigint（定稿）', v_col, v_old;
    ELSE
      RAISE NOTICE 'P10B：mes.production_orders.% 已是 bigint，跳过', v_col;
    END IF;
  END LOOP;

  RAISE NOTICE 'P10B：mes.production_orders 数量列定稿完成，转换 % 列', v_n;
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
    RAISE EXCEPTION 'P10B：mes.production_orders 仍有 % 列不是 bigint', v_bad;
  END IF;
END $$;
