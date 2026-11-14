-- ============================================================
-- master_data.mdm_subscriptions.starts_at：text → timestamptz（fail-closed）
--
-- 背景：
--   20261014000060_k1_mdm_core_tables.sql 将 starts_at 定义为 TEXT NOT NULL DEFAULT ''；
--   20261027130000_fix_ehs_columns_and_mdm_v55_types.sql 只把 expires_at 收敛为
--   timestamptz，starts_at 仍留在 text。Rust 侧 SubscriptionRow.starts_at 以
--   DateTime<Utc> 解码，读回依赖 starts_at::timestamptz，类型不统一风险持续存在。
--
-- 口径：
--   1. 不做任何静默修复：NULL / 空串（btrim 后为空）/ 非法 timestamptz 格式
--      任一存在 → RAISE EXCEPTION 并报出计数，整事务中止；
--      不用 NULLIF 转 NULL、不回填固定值、不 DROP NOT NULL。
--   2. 存量全部合法时才 ALTER ... TYPE timestamptz USING btrim(starts_at)::timestamptz；
--      原默认值 ''::text 在切换时一并 DROP，不设新默认值——省略 starts_at 的写入
--      会因 NOT NULL 显式报错，而不是静默落成空串。
--   3. 幂等：列已是 timestamptz 时 NOTICE 跳过；列为 text/varchar 之外的类型直接拒绝。
--   4. 会话时区固定 Asia/Shanghai，保证无偏移量的历史字符串解析结果可复现。
--   5. 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
--
-- 窗口前置：先跑 database/scripts/mdm_starts_at_window_stats.sql（只读）确认存量分布。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';
SET TimeZone = 'Asia/Shanghai';

DO $mdm_starts_at_tz$
DECLARE
    v_type    text;
    v_total   bigint;
    v_null    bigint;
    v_empty   bigint;
    v_invalid bigint;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'master_data'
       AND c.table_name   = 'mdm_subscriptions'
       AND c.column_name  = 'starts_at';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'master_data.mdm_subscriptions.starts_at 不存在，迁移中止';
    END IF;

    IF v_type = 'timestamp with time zone' THEN
        RAISE NOTICE 'master_data.mdm_subscriptions.starts_at 已是 timestamptz，跳过';
        RETURN;
    END IF;

    IF v_type NOT IN ('text', 'character varying') THEN
        RAISE EXCEPTION 'master_data.mdm_subscriptions.starts_at 当前类型=%（预期 text/varchar），拒绝自动转换', v_type;
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE starts_at IS NULL),
           count(*) FILTER (WHERE starts_at IS NOT NULL AND btrim(starts_at) = ''),
           count(*) FILTER (WHERE starts_at IS NOT NULL AND btrim(starts_at) <> ''
                              AND pg_input_is_valid(btrim(starts_at), 'timestamptz') IS NOT TRUE)
      INTO v_total, v_null, v_empty, v_invalid
      FROM master_data.mdm_subscriptions;

    IF v_null > 0 THEN
        RAISE EXCEPTION 'starts_at 存在 NULL % 行（总 % 行），整事务中止；不擅自 DROP NOT NULL，需人工确认后另行处理',
            v_null, v_total;
    END IF;

    IF v_empty > 0 THEN
        RAISE EXCEPTION 'starts_at 存在空串（btrim 后为空）% 行（总 % 行），整事务中止；不静默转 NULL、不回填固定值、不改 NOT NULL',
            v_empty, v_total;
    END IF;

    IF v_invalid > 0 THEN
        RAISE EXCEPTION 'starts_at 存在非法 timestamptz 格式 % 行（总 % 行），整事务中止；请先人工核对数据来源与格式',
            v_invalid, v_total;
    END IF;

    ALTER TABLE master_data.mdm_subscriptions
        ALTER COLUMN starts_at DROP DEFAULT,
        ALTER COLUMN starts_at TYPE timestamptz USING btrim(starts_at)::timestamptz;

    RAISE NOTICE 'master_data.mdm_subscriptions.starts_at: text -> timestamptz 完成（% 行）；DEFAULT 已移除', v_total;
END
$mdm_starts_at_tz$;
