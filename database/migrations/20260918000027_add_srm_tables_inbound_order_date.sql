-- TOPEMS database migration 20260918000027
-- 补建 5432 缺失对象（5433 重建库应用自建已有，幂等跳过）：
--   srm.biddings / srm.quotations 表（代码超前，5432 无表）
--   wms.inbound_orders.order_date 列（5432 缺）
-- 结构以 5433 现有表为权威（应用自建），幂等 CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS。

CREATE TABLE IF NOT EXISTS srm.biddings (
    id uuid NOT NULL PRIMARY KEY,
    bidding_no character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    category character varying,
    bidding_type character varying,
    status character varying NOT NULL,
    budget_amount numeric,
    currency character varying,
    publish_date timestamptz with time zone,
    bid_deadline timestamp with time zone,
    open_date timestamptz with time zone,
    winner_supplier_id uuid,
    winner_supplier_name character varying,
    winner_amount numeric,
    supplier_count integer,
    creator uuid,
    department character varying,
    items jsonb,
    remarks text,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS srm.quotations (
    id uuid NOT NULL PRIMARY KEY,
    quotation_no character varying NOT NULL,
    inquiry_id uuid,
    inquiry_no character varying,
    supplier_id uuid,
    supplier_name character varying,
    title character varying,
    total_amount numeric,
    currency character varying,
    valid_until timestamp with time zone,
    delivery_time character varying,
    payment_terms text,
    status character varying NOT NULL,
    items jsonb,
    remarks text,
    submitted_at timestamptz with time zone,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS order_date date;
