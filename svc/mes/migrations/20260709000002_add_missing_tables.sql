-- Process Flows
CREATE TABLE IF NOT EXISTS process_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    version VARCHAR(32) DEFAULT '1.0',
    status VARCHAR(32) DEFAULT 'active',
    route_id UUID,
    production_line VARCHAR(128),
    capacity DECIMAL(12,2),
    unit VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Process Flow Steps
CREATE TABLE IF NOT EXISTS process_flow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,
    process_id UUID REFERENCES production_processes(id),
    sequence INT DEFAULT 0,
    work_station_id UUID REFERENCES work_stations(id),
    equipment_id UUID REFERENCES equipment(id),
    estimated_duration INT DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Work Reports
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_no VARCHAR(64) NOT NULL UNIQUE,
    work_order_id UUID,
    work_order_no VARCHAR(64),
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_no VARCHAR(64),
    work_station_id UUID REFERENCES work_stations(id),
    work_station_name VARCHAR(128),
    reporter_name VARCHAR(128),
    report_date DATE NOT NULL,
    shift VARCHAR(32),
    output_quantity DECIMAL(12,2) DEFAULT 0,
    defect_quantity DECIMAL(12,2) DEFAULT 0,
    labor_hours DECIMAL(10,2) DEFAULT 0,
    remark TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP,
    approval_remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_process_flows_code ON process_flows(code);
CREATE INDEX IF NOT EXISTS idx_process_flows_status ON process_flows(status);
CREATE INDEX IF NOT EXISTS idx_process_flow_steps_flow_id ON process_flow_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_process_flow_steps_process_id ON process_flow_steps(process_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_report_no ON work_reports(report_no);
CREATE INDEX IF NOT EXISTS idx_work_reports_work_order_id ON work_reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_order_id ON work_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_work_station_id ON work_reports(work_station_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_report_date ON work_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_work_reports_status ON work_reports(status);
