-- fix: qms.qa_quality_inspections 时间列类型与 Rust 模型(DateTime<Utc>)不一致
-- 基线迁移(20260725000000)误用 TIMESTAMP(无时区),导致 INSERT/SELECT RETURNING
-- 解码 created_at/updated_at/inspected_at 时类型不匹配(500: mismatched types;
-- Rust Option<DateTime<Utc>> 期望 TIMESTAMPTZ)。deleted_at 一并对齐保持一致。
ALTER TABLE "qms"."qa_quality_inspections" ALTER COLUMN "inspected_at" TYPE TIMESTAMPTZ;
ALTER TABLE "qms"."qa_quality_inspections" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ;
ALTER TABLE "qms"."qa_quality_inspections" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ;
ALTER TABLE "qms"."qa_quality_inspections" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ;
