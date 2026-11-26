-- B339 Finance 会计期间唯一索引 partial 化（2026-11-26）
--
-- 背景：
--   finance.core_finance_periods 的 unique_period(tenant_id, year, month) 为非 partial 唯一索引。
--   B328 给期间开启/关闭补齐了软删谓词，但索引本身仍把 deleted_at IS NOT NULL 的行计入唯一性：
--   - 期间软删后，同租户同 year/month 的新期间无法 INSERT（open_period_handler 在
--     "current = None" 分支直接插入，会命中 unique_period 冲突，前端看到 500）；
--   - 只有重建整个期间行（物理删除软删行）才能绕开，违背软删审计。
--
-- 处置：
--   注意：原 unique_period 是 UNIQUE 约束承载的索引（非普通独立索引），
--   必须 DROP CONSTRAINT 后才能降级为 partial 唯一索引；约束不能带 WHERE 谓词。
--
--   把唯一性收敛到"仅有效行"（WHERE deleted_at IS NULL）。软删行保留可审计历史，
--   同时允许同租户同 year/month 重新开启；有效行之间仍然严格唯一。
--
-- 影响面：
--   仅唯一索引谓词变化，无列/类型/数据变更；本地 1489 行全为 open 且无软删行，重建索引不产生冲突。
--   索引名、列顺序不变，仅新增过滤谓词。

ALTER TABLE finance.core_finance_periods
    DROP CONSTRAINT IF EXISTS unique_period;

CREATE UNIQUE INDEX IF NOT EXISTS unique_period
    ON finance.core_finance_periods (tenant_id, year, month)
    WHERE deleted_at IS NULL;
