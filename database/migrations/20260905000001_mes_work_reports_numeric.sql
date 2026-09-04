-- ============================================================================
-- mes.work_reports 表结构落档（对齐 sqlx 离线缓存）
-- ----------------------------------------------------------------------------
-- 背景：
--   该表曾为手动建表，output_quantity / defect_quantity / labor_hours
--   误用 double precision，与 .sqlx 离线缓存（sqlx::query! 推断 Numeric /
--   BigDecimal）不一致，导致报工 API 触发 PgNumeric::decode panic
--   （sqlx-postgres 0.8.6 bytes::Buf::get_i16 advance out of bounds）。
--   2026-09-05 已 ALTER 为 numeric 修复。
--
-- 作用：
--   ① 新环境可用下方 CREATE TABLE IF NOT EXISTS 直接建表（结构与代码一致）；
--   ② 存量环境用 ALTER 语句对齐列类型（幂等，重复执行无害）。
--
-- 注意：
--   代码（svc/mes/src/modules/work_report.rs）按 BigDecimal 绑定/返回
--   output_quantity / defect_quantity / labor_hours，勿改回 float8。
-- ============================================================================

CREATE TABLE IF NOT EXISTS mes.work_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_no character varying(100) NOT NULL,
    organization_id uuid,
    work_order_id uuid,
    work_order_no character varying(100),
    order_id uuid,
    order_no character varying(100),
    work_station_id uuid,
    work_station_name character varying(255),
    reporter_name character varying(255) NOT NULL,
    report_date date,
    shift character varying(50),
    output_quantity numeric DEFAULT 0,
    defect_quantity numeric DEFAULT 0,
    labor_hours numeric DEFAULT 0,
    remark text,
    status character varying(50) DEFAULT 'pending'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remark text,
    CONSTRAINT work_reports_pkey PRIMARY KEY (id)
);

-- 存量环境类型对齐（幂等；已为 numeric 则无副作用）
ALTER TABLE mes.work_reports
    ALTER COLUMN output_quantity TYPE numeric,
    ALTER COLUMN defect_quantity TYPE numeric,
    ALTER COLUMN labor_hours TYPE numeric;
