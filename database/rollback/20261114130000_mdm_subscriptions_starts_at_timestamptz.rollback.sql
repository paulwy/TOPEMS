-- ============================================================
-- 回滚：20261114130000_mdm_subscriptions_starts_at_timestamptz.sql
--
-- 口径：
--   1. 仅当列类型为 timestamptz 时改回 text；已是 text 为 no-op；其它类型 RAISE EXCEPTION。
--   2. 文本化固定会话时区 Asia/Shanghai，输出带偏移量（如 2026-01-01T00:00:00+08），
--      可被 ::timestamptz 无损解析；不依赖调用方默认时区。
--   3. 恢复迁移前的 DEFAULT ''::text（原表定义如此）。回滚后省略 starts_at 的写入会
--      重新静默落成空串——仅用于撤销本次变更，不是长期可接受的形态。
--   4. 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';
SET TimeZone = 'Asia/Shanghai';

DO $mdm_starts_at_tz_rb$
DECLARE
    v_type text;
BEGIN
    SELECT c.data_type INTO v_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'master_data'
       AND c.table_name   = 'mdm_subscriptions'
       AND c.column_name  = 'starts_at';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'master_data.mdm_subscriptions.starts_at 不存在，回滚中止';
    END IF;

    IF v_type = 'text' THEN
        RAISE NOTICE 'master_data.mdm_subscriptions.starts_at 已是 text，跳过';
        RETURN;
    END IF;

    IF v_type <> 'timestamp with time zone' THEN
        RAISE EXCEPTION 'master_data.mdm_subscriptions.starts_at 当前类型=%（预期 timestamptz），拒绝自动回滚', v_type;
    END IF;

    ALTER TABLE master_data.mdm_subscriptions
        ALTER COLUMN starts_at TYPE text USING to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
        ALTER COLUMN starts_at SET DEFAULT ''::text;

    RAISE NOTICE 'master_data.mdm_subscriptions.starts_at: timestamptz -> text 完成；DEFAULT 恢复 ''::text';
END
$mdm_starts_at_tz_rb$;
