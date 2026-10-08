-- =============================================================
-- sqlx 台账收敛校验（只读幂等）
--
-- 背景（2026-10-08，A5 批 + 非一致性方向三件套）：
--   5432 历史上曾存在三本并行 _sqlx_migrations 台账：
--     public._sqlx_migrations  权威（磁盘迁移链的唯一账本）
--     mes._sqlx_migrations     陈旧碎片 292 条（10-07 对账前旧 search_path 漂移产物）
--     iam._sqlx_migrations     陈旧碎片 49 条（同上）
--   碎片已由并行线先行 DROP（无废弃备份表残留）；本脚本固化收敛后状态，
--   供后续回归：sqlx 以 public 为唯一台账，不再被 mes/iam 首位版本集误导。
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/verify-sqlx-ledger-convergence.sql
--
-- 校验项：
--   [1] 全库仅 public._sqlx_migrations 一本台账（任何 schema 下同名表=残留）
--   [2] public 台账计数 / success / checksum 完整性
--   [3] 与磁盘迁移链（331 个 .sql）的版本集核对（在 psql 外由 diff 完成）
-- =============================================================

\echo '=== [1] 全库 _sqlx_migrations 台账表枚举（期望仅 public 1 行） ==='

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = '_sqlx_migrations'
ORDER BY table_schema;

\echo ''
\echo '=== [2] public 权威台账完整性 ==='

SELECT
    count(*)                                                  AS total_rows,
    count(*) FILTER (WHERE success = TRUE)                   AS success_true,
    count(*) FILTER (WHERE success = FALSE)                   AS success_false,
    count(*) FILTER (WHERE checksum IS NULL OR checksum = '') AS checksum_null,
    max(installed_on)                                        AS latest_install
FROM public._sqlx_migrations;

\echo ''
\echo '=== [3] 提示：磁盘版本集对照（在 shell 执行） ==='
\echo '  ls database/migrations/*.sql | sed "s#.*/##" | grep -oE "^[0-9]+" | sed "s/^0*\\([0-9]\\)/\\1/" | sort -n > /tmp/disk.txt'
\echo '  psql "$DATABASE_URL" -tAc "SELECT version FROM public._sqlx_migrations ORDER BY version" > /tmp/ledger.txt'
\echo '  diff /tmp/disk.txt /tmp/ledger.txt   # 无输出 = 收敛'
