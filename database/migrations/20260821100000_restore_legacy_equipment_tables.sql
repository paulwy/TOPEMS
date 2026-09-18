-- ================================================================================
-- 20260821100000_restore_legacy_equipment_tables.sql
-- 空库重建遗留表恢复（v253 依赖的旧设备域表）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：20260821200000_v253_unify_schema_nullability.sql
-- 对 public/rs 的 equipment_inspections / equipment_maintenance_records 做列对齐与 FK，
-- 其依赖的遗留表 DDL 在 2026-09-07 收敛时从 init/postgres 移除、未完整落入迁移链，
-- 空库重建时这些表仅存裸骨架（id,deleted_at）或完全缺失（public.equipment），
-- 导致 v253 在行 7942 报 column "equipment_id" does not exist。
-- 本迁移从 5432 活跃库（遗留结构唯一保存处）恢复 6 张表的权威列定义，版本置于 v253 之前。
-- 幂等：CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS。
-- 注意：FK（equipment_id -> public.equipment）由 v253 自行 DROP IF EXISTS + ADD，
--       本迁移不建 FK，避免与 v253 冲突。
-- ================================================================================

-- ============ public.equipment（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "public"."equipment" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "equipment_no" VARCHAR(64) NOT NULL;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128) NOT NULL;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "model" VARCHAR(64);
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "manufacturer" VARCHAR(128);
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'normal'::character varying;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "location" VARCHAR(256);
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "purchase_date" DATE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "warranty_end_date" DATE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "maintenance_cycle" INTEGER DEFAULT 30;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "last_maintenance_date" DATE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "next_maintenance_date" DATE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "equipment_type" VARCHAR(128);
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "last_maintenance" TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "next_maintenance" TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "running_hours" NUMERIC(10,2) DEFAULT 0;
ALTER TABLE "public"."equipment" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- ============ public.equipment_inspections（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "public"."equipment_inspections" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_id" UUID;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_code" VARCHAR(64);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(256);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspector" VARCHAR(128);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspection_date" TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "location" VARCHAR(256);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "temperature" NUMERIC(8,2);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "vibration" NUMERIC(8,2);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "noiselevel" NUMERIC(8,2);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'pending'::character varying;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "items" TEXT;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "abnormalities" TEXT;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- ============ public.equipment_maintenance_records（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "public"."equipment_maintenance_records" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_id" UUID;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintenance_type" VARCHAR(64) NOT NULL;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintainer" VARCHAR(128);
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP WITHOUT TIME ZONE NOT NULL;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "cost" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "result" VARCHAR(256);
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'pending'::character varying;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- ============ rs.equipment（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "rs"."equipment" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "equipment_no" VARCHAR(64) NOT NULL;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128) NOT NULL;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "model" VARCHAR(64);
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "manufacturer" VARCHAR(128);
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'normal'::character varying;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "location" VARCHAR(256);
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "purchase_date" DATE;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "warranty_end_date" DATE;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "maintenance_cycle" INTEGER DEFAULT 30;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "last_maintenance_date" DATE;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "next_maintenance_date" DATE;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- ============ rs.equipment_inspections（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "rs"."equipment_inspections" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_id" UUID NOT NULL;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_code" VARCHAR(64);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(128);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspector" VARCHAR(128) NOT NULL;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspection_date" VARCHAR(32) NOT NULL;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "location" VARCHAR(256);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "temperature" NUMERIC(10,2);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "vibration" NUMERIC(10,4);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "noiselevel" NUMERIC(10,2);
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'normal'::character varying;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "items" JSONB;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "abnormalities" TEXT;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment_inspections" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- ============ rs.equipment_maintenance_records（5432 权威结构恢复）============
CREATE TABLE IF NOT EXISTS "rs"."equipment_maintenance_records" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_id" UUID NOT NULL;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintenance_type" VARCHAR(64) NOT NULL;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintainer" VARCHAR(128) NOT NULL;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP WITHOUT TIME ZONE NOT NULL;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "cost" NUMERIC(12,2);
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) DEFAULT 'pending'::character varying;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE "rs"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;
