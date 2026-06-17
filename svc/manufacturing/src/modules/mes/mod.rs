//! MES module - Manufacturing Execution System

pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod equipment;
pub mod work_station;

use sqlx::PgPool;

/// Initialize MES database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create production_order table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            quantity DECIMAL(12,2) NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            planned_start_date DATE,
            planned_end_date DATE,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create production_process table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS production_processes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            process_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            version VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
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

    Ok(())
}
