-- 修复 public.core_users 时间列类型：TIMESTAMP → TIMESTAMPTZ
-- 根因：unified-core IAM 登录查询 UserRow 期望 DateTime<Utc>(TIMESTAMPTZ)，
--       但建表为 TIMESTAMP(无时区)，导致聚合 server(:8099) 登录 500
--       "mismatched types; Rust type Option<DateTime<Utc>> ... not compatible with SQL type TIMESTAMP"
-- 存量值按 UTC 解释（应用写入的一直是 UTC 语义时间）
ALTER TABLE public.core_users
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
