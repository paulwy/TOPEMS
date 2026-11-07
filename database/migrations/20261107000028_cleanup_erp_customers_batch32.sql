-- [batch32] cleanup_erp_customers_test_rows
--
-- 背景：
--   批 31 审计判定 erp.customers 为活跃业务表（存在被 erp.sales_orders 外键引用的
--   真实客户行），不可 drop；批 32 仅清理其中残留的 5 行 B1 测试数据。
--
-- 清理范围（仅以下 5 个已知 id，均已软删 deleted_at IS NOT NULL，且无 sales_orders 引用）：
--   b6a1bb76-63f0-423e-b7d2-adb30bd54513  B1证据客户甲-V2
--   8d173214-19de-4019-87e3-58a247c78981  B1固化验证客户
--   2cc779fb-ba37-4218-9475-948f0807903b  B1固化终验客户
--   91c865d2-91ff-4936-a201-e21ea245bb29  B1终验3
--   2fee2f35-cab0-4500-ba10-347594ca0a44  B1终验4
--
-- 保留行（不删，因为被 erp.sales_orders 外键引用，破坏外键会导致悬挂引用）：
--   c38c26b4-d37c-4a3f-9b45-a4df6ae61b78  MCP端到端客户
--   被 erp.sales_orders 单据 SO-TEST-0001（状态 confirmed）引用。
--
-- 幂等保证：
--   二次执行时 5 行已不存在，DELETE 影响行数为 0，不报错，事务正常提交。
--
-- 回滚（ROLLBACK）SQL：
--   清行前已全量备份至：
--     database/backup/batch32_erp_customers_pre_cleanup_20261107_071934.csv
--   恢复命令（在 psql 中执行，连接到 topems 库）：
--     \copy erp.customers FROM 'database/backup/batch32_erp_customers_pre_cleanup_20261107_071934.csv' WITH CSV HEADER
--   注意：MCP端到端客户（c38c26b4-...）本次未删除，回滚时该 id 已在表中存在，
--         \copy 会触发主键冲突；如需完整回滚，请先 DELETE FROM erp.customers
--         WHERE id IN ('b6a1bb76-...','8d173214-...','2cc779fb-...','91c865d2-...','2fee2f35-...')
--         再执行 \copy，或直接从备份 CSV 中剔除 MCP 行后单独导入 5 行。
--   本迁移不修改表结构、RLS、索引，也不触碰 erp.sales_orders。

BEGIN;

DELETE FROM erp.customers c
WHERE c.id IN (
    'b6a1bb76-63f0-423e-b7d2-adb30bd54513',
    '8d173214-19de-4019-87e3-58a247c78981',
    '2cc779fb-ba37-4218-9475-948f0807903b',
    '91c865d2-91ff-4936-a201-e21ea245bb29',
    '2fee2f35-cab0-4500-ba10-347594ca0a44'
)
  AND c.deleted_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM erp.sales_orders so WHERE so.customer_id = c.id
  );

COMMIT;
