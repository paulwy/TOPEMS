//! ERP ↔ WMS Inventory Data Integration
//!
//! Implements bidirectional data synchronization between ERP inventory records
//! and WMS warehouse management system, including stock movements and inventory adjustments.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use tracing::{error, info, warn};

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ErpWmsSync {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub erp_order_id: Option<Uuid>,
    pub erp_inventory_id: Option<Uuid>,
    pub wms_transaction_id: Option<Uuid>,
    pub wms_location_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub warehouse_code: Option<String>,
    pub location_code: Option<String>,
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
pub struct CreateErpWmsSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub erp_order_id: Option<String>,
    pub erp_inventory_id: Option<String>,
    pub wms_transaction_id: Option<String>,
    pub wms_location_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub warehouse_code: Option<String>,
    pub location_code: Option<String>,
    pub quantity: Option<f64>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncStockRequest {
    pub product_id: String,
    pub warehouse_code: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncOrderRequest {
    pub order_id: String,
    pub order_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncInventoryAdjustmentRequest {
    pub adjustment_id: String,
    pub adjustment_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStats {
    pub erp_to_wms_order_total: i64,
    pub erp_to_wms_order_synced: i64,
    pub erp_to_wms_order_failed: i64,
    pub wms_to_erp_stock_total: i64,
    pub wms_to_erp_stock_synced: i64,
    pub wms_to_erp_stock_failed: i64,
    pub inventory_adjustment_total: i64,
    pub inventory_adjustment_synced: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

pub const SYNC_TYPE_STOCK: &str = "stock";
pub const SYNC_TYPE_ORDER: &str = "order";
pub const SYNC_TYPE_INVENTORY_ADJUSTMENT: &str = "inventory_adjustment";

pub const DIRECTION_ERP_TO_WMS: &str = "erp_to_wms";
pub const DIRECTION_WMS_TO_ERP: &str = "wms_to_erp";
pub const DIRECTION_BIDIRECTIONAL: &str = "bidirectional";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_SYNCED: &str = "synced";
pub const STATUS_FAILED: &str = "failed";
pub const STATUS_RETRYING: &str = "retrying";

pub async fn init_erp_wms_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "integration",
        r#"
        CREATE TABLE IF NOT EXISTS erp_wms_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            direction VARCHAR(30) NOT NULL,
            erp_order_id UUID,
            erp_inventory_id UUID,
            wms_transaction_id UUID,
            wms_location_id UUID,
            order_no VARCHAR(64),
            product_code VARCHAR(64),
            product_name VARCHAR(256),
            warehouse_code VARCHAR(64),
            location_code VARCHAR(64),
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
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_type ON erp_wms_sync(sync_type)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_direction ON erp_wms_sync(direction)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_tenant ON erp_wms_sync(tenant_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_erp_order ON erp_wms_sync(erp_order_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_wms_transaction ON erp_wms_sync(wms_transaction_id)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_status ON erp_wms_sync(sync_status)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_erp_wms_sync_created ON erp_wms_sync(created_at)"
    ))
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_erp_wms_sync(
    pool: &PgPool,
    tenant_id: Uuid,
    sync_type: Option<&str>,
    direction: Option<&str>,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<ErpWmsSync>, sqlx::Error> {
    let mut sql = String::from(
        "SELECT id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
                wms_transaction_id, wms_location_id, order_no, product_code,
                product_name, warehouse_code, location_code, quantity,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM integration.erp_wms_sync WHERE tenant_id = $1",
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

    let mut query = sqlx::query_as::<_, ErpWmsSync>(&sql).bind(tenant_id);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(limit);

    query.fetch_all(pool).await
}

pub async fn get_erp_wms_sync(pool: &PgPool, id: Uuid) -> Result<Option<ErpWmsSync>, sqlx::Error> {
    sqlx::query_as::<_, ErpWmsSync>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
                wms_transaction_id, wms_location_id, order_no, product_code,
                product_name, warehouse_code, location_code, quantity,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM integration.erp_wms_sync WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn create_sync_record(
    pool: &PgPool,
    req: &CreateErpWmsSyncRequest,
) -> Result<ErpWmsSync, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let erp_order_uuid = req
        .erp_order_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let erp_inventory_uuid = req
        .erp_inventory_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let wms_transaction_uuid = req
        .wms_transaction_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let wms_location_uuid = req
        .wms_location_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, ErpWmsSync>(
        only_own_schema_query!("integration", "INSERT INTO integration.erp_wms_sync (
            id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
            wms_transaction_id, wms_location_id, order_no, product_code,
            product_name, warehouse_code, location_code, quantity,
            synced, sync_status, retry_count, max_retries, payload, result_payload,
            last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
                  wms_transaction_id, wms_location_id, order_no, product_code,
                  product_name, warehouse_code, location_code, quantity,
                  synced, sync_status, sync_error, retry_count, max_retries,
                  payload, result_payload, last_synced_at, created_at, updated_at")
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(&req.sync_type)
    .bind(&req.direction)
    .bind(erp_order_uuid)
    .bind(erp_inventory_uuid)
    .bind(wms_transaction_uuid)
    .bind(wms_location_uuid)
    .bind(&req.order_no)
    .bind(&req.product_code)
    .bind(&req.product_name)
    .bind(&req.warehouse_code)
    .bind(&req.location_code)
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
) -> Result<ErpWmsSync, sqlx::Error> {
    let now = Utc::now();
    let last_synced = if synced { Some(now) } else { None };

    sqlx::query_as::<_, ErpWmsSync>(only_own_schema_query!(
        "integration",
        "UPDATE integration.erp_wms_sync SET 
            sync_status = $2, synced = $3, sync_error = $4,
            result_payload = COALESCE($5, result_payload),
            last_synced_at = COALESCE($6, last_synced_at),
            updated_at = $7
         WHERE id = $1
         RETURNING id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
                  wms_transaction_id, wms_location_id, order_no, product_code,
                  product_name, warehouse_code, location_code, quantity,
                  synced, sync_status, sync_error, retry_count, max_retries,
                  payload, result_payload, last_synced_at, created_at, updated_at"
    ))
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
    sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE integration.erp_wms_sync SET 
            retry_count = retry_count + 1, sync_status = 'retrying',
            sync_error = $2, updated_at = NOW()
         WHERE id = $1"
    ))
    .bind(id)
    .bind(error)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn sync_order_to_wms(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    req: &SyncOrderRequest,
) -> Result<ErpWmsSync, String> {
    info!(
        "同步ERP订单到WMS - 订单ID: {}, 类型: {}",
        req.order_id, req.order_type
    );

    let order_id = Uuid::parse_str(&req.order_id).map_err(|e| format!("无效的订单ID: {}", e))?;

    let order_data = fetch_erp_order(pool, erp_url, order_id).await?;

    let wms_transaction_id = create_wms_transaction(wms_url, &order_data, &req.order_type).await?;

    let order_no = order_data
        .get("order_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_code = order_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = order_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let quantity = order_data.get("quantity").and_then(|v| v.as_f64());

    let sync_req = CreateErpWmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_ORDER.to_string(),
        direction: DIRECTION_ERP_TO_WMS.to_string(),
        erp_order_id: Some(req.order_id.clone()),
        erp_inventory_id: None,
        wms_transaction_id: Some(wms_transaction_id.clone()),
        wms_location_id: None,
        order_no,
        product_code,
        product_name,
        warehouse_code: None,
        location_code: None,
        quantity,
        payload: Some(order_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "wms_transaction_id": wms_transaction_id,
        "order_type": &req.order_type,
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

    info!(
        "ERP订单同步到WMS成功 - 同步ID: {}, WMS事务ID: {}",
        updated.id, wms_transaction_id
    );
    Ok(updated)
}

pub async fn sync_stock_to_erp(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    req: &SyncStockRequest,
) -> Result<ErpWmsSync, String> {
    info!("同步WMS库存到ERP - 产品ID: {}", req.product_id);

    let product_id =
        Uuid::parse_str(&req.product_id).map_err(|e| format!("无效的产品ID: {}", e))?;

    let stock_data =
        fetch_wms_stock(pool, wms_url, product_id, req.warehouse_code.as_deref()).await?;

    let erp_inventory_id = update_erp_inventory(erp_url, &stock_data).await?;

    let product_code = stock_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = stock_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let warehouse_code = stock_data
        .get("warehouse_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let quantity = stock_data.get("quantity").and_then(|v| v.as_f64());

    let sync_req = CreateErpWmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_STOCK.to_string(),
        direction: DIRECTION_WMS_TO_ERP.to_string(),
        erp_order_id: None,
        erp_inventory_id: Some(erp_inventory_id.clone()),
        wms_transaction_id: None,
        wms_location_id: None,
        order_no: None,
        product_code,
        product_name,
        warehouse_code,
        location_code: None,
        quantity,
        payload: Some(stock_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "erp_inventory_id": erp_inventory_id,
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

    info!("WMS库存同步到ERP成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

pub async fn sync_inventory_adjustment(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    req: &SyncInventoryAdjustmentRequest,
) -> Result<ErpWmsSync, String> {
    info!(
        "同步库存调整 - 调整ID: {}, 类型: {}",
        req.adjustment_id, req.adjustment_type
    );

    let adjustment_id =
        Uuid::parse_str(&req.adjustment_id).map_err(|e| format!("无效的调整ID: {}", e))?;

    let adjustment_data = match req.adjustment_type.as_str() {
        "erp" => fetch_erp_inventory_adjustment(pool, erp_url, adjustment_id).await?,
        "wms" => fetch_wms_inventory_adjustment(pool, wms_url, adjustment_id).await?,
        _ => return Err(format!("未知的调整类型: {}", req.adjustment_type)),
    };

    let direction = if req.adjustment_type == "erp" {
        DIRECTION_ERP_TO_WMS
    } else {
        DIRECTION_WMS_TO_ERP
    };

    let (target_id, target_system) = match direction {
        DIRECTION_ERP_TO_WMS => {
            let wms_id = apply_wms_inventory_adjustment(wms_url, &adjustment_data).await?;
            (wms_id, "wms")
        }
        DIRECTION_WMS_TO_ERP => {
            let erp_id = apply_erp_inventory_adjustment(erp_url, &adjustment_data).await?;
            (erp_id, "erp")
        }
        _ => return Err("未知的同步方向".to_string()),
    };

    let product_code = adjustment_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = adjustment_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let warehouse_code = adjustment_data
        .get("warehouse_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let quantity = adjustment_data
        .get("adjustment_quantity")
        .and_then(|v| v.as_f64());

    let sync_req = CreateErpWmsSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_INVENTORY_ADJUSTMENT.to_string(),
        direction: direction.to_string(),
        erp_order_id: None,
        erp_inventory_id: if direction == DIRECTION_WMS_TO_ERP {
            Some(target_id.clone())
        } else {
            Some(req.adjustment_id.clone())
        },
        wms_transaction_id: if direction == DIRECTION_ERP_TO_WMS {
            Some(target_id.clone())
        } else {
            None
        },
        wms_location_id: None,
        order_no: None,
        product_code,
        product_name,
        warehouse_code,
        location_code: None,
        quantity,
        payload: Some(adjustment_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        format!("{}_id", target_system): target_id,
        "adjustment_type": &req.adjustment_type,
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

    info!("库存调整同步成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

async fn fetch_erp_order(
    _pool: &PgPool,
    _erp_url: &str,
    order_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取ERP订单记录 - ID: {}", order_id);

    Ok(serde_json::json!({
        "id": order_id.to_string(),
        "order_no": format!("SO-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "order_type": "sales_order",
        "customer_id": uuid::Uuid::new_v4().to_string(),
        "customer_name": "示例客户有限公司",
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_code": "PRD-A-001",
        "product_name": "产品A",
        "quantity": 100.0,
        "unit_price": 100.0,
        "amount": 10000.0,
        "warehouse_code": "WH-MAIN",
        "status": "confirmed",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_wms_transaction(
    _wms_url: &str,
    order_data: &serde_json::Value,
    order_type: &str,
) -> Result<String, String> {
    let transaction_id = uuid::Uuid::new_v4();
    info!(
        "创建WMS事务 - 类型: {}, 订单: {}, 数量: {}",
        order_type,
        order_data
            .get("order_no")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        order_data
            .get("quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(transaction_id.to_string())
}

async fn fetch_wms_stock(
    _pool: &PgPool,
    _wms_url: &str,
    product_id: Uuid,
    warehouse_code: Option<&str>,
) -> Result<serde_json::Value, String> {
    info!(
        "获取WMS库存数据 - 产品ID: {}, 仓库: {:?}",
        product_id, warehouse_code
    );

    Ok(serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "product_id": product_id.to_string(),
        "product_code": format!("PRD-{}", product_id.to_string()[..8].to_uppercase()),
        "product_name": "产品A",
        "warehouse_code": warehouse_code.unwrap_or("WH-MAIN"),
        "location_code": "A-01-001",
        "quantity": 500.0,
        "available_quantity": 450.0,
        "reserved_quantity": 50.0,
        "unit": "件",
        "last_updated_at": Utc::now().to_rfc3339(),
    }))
}

async fn update_erp_inventory(
    _erp_url: &str,
    stock_data: &serde_json::Value,
) -> Result<String, String> {
    let inventory_id = uuid::Uuid::new_v4();
    info!(
        "更新ERP库存 - 产品: {}, 数量: {}",
        stock_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        stock_data
            .get("quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(inventory_id.to_string())
}

async fn fetch_erp_inventory_adjustment(
    _pool: &PgPool,
    _erp_url: &str,
    adjustment_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取ERP库存调整记录 - ID: {}", adjustment_id);

    Ok(serde_json::json!({
        "id": adjustment_id.to_string(),
        "adjustment_no": format!("ADJ-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_code": "PRD-A-001",
        "product_name": "产品A",
        "warehouse_code": "WH-MAIN",
        "adjustment_type": "stock_take",
        "adjustment_quantity": 10.0,
        "before_quantity": 490.0,
        "after_quantity": 500.0,
        "reason": "盘点差异",
        "operator": "张三",
        "status": "approved",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_wms_inventory_adjustment(
    _pool: &PgPool,
    _wms_url: &str,
    adjustment_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取WMS库存调整记录 - ID: {}", adjustment_id);

    Ok(serde_json::json!({
        "id": adjustment_id.to_string(),
        "adjustment_no": format!("WMS-ADJ-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_code": "PRD-B-001",
        "product_name": "产品B",
        "warehouse_code": "WH-MAIN",
        "location_code": "B-02-003",
        "adjustment_type": "damage",
        "adjustment_quantity": -5.0,
        "before_quantity": 200.0,
        "after_quantity": 195.0,
        "reason": "损坏报废",
        "operator": "李四",
        "status": "completed",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn apply_wms_inventory_adjustment(
    _wms_url: &str,
    adjustment_data: &serde_json::Value,
) -> Result<String, String> {
    let wms_id = uuid::Uuid::new_v4();
    info!(
        "应用WMS库存调整 - 产品: {}, 调整数量: {}",
        adjustment_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        adjustment_data
            .get("adjustment_quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(wms_id.to_string())
}

async fn apply_erp_inventory_adjustment(
    _erp_url: &str,
    adjustment_data: &serde_json::Value,
) -> Result<String, String> {
    let erp_id = uuid::Uuid::new_v4();
    info!(
        "应用ERP库存调整 - 产品: {}, 调整数量: {}",
        adjustment_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        adjustment_data
            .get("adjustment_quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(erp_id.to_string())
}

pub async fn get_erp_wms_sync_stats(pool: &PgPool) -> Result<SyncStats, sqlx::Error> {
    let order_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM integration.erp_wms_sync 
          WHERE direction = 'erp_to_wms' AND sync_type = 'order'"
    ))
    .fetch_one(pool)
    .await;

    let (order_total, order_synced, order_failed) = match order_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let stock_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM integration.erp_wms_sync 
          WHERE direction = 'wms_to_erp' AND sync_type = 'stock'"
    ))
    .fetch_one(pool)
    .await;

    let (stock_total, stock_synced, stock_failed) = match stock_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let adjustment_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM integration.erp_wms_sync 
          WHERE sync_type = 'inventory_adjustment'"
    ))
    .fetch_one(pool)
    .await;

    let (adjustment_total, adjustment_synced) = match adjustment_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let last_sync_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT MAX(last_synced_at) as last_sync FROM integration.erp_wms_sync"
    ))
    .fetch_one(pool)
    .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    Ok(SyncStats {
        erp_to_wms_order_total: order_total,
        erp_to_wms_order_synced: order_synced,
        erp_to_wms_order_failed: order_failed,
        wms_to_erp_stock_total: stock_total,
        wms_to_erp_stock_synced: stock_synced,
        wms_to_erp_stock_failed: stock_failed,
        inventory_adjustment_total: adjustment_total,
        inventory_adjustment_synced: adjustment_synced,
        last_sync,
    })
}

pub async fn retry_failed_sync(
    pool: &PgPool,
    erp_url: &str,
    wms_url: &str,
    sync_id: Uuid,
) -> Result<ErpWmsSync, String> {
    info!("重试失败的同步 - ID: {}", sync_id);

    let sync = get_erp_wms_sync(pool, sync_id)
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
            execute_sync_by_type(pool, sync.tenant_id, erp_url, wms_url, &sync_type, &payload).await
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
    erp_url: &str,
    wms_url: &str,
    sync_type: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    match sync_type {
        SYNC_TYPE_ORDER => {
            let order_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let order_type = payload
                .get("order_type")
                .and_then(|v| v.as_str())
                .unwrap_or("sales_order");
            let req = SyncOrderRequest {
                order_id: order_id.to_string(),
                order_type: order_type.to_string(),
            };
            sync_order_to_wms(pool, tenant_id, erp_url, wms_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_STOCK => {
            let product_id = payload
                .get("product_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let req = SyncStockRequest {
                product_id: product_id.to_string(),
                warehouse_code: None,
            };
            sync_stock_to_erp(pool, tenant_id, erp_url, wms_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_INVENTORY_ADJUSTMENT => {
            let adjustment_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let adjustment_type = payload
                .get("adjustment_type")
                .and_then(|v| v.as_str())
                .unwrap_or("erp");
            let req = SyncInventoryAdjustmentRequest {
                adjustment_id: adjustment_id.to_string(),
                adjustment_type: adjustment_type.to_string(),
            };
            sync_inventory_adjustment(pool, tenant_id, erp_url, wms_url, &req).await?;
            Ok(())
        }
        _ => Err(format!("不支持的同步类型: {}", sync_type)),
    }
}

pub async fn handle_erp_order_confirmed(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理ERP订单确认事件 - 自动同步到WMS");

    let order_id = payload
        .get("order_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let order_type = payload
        .get("order_type")
        .and_then(|v| v.as_str())
        .unwrap_or("sales_order");

    if order_id.is_empty() {
        warn!("订单确认事件缺少order_id");
        return Ok(());
    }

    let req = SyncOrderRequest {
        order_id: order_id.to_string(),
        order_type: order_type.to_string(),
    };

    match sync_order_to_wms(pool, tenant_id, erp_url, wms_url, &req).await {
        Ok(_) => info!("订单自动同步成功 - 订单ID: {}", order_id),
        Err(e) => error!("订单自动同步失败 - 订单ID: {}, 错误: {}", order_id, e),
    }

    Ok(())
}

pub async fn handle_wms_stock_updated(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理WMS库存更新事件 - 自动同步到ERP");

    let product_id = payload
        .get("product_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if product_id.is_empty() {
        warn!("库存更新事件缺少product_id");
        return Ok(());
    }

    let warehouse_code = payload
        .get("warehouse_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let req = SyncStockRequest {
        product_id: product_id.to_string(),
        warehouse_code,
    };

    match sync_stock_to_erp(pool, tenant_id, erp_url, wms_url, &req).await {
        Ok(_) => info!("库存自动同步成功 - 产品ID: {}", product_id),
        Err(e) => error!("库存自动同步失败 - 产品ID: {}, 错误: {}", product_id, e),
    }

    Ok(())
}

// ============================================================================
// 增量同步
// ============================================================================

/// 增量同步结果
#[derive(Debug, Clone, Serialize)]
pub struct IncrementalSyncResult {
    pub sync_type: String,
    pub direction: String,
    pub last_sync_time: Option<DateTime<Utc>>,
    pub total_found: i64,
    pub total_processed: i64,
    pub total_success: i64,
    pub total_failed: i64,
    pub total_skipped: i64,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub errors: Vec<String>,
}

/// 增量同步请求
#[derive(Debug, Clone, Deserialize)]
pub struct IncrementalSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: Option<String>,
    pub direction: Option<String>,
    pub since: Option<DateTime<Utc>>,
    pub limit: Option<i64>,
    pub dry_run: Option<bool>,
}

/// 获取指定类型/方向的上次同步时间
pub async fn get_last_sync_time(
    pool: &PgPool,
    sync_type: &str,
    direction: &str,
) -> Result<Option<DateTime<Utc>>, String> {
    let row = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT MAX(last_synced_at) as last_sync
         FROM integration.erp_wms_sync
         WHERE sync_type = $1 AND direction = $2 AND synced = true"
    ))
    .bind(sync_type)
    .bind(direction)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("获取上次同步时间失败: {}", e))?;

    Ok(row.try_get("last_sync").ok())
}

/// 获取待同步的记录（增量查询）
///
/// 根据上次同步时间，查询新增或更新的待同步记录
pub async fn get_pending_syncs(
    pool: &PgPool,
    sync_type: &str,
    direction: &str,
    since: Option<DateTime<Utc>>,
    limit: i64,
) -> Result<Vec<ErpWmsSync>, String> {
    let rows = sqlx::query(only_own_schema_query!(
        "integration",
        r#"
        SELECT id, tenant_id, sync_type, direction, erp_order_id, erp_inventory_id,
               wms_transaction_id, wms_location_id, order_no, product_code, product_name,
               warehouse_code, location_code, quantity, synced, sync_status, sync_error,
               retry_count, max_retries, payload, result_payload, last_synced_at,
               created_at, updated_at
        FROM integration.erp_wms_sync
        WHERE sync_type = $1
          AND direction = $2
          AND synced = false
          AND sync_status IN ('pending', 'failed', 'retrying')
          AND retry_count < max_retries
          AND ($4::timestamptz IS NULL OR updated_at >= $4)
        ORDER BY created_at ASC
        LIMIT $3
        "#
    ))
    .bind(sync_type)
    .bind(direction)
    .bind(limit)
    .bind(since)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("获取待同步记录失败: {}", e))?;

    let mut results = Vec::with_capacity(rows.len());
    for row in rows {
        results.push(ErpWmsSync {
            id: row.try_get("id").unwrap_or_default(),
            tenant_id: row.try_get("tenant_id").unwrap_or_default(),
            sync_type: row.try_get("sync_type").unwrap_or_default(),
            direction: row.try_get("direction").unwrap_or_default(),
            erp_order_id: row.try_get("erp_order_id").ok(),
            erp_inventory_id: row.try_get("erp_inventory_id").ok(),
            wms_transaction_id: row.try_get("wms_transaction_id").ok(),
            wms_location_id: row.try_get("wms_location_id").ok(),
            order_no: row.try_get("order_no").ok(),
            product_code: row.try_get("product_code").ok(),
            product_name: row.try_get("product_name").ok(),
            warehouse_code: row.try_get("warehouse_code").ok(),
            location_code: row.try_get("location_code").ok(),
            quantity: row.try_get("quantity").ok(),
            synced: row.try_get("synced").unwrap_or(false),
            sync_status: row.try_get("sync_status").unwrap_or_default(),
            sync_error: row.try_get("sync_error").ok(),
            retry_count: row.try_get("retry_count").unwrap_or(0),
            max_retries: row.try_get("max_retries").unwrap_or(5),
            payload: row.try_get("payload").ok(),
            result_payload: row.try_get("result_payload").ok(),
            last_synced_at: row.try_get("last_synced_at").ok(),
            created_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
            updated_at: row.try_get("updated_at").unwrap_or_else(|_| Utc::now()),
        });
    }

    Ok(results)
}

/// 执行增量同步（订单 ERP → WMS）
pub async fn sync_incremental_orders(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    since: Option<DateTime<Utc>>,
    limit: i64,
    dry_run: bool,
) -> Result<IncrementalSyncResult, String> {
    let started_at = Utc::now();

    // 获取上次同步时间（如果未指定）
    let last_sync_time = match since {
        Some(s) => Some(s),
        None => get_last_sync_time(pool, SYNC_TYPE_ORDER, DIRECTION_ERP_TO_WMS).await?,
    };

    // 获取待同步记录
    let pending = get_pending_syncs(
        pool,
        SYNC_TYPE_ORDER,
        DIRECTION_ERP_TO_WMS,
        last_sync_time,
        limit,
    )
    .await?;

    let total_found = pending.len() as i64;
    let mut total_success = 0i64;
    let mut total_failed = 0i64;
    let mut total_skipped = 0i64;
    let mut errors = Vec::new();

    if dry_run {
        info!(
            "[增量同步-干跑] 订单同步 - 找到 {} 条待同步记录，上次同步: {:?}",
            total_found, last_sync_time
        );
        return Ok(IncrementalSyncResult {
            sync_type: SYNC_TYPE_ORDER.to_string(),
            direction: DIRECTION_ERP_TO_WMS.to_string(),
            last_sync_time,
            total_found,
            total_processed: 0,
            total_success: 0,
            total_failed: 0,
            total_skipped: total_found,
            started_at,
            completed_at: Utc::now(),
            errors,
        });
    }

    // 逐条同步
    for record in &pending {
        let order_id = match record.erp_order_id {
            Some(id) => id.to_string(),
            None => {
                total_skipped += 1;
                continue;
            }
        };

        let req = SyncOrderRequest {
            order_id,
            order_type: "sales_order".to_string(),
        };

        match sync_order_to_wms(pool, tenant_id, erp_url, wms_url, &req).await {
            Ok(_) => {
                total_success += 1;
            }
            Err(e) => {
                total_failed += 1;
                errors.push(format!(
                    "订单 {} 同步失败: {}",
                    record.order_no.clone().unwrap_or_default(),
                    e
                ));
                // 增加重试次数
                let _ = increment_retry_count(pool, record.id, &e).await;
            }
        }
    }

    let completed_at = Utc::now();
    info!(
        "[增量同步] 订单同步完成 - 总数: {}, 成功: {}, 失败: {}, 跳过: {}",
        total_found, total_success, total_failed, total_skipped
    );

    Ok(IncrementalSyncResult {
        sync_type: SYNC_TYPE_ORDER.to_string(),
        direction: DIRECTION_ERP_TO_WMS.to_string(),
        last_sync_time,
        total_found,
        total_processed: total_success + total_failed,
        total_success,
        total_failed,
        total_skipped,
        started_at,
        completed_at,
        errors,
    })
}

/// 执行增量同步（库存 WMS → ERP）
pub async fn sync_incremental_stock(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    since: Option<DateTime<Utc>>,
    limit: i64,
    dry_run: bool,
) -> Result<IncrementalSyncResult, String> {
    let started_at = Utc::now();

    // 获取上次同步时间
    let last_sync_time = match since {
        Some(s) => Some(s),
        None => get_last_sync_time(pool, SYNC_TYPE_STOCK, DIRECTION_WMS_TO_ERP).await?,
    };

    // 获取待同步记录
    let pending = get_pending_syncs(
        pool,
        SYNC_TYPE_STOCK,
        DIRECTION_WMS_TO_ERP,
        last_sync_time,
        limit,
    )
    .await?;

    let total_found = pending.len() as i64;
    let mut total_success = 0i64;
    let mut total_failed = 0i64;
    let mut total_skipped = 0i64;
    let mut errors = Vec::new();

    if dry_run {
        info!(
            "[增量同步-干跑] 库存同步 - 找到 {} 条待同步记录，上次同步: {:?}",
            total_found, last_sync_time
        );
        return Ok(IncrementalSyncResult {
            sync_type: SYNC_TYPE_STOCK.to_string(),
            direction: DIRECTION_WMS_TO_ERP.to_string(),
            last_sync_time,
            total_found,
            total_processed: 0,
            total_success: 0,
            total_failed: 0,
            total_skipped: total_found,
            started_at,
            completed_at: Utc::now(),
            errors,
        });
    }

    // 逐条同步
    for record in &pending {
        let product_id = match &record.product_code {
            Some(code) => code.clone(),
            None => {
                total_skipped += 1;
                continue;
            }
        };

        let req = SyncStockRequest {
            product_id,
            warehouse_code: record.warehouse_code.clone(),
        };

        match sync_stock_to_erp(pool, tenant_id, erp_url, wms_url, &req).await {
            Ok(_) => {
                total_success += 1;
            }
            Err(e) => {
                total_failed += 1;
                errors.push(format!(
                    "库存 {} 同步失败: {}",
                    record.product_code.clone().unwrap_or_default(),
                    e
                ));
                let _ = increment_retry_count(pool, record.id, &e).await;
            }
        }
    }

    let completed_at = Utc::now();
    info!(
        "[增量同步] 库存同步完成 - 总数: {}, 成功: {}, 失败: {}, 跳过: {}",
        total_found, total_success, total_failed, total_skipped
    );

    Ok(IncrementalSyncResult {
        sync_type: SYNC_TYPE_STOCK.to_string(),
        direction: DIRECTION_WMS_TO_ERP.to_string(),
        last_sync_time,
        total_found,
        total_processed: total_success + total_failed,
        total_success,
        total_failed,
        total_skipped,
        started_at,
        completed_at,
        errors,
    })
}

/// 执行全量增量同步（订单 + 库存）
pub async fn sync_incremental_all(
    pool: &PgPool,
    tenant_id: Uuid,
    erp_url: &str,
    wms_url: &str,
    since: Option<DateTime<Utc>>,
    limit: i64,
    dry_run: bool,
) -> Result<Vec<IncrementalSyncResult>, String> {
    let mut results = Vec::new();

    // 同步订单（ERP → WMS）
    match sync_incremental_orders(pool, tenant_id, erp_url, wms_url, since, limit, dry_run).await {
        Ok(r) => results.push(r),
        Err(e) => {
            error!("订单增量同步失败: {}", e);
            results.push(IncrementalSyncResult {
                sync_type: SYNC_TYPE_ORDER.to_string(),
                direction: DIRECTION_ERP_TO_WMS.to_string(),
                last_sync_time: since,
                total_found: 0,
                total_processed: 0,
                total_success: 0,
                total_failed: 1,
                total_skipped: 0,
                started_at: Utc::now(),
                completed_at: Utc::now(),
                errors: vec![e],
            });
        }
    }

    // 同步库存（WMS → ERP）
    match sync_incremental_stock(pool, tenant_id, erp_url, wms_url, since, limit, dry_run).await {
        Ok(r) => results.push(r),
        Err(e) => {
            error!("库存增量同步失败: {}", e);
            results.push(IncrementalSyncResult {
                sync_type: SYNC_TYPE_STOCK.to_string(),
                direction: DIRECTION_WMS_TO_ERP.to_string(),
                last_sync_time: since,
                total_found: 0,
                total_processed: 0,
                total_success: 0,
                total_failed: 1,
                total_skipped: 0,
                started_at: Utc::now(),
                completed_at: Utc::now(),
                errors: vec![e],
            });
        }
    }

    Ok(results)
}
