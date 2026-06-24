//! MES module - Manufacturing Execution System

pub mod equipment;
pub mod permission;
pub mod plugin;
pub mod production_order;
pub mod production_process;
pub mod production_record;
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

    Ok(())
}
