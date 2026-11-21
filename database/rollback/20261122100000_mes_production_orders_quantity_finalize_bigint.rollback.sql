-- 回滚 20261122100000_mes_production_orders_quantity_finalize_bigint
-- 恢复到本迁移之前的「混合态」：quantity 保持 bigint（20261107000017 的结果），
-- completed_quantity 回到 numeric(12,2)（20261120090000 的结果）。
-- 幂等：列已非 bigint / 表不存在时按需跳过；账本行不存在也不报错。
-- 注意：回滚 reintroduce 20261120090000 与 20261107000017 的语义冲突；
--       仅用于回退本定稿迁移，不用于修复漂移。

DO $$
BEGIN
  IF to_regclass('mes.production_orders') IS NULL THEN
    RAISE NOTICE '回滚：mes.production_orders 不存在，跳过列回退';
  ELSE
    ALTER TABLE mes.production_orders
      ALTER COLUMN completed_quantity TYPE numeric(12,2) USING completed_quantity::numeric(12,2);
  END IF;
END $$;

DO $$
DECLARE
  v_type text;
BEGIN
  IF to_regclass('mes.production_orders') IS NULL THEN
    RETURN;
  END IF;
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
  FROM pg_attribute a
  WHERE a.attrelid = 'mes.production_orders'::regclass
    AND a.attname = 'completed_quantity'
    AND a.attnum > 0
    AND NOT a.attisdropped;
  IF v_type IS DISTINCT FROM 'numeric(12,2)' THEN
    RAISE EXCEPTION '回滚断言失败：completed_quantity 期望 numeric(12,2)，实际 %', coalesce(v_type, '缺失');
  END IF;
  RAISE NOTICE '回滚完成：completed_quantity 已恢复 numeric(12,2)';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261122100000;
