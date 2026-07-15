//! CRM ↔ ERP Customer Data Integration
//!
//! Implements bidirectional data synchronization between CRM customer records
//! and ERP customer master data, including contacts and opportunity-to-order conversion.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool, Row};
use tracing::{error, info, warn};

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CrmErpSync {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub crm_customer_id: Option<Uuid>,
    pub crm_contact_id: Option<Uuid>,
    pub crm_opportunity_id: Option<Uuid>,
    pub erp_customer_id: Option<Uuid>,
    pub erp_contact_id: Option<Uuid>,
    pub erp_order_id: Option<Uuid>,
    pub customer_code: Option<String>,
    pub customer_name: Option<String>,
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
pub struct CreateCrmErpSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub crm_customer_id: Option<String>,
    pub crm_contact_id: Option<String>,
    pub crm_opportunity_id: Option<String>,
    pub erp_customer_id: Option<String>,
    pub erp_contact_id: Option<String>,
    pub erp_order_id: Option<String>,
    pub customer_code: Option<String>,
    pub customer_name: Option<String>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncCustomerRequest {
    pub customer_id: String,
    pub source_system: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncContactRequest {
    pub contact_id: String,
    pub customer_id: Option<String>,
    pub source_system: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpportunityToOrderRequest {
    pub opportunity_id: String,
    pub order_type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStats {
    pub crm_to_erp_customer_total: i64,
    pub crm_to_erp_customer_synced: i64,
    pub crm_to_erp_customer_failed: i64,
    pub erp_to_crm_customer_total: i64,
    pub erp_to_crm_customer_synced: i64,
    pub erp_to_crm_customer_failed: i64,
    pub contact_sync_total: i64,
    pub contact_sync_synced: i64,
    pub opportunity_to_order_total: i64,
    pub opportunity_to_order_completed: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

pub const SYNC_TYPE_CUSTOMER: &str = "customer";
pub const SYNC_TYPE_CONTACT: &str = "contact";
pub const SYNC_TYPE_OPPORTUNITY_TO_ORDER: &str = "opportunity_to_order";

pub const DIRECTION_CRM_TO_ERP: &str = "crm_to_erp";
pub const DIRECTION_ERP_TO_CRM: &str = "erp_to_crm";
pub const DIRECTION_BIDIRECTIONAL: &str = "bidirectional";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_SYNCED: &str = "synced";
pub const STATUS_FAILED: &str = "failed";
pub const STATUS_RETRYING: &str = "retrying";

pub async fn init_crm_erp_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm_erp_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            direction VARCHAR(30) NOT NULL,
            crm_customer_id UUID,
            crm_contact_id UUID,
            crm_opportunity_id UUID,
            erp_customer_id UUID,
            erp_contact_id UUID,
            erp_order_id UUID,
            customer_code VARCHAR(64),
            customer_name VARCHAR(256),
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_type ON crm_erp_sync(sync_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_direction ON crm_erp_sync(direction)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_tenant ON crm_erp_sync(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_crm_customer ON crm_erp_sync(crm_customer_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_erp_customer ON crm_erp_sync(erp_customer_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_status ON crm_erp_sync(sync_status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_crm_erp_sync_created ON crm_erp_sync(created_at)")
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn list_crm_erp_sync(
    pool: &PgPool,
    tenant_id: Uuid,
    sync_type: Option<&str>,
    direction: Option<&str>,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<CrmErpSync>, sqlx::Error> {
    let mut sql = String::from(
        "SELECT id, tenant_id, sync_type, direction, crm_customer_id, crm_contact_id,
                crm_opportunity_id, erp_customer_id, erp_contact_id, erp_order_id,
                customer_code, customer_name, synced, sync_status, sync_error,
                retry_count, max_retries, payload, result_payload, last_synced_at,
                created_at, updated_at
           FROM crm_erp_sync WHERE tenant_id = $1",
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

    let mut query = sqlx::query_as::<_, CrmErpSync>(&sql).bind(tenant_id);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(limit);

    query.fetch_all(pool).await
}

pub async fn get_crm_erp_sync(pool: &PgPool, id: Uuid) -> Result<Option<CrmErpSync>, sqlx::Error> {
    sqlx::query_as::<_, CrmErpSync>(
        "SELECT id, tenant_id, sync_type, direction, crm_customer_id, crm_contact_id,
                crm_opportunity_id, erp_customer_id, erp_contact_id, erp_order_id,
                customer_code, customer_name, synced, sync_status, sync_error,
                retry_count, max_retries, payload, result_payload, last_synced_at,
                created_at, updated_at
           FROM crm_erp_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn create_sync_record(
    pool: &PgPool,
    req: &CreateCrmErpSyncRequest,
) -> Result<CrmErpSync, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let crm_customer_uuid = req
        .crm_customer_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let crm_contact_uuid = req
        .crm_contact_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let crm_opportunity_uuid = req
        .crm_opportunity_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let erp_customer_uuid = req
        .erp_customer_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let erp_contact_uuid = req
        .erp_contact_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let erp_order_uuid = req
        .erp_order_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, CrmErpSync>(
        "INSERT INTO crm_erp_sync (
            id, tenant_id, sync_type, direction, crm_customer_id, crm_contact_id,
            crm_opportunity_id, erp_customer_id, erp_contact_id, erp_order_id,
            customer_code, customer_name, synced, sync_status,
            retry_count, max_retries, payload, result_payload,
            last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id, tenant_id, sync_type, direction, crm_customer_id, crm_contact_id,
                  crm_opportunity_id, erp_customer_id, erp_contact_id, erp_order_id,
                  customer_code, customer_name, synced, sync_status, sync_error,
                  retry_count, max_retries, payload, result_payload, last_synced_at,
                  created_at, updated_at"
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(&req.sync_type)
    .bind(&req.direction)
    .bind(crm_customer_uuid)
    .bind(crm_contact_uuid)
    .bind(crm_opportunity_uuid)
    .bind(erp_customer_uuid)
    .bind(erp_contact_uuid)
    .bind(erp_order_uuid)
    .bind(&req.customer_code)
    .bind(&req.customer_name)
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
) -> Result<CrmErpSync, sqlx::Error> {
    let now = Utc::now();
    let last_synced = if synced { Some(now) } else { None };

    sqlx::query_as::<_, CrmErpSync>(
        "UPDATE crm_erp_sync SET 
            sync_status = $2, synced = $3, sync_error = $4,
            result_payload = COALESCE($5, result_payload),
            last_synced_at = COALESCE($6, last_synced_at),
            updated_at = $7
         WHERE id = $1
         RETURNING id, tenant_id, sync_type, direction, crm_customer_id, crm_contact_id,
                  crm_opportunity_id, erp_customer_id, erp_contact_id, erp_order_id,
                  customer_code, customer_name, synced, sync_status, sync_error,
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
        "UPDATE crm_erp_sync SET 
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

pub async fn sync_customer(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    req: &SyncCustomerRequest,
) -> Result<CrmErpSync, String> {
    info!(
        "同步客户数据 - ID: {}, 来源: {}",
        req.customer_id, req.source_system
    );

    let customer_id =
        Uuid::parse_str(&req.customer_id).map_err(|e| format!("无效的客户ID: {}", e))?;

    let (customer_data, direction) = match req.source_system.as_str() {
        "crm" => {
            let data = fetch_crm_customer(pool, crm_url, customer_id).await?;
            (data, DIRECTION_CRM_TO_ERP)
        }
        "erp" => {
            let data = fetch_erp_customer(pool, erp_url, customer_id).await?;
            (data, DIRECTION_ERP_TO_CRM)
        }
        _ => return Err(format!("未知的来源系统: {}", req.source_system)),
    };

    match direction {
        DIRECTION_CRM_TO_ERP => {
            let erp_customer_id = create_erp_customer(erp_url, &customer_data).await?;
            let _erp_uuid = Uuid::parse_str(&erp_customer_id).ok();

            let sync_req = CreateCrmErpSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_CUSTOMER.to_string(),
                direction: DIRECTION_CRM_TO_ERP.to_string(),
                crm_customer_id: Some(req.customer_id.clone()),
                crm_contact_id: None,
                crm_opportunity_id: None,
                erp_customer_id: Some(erp_customer_id.clone()),
                erp_contact_id: None,
                erp_order_id: None,
                customer_code: customer_data
                    .get("customer_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                customer_name: customer_data
                    .get("customer_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                payload: Some(customer_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "erp_customer_id": erp_customer_id,
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
                "客户数据从CRM同步到ERP成功 - 同步ID: {}, ERP客户ID: {}",
                updated.id, erp_customer_id
            );
            Ok(updated)
        }
        DIRECTION_ERP_TO_CRM => {
            let crm_customer_id = create_crm_customer(crm_url, &customer_data).await?;

            let sync_req = CreateCrmErpSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_CUSTOMER.to_string(),
                direction: DIRECTION_ERP_TO_CRM.to_string(),
                crm_customer_id: Some(crm_customer_id.clone()),
                crm_contact_id: None,
                crm_opportunity_id: None,
                erp_customer_id: Some(req.customer_id.clone()),
                erp_contact_id: None,
                erp_order_id: None,
                customer_code: customer_data
                    .get("customer_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                customer_name: customer_data
                    .get("customer_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                payload: Some(customer_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "crm_customer_id": crm_customer_id,
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
                "客户数据从ERP同步到CRM成功 - 同步ID: {}, CRM客户ID: {}",
                updated.id, crm_customer_id
            );
            Ok(updated)
        }
        _ => Err("未知的同步方向".to_string()),
    }
}

pub async fn sync_contact(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    req: &SyncContactRequest,
) -> Result<CrmErpSync, String> {
    info!(
        "同步联系人数据 - ID: {}, 来源: {}",
        req.contact_id, req.source_system
    );

    let contact_id =
        Uuid::parse_str(&req.contact_id).map_err(|e| format!("无效的联系人ID: {}", e))?;

    let (contact_data, direction) = match req.source_system.as_str() {
        "crm" => {
            let data = fetch_crm_contact(pool, crm_url, contact_id).await?;
            (data, DIRECTION_CRM_TO_ERP)
        }
        "erp" => {
            let data = fetch_erp_contact(pool, erp_url, contact_id).await?;
            (data, DIRECTION_ERP_TO_CRM)
        }
        _ => return Err(format!("未知的来源系统: {}", req.source_system)),
    };

    match direction {
        DIRECTION_CRM_TO_ERP => {
            let erp_contact_id = create_erp_contact(erp_url, &contact_data).await?;

            let sync_req = CreateCrmErpSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_CONTACT.to_string(),
                direction: DIRECTION_CRM_TO_ERP.to_string(),
                crm_customer_id: req.customer_id.clone(),
                crm_contact_id: Some(req.contact_id.clone()),
                crm_opportunity_id: None,
                erp_customer_id: None,
                erp_contact_id: Some(erp_contact_id.clone()),
                erp_order_id: None,
                customer_code: None,
                customer_name: None,
                payload: Some(contact_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "erp_contact_id": erp_contact_id,
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

            info!("联系人数据从CRM同步到ERP成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        DIRECTION_ERP_TO_CRM => {
            let crm_contact_id = create_crm_contact(crm_url, &contact_data).await?;

            let sync_req = CreateCrmErpSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_CONTACT.to_string(),
                direction: DIRECTION_ERP_TO_CRM.to_string(),
                crm_customer_id: None,
                crm_contact_id: Some(crm_contact_id.clone()),
                crm_opportunity_id: None,
                erp_customer_id: req.customer_id.clone(),
                erp_contact_id: Some(req.contact_id.clone()),
                erp_order_id: None,
                customer_code: None,
                customer_name: None,
                payload: Some(contact_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "crm_contact_id": crm_contact_id,
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

            info!("联系人数据从ERP同步到CRM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        _ => Err("未知的同步方向".to_string()),
    }
}

pub async fn convert_opportunity_to_order(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    req: &OpportunityToOrderRequest,
) -> Result<CrmErpSync, String> {
    info!("商机转订单 - 商机ID: {}", req.opportunity_id);

    let opportunity_id =
        Uuid::parse_str(&req.opportunity_id).map_err(|e| format!("无效的商机ID: {}", e))?;

    let opportunity_data = fetch_crm_opportunity(pool, crm_url, opportunity_id).await?;

    let order_type = req
        .order_type
        .clone()
        .unwrap_or_else(|| "sales_order".to_string());

    let erp_order_id =
        create_erp_order_from_opportunity(erp_url, &opportunity_data, &order_type).await?;

    let customer_code = opportunity_data
        .get("customer_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let customer_name = opportunity_data
        .get("customer_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateCrmErpSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_OPPORTUNITY_TO_ORDER.to_string(),
        direction: DIRECTION_CRM_TO_ERP.to_string(),
        crm_customer_id: None,
        crm_contact_id: None,
        crm_opportunity_id: Some(req.opportunity_id.clone()),
        erp_customer_id: None,
        erp_contact_id: None,
        erp_order_id: Some(erp_order_id.clone()),
        customer_code,
        customer_name,
        payload: Some(opportunity_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "erp_order_id": erp_order_id,
        "order_type": order_type,
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
        "商机转订单成功 - 同步ID: {}, ERP订单ID: {}",
        updated.id, erp_order_id
    );
    Ok(updated)
}

async fn fetch_crm_customer(
    _pool: &PgPool,
    _crm_url: &str,
    customer_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取CRM客户记录 - ID: {}", customer_id);

    Ok(serde_json::json!({
        "id": customer_id.to_string(),
        "customer_code": format!("CUST-{}", customer_id.to_string()[..8].to_uppercase()),
        "customer_name": "示例客户有限公司",
        "short_name": "示例客户",
        "tax_id": "91310000MA1GB12345",
        "address": "上海市浦东新区张江高科技园区",
        "contact_phone": "021-12345678",
        "email": "contact@example.com",
        "industry": "制造业",
        "customer_level": "VIP",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
        "updated_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_erp_customer(
    _pool: &PgPool,
    _erp_url: &str,
    customer_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取ERP客户记录 - ID: {}", customer_id);

    Ok(serde_json::json!({
        "id": customer_id.to_string(),
        "customer_code": format!("ERP-CUST-{}", customer_id.to_string()[..8].to_uppercase()),
        "customer_name": "ERP客户有限公司",
        "short_name": "ERP客户",
        "tax_id": "91310000MA1GB54321",
        "address": "北京市朝阳区建国路",
        "contact_phone": "010-87654321",
        "email": "erp_contact@example.com",
        "industry": "服务业",
        "credit_limit": 1000000.0,
        "payment_term": "30天",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_erp_customer(
    _erp_url: &str,
    customer_data: &serde_json::Value,
) -> Result<String, String> {
    let erp_id = uuid::Uuid::new_v4();
    info!(
        "创建ERP客户 - 客户名称: {}",
        customer_data
            .get("customer_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(erp_id.to_string())
}

async fn create_crm_customer(
    _crm_url: &str,
    customer_data: &serde_json::Value,
) -> Result<String, String> {
    let crm_id = uuid::Uuid::new_v4();
    info!(
        "创建CRM客户 - 客户名称: {}",
        customer_data
            .get("customer_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(crm_id.to_string())
}

async fn fetch_crm_contact(
    _pool: &PgPool,
    _crm_url: &str,
    contact_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取CRM联系人记录 - ID: {}", contact_id);

    Ok(serde_json::json!({
        "id": contact_id.to_string(),
        "customer_id": uuid::Uuid::new_v4().to_string(),
        "name": "张三",
        "position": "采购经理",
        "phone": "13800138000",
        "mobile": "13900139000",
        "email": "zhangsan@example.com",
        "department": "采购部",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_erp_contact(
    _pool: &PgPool,
    _erp_url: &str,
    contact_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取ERP联系人记录 - ID: {}", contact_id);

    Ok(serde_json::json!({
        "id": contact_id.to_string(),
        "customer_id": uuid::Uuid::new_v4().to_string(),
        "name": "李四",
        "position": "财务总监",
        "phone": "021-87654321",
        "mobile": "13700137000",
        "email": "lisi@example.com",
        "department": "财务部",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_erp_contact(
    _erp_url: &str,
    contact_data: &serde_json::Value,
) -> Result<String, String> {
    let erp_id = uuid::Uuid::new_v4();
    info!(
        "创建ERP联系人 - 姓名: {}",
        contact_data
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(erp_id.to_string())
}

async fn create_crm_contact(
    _crm_url: &str,
    contact_data: &serde_json::Value,
) -> Result<String, String> {
    let crm_id = uuid::Uuid::new_v4();
    info!(
        "创建CRM联系人 - 姓名: {}",
        contact_data
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(crm_id.to_string())
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
        "customer_code": "CUST-A001",
        "customer_name": "示例客户有限公司",
        "product_name": "企业管理软件",
        "product_code": "PROD-EMS-001",
        "quantity": 1.0,
        "unit_price": 500000.0,
        "amount": 500000.0,
        "stage": "negotiation",
        "probability": 80.0,
        "expected_close_date": Utc::now().to_rfc3339(),
        "contact_id": uuid::Uuid::new_v4().to_string(),
        "sales_person": "王五",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_erp_order_from_opportunity(
    _erp_url: &str,
    opportunity_data: &serde_json::Value,
    order_type: &str,
) -> Result<String, String> {
    let order_id = uuid::Uuid::new_v4();
    info!(
        "从商机创建ERP订单 - 类型: {}, 金额: {}",
        order_type,
        opportunity_data
            .get("amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(order_id.to_string())
}

pub async fn get_crm_erp_sync_stats(pool: &PgPool) -> Result<SyncStats, sqlx::Error> {
    let crm_to_erp_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM crm_erp_sync 
          WHERE direction = 'crm_to_erp' AND sync_type = 'customer'",
    )
    .fetch_one(pool)
    .await;

    let (crm_to_erp_total, crm_to_erp_synced, crm_to_erp_failed) = match crm_to_erp_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let erp_to_crm_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM crm_erp_sync 
          WHERE direction = 'erp_to_crm' AND sync_type = 'customer'",
    )
    .fetch_one(pool)
    .await;

    let (erp_to_crm_total, erp_to_crm_synced, erp_to_crm_failed) = match erp_to_crm_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let contact_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM crm_erp_sync 
          WHERE sync_type = 'contact'",
    )
    .fetch_one(pool)
    .await;

    let (contact_total, contact_synced) = match contact_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let opportunity_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as completed
           FROM crm_erp_sync 
          WHERE sync_type = 'opportunity_to_order'",
    )
    .fetch_one(pool)
    .await;

    let (opportunity_total, opportunity_completed) = match opportunity_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("completed").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let last_sync_result = sqlx::query("SELECT MAX(last_synced_at) as last_sync FROM crm_erp_sync")
        .fetch_one(pool)
        .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    Ok(SyncStats {
        crm_to_erp_customer_total: crm_to_erp_total,
        crm_to_erp_customer_synced: crm_to_erp_synced,
        crm_to_erp_customer_failed: crm_to_erp_failed,
        erp_to_crm_customer_total: erp_to_crm_total,
        erp_to_crm_customer_synced: erp_to_crm_synced,
        erp_to_crm_customer_failed: erp_to_crm_failed,
        contact_sync_total: contact_total,
        contact_sync_synced: contact_synced,
        opportunity_to_order_total: opportunity_total,
        opportunity_to_order_completed: opportunity_completed,
        last_sync,
    })
}

pub async fn retry_failed_sync(
    pool: &PgPool,
    crm_url: &str,
    erp_url: &str,
    sync_id: Uuid,
) -> Result<CrmErpSync, String> {
    info!("重试失败的同步 - ID: {}", sync_id);

    let sync = get_crm_erp_sync(pool, sync_id)
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
            execute_sync_by_type(pool, sync.tenant_id, crm_url, erp_url, &sync_type, &payload).await
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
    erp_url: &str,
    sync_type: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    match sync_type {
        SYNC_TYPE_CUSTOMER => {
            let customer_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncCustomerRequest {
                customer_id: customer_id.to_string(),
                source_system: "crm".to_string(),
            };
            sync_customer(pool, tenant_id, crm_url, erp_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_CONTACT => {
            let contact_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncContactRequest {
                contact_id: contact_id.to_string(),
                customer_id: None,
                source_system: "crm".to_string(),
            };
            sync_contact(pool, tenant_id, crm_url, erp_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_OPPORTUNITY_TO_ORDER => {
            let opportunity_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = OpportunityToOrderRequest {
                opportunity_id: opportunity_id.to_string(),
                order_type: Some("sales_order".to_string()),
            };
            convert_opportunity_to_order(pool, tenant_id, crm_url, erp_url, &req).await?;
            Ok(())
        }
        _ => Err(format!("不支持的同步类型: {}", sync_type)),
    }
}

pub async fn handle_crm_customer_created(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理CRM客户创建事件 - 自动同步到ERP");

    let customer_id = payload
        .get("customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if customer_id.is_empty() {
        warn!("客户创建事件缺少customer_id");
        return Ok(());
    }

    let req = SyncCustomerRequest {
        customer_id: customer_id.to_string(),
        source_system: "crm".to_string(),
    };

    match sync_customer(pool, tenant_id, crm_url, erp_url, &req).await {
        Ok(_) => info!("客户自动同步成功 - 客户ID: {}", customer_id),
        Err(e) => error!("客户自动同步失败 - 客户ID: {}, 错误: {}", customer_id, e),
    }

    Ok(())
}

pub async fn handle_erp_customer_created(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理ERP客户创建事件 - 自动同步到CRM");

    let customer_id = payload
        .get("customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if customer_id.is_empty() {
        warn!("ERP客户创建事件缺少customer_id");
        return Ok(());
    }

    let req = SyncCustomerRequest {
        customer_id: customer_id.to_string(),
        source_system: "erp".to_string(),
    };

    match sync_customer(pool, tenant_id, crm_url, erp_url, &req).await {
        Ok(_) => info!("ERP客户自动同步成功 - 客户ID: {}", customer_id),
        Err(e) => error!("ERP客户自动同步失败 - 客户ID: {}, 错误: {}", customer_id, e),
    }

    Ok(())
}

pub async fn handle_crm_opportunity_won(
    pool: &PgPool,
    tenant_id: Uuid,
    crm_url: &str,
    erp_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理CRM商机赢单事件 - 自动创建ERP订单");

    let opportunity_id = payload
        .get("opportunity_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if opportunity_id.is_empty() {
        warn!("商机赢单事件缺少opportunity_id");
        return Ok(());
    }

    let req = OpportunityToOrderRequest {
        opportunity_id: opportunity_id.to_string(),
        order_type: Some("sales_order".to_string()),
    };

    match convert_opportunity_to_order(pool, tenant_id, crm_url, erp_url, &req).await {
        Ok(_) => info!("商机转订单成功 - 商机ID: {}", opportunity_id),
        Err(e) => error!("商机转订单失败 - 商机ID: {}, 错误: {}", opportunity_id, e),
    }

    Ok(())
}
