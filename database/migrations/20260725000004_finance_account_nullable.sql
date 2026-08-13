-- B-8: 将 core_finance_accounts.account_type 和 is_enabled 改为可空
-- 与 Rust Account 结构体的 Option<AccountType> / Option<bool> 字段对齐，
-- 允许前端仅发送 category/isactive 时反序列化通过。
-- 数据库层仍保留默认值，旧数据不受影响。

ALTER TABLE core_finance_accounts ALTER COLUMN account_type DROP NOT NULL;
ALTER TABLE core_finance_accounts ALTER COLUMN is_enabled DROP NOT NULL;
