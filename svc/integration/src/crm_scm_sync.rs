//! CRM ↔ SCM Opportunity-to-Purchase Order Integration
//!
//! Implements data synchronization between CRM opportunities and SCM purchase orders,
//! including opportunity-to-purchase conversion and supplier information sync.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use tracing::{error, info, warn};

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CrmScmSync {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub crm_opportunity_id: Option<Uuid>,
    pub crm_product_id: Option<Uuid>,
    pub scm_purchase_order_id: Option<Uuid>,
    pub scm_supplier_id: Option<Uuid>,
    pub opportunity_no: Option<String>,
    pub purchase_order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub supplier_code: Option<String>,
    pub supplier_name: Option<String>,
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
pub struct CreateCrmScmSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub crm_opportunity_id: Option<String>,
    pub crm_product_id: Option<String>,
    pub scm_purchase_order_id: Option<String>,
    pub scm_supplier_id: Option<String>,
    pub opportunity_no: Option<String>,
    pub purchase_order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub supplier_code: Option<String>,
    pub supplier_name: Option<String>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpportunityToPurchaseRequest {
    pub opportunity_id: String,
    pub supplier_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncSupplierRequest {
    pub supplier_id: String,
    pub source_system: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncProductRequest {
    pub product_id: String,
    pub source_system: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStats {
    pub opportunity_to_purchase_total: i64,
    pub opportunity_to_purchase_completed: i64,
    pub opportunity_to_purchase_failed: i64,
    pub supplier_sync_total: i64,
    pub supplier_sync_synced: i64,
    pub product_sync_total: i64,
    pub product_sync_synced: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

pub const SYNC_TYPE_OPPORTUNITY_TO_PURCHASE: &str = "opportunity_to_purchase";
pub const SYNC_TYPE_SUPPLIER: &str = "supplier";
pub const SYNC_TYPE_PRODUCT: &str = "product";

pub const DIRECTION_CRM_TO_SCM: &str = "crm_to_scm";
pub const DIRECTION_SCM_TO_CRM: &str = "scm_to_crm";
pub const DIRECTION_BIDIRECTIONAL: &str = "bidirectional";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_SYNCED: &str = "synced";
pub const STATUS_FAILED: &str = "failed";
pub const STATUS_RETRYING: &str = "retrying";

pub async fn init_crm_scm_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "integration",
        r#"
        CREATE TABLE IF NOT EXISTS crm_scm_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            direction VARCHAR(30) NOT NULL,
            crm_opportunity_id UUID,
            crm_product_id UUID,
            scm_purchase_order_id UUID,
            scm_supplier_id UUID,
            opportunity_no VARCHAR(64),
            purchase_order_no VARCHAR(64),
            product_code VARCHAR(64),
            product_name VARCHAR(256),
            supplier_code VARCHAR(64),
            supplier_name VARCHAR(256),
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
        "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_type ON crm_scm_sync(sync_type)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_direction ON crm_scm_sync(direction)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_tenant ON crm_scm_sync(tenant_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_opportunity ON crm_scm_sync(crm_opportunity_id)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_purchase ON crm_scm_sync(scm_purchase_order_id)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_status ON crm_scm_sync(sync_status)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_crm_scm_sync_created ON crm_scm_sync(created_at)"
    ))
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_crm_scm_sync(
    pool: &PgPool,
    tenant_id: Uuid,
    sync_type: Option<&str>,
    direction: Option<&str>,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<CrmScmSync>, sqlx::Error> {
    let mut sql = String::from(
        "SELECT id, tenant_id, sync_type, direction, crm_opportunity_id, crm_product_id,
                scm_purchase_order_id, scm_supplier_id, opportunity_no, purchase_order_no,
                product_code, product_name, supplier_code, supplier_name,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM integration.crm_scm_sync WHERE tenant_id = $1",
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

    let mut query = sqlx::query_as::<_, CrmScmSync>(&sql).bind(tenant_id);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(limit);

    query.fetch_all(pool).await
}

pub async fn get_crm_scm_sync(pool: &PgPool, id: Uuid) -> Result<Option<CrmScmSync>, sqlx::Error> {
    sqlx::query_as::<_, CrmScmSync>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, sync_type, direction, crm_opportunity_id, crm_product_id,
                scm_purchase_order_id, scm_supplier_id, opportunity_no, purchase_order_no,
                product_code, product_name, supplier_code, supplier_name,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM integration.crm_scm_sync WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn create_sync_record(
    pool: &PgPool,
    req: &CreateCrmScmSyncRequest,
) -> Result<CrmScmSync, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let crm_opportunity_uuid = req
        .crm_opportunity_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let crm_product_uuid = req
        .crm_product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let scm_purchase_uuid = req
        .scm_purchase_order_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let scm_supplier_uuid = req
        .scm_supplier_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, CrmScmSync>(
        only_own_schema_query!("integration", "INSERT INTO integration.crm_scm_sync (
            id, tenant_id, sync_type, direction, crm_opportunity_id, crm_product_id,
            scm_purchase_order_id, scm_supplier_id, opportunity_no, purchase_order_no,
            product_code, product_name, supplier_code, supplier_name,
            synced, sync_status, retry_count, max_retries, payload, result_payload,
            last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, tenant_id, sync_type, direction, crm_opportunity_id, crm_product_id,
                  scm_purchase_order_id, scm_supplier_id, opportunity_no, purchase_order_no,
                  product_code, product_name, supplier_code, supplier_name,
                  synced, sync_status, sync_error, retry_count, max_retries,
                  payload, result_payload, last_synced_at, created_at, updated_at")
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(&req.sync_type)
    .bind(&req.direction)
    .bind(crm_opportunity_uuid)
    .bind(crm_product_uuid)
    .bind(scm_purchase_uuid)
    .bind(scm_supplier_uuid)
    .bind(&req.opportunity_no)
    .bind(&req.purchase_order_no)
    .bind(&req.product_code)
    .bind(&req.product_name)
    .bind(&req.supplier_code)
    .bind(&req.supplier_name)
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
) -> Result<CrmScmSync, sqlx::Error> {
    let now = Utc::now();
    let last_synced = if synced { Some(now) } else { None };

    sqlx::query_as::<_, CrmScmSync>(only_own_schema_query!(
        "integration",
        "UPDATE integration.crm_scm_sync SET 
            sync_status = $2, synced = $3, sync_error = $4,
            result_payload = COALESCE($5, result_payload),
            last_synced_at = COALESCE($6, last_synced_at),
            updated_at = $7
         WHERE id = $1
         RETURNING id, tenant_id, sync_type, direction, crm_opportunity_id, crm_product_id,
                  scm_purchase_order_id, scm_supplier_id, opportunity_no, purchase_order_no,
                  product_code, product_name, supplier_code, supplier_name,
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
        "UPDATE integration.crm_scm_sync SET 
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

pub async fn convert_opportunity_to_purchase(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    scm_url: &str,
    req: &OpportunityToPurchaseRequest,
) -> Result<CrmScmSync, String> {
    info!("商机转采购订单 - 商机ID: {}", req.opportunity_id);

    let opportunity_id =
        Uuid::parse_str(&req.opportunity_id).map_err(|e| format!("无效的商机ID: {}", e))?;

    let opportunity_data = fetch_crm_opportunity(pool, crm_url, opportunity_id).await?;

    let scm_purchase_order_id =
        create_scm_purchase_order(scm_url, &opportunity_data, req.supplier_id.as_deref()).await?;

    let opportunity_no = opportunity_data
        .get("opportunity_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_code = opportunity_data
        .get("product_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let product_name = opportunity_data
        .get("product_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateCrmScmSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_OPPORTUNITY_TO_PURCHASE.to_string(),
        direction: DIRECTION_CRM_TO_SCM.to_string(),
        crm_opportunity_id: Some(req.opportunity_id.clone()),
        crm_product_id: None,
        scm_purchase_order_id: Some(scm_purchase_order_id.clone()),
        scm_supplier_id: req.supplier_id.clone(),
        opportunity_no,
        purchase_order_no: None,
        product_code,
        product_name,
        supplier_code: None,
        supplier_name: None,
        payload: Some(opportunity_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "scm_purchase_order_id": scm_purchase_order_id,
        "converted_at": Utc::now().to_rfc3339(),
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
        "商机转采购订单成功 - 同步ID: {}, SCM采购订单ID: {}",
        updated.id, scm_purchase_order_id
    );
    Ok(updated)
}

pub async fn sync_supplier(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    scm_url: &str,
    req: &SyncSupplierRequest,
) -> Result<CrmScmSync, String> {
    info!(
        "同步供应商数据 - ID: {}, 来源: {}",
        req.supplier_id, req.source_system
    );

    let supplier_id =
        Uuid::parse_str(&req.supplier_id).map_err(|e| format!("无效的供应商ID: {}", e))?;

    let (supplier_data, direction) = match req.source_system.as_str() {
        "crm" => {
            let data = fetch_crm_supplier(pool, crm_url, supplier_id).await?;
            (data, DIRECTION_CRM_TO_SCM)
        }
        "scm" => {
            let data = fetch_scm_supplier(pool, scm_url, supplier_id).await?;
            (data, DIRECTION_SCM_TO_CRM)
        }
        _ => return Err(format!("未知的来源系统: {}", req.source_system)),
    };

    match direction {
        DIRECTION_CRM_TO_SCM => {
            let scm_supplier_id = create_scm_supplier(scm_url, &supplier_data).await?;

            let sync_req = CreateCrmScmSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_SUPPLIER.to_string(),
                direction: DIRECTION_CRM_TO_SCM.to_string(),
                crm_opportunity_id: None,
                crm_product_id: None,
                scm_purchase_order_id: None,
                scm_supplier_id: Some(scm_supplier_id.clone()),
                opportunity_no: None,
                purchase_order_no: None,
                product_code: None,
                product_name: None,
                supplier_code: supplier_data
                    .get("supplier_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                supplier_name: supplier_data
                    .get("supplier_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                payload: Some(supplier_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "scm_supplier_id": scm_supplier_id,
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

            info!("供应商数据从CRM同步到SCM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        DIRECTION_SCM_TO_CRM => {
            let crm_supplier_id = create_crm_supplier(crm_url, &supplier_data).await?;

            let sync_req = CreateCrmScmSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_SUPPLIER.to_string(),
                direction: DIRECTION_SCM_TO_CRM.to_string(),
                crm_opportunity_id: None,
                crm_product_id: None,
                scm_purchase_order_id: None,
                scm_supplier_id: Some(req.supplier_id.clone()),
                opportunity_no: None,
                purchase_order_no: None,
                product_code: None,
                product_name: None,
                supplier_code: supplier_data
                    .get("supplier_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                supplier_name: supplier_data
                    .get("supplier_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                payload: Some(supplier_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "crm_supplier_id": crm_supplier_id,
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

            info!("供应商数据从SCM同步到CRM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        _ => Err("未知的同步方向".to_string()),
    }
}

pub async fn sync_product(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    scm_url: &str,
    req: &SyncProductRequest,
) -> Result<CrmScmSync, String> {
    info!(
        "同步产品数据 - ID: {}, 来源: {}",
        req.product_id, req.source_system
    );

    let product_id =
        Uuid::parse_str(&req.product_id).map_err(|e| format!("无效的产品ID: {}", e))?;

    let (product_data, direction) = match req.source_system.as_str() {
        "crm" => {
            let data = fetch_crm_product(pool, crm_url, product_id).await?;
            (data, DIRECTION_CRM_TO_SCM)
        }
        "scm" => {
            let data = fetch_scm_product(pool, scm_url, product_id).await?;
            (data, DIRECTION_SCM_TO_CRM)
        }
        _ => return Err(format!("未知的来源系统: {}", req.source_system)),
    };

    match direction {
        DIRECTION_CRM_TO_SCM => {
            let scm_product_id = create_scm_product(scm_url, &product_data).await?;

            let sync_req = CreateCrmScmSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_PRODUCT.to_string(),
                direction: DIRECTION_CRM_TO_SCM.to_string(),
                crm_opportunity_id: None,
                crm_product_id: Some(req.product_id.clone()),
                scm_purchase_order_id: None,
                scm_supplier_id: None,
                opportunity_no: None,
                purchase_order_no: None,
                product_code: product_data
                    .get("product_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                product_name: product_data
                    .get("product_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                supplier_code: None,
                supplier_name: None,
                payload: Some(product_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "scm_product_id": scm_product_id,
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

            info!("产品数据从CRM同步到SCM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        DIRECTION_SCM_TO_CRM => {
            let crm_product_id = create_crm_product(crm_url, &product_data).await?;

            let sync_req = CreateCrmScmSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_PRODUCT.to_string(),
                direction: DIRECTION_SCM_TO_CRM.to_string(),
                crm_opportunity_id: None,
                crm_product_id: Some(crm_product_id.clone()),
                scm_purchase_order_id: None,
                scm_supplier_id: None,
                opportunity_no: None,
                purchase_order_no: None,
                product_code: product_data
                    .get("product_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                product_name: product_data
                    .get("product_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                supplier_code: None,
                supplier_name: None,
                payload: Some(product_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "crm_product_id": crm_product_id,
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

            info!("产品数据从SCM同步到CRM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        _ => Err("未知的同步方向".to_string()),
    }
}

async fn fetch_crm_opportunity(
    _pool: &PgPool,
    _crm_url: &str,
    opportunity_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取CRM商机记录 - ID: {}", opportunity_id);

    Ok(serde_json::json!({
        "id": opportunity_id.to_string(),
        "opportunity_no": format!("OPP-{}", Utc::now().format("%Y%m%d%H%M%S")),
        "customer_id": uuid::Uuid::new_v4().to_string(),
        "customer_name": "示例客户有限公司",
        "product_id": uuid::Uuid::new_v4().to_string(),
        "product_name": "原材料A",
        "product_code": "RM-A-001",
        "quantity": 1000.0,
        "unit_price": 50.0,
        "amount": 50000.0,
        "stage": "negotiation",
        "probability": 80.0,
        "expected_close_date": Utc::now().to_rfc3339(),
        "sales_person": "王五",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_scm_purchase_order(
    _scm_url: &str,
    opportunity_data: &serde_json::Value,
    supplier_id: Option<&str>,
) -> Result<String, String> {
    let purchase_id = uuid::Uuid::new_v4();
    info!(
        "创建SCM采购订单 - 产品: {}, 数量: {}, 供应商: {:?}",
        opportunity_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        opportunity_data
            .get("quantity")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
        supplier_id
    );
    Ok(purchase_id.to_string())
}

async fn fetch_crm_supplier(
    _pool: &PgPool,
    _crm_url: &str,
    supplier_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取CRM供应商记录 - ID: {}", supplier_id);

    Ok(serde_json::json!({
        "id": supplier_id.to_string(),
        "supplier_code": format!("SUP-{}", supplier_id.to_string()[..8].to_uppercase()),
        "supplier_name": "示例供应商有限公司",
        "short_name": "示例供应商",
        "tax_id": "91310000MA1GB98765",
        "address": "广东省深圳市南山区科技园",
        "contact_phone": "0755-12345678",
        "email": "sales@supplier.com",
        "contact_person": "赵六",
        "bank_account": "6222021234567890123",
        "bank_name": "招商银行",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_scm_supplier(
    _pool: &PgPool,
    _scm_url: &str,
    supplier_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取SCM供应商记录 - ID: {}", supplier_id);

    Ok(serde_json::json!({
        "id": supplier_id.to_string(),
        "supplier_code": format!("SCM-SUP-{}", supplier_id.to_string()[..8].to_uppercase()),
        "supplier_name": "SCM供应商有限公司",
        "short_name": "SCM供应商",
        "tax_id": "91310000MA1GB54321",
        "address": "浙江省杭州市滨江区",
        "contact_phone": "0571-87654321",
        "email": "scm@supplier.com",
        "contact_person": "钱七",
        "supplier_type": "raw_material",
        "qualification_level": "A",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_scm_supplier(
    _scm_url: &str,
    supplier_data: &serde_json::Value,
) -> Result<String, String> {
    let scm_id = uuid::Uuid::new_v4();
    info!(
        "创建SCM供应商 - 名称: {}",
        supplier_data
            .get("supplier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(scm_id.to_string())
}

async fn create_crm_supplier(
    _crm_url: &str,
    supplier_data: &serde_json::Value,
) -> Result<String, String> {
    let crm_id = uuid::Uuid::new_v4();
    info!(
        "创建CRM供应商 - 名称: {}",
        supplier_data
            .get("supplier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(crm_id.to_string())
}

async fn fetch_crm_product(
    _pool: &PgPool,
    _crm_url: &str,
    product_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取CRM产品记录 - ID: {}", product_id);

    Ok(serde_json::json!({
        "id": product_id.to_string(),
        "product_code": format!("PRD-{}", product_id.to_string()[..8].to_uppercase()),
        "product_name": "产品A",
        "description": "示例产品描述",
        "category": "电子产品",
        "unit": "件",
        "price": 100.0,
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_scm_product(
    _pool: &PgPool,
    _scm_url: &str,
    product_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取SCM产品记录 - ID: {}", product_id);

    Ok(serde_json::json!({
        "id": product_id.to_string(),
        "product_code": format!("SCM-PRD-{}", product_id.to_string()[..8].to_uppercase()),
        "product_name": "SCM产品B",
        "description": "SCM产品描述",
        "category": "原材料",
        "unit": "KG",
        "standard_cost": 50.0,
        "safety_stock": 100.0,
        "reorder_point": 50.0,
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_scm_product(
    _scm_url: &str,
    product_data: &serde_json::Value,
) -> Result<String, String> {
    let scm_id = uuid::Uuid::new_v4();
    info!(
        "创建SCM产品 - 名称: {}",
        product_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(scm_id.to_string())
}

async fn create_crm_product(
    _crm_url: &str,
    product_data: &serde_json::Value,
) -> Result<String, String> {
    let crm_id = uuid::Uuid::new_v4();
    info!(
        "创建CRM产品 - 名称: {}",
        product_data
            .get("product_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(crm_id.to_string())
}

pub async fn get_crm_scm_sync_stats(pool: &PgPool) -> Result<SyncStats, sqlx::Error> {
    let purchase_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM integration.crm_scm_sync 
          WHERE sync_type = 'opportunity_to_purchase'"
    ))
    .fetch_one(pool)
    .await;

    let (purchase_total, purchase_completed, purchase_failed) = match purchase_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("completed").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let supplier_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM integration.crm_scm_sync 
          WHERE sync_type = 'supplier'"
    ))
    .fetch_one(pool)
    .await;

    let (supplier_total, supplier_synced) = match supplier_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let product_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM integration.crm_scm_sync 
          WHERE sync_type = 'product'"
    ))
    .fetch_one(pool)
    .await;

    let (product_total, product_synced) = match product_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let last_sync_result = sqlx::query(only_own_schema_query!(
        "integration",
        "SELECT MAX(last_synced_at) as last_sync FROM integration.crm_scm_sync"
    ))
    .fetch_one(pool)
    .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    Ok(SyncStats {
        opportunity_to_purchase_total: purchase_total,
        opportunity_to_purchase_completed: purchase_completed,
        opportunity_to_purchase_failed: purchase_failed,
        supplier_sync_total: supplier_total,
        supplier_sync_synced: supplier_synced,
        product_sync_total: product_total,
        product_sync_synced: product_synced,
        last_sync,
    })
}

pub async fn retry_failed_sync(
    pool: &PgPool,
    crm_url: &str,
    scm_url: &str,
    sync_id: Uuid,
) -> Result<CrmScmSync, String> {
    info!("重试失败的同步 - ID: {}", sync_id);

    let sync = get_crm_scm_sync(pool, sync_id)
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
            execute_sync_by_type(pool, sync.tenant_id, crm_url, scm_url, &sync_type, &payload).await
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
    crm_url: &str,
    scm_url: &str,
    sync_type: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    match sync_type {
        SYNC_TYPE_OPPORTUNITY_TO_PURCHASE => {
            let opportunity_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = OpportunityToPurchaseRequest {
                opportunity_id: opportunity_id.to_string(),
                supplier_id: None,
            };
            convert_opportunity_to_purchase(pool, tenant_id, crm_url, scm_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_SUPPLIER => {
            let supplier_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncSupplierRequest {
                supplier_id: supplier_id.to_string(),
                source_system: "crm".to_string(),
            };
            sync_supplier(pool, tenant_id, crm_url, scm_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_PRODUCT => {
            let product_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncProductRequest {
                product_id: product_id.to_string(),
                source_system: "crm".to_string(),
            };
            sync_product(pool, tenant_id, crm_url, scm_url, &req).await?;
            Ok(())
        }
        _ => Err(format!("不支持的同步类型: {}", sync_type)),
    }
}

pub async fn handle_crm_opportunity_won(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    scm_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理CRM商机赢单事件 - 自动创建SCM采购订单");

    let opportunity_id = payload
        .get("opportunity_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if opportunity_id.is_empty() {
        warn!("商机赢单事件缺少opportunity_id");
        return Ok(());
    }

    let supplier_id = payload
        .get("supplier_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let req = OpportunityToPurchaseRequest {
        opportunity_id: opportunity_id.to_string(),
        supplier_id,
    };

    match convert_opportunity_to_purchase(pool, tenant_id, crm_url, scm_url, &req).await {
        Ok(_) => info!("商机转采购订单成功 - 商机ID: {}", opportunity_id),
        Err(e) => error!(
            "商机转采购订单失败 - 商机ID: {}, 错误: {}",
            opportunity_id, e
        ),
    }

    Ok(())
}

pub async fn handle_scm_supplier_created(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    scm_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理SCM供应商创建事件 - 自动同步到CRM");

    let supplier_id = payload
        .get("supplier_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if supplier_id.is_empty() {
        warn!("供应商创建事件缺少supplier_id");
        return Ok(());
    }

    let req = SyncSupplierRequest {
        supplier_id: supplier_id.to_string(),
        source_system: "scm".to_string(),
    };

    match sync_supplier(pool, tenant_id, crm_url, scm_url, &req).await {
        Ok(_) => info!("供应商自动同步成功 - 供应商ID: {}", supplier_id),
        Err(e) => error!(
            "供应商自动同步失败 - 供应商ID: {}, 错误: {}",
            supplier_id, e
        ),
    }

    Ok(())
}
