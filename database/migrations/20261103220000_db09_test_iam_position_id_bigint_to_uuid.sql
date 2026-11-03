-- ============================================================
-- DB-09: test iam.position_* id bigint → uuid 对齐 5433/prod
--
-- 背景：类型批次 bigint↔uuid id 4 项——原评估"主键+外键不动"，
-- 实测 0 外键依赖 + 全空表，可安全改。
--
-- 关键实测（2026-11-03）：
--   * 4 表全空（0 行），无数据转换。
--   * 0 外键依赖（无其他表引用这 4 个 id）。
--   * default: sequence nextval → gen_random_uuid()。
-- ============================================================

SET lock_timeout = '5s';

ALTER TABLE iam.position_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE iam.position_permissions ALTER COLUMN id TYPE uuid USING id::text::uuid;
ALTER TABLE iam.position_permissions ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE iam.position_roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE iam.position_roles ALTER COLUMN id TYPE uuid USING id::text::uuid;
ALTER TABLE iam.position_roles ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE iam.resource_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE iam.resource_permissions ALTER COLUMN id TYPE uuid USING id::text::uuid;
ALTER TABLE iam.resource_permissions ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE iam.user_positions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE iam.user_positions ALTER COLUMN id TYPE uuid USING id::text::uuid;
ALTER TABLE iam.user_positions ALTER COLUMN id SET DEFAULT gen_random_uuid();
