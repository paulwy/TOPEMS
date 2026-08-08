-- S1.3: BI 数据集白名单表 — 用于纵深防御 SQL 注入
-- 记录允许被 BI 查询模块访问的 (table_name, column_name) 对，配合 dataset_whitelist.rs
-- 模式：off | warn | strict — 见 BI_WHITELIST_ENFORCE 环境变量说明

BEGIN;

CREATE TABLE IF NOT EXISTS bi_datasets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  VARCHAR(128) NOT NULL,
    column_name VARCHAR(128) NOT NULL,
    data_type   VARCHAR(32)  NOT NULL DEFAULT 'string',   -- string | number | datetime | boolean | json
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    description VARCHAR(256),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(table_name, column_name)
);

CREATE INDEX IF NOT EXISTS idx_bi_datasets_table_active
    ON bi_datasets(table_name, is_active);

COMMENT ON TABLE  bi_datasets                 IS 'BI 数据集白名单：BI 模块允许查询的表和列';
COMMENT ON COLUMN bi_datasets.table_name      IS '允许查询的表名（精确匹配）';
COMMENT ON COLUMN bi_datasets.column_name     IS '允许查询的列名（精确匹配，区分大小写）';
COMMENT ON COLUMN bi_datasets.data_type       IS '列数据类型，预留用于未来类型校验';
COMMENT ON COLUMN bi_datasets.is_active       IS '是否启用；FALSE 时该列不允许查询';

-- 预置：对 BI 模块内部常查询的 analytics_data 启用"动态发现"策略。
-- 服务启动时若 BI_WHITELIST_AUTO_REGISTER=true 则自动从 information_schema.columns
-- 同步实际列信息到本表；若为 false 则需管理员预先通过管理 API 或 SQL 脚本手动录入。

COMMIT;
