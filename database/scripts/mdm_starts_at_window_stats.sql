-- ============================================================
-- 只读、窗口内跑：master_data.mdm_subscriptions.starts_at 存量分布统计
--
-- 用途：执行 20261114130000_mdm_subscriptions_starts_at_timestamptz.sql 之前，
--       在窗口内先取一次分布，按判据表决定是否继续（见
--       docs/quality/mdm-starts-at-timestamptz-window-2026-11-14.md）。
--
-- 安全：本文件只有 SELECT；default_transaction_read_only=on 双保险，
--       不写库、不建表、不加排他锁。
--
-- 用法（对目标库，只读连接）：
--   psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f database/scripts/mdm_starts_at_window_stats.sql
--
-- 说明：starts_at::text 使脚本在迁移前（text）与迁移后（timestamptz）都能跑；
--       迁移前等价于 btrim(starts_at)。
-- ============================================================

\set ON_ERROR_STOP on
SET default_transaction_read_only = on;
SET statement_timeout = '60s';

-- 0) 库身份 + 列类型（报告首行取证用）
SELECT current_database() AS db,
       current_user       AS usr,
       inet_server_addr() AS host,
       current_setting('server_version') AS pg_version,
       (SELECT c.data_type
          FROM information_schema.columns c
         WHERE c.table_schema = 'master_data'
           AND c.table_name   = 'mdm_subscriptions'
           AND c.column_name  = 'starts_at') AS starts_at_type;

-- 1) 分布计数：total / null / empty / invalid / valid
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE starts_at IS NULL) AS null_rows,
       count(*) FILTER (WHERE starts_at IS NOT NULL AND btrim(starts_at::text) = '') AS empty_rows,
       count(*) FILTER (WHERE starts_at IS NOT NULL AND btrim(starts_at::text) <> ''
                          AND pg_input_is_valid(btrim(starts_at::text), 'timestamptz') IS NOT TRUE) AS invalid_rows,
       count(*) FILTER (WHERE starts_at IS NOT NULL AND btrim(starts_at::text) <> ''
                          AND pg_input_is_valid(btrim(starts_at::text), 'timestamptz')) AS valid_rows
  FROM master_data.mdm_subscriptions;

-- 2) 异常明细样例（最多 20 行）：定位来源，不做任何修正
SELECT id, api_product_id, tenant_id::text, starts_at::text
  FROM master_data.mdm_subscriptions
 WHERE starts_at IS NULL
    OR btrim(starts_at::text) = ''
    OR pg_input_is_valid(btrim(starts_at::text), 'timestamptz') IS NOT TRUE
 ORDER BY id
 LIMIT 20;
