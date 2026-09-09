pub mod anomaly_detection;
pub mod approval_common;
pub mod aps_compat;
pub mod aps_scheduling;
pub mod audit;
pub mod capacity;
pub mod dashboard_ws;
pub mod demand_forecast;
pub mod energy_management;
pub mod equipment;
pub mod equipment_oee;
pub mod equipment_oee_calc;
pub mod material_bom;
pub mod material_plan;
pub mod material_requirement;
pub mod mes_plugin;
pub mod oee_logic;
pub mod openapi;
pub mod process_flow;
pub mod process_route;
pub mod production_cost;
pub mod production_kanban;
pub mod production_order;
pub mod production_plan;
pub mod production_process;
pub mod production_record;
pub mod production_scheduling;
pub mod quality_management;
pub mod quality_traceability;
pub mod team;
pub mod wip;
pub mod work_order;
pub mod work_order_calc;
pub mod work_report;
pub mod work_station;
pub mod settings;

use crate::AppState;
use axum::Router;
use sqlx::PgPool;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .merge(anomaly_detection::create_routes())
        .merge(aps_scheduling::create_routes())
        .merge(capacity::create_routes())
        .merge(demand_forecast::create_routes())
        .merge(production_cost::create_routes())
        .merge(energy_management::create_routes())
        .merge(equipment::create_routes())
        .merge(equipment_oee::create_routes())
        .merge(material_bom::create_routes())
        .merge(material_plan::create_routes())
        .merge(material_requirement::create_routes())
        .merge(process_flow::create_routes())
        .merge(process_route::create_routes())
        .merge(production_kanban::create_routes())
        .merge(production_order::create_routes())
        .merge(production_plan::create_routes())
        .merge(production_process::create_routes())
        .merge(production_record::create_routes())
        .merge(production_scheduling::create_routes())
        .merge(quality_management::create_routes())
        .merge(quality_traceability::create_routes())
        .merge(team::create_routes())
        .merge(wip::create_routes())
        .merge(work_order::create_routes())
        .merge(work_report::create_routes())
        .merge(work_station::create_routes())
        .merge(audit::create_routes())
        .merge(settings::create_routes())
}

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS work_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            work_order_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_no VARCHAR(64),
            product_code VARCHAR(64),
            product_name VARCHAR(256),
            work_station_id UUID,
            process_id UUID,
            planned_quantity DECIMAL(12,2) DEFAULT 0,
            completed_quantity DECIMAL(12,2) DEFAULT 0,
            plan_start_date TIMESTAMP,
            plan_end_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            team_id UUID,
            operator VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            priority INT DEFAULT 0,
            remark TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_production_orders_order_no ON production_orders(order_number)",
    )
    .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_order_id ON production_records(order_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_work_station_id ON production_records(work_station_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_no ON equipment(equipment_no)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_work_stations_station_no ON work_stations(station_no)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            UNIQUE(equipment_id, record_date, shift),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

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
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON production_orders(created_at)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_process_id ON production_records(process_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_records_created_at ON production_records(created_at)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_wips_current_process_id ON wips(current_process_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_created_at ON wips(created_at)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_schedule_no ON production_schedules(schedule_no)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_order_id ON production_schedules(order_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_production_schedules_status ON production_schedules(status)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_boms_bom_no ON material_boms(bom_no)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_material_boms_product_id ON material_boms(product_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_material_issues_issue_no ON material_issues(issue_no)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_material_issues_order_id ON material_issues(order_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_material_returns_return_no ON material_returns(return_no)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_quality_records_record_no ON quality_records(record_no)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_quality_records_order_id ON quality_records(order_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_batch_records_batch_no ON batch_records(batch_no)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_equipment_oee_equipment_id ON equipment_oee(equipment_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_equipment_oee_record_date ON equipment_oee(record_date)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_wip_no ON wips(wip_no)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_order_id ON wips(order_id)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wips_status ON wips(status)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_wip_transfers_wip_id ON wip_transfers(wip_id)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_code VARCHAR(64) NOT NULL UNIQUE,
            team_name VARCHAR(128) NOT NULL,
            team_type VARCHAR(32),
            work_station_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
            leader_id UUID,
            leader_name VARCHAR(128),
            member_count INT DEFAULT 0,
            status VARCHAR(32) DEFAULT 'active',
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS team_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            employee_id VARCHAR(64) NOT NULL,
            employee_name VARCHAR(128) NOT NULL,
            employee_code VARCHAR(64),
            position VARCHAR(64),
            join_date TIMESTAMP DEFAULT NOW(),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_teams_work_station_id ON teams(work_station_id)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)")
        .execute(pool)
        .await
        .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id)",
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS material_requirements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            mrp_no VARCHAR(64) NOT NULL UNIQUE,
            order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
            order_number VARCHAR(64),
            product_code VARCHAR(64) NOT NULL,
            product_name VARCHAR(256) NOT NULL,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            specification VARCHAR(256),
            unit VARCHAR(32),
            required_quantity DECIMAL(12,4) NOT NULL,
            available_quantity DECIMAL(12,4) DEFAULT 0,
            shortfall_quantity DECIMAL(12,4) DEFAULT 0,
            required_date VARCHAR(32) NOT NULL,
            priority VARCHAR(32) DEFAULT 'normal',
            status VARCHAR(32) DEFAULT 'pending',
            source_type VARCHAR(32),
            remark TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_requirements_mrp_no ON material_requirements(mrp_no)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_requirements_order_id ON material_requirements(order_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_requirements_status ON material_requirements(status)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_requirements_material_code ON material_requirements(material_code)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS equipment_inspections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            equipment_code VARCHAR(64),
            equipment_name VARCHAR(128),
            inspector VARCHAR(128) NOT NULL,
            inspection_date VARCHAR(32) NOT NULL,
            location VARCHAR(256),
            temperature DECIMAL(10,2),
            vibration DECIMAL(10,4),
            noiselevel DECIMAL(10,2),
            status VARCHAR(32) DEFAULT 'normal',
            items JSONB,
            abnormalities TEXT,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS equipment_maintenance_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            maintenance_type VARCHAR(64) NOT NULL,
            description TEXT,
            maintainer VARCHAR(128) NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            cost DECIMAL(12,2),
            result TEXT,
            status VARCHAR(32) DEFAULT 'pending',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
    .ok();

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_inspections_equipment_id ON equipment_inspections(equipment_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_inspections_inspection_date ON equipment_inspections(inspection_date)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_equipment_id ON equipment_maintenance_records(equipment_id)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_status ON equipment_maintenance_records(status)")
        .execute(pool)
            .await
            .map_err(|e| tracing::warn!("[mes init 宽容跳过] {}", e))
            .ok();

    production_plan::init_database(pool).await?;
    capacity::init_database(pool).await?;
    demand_forecast::init_database(pool).await?;

    Ok(())
}
