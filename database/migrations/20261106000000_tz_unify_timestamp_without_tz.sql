-- ============================================================
-- B4：全量归一无时区 timestamp 列 → timestamptz
-- 版本：20261106000000（大于现有最大 20261105235700）
-- date-type-baseline: covered（本迁移已声明覆盖全部存量无时区 timestamp 列，
--   应用后 scripts/date-type-baseline.json 的 remaining 应为 0）
-- ============================================================
-- 旧值语义：UTC
--   证据见交付报告：生产编排 deploy/docker/docker-compose.yml 与
--   deploy/k8s/base/postgres.yaml 均设 TZ=UTC / PGTZ=UTC；应用连接串
--   未带 options，代码写库以 Utc::now() 为主；既有先例
--   20261103170000_db04_unify_remaining_naive_timestamps_5433.sql 采用
--   AT TIME ZONE 'UTC'，并有生产样本「2026-10-08 04:55 UTC（北京 12:55）」
--   的校准记录。因此存量 naive 值一律按 UTC 解释。
--
-- 幂等 / 可重放：
--   每列先判断当前类型，仅处理仍为 timestamp without time zone 的列；
--   空库跑完整迁移链后再跑本迁移为 0 次操作；重复执行不报错。
--
-- 保留语义：
--   * NOT NULL：ALTER COLUMN TYPE 原地保留，无需额外 SET NOT NULL；
--   * 默认值：now() / CURRENT_TIMESTAMP 在类型改回 timestamptz 后自动
--     重新绑定为 timestamptz 的 now()，行为不变（不再做会话时区换算）；
--   * 精度：本仓库实测无 timestamp(n) 列（atttypmod 全为 -1），仍按
--     atttypmod 动态保留，避免将来出现 timestamp(n) 时丢精度；
--   * 长度/字节序无关；无分区表、无生成列、无视图/物化视图列（实测 0）。
--
-- 索引与约束：
--   PostgreSQL 在 ALTER COLUMN TYPE 时重写表并自动重建该列上的索引、
--   主键/唯一约束、CHECK 与外键依赖，无需手工 DROP/CREATE INDEX。
--
-- 锁：逐列 ACCESS EXCLUSIVE；lock_timeout 5s 保证拿不到锁时快速失败，
--     可重试（幂等），不会长时间阻塞业务。
--
-- 视图/物化视图/分区/生成列排除：relkind 仅取 'r','p'（普通表 + 分区表）；
-- 若将来出现视图中被 cast 成无时区 timestamp 的列，需单独迁移（本脚本不处理）。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '0';

DO $$
DECLARE
  r        record;
  v_type   text;
  v_prec   text;
  v_count  int := 0;
BEGIN
  -- 按 schema、表、列顺序遍历（等价于按 schema/表分组）
  FOR r IN
    SELECT n.nspname AS sch,
           c.relname AS tbl,
           a.attname AS col,
           a.atttypmod AS typmod
    FROM pg_attribute a
    JOIN pg_class c     ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND a.atttypid = 'timestamp without time zone'::regtype
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND n.nspname NOT LIKE 'pg_toast%'
    ORDER BY n.nspname, c.relname, a.attnum
  LOOP
    v_prec := CASE WHEN r.typmod >= 0 THEN '(' || r.typmod::text || ')' ELSE '' END;
    v_type := 'timestamptz' || v_prec;
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE %s USING %I AT TIME ZONE ''UTC''',
      r.sch, r.tbl, r.col, v_type, r.col
    );
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'B4 timestamp→timestamptz 归一：处理 % 列', v_count;
END $$;
