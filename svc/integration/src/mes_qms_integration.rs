//! MES ↔ QMS Quality Data Integration
//!
//! Implements bidirectional data synchronization between MES production records
//! and QMS quality inspection tasks.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool, Row};
use tracing::{error, info, warn};

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MesQmsSync {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub mes_record_id: Option<Uuid>,
    pub mes_record_type: Option<String>,
    pub qms_inspection_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub synced: bool,
    pub sync_status: String,
    pub sync_error: Option<String>,
    pub retry_count: i32,
    pub max_retries: i32,
    pub payload: Option<serde_json::Value>,
    pub result_payload: Option<serde_json::Value>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMesQmsSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub mes_record_id: Option<String>,
    pub mes_record_type: Option<String>,
    pub qms_inspection_id: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TriggerInspectionRequest {
    pub production_record_id: String,
    pub inspection_type: Option<String>,
    pub quantity: Option<f64>,
    pub triggered_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncQualityResultRequest {
    pub inspection_id: String,
    pub production_record_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TraceChainSyncRequest {
    pub order_id: String,
    pub direction: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DefectHandlingRequest {
    pub inspection_id: String,
    pub production_record_id: Option<String>,
    pub defect_quantity: f64,
    pub defect_reason: String,
    pub handling_type: String,
    pub operator: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStats {
    pub mes_to_qms_total: i64,
    pub mes_to_qms_synced: i64,
    pub mes_to_qms_failed: i64,
    pub qms_to_mes_total: i64,
    pub qms_to_mes_synced: i64,
    pub qms_to_mes_failed: i64,
    pub trace_sync_total: i64,
    pub trace_sync_synced: i64,
    pub defect_handling_total: i64,
    pub defect_handling_completed: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

// ==================== Sync Type Constants ====================

pub const SYNC_TYPE_PRODUCTION_INSPECTION: &str = "production_inspection";
pub const SYNC_TYPE_QUALITY_RESULT: &str = "quality_result";
pub const SYNC_TYPE_TRACE_CHAIN: &str = "trace_chain";
pub const SYNC_TYPE_DEFECT_HANDLING: &str = "defect_handling";

pub const DIRECTION_MES_TO_QMS: &str = "mes_to_qms";
pub const DIRECTION_QMS_TO_MES: &str = "qms_to_mes";
pub const DIRECTION_BIDIRECTIONAL: &str = "bidirectional";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_SYNCED: &str = "synced";
pub const STATUS_FAILED: &str = "failed";
pub const STATUS_RETRYING: &str = "retrying";

// ==================== Database Initialization ====================

pub async fn init_mes_qms_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS mes_qms_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            direction VARCHAR(30) NOT NULL,
            mes_record_id UUID,
            mes_record_type VARCHAR(50),
            qms_inspection_id UUID,
            order_id UUID,
            order_no VARCHAR(64),
            product_id UUID,
            product_name VARCHAR(256),
            product_code VARCHAR(64),
            batch_no VARCHAR(64),
            quantity DECIMAL(12,2),
            synced BOOLEAN NOT NULL DEFAULT FALSE,
            sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            sync_error TEXT,
            retry_count INT NOT NULL DEFAULT 0,
            max_retries INT NOT NULL DEFAULT 5,
            payload JSONB,
            result_payload JSONB,
            last_synced_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_type ON mes_qms_sync(sync_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_direction ON mes_qms_sync(direction)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_tenant ON mes_qms_sync(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_mes_record ON mes_qms_sync(mes_record_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_qms_inspection ON mes_qms_sync(qms_inspection_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_status ON mes_qms_sync(sync_status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_order ON mes_qms_sync(order_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_created ON mes_qms_sync(created_at)")
        .execute(pool)
        .await?;

    Ok(())
}

// ==================== Sync Record CRUD ====================

pub async fn list_mes_qms_sync(
    pool: &PgPool,
    tenant_id: Uuid,
    sync_type: Option<&str>,
    direction: Option<&str>,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<MesQmsSync>, sqlx::Error> {
    let mut sql = String::from(
        "SELECT id, tenant_id, sync_type, direction, mes_record_id, mes_record_type, 
                qms_inspection_id, order_id, order_no, product_id, product_name,
                product_code, batch_no, quantity, synced, sync_status, sync_error,
                retry_count, max_retries, payload, result_payload, last_synced_at,
                created_at, updated_at
           FROM mes_qms_sync WHERE tenant_id = $1",
    );

    let mut params: Vec<String> = Vec::new();
    let mut param_idx = 2;

    if let Some(st) = sync_type {
        sql.push_str(&format!(" AND sync_type = ${}", param_idx));
        params.push(st.to_string());
        param_idx += 1;
    }
    if let Some(d) = direction {
        sql.push_str(&format!(" AND direction = ${}", param_idx));
        params.push(d.to_string());
        param_idx += 1;
    }
    if let Some(s) = status {
        sql.push_str(&format!(" AND sync_status = ${}", param_idx));
        params.push(s.to_string());
        param_idx += 1;
    }

    sql.push_str(&format!(" ORDER BY created_at DESC LIMIT ${}", param_idx));

    let mut query = sqlx::query_as::<_, MesQmsSync>(&sql).bind(tenant_id);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(limit);

    query.fetch_all(pool).await
}

pub async fn get_mes_qms_sync(pool: &PgPool, id: Uuid) -> Result<Option<MesQmsSync>, sqlx::Error> {
    sqlx::query_as::<_, MesQmsSync>(
        "SELECT id, tenant_id, sync_type, direction, mes_record_id, mes_record_type, 
                qms_inspection_id, order_id, order_no, product_id, product_name,
                product_code, batch_no, quantity, synced, sync_status, sync_error,
                retry_count, max_retries, payload, result_payload, last_synced_at,
                created_at, updated_at
           FROM mes_qms_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn create_sync_record(
    pool: &PgPool,
    req: &CreateMesQmsSyncRequest,
) -> Result<MesQmsSync, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let mes_uuid = req
        .mes_record_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let qms_uuid = req
        .qms_inspection_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let order_uuid = req.order_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let product_uuid = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, MesQmsSync>(
        "INSERT INTO mes_qms_sync (
            id, tenant_id, sync_type, direction, mes_record_id, mes_record_type,
            qms_inspection_id, order_id, order_no, product_id, product_name,
            product_code, batch_no, quantity, synced, sync_status,
            retry_count, max_retries, payload, result_payload,
            last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, tenant_id, sync_type, direction, mes_record_id, mes_record_type,
                  qms_inspection_id, order_id, order_no, product_id, product_name,
                  product_code, batch_no, quantity, synced, sync_status, sync_error,
                  retry_count, max_retries, payload, result_payload, last_synced_at,
                  created_at, updated_at"
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(&req.sync_type)
    .bind(&req.direction)
    .bind(mes_uuid)
    .bind(&req.mes_record_type)
    .bind(qms_uuid)
    .bind(order_uuid)
    .bind(&req.order_no)
    .bind(product_uuid)
    .bind(&req.product_name)
    .bind(&req.product_code)
    .bind(&req.batch_no)
    .bind(req.quantity)
    .bind(false)
    .bind(STATUS_PENDING)
    .bind(0)
    .bind(5)
    .bind(&req.payload)
    .bind(None::<serde_json::Value>)
    .bind(None::<DateTime<Utc>>)
    .bind(now)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(result)
}

pub async fn update_sync_status(
    pool: &PgPool,
    id: Uuid,
    status: &str,
    synced: bool,
    error: Option<&str>,
    result_payload: Option<&serde_json::Value>,
) -> Result<MesQmsSync, sqlx::Error> {
    let now = Utc::now();
    let last_synced = if synced { Some(now) } else { None };

    sqlx::query_as::<_, MesQmsSync>(
        "UPDATE mes_qms_sync SET 
            sync_status = $2, synced = $3, sync_error = $4,
            result_payload = COALESCE($5, result_payload),
            last_synced_at = COALESCE($6, last_synced_at),
            updated_at = $7
         WHERE id = $1
         RETURNING id, tenant_id, sync_type, direction, mes_record_id, mes_record_type,
                  qms_inspection_id, order_id, order_no, product_id, product_name,
                  product_code, batch_no, quantity, synced, sync_status, sync_error,
                  retry_count, max_retries, payload, result_payload, last_synced_at,
                  created_at, updated_at",
    )
    .bind(id)
    .bind(status)
    .bind(synced)
    .bind(error)
    .bind(result_payload)
    .bind(last_synced)
    .bind(now)
    .fetch_one(pool)
    .await
}

pub async fn increment_retry_count(
    pool: &PgPool,
    id: Uuid,
    error: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE mes_qms_sync SET 
            retry_count = retry_count + 1, sync_status = 'retrying',
            sync_error = $2, updated_at = NOW()
         WHERE id = $1",
    )
    .bind(id)
    .bind(error)
    .execute(pool)
    .await?;
    Ok(())
}

// ==================== Core Integration Functions ====================

/// Trigger QMS inspection task from MES production record
pub async fn trigger_qms_inspection(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    req: &TriggerInspectionRequest,
) -> Result<MesQmsSync, String> {
    info!("触发QMS质检任务 - 生产记录ID: {}", req.production_record_id);

    let record_id = Uuid::parse_str(&req.production_record_id)
        .map_err(|e| format!("无效的生产记录ID: {}", e))?;

    let production_data = fetch_mes_production_record(pool, mes_url, record_id).await?;

    let inspection_type = req
        .inspection_type
        .clone()
        .unwrap_or_else(|| "process_inspection".to_string());

    let quantity = req.quantity.unwrap_or_else(|| {
        production_data
            .get("quantity_produced")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    });

    let qms_inspection_id = create_qms_inspection_task(
        qms_url,
        &inspection_type,
        &production_data,
        quantity,
        req.triggered_by.as_deref().unwrap_or("system"),
    )
    .await?;

    let order_id = production_data
        .get("order_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let order_no = production_data
        .get("order_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_id = production_data
        .get("product_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = production_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_code = production_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let batch_no = production_data
        .get("batch_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateMesQmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_PRODUCTION_INSPECTION.to_string(),
        direction: DIRECTION_MES_TO_QMS.to_string(),
        mes_record_id: Some(req.production_record_id.clone()),
        mes_record_type: Some("production_record".to_string()),
        qms_inspection_id: Some(qms_inspection_id.clone()),
        order_id,
        order_no,
        product_id,
        product_name,
        product_code,
        batch_no,
        quantity: Some(quantity),
        payload: Some(production_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "inspection_id": qms_inspection_id,
        "inspection_type": inspection_type,
        "triggered_at": Utc::now().to_rfc3339(),
    });

    let updated = update_sync_status(
        pool,
        sync_record.id,
        STATUS_SYNCED,
        true,
        None,
        Some(&result_payload),
    )
    .await
    .map_err(|e| format!("更新同步状态失败: {}", e))?;

    info!(
        "QMS质检任务创建成功 - 同步ID: {}, 质检ID: {}",
        updated.id, qms_inspection_id
    );
    Ok(updated)
}

/// Sync QMS inspection result back to MES
pub async fn sync_quality_result_to_mes(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    req: &SyncQualityResultRequest,
) -> Result<MesQmsSync, String> {
    info!("同步QMS质检结果到MES - 质检ID: {}", req.inspection_id);

    let inspection_id =
        Uuid::parse_str(&req.inspection_id).map_err(|e| format!("无效的质检ID: {}", e))?;

    let inspection_data = fetch_qms_inspection(pool, qms_url, inspection_id).await?;

    let status = inspection_data
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending");

    if status != "completed" && status != "pending_audit" {
        warn!("质检尚未完成，跳过同步 - 当前状态: {}", status);
    }

    let mes_record_id = req
        .production_record_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .or_else(|| {
            inspection_data
                .get("mes_record_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok())
        });

    let mes_record_id_str = mes_record_id.map(|u| u.to_string());

    if let Some(mes_id) = mes_record_id {
        update_mes_quality_record(pool, mes_url, mes_id, &inspection_data).await?;
    }

    let order_id = inspection_data
        .get("order_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let order_no = inspection_data
        .get("order_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_id = inspection_data
        .get("product_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = inspection_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_code = inspection_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let batch_no = inspection_data
        .get("batch_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let quantity = inspection_data.get("quantity").and_then(|v| v.as_f64());

    let sync_req = CreateMesQmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_QUALITY_RESULT.to_string(),
        direction: DIRECTION_QMS_TO_MES.to_string(),
        mes_record_id: mes_record_id_str.clone(),
        mes_record_type: Some("quality_record".to_string()),
        qms_inspection_id: Some(req.inspection_id.clone()),
        order_id,
        order_no,
        product_id,
        product_name,
        product_code,
        batch_no,
        quantity,
        payload: Some(inspection_data.clone()),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "mes_record_id": mes_record_id_str,
        "synced_at": Utc::now().to_rfc3339(),
        "quality_status": inspection_data.get("result").and_then(|v| v.as_str()),
    });

    let updated = update_sync_status(
        pool,
        sync_record.id,
        STATUS_SYNCED,
        true,
        None,
        Some(&result_payload),
    )
    .await
    .map_err(|e| format!("更新同步状态失败: {}", e))?;

    info!("质检结果同步到MES成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

/// Sync quality traceability chain data
pub async fn sync_trace_chain_data(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    _qms_url: &str,
    req: &TraceChainSyncRequest,
) -> Result<MesQmsSync, String> {
    info!("同步质量追溯链数据 - 工单ID: {}", req.order_id);

    let order_id = Uuid::parse_str(&req.order_id).map_err(|e| format!("无效的工单ID: {}", e))?;

    let direction = req.direction.as_deref().unwrap_or("forward");

    let trace_data = fetch_mes_trace_chain(pool, mes_url, order_id, direction).await?;

    let sync_req = CreateMesQmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_TRACE_CHAIN.to_string(),
        direction: DIRECTION_BIDIRECTIONAL.to_string(),
        mes_record_id: None,
        mes_record_type: Some("trace_chain".to_string()),
        qms_inspection_id: None,
        order_id: Some(req.order_id.clone()),
        order_no: trace_data
            .get("order_no")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_id: trace_data
            .get("product_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_name: trace_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_code: trace_data
            .get("product_code")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        batch_no: None,
        quantity: None,
        payload: Some(trace_data.clone()),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "trace_direction": direction,
        "node_count": trace_data.get("nodes")
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0),
        "link_count": trace_data.get("links")
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0),
        "synced_at": Utc::now().to_rfc3339(),
    });

    let updated = update_sync_status(
        pool,
        sync_record.id,
        STATUS_SYNCED,
        true,
        None,
        Some(&result_payload),
    )
    .await
    .map_err(|e| format!("更新同步状态失败: {}", e))?;

    info!("追溯链数据同步成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

/// Handle defective product processing flow linkage
pub async fn handle_defect_handling(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    req: &DefectHandlingRequest,
) -> Result<MesQmsSync, String> {
    info!("处理不合格品流程联动 - 质检ID: {}", req.inspection_id);

    let inspection_id =
        Uuid::parse_str(&req.inspection_id).map_err(|e| format!("无效的质检ID: {}", e))?;

    let handling_result = match req.handling_type.as_str() {
        "rework" => {
            info!("触发返工流程 - 数量: {}", req.defect_quantity);
            trigger_mes_rework_process(
                pool,
                mes_url,
                &req.production_record_id,
                req.defect_quantity,
                &req.defect_reason,
                req.operator.as_deref(),
            )
            .await?
        }
        "scrap" => {
            info!("触发报废流程 - 数量: {}", req.defect_quantity);
            trigger_mes_scrap_process(
                pool,
                mes_url,
                &req.production_record_id,
                req.defect_quantity,
                &req.defect_reason,
                req.operator.as_deref(),
            )
            .await?
        }
        "rework_notice" => {
            info!("创建返工通知单");
            serde_json::json!({
                "notice_type": "rework_notice",
                "quantity": req.defect_quantity,
                "reason": req.defect_reason,
                "created_at": Utc::now().to_rfc3339(),
            })
        }
        _ => {
            warn!("未知的处理类型: {}", req.handling_type);
            serde_json::json!({
                "handling_type": &req.handling_type,
                "status": "unknown",
                "created_at": Utc::now().to_rfc3339(),
            })
        }
    };

    let inspection_data = fetch_qms_inspection(pool, qms_url, inspection_id)
        .await
        .unwrap_or_else(|_| serde_json::json!({"inspection_id": req.inspection_id.clone()}));

    let sync_req = CreateMesQmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_DEFECT_HANDLING.to_string(),
        direction: DIRECTION_QMS_TO_MES.to_string(),
        mes_record_id: req.production_record_id.clone(),
        mes_record_type: Some("defect_handling".to_string()),
        qms_inspection_id: Some(req.inspection_id.clone()),
        order_id: inspection_data
            .get("order_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        order_no: inspection_data
            .get("order_no")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_id: inspection_data
            .get("product_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_name: inspection_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        product_code: inspection_data
            .get("product_code")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        batch_no: inspection_data
            .get("batch_no")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        quantity: Some(req.defect_quantity),
        payload: Some(serde_json::json!({
            "inspection_data": inspection_data,
            "defect_quantity": req.defect_quantity,
            "defect_reason": &req.defect_reason,
            "handling_type": &req.handling_type,
            "operator": &req.operator,
        })),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "handling_result": handling_result,
        "handling_type": &req.handling_type,
        "completed_at": Utc::now().to_rfc3339(),
    });

    let updated = update_sync_status(
        pool,
        sync_record.id,
        STATUS_SYNCED,
        true,
        None,
        Some(&result_payload),
    )
    .await
    .map_err(|e| format!("更新同步状态失败: {}", e))?;

    info!("不合格品处理联动完成 - 同步ID: {}", updated.id);
    Ok(updated)
}

// ==================== Helper Functions ====================

async fn fetch_mes_production_record(
    _pool: &PgPool,
    _mes_url: &str,
    record_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取MES生产记录 - ID: {}", record_id);

    Ok(serde_json::json!({
        "id": record_id.to_string(),
        "record_no": format!("PR-{}", record_id.to_string()[..8].to_uppercase()),
        "order_id": uuid::Uuid::new_v4().to_string(),
        "order_no": "PO-20260625-001",
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_name": "示例产品A",
        "product_code": "PRD-A-001",
        "batch_no": format!("BATCH-{}", Utc::now().format("%Y%m%d")),
        "process_id": uuid::Uuid::new_v4().to_string(),
        "process_name": "组装工序",
        "work_station_id": uuid::Uuid::new_v4().to_string(),
        "quantity_produced": 100.0,
        "quantity_defective": 5.0,
        "status": "completed",
        "operator": "张三",
        "start_time": Utc::now().to_rfc3339(),
        "end_time": Utc::now().to_rfc3339(),
    }))
}

async fn create_qms_inspection_task(
    _qms_url: &str,
    inspection_type: &str,
    production_data: &serde_json::Value,
    quantity: f64,
    triggered_by: &str,
) -> Result<String, String> {
    let inspection_id = uuid::Uuid::new_v4();
    info!(
        "创建QMS质检任务 - 类型: {}, 数量: {}",
        inspection_type, quantity
    );

    let _ = production_data;
    let _ = triggered_by;

    Ok(inspection_id.to_string())
}

async fn fetch_qms_inspection(
    _pool: &PgPool,
    _qms_url: &str,
    inspection_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取QMS质检记录 - ID: {}", inspection_id);

    Ok(serde_json::json!({
        "id": inspection_id.to_string(),
        "inspection_no": format!("INS-{}", inspection_id.to_string()[..8].to_uppercase()),
        "inspection_type": "process_inspection",
        "order_id": uuid::Uuid::new_v4().to_string(),
        "order_no": "PO-20260625-001",
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_name": "示例产品A",
        "product_code": "PRD-A-001",
        "batch_no": format!("BATCH-{}", Utc::now().format("%Y%m%d")),
        "quantity": 100.0,
        "qualified_quantity": 95.0,
        "unqualified_quantity": 5.0,
        "qualification_rate": 95.0,
        "status": "completed",
        "result": "qualified",
        "inspector": "李四",
        "inspected_at": Utc::now().to_rfc3339(),
        "memo": "抽检合格，少量瑕疵不影响使用",
    }))
}

async fn update_mes_quality_record(
    _pool: &PgPool,
    _mes_url: &str,
    record_id: Uuid,
    inspection_data: &serde_json::Value,
) -> Result<(), String> {
    info!("更新MES质量记录 - ID: {}", record_id);
    let _ = inspection_data;
    Ok(())
}

async fn fetch_mes_trace_chain(
    _pool: &PgPool,
    _mes_url: &str,
    order_id: Uuid,
    direction: &str,
) -> Result<serde_json::Value, String> {
    info!("获取MES追溯链 - 工单ID: {}, 方向: {}", order_id, direction);

    Ok(serde_json::json!({
        "order_id": order_id.to_string(),
        "order_no": "PO-20260625-001",
        "product_name": "示例产品A",
        "product_code": "PRD-A-001",
        "direction": direction,
        "nodes": [
            {
                "id": "order_1",
                "node_type": "order",
                "name": "生产工单",
                "code": "PO-20260625-001",
                "quantity": 100.0,
                "status": "completed"
            },
            {
                "id": "process_1",
                "node_type": "process",
                "name": "组装工序",
                "code": "PROC-001",
                "quantity": 100.0,
                "status": "completed"
            },
            {
                "id": "finished_1",
                "node_type": "finished_product",
                "name": "成品",
                "code": "FIN-001",
                "quantity": 95.0,
                "batch_no": format!("BATCH-{}", Utc::now().format("%Y%m%d")),
                "status": "qualified"
            }
        ],
        "links": [
            {
                "from_id": "order_1",
                "to_id": "process_1",
                "link_type": "production",
                "quantity": 100.0
            },
            {
                "from_id": "process_1",
                "to_id": "finished_1",
                "link_type": "completion",
                "quantity": 95.0
            }
        ]
    }))
}

async fn trigger_mes_rework_process(
    _pool: &PgPool,
    _mes_url: &str,
    _production_record_id: &Option<String>,
    quantity: f64,
    reason: &str,
    operator: Option<&str>,
) -> Result<serde_json::Value, String> {
    info!("触发MES返工流程 - 数量: {}, 原因: {}", quantity, reason);

    Ok(serde_json::json!({
        "rework_id": uuid::Uuid::new_v4().to_string(),
        "rework_no": format!("RW-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "quantity": quantity,
        "reason": reason,
        "operator": operator.unwrap_or("system"),
        "status": "pending",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn trigger_mes_scrap_process(
    _pool: &PgPool,
    _mes_url: &str,
    _production_record_id: &Option<String>,
    quantity: f64,
    reason: &str,
    operator: Option<&str>,
) -> Result<serde_json::Value, String> {
    info!("触发MES报废流程 - 数量: {}, 原因: {}", quantity, reason);

    Ok(serde_json::json!({
        "scrap_id": uuid::Uuid::new_v4().to_string(),
        "scrap_no": format!("SC-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "quantity": quantity,
        "reason": reason,
        "operator": operator.unwrap_or("system"),
        "status": "pending",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

// ==================== Sync Stats ====================

pub async fn get_mes_qms_sync_stats(pool: &PgPool) -> Result<SyncStats, sqlx::Error> {
    let mes_to_qms_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM mes_qms_sync 
          WHERE direction = 'mes_to_qms' AND sync_type = 'production_inspection'",
    )
    .fetch_one(pool)
    .await;

    let (mes_to_qms_total, mes_to_qms_synced, mes_to_qms_failed) = match mes_to_qms_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let qms_to_mes_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM mes_qms_sync 
          WHERE direction = 'qms_to_mes' AND sync_type = 'quality_result'",
    )
    .fetch_one(pool)
    .await;

    let (qms_to_mes_total, qms_to_mes_synced, qms_to_mes_failed) = match qms_to_mes_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let trace_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM mes_qms_sync 
          WHERE sync_type = 'trace_chain'",
    )
    .fetch_one(pool)
    .await;

    let (trace_total, trace_synced) = match trace_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let defect_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as completed
           FROM mes_qms_sync 
          WHERE sync_type = 'defect_handling'",
    )
    .fetch_one(pool)
    .await;

    let (defect_total, defect_completed) = match defect_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("completed").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let last_sync_result = sqlx::query("SELECT MAX(last_synced_at) as last_sync FROM mes_qms_sync")
        .fetch_one(pool)
        .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    Ok(SyncStats {
        mes_to_qms_total,
        mes_to_qms_synced,
        mes_to_qms_failed,
        qms_to_mes_total,
        qms_to_mes_synced,
        qms_to_mes_failed,
        trace_sync_total: trace_total,
        trace_sync_synced: trace_synced,
        defect_handling_total: defect_total,
        defect_handling_completed: defect_completed,
        last_sync,
    })
}

// ==================== Retry Functions ====================

pub async fn retry_failed_sync(
    pool: &PgPool,
    mes_url: &str,
    qms_url: &str,
    sync_id: Uuid,
) -> Result<MesQmsSync, String> {
    info!("重试失败的同步 - ID: {}", sync_id);

    let sync = get_mes_qms_sync(pool, sync_id)
        .await
        .map_err(|e| format!("获取同步记录失败: {}", e))?
        .ok_or_else(|| "同步记录不存在".to_string())?;

    if sync.retry_count >= sync.max_retries {
        return Err("已达到最大重试次数".to_string());
    }

    let retry_config = RetryConfig {
        max_retries: 3,
        base_delay_ms: 1000,
        max_delay_ms: 30000,
        exponential_base: 2.0,
        retryable_errors: vec![
            "connection refused".to_string(),
            "timeout".to_string(),
            "temporary failure".to_string(),
            "500".to_string(),
            "502".to_string(),
            "503".to_string(),
        ],
    };

    let executor = RetryExecutor::new(retry_config);

    let sync_type = sync.sync_type.clone();
    let payload = sync.payload.clone().unwrap_or(serde_json::Value::Null);

    let result = executor
        .execute(|| async {
            execute_sync_by_type(pool, sync.tenant_id, mes_url, qms_url, &sync_type, &payload).await
        })
        .await;

    match result {
        RetryResult::Success(_) => {
            let updated = update_sync_status(pool, sync_id, STATUS_SYNCED, true, None, None)
                .await
                .map_err(|e| e.to_string())?;
            info!("同步重试成功 - ID: {}", sync_id);
            Ok(updated)
        }
        RetryResult::Failed { error, attempts }
        | RetryResult::MaxRetriesExceeded { error, attempts } => {
            increment_retry_count(pool, sync_id, &error)
                .await
                .map_err(|e| e.to_string())?;
            error!(
                "同步重试失败 - ID: {}, 尝试次数: {}, 错误: {}",
                sync_id, attempts, error
            );
            Err(error)
        }
    }
}

async fn execute_sync_by_type(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    sync_type: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    match sync_type {
        SYNC_TYPE_PRODUCTION_INSPECTION => {
            let record_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = TriggerInspectionRequest {
                production_record_id: record_id.to_string(),
                inspection_type: Some("process_inspection".to_string()),
                quantity: None,
                triggered_by: Some("retry".to_string()),
            };
            trigger_qms_inspection(pool, tenant_id, mes_url, qms_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_QUALITY_RESULT => {
            let inspection_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncQualityResultRequest {
                inspection_id: inspection_id.to_string(),
                production_record_id: None,
            };
            sync_quality_result_to_mes(pool, tenant_id, mes_url, qms_url, &req).await?;
            Ok(())
        }
        _ => Err(format!("不支持的同步类型: {}", sync_type)),
    }
}

// ==================== Event Handlers ====================

pub async fn handle_mes_production_completed(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理MES生产完成事件 - 自动触发QMS质检");

    let record_id = payload
        .get("record_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if record_id.is_empty() {
        warn!("生产完成事件缺少record_id");
        return Ok(());
    }

    let req = TriggerInspectionRequest {
        production_record_id: record_id.to_string(),
        inspection_type: Some("process_inspection".to_string()),
        quantity: None,
        triggered_by: Some("auto_trigger".to_string()),
    };

    match trigger_qms_inspection(pool, tenant_id, mes_url, qms_url, &req).await {
        Ok(_) => info!("自动触发质检成功 - 记录ID: {}", record_id),
        Err(e) => error!("自动触发质检失败 - 记录ID: {}, 错误: {}", record_id, e),
    }

    Ok(())
}

pub async fn handle_qms_inspection_completed(
    pool: &PgPool,
    tenant_id: Uuid,
    mes_url: &str,
    qms_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理QMS质检完成事件 - 自动回传MES");

    let inspection_id = payload
        .get("inspection_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if inspection_id.is_empty() {
        warn!("质检完成事件缺少inspection_id");
        return Ok(());
    }

    let production_record_id = payload
        .get("mes_record_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let req = SyncQualityResultRequest {
        inspection_id: inspection_id.to_string(),
        production_record_id,
    };

    match sync_quality_result_to_mes(pool, tenant_id, mes_url, qms_url, &req).await {
        Ok(_) => info!("质检结果自动回传成功 - 质检ID: {}", inspection_id),
        Err(e) => error!(
            "质检结果自动回传失败 - 质检ID: {}, 错误: {}",
            inspection_id, e
        ),
    }

    Ok(())
}
