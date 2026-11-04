-- ============================================================
-- P1: prod 低风险类型加宽（17 列：16 列 varchar → text，1 列 numeric 加宽）
--
-- 依据：prod 只读盘点 2026-11-04（topems_prod vs 同实例 topems_test 基线）
--   实测类型差异 296 项；本文件只取「prod 比 test 窄」的方向，全部为加宽：
--     - test=text，prod=character varying(N)  → text 无长度上限，纯加宽
--     - test=numeric(18,4)，prod=numeric(15,2) → 精度/标度纯加宽
--   严格排除：任何收窄（prod 比 test 宽）、timestamptz → naive（164 项 prod 已领先，
--   应由 test 侧追平，绝不在 prod 降级）、以及 UUID/date/jsonb 等契约型差异。
--
-- 口径说明：此前口头汇总的「14 列」来自 varchar(N)→varchar(M) 与 numeric 两组分类的
--   部分相加；按完整导出逐列复核后，可安全加宽的实为 17 列（16+1）。未加入任何收窄项。
--
-- 数据面（prod 实测 count(*)）：仅 4 张表非空——34 / 16 / 6 行，其余 13 列所在表均为 0 行。
-- 幂等：先判列存在与当前类型，已是目标类型即跳过；表/列不存在（如 test 空跑）同样跳过。
-- 回滚：类型加宽在存储层面不可逆（varchar(N) 的 N 约束、numeric 的标度信息在改写后丢失），
--   回滚只能依赖执行前整库 dump 还原：
--   pg_dump -Fc topems_prod > topems_prod_pre_p1_$(date +%Y%m%d%H%M).dump
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- crm.contacts.mobile：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'crm' AND t.relname = 'contacts'
      AND a.attname = 'mobile' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE crm.contacts ALTER COLUMN mobile TYPE text;
  END IF;
END
$$;

-- ehs.qa_ehs_environment_monitors.standard_value：character varying(128) → text（prod 34 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs' AND t.relname = 'qa_ehs_environment_monitors'
      AND a.attname = 'standard_value' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE ehs.qa_ehs_environment_monitors ALTER COLUMN standard_value TYPE text;
  END IF;
END
$$;

-- ehs.qa_ehs_hazardous_materials.storage_condition：character varying(256) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ehs' AND t.relname = 'qa_ehs_hazardous_materials'
      AND a.attname = 'storage_condition' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE ehs.qa_ehs_hazardous_materials ALTER COLUMN storage_condition TYPE text;
  END IF;
END
$$;

-- erp.customers.contact_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp' AND t.relname = 'customers'
      AND a.attname = 'contact_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE erp.customers ALTER COLUMN contact_phone TYPE text;
  END IF;
END
$$;

-- erp.customers.email：character varying(100) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp' AND t.relname = 'customers'
      AND a.attname = 'email' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE erp.customers ALTER COLUMN email TYPE text;
  END IF;
END
$$;

-- erp.suppliers.contact_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp' AND t.relname = 'suppliers'
      AND a.attname = 'contact_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE erp.suppliers ALTER COLUMN contact_phone TYPE text;
  END IF;
END
$$;

-- erp.suppliers.email：character varying(100) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'erp' AND t.relname = 'suppliers'
      AND a.attname = 'email' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE erp.suppliers ALTER COLUMN email TYPE text;
  END IF;
END
$$;

-- gis.business_locations.contact_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'gis' AND t.relname = 'business_locations'
      AND a.attname = 'contact_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE gis.business_locations ALTER COLUMN contact_phone TYPE text;
  END IF;
END
$$;

-- master_data.materials.specification：character varying(256) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'master_data' AND t.relname = 'materials'
      AND a.attname = 'specification' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE master_data.materials ALTER COLUMN specification TYPE text;
  END IF;
END
$$;

-- portal.portal_todos.priority：character varying(32) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'portal' AND t.relname = 'portal_todos'
      AND a.attname = 'priority' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE portal.portal_todos ALTER COLUMN priority TYPE text;
  END IF;
END
$$;

-- portal.portal_todos.title：character varying(255) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'portal' AND t.relname = 'portal_todos'
      AND a.attname = 'title' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE portal.portal_todos ALTER COLUMN title TYPE text;
  END IF;
END
$$;

-- scm.supplier_admissions.contact_email：character varying(100) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'scm' AND t.relname = 'supplier_admissions'
      AND a.attname = 'contact_email' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE scm.supplier_admissions ALTER COLUMN contact_email TYPE text;
  END IF;
END
$$;

-- scm.supplier_admissions.contact_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'scm' AND t.relname = 'supplier_admissions'
      AND a.attname = 'contact_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE scm.supplier_admissions ALTER COLUMN contact_phone TYPE text;
  END IF;
END
$$;

-- scm.supplier_delivery_appointments.driver_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'scm' AND t.relname = 'supplier_delivery_appointments'
      AND a.attname = 'driver_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE scm.supplier_delivery_appointments ALTER COLUMN driver_phone TYPE text;
  END IF;
END
$$;

-- wms.transfers.driver_phone：character varying(50) → text（prod 0 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'wms' AND t.relname = 'transfers'
      AND a.attname = 'driver_phone' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE wms.transfers ALTER COLUMN driver_phone TYPE text;
  END IF;
END
$$;

-- wms.warehouses.contact_email：character varying(100) → text（prod 6 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'wms' AND t.relname = 'warehouses'
      AND a.attname = 'contact_email' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'text'
  ) THEN
    ALTER TABLE wms.warehouses ALTER COLUMN contact_email TYPE text;
  END IF;
END
$$;

-- pm.projects.budget：numeric(15,2) → numeric(18,4)（纯加宽，prod 16 行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'pm' AND t.relname = 'projects'
      AND a.attname = 'budget' AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) = 'numeric(15,2)'
  ) THEN
    ALTER TABLE pm.projects ALTER COLUMN budget TYPE numeric(18,4);
  END IF;
END
$$;
