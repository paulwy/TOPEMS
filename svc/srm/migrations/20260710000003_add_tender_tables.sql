-- Add tender management tables
CREATE SCHEMA IF NOT EXISTS plugin_srm;

SET search_path TO plugin_srm;

-- Tenders table
CREATE TABLE IF NOT EXISTS tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    budget NUMERIC(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tender bids table
CREATE TABLE IF NOT EXISTS tender_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_no VARCHAR(50) NOT NULL UNIQUE,
    tender_id UUID NOT NULL REFERENCES plugin_srm.tenders(id) ON DELETE CASCADE,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    bid_price NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    bid_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tender awards table
CREATE TABLE IF NOT EXISTS tender_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    award_no VARCHAR(50) NOT NULL UNIQUE,
    tender_id UUID NOT NULL REFERENCES plugin_srm.tenders(id) ON DELETE CASCADE,
    bid_id UUID NOT NULL REFERENCES plugin_srm.tender_bids(id) ON DELETE CASCADE,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    award_price NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenders_no ON plugin_srm.tenders(tender_no);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON plugin_srm.tenders(status);
CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON plugin_srm.tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_supplier ON plugin_srm.tender_bids(supplier_id);
CREATE INDEX IF NOT EXISTS idx_tender_awards_tender ON plugin_srm.tender_awards(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_awards_supplier ON plugin_srm.tender_awards(supplier_id);

RESET search_path;
