-- Add bid price management tables
CREATE SCHEMA IF NOT EXISTS plugin_srm;

SET search_path TO plugin_srm;

-- Bid requests table
CREATE TABLE IF NOT EXISTS bid_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES plugin_srm.bid_requests(id) ON DELETE CASCADE,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    price NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    valid_until TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_requests_no ON plugin_srm.bid_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_bid_requests_status ON plugin_srm.bid_requests(status);
CREATE INDEX IF NOT EXISTS idx_bids_request ON plugin_srm.bids(request_id);
CREATE INDEX IF NOT EXISTS idx_bids_supplier ON plugin_srm.bids(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bids_price ON plugin_srm.bids(price);

RESET search_path;
