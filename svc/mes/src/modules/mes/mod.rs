//! MES module - Manufacturing Execution System

pub mod equipment;
pub mod equipment_oee;
pub mod material_bom;
pub mod permission;
pub mod plugin;
pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod production_scheduling;
pub mod quality_traceability;
pub mod wip;
pub mod work_station;

use sqlx::PgPool;

/// Initialize MES database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create production_orders table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            completed_quantity DECIMAL(12,2) DEFAULT 0,
            status VARCHAR(32) DEFAULT 'pending',
            source VARCHAR(32) DEFAULT 'manual',
            source_order_id UUID,
            source_order_number VARCHAR(64),
            planned_start_date TIMESTAMP,
            planned_end_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            workshop_id UUID,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create production_processes table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_processes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            process_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            version VARCHAR(32) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'active',
            sequence INT DEFAULT 0,
            equipment_required BOOLEAN DEFAULT false,
            estimated_duration INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create production_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
            process_id UUID REFERENCES production_processes(id),
            work_station_id UUID REFERENCES work_stations(id),
            equipment_id UUID REFERENCES equipment(id),
            operator_id UUID,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            quantity_produced DECIMAL(12,2) DEFAULT 0,
            quantity_defective DECIMAL(12,2) DEFAULT 0,
            status VARCHAR(32) DEFAULT 'in_progress',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create equipment table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS equipment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            model VARCHAR(64),
            manufacturer VARCHAR(128),
            status VARCHAR(32) DEFAULT 'normal',
            location VARCHAR(256),
            purchase_date DATE,
            warranty_end_date DATE,
            maintenance_cycle INT DEFAULT 30,
            last_maintenance_date DATE,
            next_maintenance_date DATE,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create work_stations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS work_stations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            station_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            workshop_id UUID,
            location VARCHAR(256),
            status VARCHAR(32) DEFAULT 'active',
            capacity INT DEFAULT 1,
            equipment_id UUID REFERENCES equipment(id),
            process_id UUID REFERENCES production_processes(id),
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_orders_order_no ON production_orders(order_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_order_id ON production_records(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_work_station_id ON production_records(work_station_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_no ON equipment(equipment_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_work_stations_station_no ON work_stations(station_no)")
        .execute(pool)
        .await?;

    // Create production_schedules table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            schedule_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            completed_quantity DECIMAL(12,2) DEFAULT 0,
            work_station_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
            equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
            process_id UUID REFERENCES production_processes(id) ON DELETE SET NULL,
            planned_start_time TIMESTAMP,
            planned_end_time TIMESTAMP,
            actual_start_time TIMESTAMP,
            actual_end_time TIMESTAMP,
            status VARCHAR(32) DEFAULT 'pending',
            priority INT DEFAULT 0,
            sequence INT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create material_boms table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_boms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bom_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64) NOT NULL,
            version VARCHAR(32) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'draft',
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create bom_items table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS bom_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bom_id UUID NOT NULL REFERENCES material_boms(id) ON DELETE CASCADE,
            material_id UUID,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            specification VARCHAR(256),
            unit VARCHAR(32) NOT NULL,
            quantity DECIMAL(12,4) NOT NULL,
            loss_rate DECIMAL(5,4) DEFAULT 0,
            sequence INT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create material_issues table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_issues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issue_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            bom_id UUID REFERENCES material_boms(id) ON DELETE SET NULL,
            status VARCHAR(32) DEFAULT 'pending',
            warehouse_id UUID,
            operator_id UUID,
            issue_time TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create material_issue_items table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_issue_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issue_id UUID NOT NULL REFERENCES material_issues(id) ON DELETE CASCADE,
            material_id UUID,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            unit VARCHAR(32) NOT NULL,
            planned_quantity DECIMAL(12,4) NOT NULL,
            actual_quantity DECIMAL(12,4) NOT NULL,
            batch_no VARCHAR(64),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create material_returns table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_returns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            return_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            warehouse_id UUID,
            operator_id UUID,
            return_time TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create material_return_items table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_return_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            return_id UUID NOT NULL REFERENCES material_returns(id) ON DELETE CASCADE,
            material_id UUID,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            unit VARCHAR(32) NOT NULL,
            quantity DECIMAL(12,4) NOT NULL,
            reason TEXT,
            batch_no VARCHAR(64),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS quality_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            record_type VARCHAR(32) DEFAULT 'inspection',
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            product_id UUID,
            product_name VARCHAR(256),
            product_code VARCHAR(64),
            batch_no VARCHAR(64),
            quantity DECIMAL(12,2) NOT NULL,
            qualified_quantity DECIMAL(12,2) DEFAULT 0,
            defective_quantity DECIMAL(12,2) DEFAULT 0,
            quality_status VARCHAR(32) DEFAULT 'pending',
            inspector VARCHAR(128),
            inspection_time TIMESTAMP,
            defect_reason TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create batch_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS batch_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            batch_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            product_name VARCHAR(256),
            product_code VARCHAR(64),
            quantity DECIMAL(12,2) NOT NULL,
            unit VARCHAR(32),
            production_date DATE,
            expiry_date DATE,
            supplier VARCHAR(256),
            status VARCHAR(32) DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create equipment_oee table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS equipment_oee (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            record_date DATE NOT NULL,
            planned_production_time DECIMAL(10,2) NOT NULL,
            actual_run_time DECIMAL(10,2) NOT NULL,
            downtime DECIMAL(10,2) DEFAULT 0,
            ideal_cycle_time DECIMAL(10,4) NOT NULL,
            actual_output DECIMAL(12,2) NOT NULL,
            good_output DECIMAL(12,2) NOT NULL,
            defective_output DECIMAL(12,2) DEFAULT 0,
            availability DECIMAL(5,4) DEFAULT 0,
            performance DECIMAL(5,4) DEFAULT 0,
            quality_rate DECIMAL(5,4) DEFAULT 0,
            oee DECIMAL(5,4) DEFAULT 0,
            shift VARCHAR(32),
            operator VARCHAR(128),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(equipment_id, record_date, shift)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create wips table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS wips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wip_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            current_process_id UUID REFERENCES production_processes(id) ON DELETE SET NULL,
            current_work_station_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
            status VARCHAR(32) DEFAULT 'in_progress',
            batch_no VARCHAR(64),
            start_time TIMESTAMP,
            last_transfer_time TIMESTAMP,
            operator VARCHAR(128),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create wip_transfers table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS wip_transfers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            transfer_no VARCHAR(64) NOT NULL UNIQUE,
            wip_id UUID NOT NULL REFERENCES wips(id) ON DELETE CASCADE,
            from_process_id UUID REFERENCES production_processes(id) ON DELETE SET NULL,
            from_work_station_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
            to_process_id UUID REFERENCES production_processes(id) ON DELETE SET NULL,
            to_work_station_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
            quantity DECIMAL(12,2) NOT NULL,
            transfer_time TIMESTAMP NOT NULL,
            operator VARCHAR(128),
            transfer_type VARCHAR(32) DEFAULT 'process_transfer',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create additional indexes for key tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON production_orders(created_at)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_process_id ON production_records(process_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_created_at ON production_records(created_at)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_current_process_id ON wips(current_process_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_created_at ON wips(created_at)")
        .execute(pool)
        .await?;

    // Create additional indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_schedule_no ON production_schedules(schedule_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_order_id ON production_schedules(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_status ON production_schedules(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_boms_bom_no ON material_boms(bom_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_boms_product_id ON material_boms(product_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_issues_issue_no ON material_issues(issue_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_issues_order_id ON material_issues(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_returns_return_no ON material_returns(return_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_quality_records_record_no ON quality_records(record_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_quality_records_order_id ON quality_records(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_batch_records_batch_no ON batch_records(batch_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_oee_equipment_id ON equipment_oee(equipment_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_oee_record_date ON equipment_oee(record_date)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_wip_no ON wips(wip_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_order_id ON wips(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_status ON wips(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wip_transfers_wip_id ON wip_transfers(wip_id)")
        .execute(pool)
        .await?;

    Ok(())
}
