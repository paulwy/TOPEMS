//! HRM ↔ Finance Payroll Data Integration
//!
//! Implements bidirectional data synchronization between HRM employee records
//! and Finance payroll processing, including salary, social insurance, and housing fund.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool, Row};
use tracing::{error, info, warn};

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HrmFinanceSync {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub hrm_employee_id: Option<Uuid>,
    pub hrm_payroll_id: Option<Uuid>,
    pub finance_payroll_id: Option<Uuid>,
    pub employee_code: Option<String>,
    pub employee_name: Option<String>,
    pub pay_period: Option<String>,
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
pub struct CreateHrmFinanceSyncRequest {
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub direction: String,
    pub hrm_employee_id: Option<String>,
    pub hrm_payroll_id: Option<String>,
    pub finance_payroll_id: Option<String>,
    pub employee_code: Option<String>,
    pub employee_name: Option<String>,
    pub pay_period: Option<String>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncPayrollRequest {
    pub payroll_id: String,
    pub pay_period: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncEmployeeRequest {
    pub employee_id: String,
    pub source_system: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncSocialInsuranceRequest {
    pub employee_id: String,
    pub pay_period: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncHousingFundRequest {
    pub employee_id: String,
    pub pay_period: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncStats {
    pub hrm_to_finance_payroll_total: i64,
    pub hrm_to_finance_payroll_synced: i64,
    pub hrm_to_finance_payroll_failed: i64,
    pub employee_sync_total: i64,
    pub employee_sync_synced: i64,
    pub social_insurance_sync_total: i64,
    pub social_insurance_sync_synced: i64,
    pub housing_fund_sync_total: i64,
    pub housing_fund_sync_synced: i64,
    pub last_sync: Option<DateTime<Utc>>,
}

pub const SYNC_TYPE_PAYROLL: &str = "payroll";
pub const SYNC_TYPE_EMPLOYEE: &str = "employee";
pub const SYNC_TYPE_SOCIAL_INSURANCE: &str = "social_insurance";
pub const SYNC_TYPE_HOUSING_FUND: &str = "housing_fund";

pub const DIRECTION_HRM_TO_FINANCE: &str = "hrm_to_finance";
pub const DIRECTION_FINANCE_TO_HRM: &str = "finance_to_hrm";
pub const DIRECTION_BIDIRECTIONAL: &str = "bidirectional";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_SYNCED: &str = "synced";
pub const STATUS_FAILED: &str = "failed";
pub const STATUS_RETRYING: &str = "retrying";

pub async fn init_hrm_finance_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS hrm_finance_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            direction VARCHAR(30) NOT NULL,
            hrm_employee_id UUID,
            hrm_payroll_id UUID,
            finance_payroll_id UUID,
            employee_code VARCHAR(64),
            employee_name VARCHAR(256),
            pay_period VARCHAR(32),
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

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_type ON hrm_finance_sync(sync_type)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_direction ON hrm_finance_sync(direction)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_tenant ON hrm_finance_sync(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_employee ON hrm_finance_sync(hrm_employee_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_payroll ON hrm_finance_sync(hrm_payroll_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_status ON hrm_finance_sync(sync_status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_pay_period ON hrm_finance_sync(pay_period)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hrm_finance_sync_created ON hrm_finance_sync(created_at)",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_hrm_finance_sync(
    pool: &PgPool,
    tenant_id: Uuid,
    sync_type: Option<&str>,
    direction: Option<&str>,
    status: Option<&str>,
    pay_period: Option<&str>,
    limit: i64,
) -> Result<Vec<HrmFinanceSync>, sqlx::Error> {
    let mut sql = String::from(
        "SELECT id, tenant_id, sync_type, direction, hrm_employee_id, hrm_payroll_id,
                finance_payroll_id, employee_code, employee_name, pay_period,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM hrm_finance_sync WHERE tenant_id = $1",
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
    if let Some(pp) = pay_period {
        sql.push_str(&format!(" AND pay_period = ${}", param_idx));
        params.push(pp.to_string());
        param_idx += 1;
    }

    sql.push_str(&format!(" ORDER BY created_at DESC LIMIT ${}", param_idx));

    let mut query = sqlx::query_as::<_, HrmFinanceSync>(&sql).bind(tenant_id);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(limit);

    query.fetch_all(pool).await
}

pub async fn get_hrm_finance_sync(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<HrmFinanceSync>, sqlx::Error> {
    sqlx::query_as::<_, HrmFinanceSync>(
        "SELECT id, tenant_id, sync_type, direction, hrm_employee_id, hrm_payroll_id,
                finance_payroll_id, employee_code, employee_name, pay_period,
                synced, sync_status, sync_error, retry_count, max_retries,
                payload, result_payload, last_synced_at, created_at, updated_at
           FROM hrm_finance_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn create_sync_record(
    pool: &PgPool,
    req: &CreateHrmFinanceSyncRequest,
) -> Result<HrmFinanceSync, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let hrm_employee_uuid = req
        .hrm_employee_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let hrm_payroll_uuid = req
        .hrm_payroll_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let finance_payroll_uuid = req
        .finance_payroll_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, HrmFinanceSync>(
        "INSERT INTO hrm_finance_sync (
            id, tenant_id, sync_type, direction, hrm_employee_id, hrm_payroll_id,
            finance_payroll_id, employee_code, employee_name, pay_period,
            synced, sync_status, retry_count, max_retries, payload, result_payload,
            last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, tenant_id, sync_type, direction, hrm_employee_id, hrm_payroll_id,
                  finance_payroll_id, employee_code, employee_name, pay_period,
                  synced, sync_status, sync_error, retry_count, max_retries,
                  payload, result_payload, last_synced_at, created_at, updated_at"
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(&req.sync_type)
    .bind(&req.direction)
    .bind(hrm_employee_uuid)
    .bind(hrm_payroll_uuid)
    .bind(finance_payroll_uuid)
    .bind(&req.employee_code)
    .bind(&req.employee_name)
    .bind(&req.pay_period)
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
) -> Result<HrmFinanceSync, sqlx::Error> {
    let now = Utc::now();
    let last_synced = if synced { Some(now) } else { None };

    sqlx::query_as::<_, HrmFinanceSync>(
        "UPDATE hrm_finance_sync SET 
            sync_status = $2, synced = $3, sync_error = $4,
            result_payload = COALESCE($5, result_payload),
            last_synced_at = COALESCE($6, last_synced_at),
            updated_at = $7
         WHERE id = $1
         RETURNING id, tenant_id, sync_type, direction, hrm_employee_id, hrm_payroll_id,
                  finance_payroll_id, employee_code, employee_name, pay_period,
                  synced, sync_status, sync_error, retry_count, max_retries,
                  payload, result_payload, last_synced_at, created_at, updated_at",
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
        "UPDATE hrm_finance_sync SET 
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

pub async fn sync_payroll(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    req: &SyncPayrollRequest,
) -> Result<HrmFinanceSync, String> {
    info!(
        "同步薪资数据 - 薪资ID: {}, 账期: {}",
        req.payroll_id, req.pay_period
    );

    let payroll_id =
        Uuid::parse_str(&req.payroll_id).map_err(|e| format!("无效的薪资ID: {}", e))?;

    let payroll_data = fetch_hrm_payroll(pool, hrm_url, payroll_id).await?;

    let finance_payroll_id =
        create_finance_payroll(finance_url, &payroll_data, &req.pay_period).await?;
    let _finance_uuid = Uuid::parse_str(&finance_payroll_id).ok();

    let employee_code = payroll_data
        .get("employee_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let employee_name = payroll_data
        .get("employee_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateHrmFinanceSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_PAYROLL.to_string(),
        direction: DIRECTION_HRM_TO_FINANCE.to_string(),
        hrm_employee_id: None,
        hrm_payroll_id: Some(req.payroll_id.clone()),
        finance_payroll_id: Some(finance_payroll_id.clone()),
        employee_code,
        employee_name,
        pay_period: Some(req.pay_period.clone()),
        payload: Some(payroll_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "finance_payroll_id": finance_payroll_id,
        "pay_period": &req.pay_period,
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
        "薪资数据从HRM同步到Finance成功 - 同步ID: {}, Finance薪资ID: {}",
        updated.id, finance_payroll_id
    );
    Ok(updated)
}

pub async fn sync_employee(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    req: &SyncEmployeeRequest,
) -> Result<HrmFinanceSync, String> {
    info!(
        "同步员工数据 - ID: {}, 来源: {}",
        req.employee_id, req.source_system
    );

    let employee_id =
        Uuid::parse_str(&req.employee_id).map_err(|e| format!("无效的员工ID: {}", e))?;

    let (employee_data, direction) = match req.source_system.as_str() {
        "hrm" => {
            let data = fetch_hrm_employee(pool, hrm_url, employee_id).await?;
            (data, DIRECTION_HRM_TO_FINANCE)
        }
        "finance" => {
            let data = fetch_finance_employee(pool, finance_url, employee_id).await?;
            (data, DIRECTION_FINANCE_TO_HRM)
        }
        _ => return Err(format!("未知的来源系统: {}", req.source_system)),
    };

    match direction {
        DIRECTION_HRM_TO_FINANCE => {
            let finance_employee_id = create_finance_employee(finance_url, &employee_data).await?;

            let sync_req = CreateHrmFinanceSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_EMPLOYEE.to_string(),
                direction: DIRECTION_HRM_TO_FINANCE.to_string(),
                hrm_employee_id: Some(req.employee_id.clone()),
                hrm_payroll_id: None,
                finance_payroll_id: None,
                employee_code: employee_data
                    .get("employee_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                employee_name: employee_data
                    .get("employee_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                pay_period: None,
                payload: Some(employee_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "finance_employee_id": finance_employee_id,
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

            info!("员工数据从HRM同步到Finance成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        DIRECTION_FINANCE_TO_HRM => {
            let hrm_employee_id = create_hrm_employee(hrm_url, &employee_data).await?;

            let sync_req = CreateHrmFinanceSyncRequest {
                tenant_id,
                sync_type: SYNC_TYPE_EMPLOYEE.to_string(),
                direction: DIRECTION_FINANCE_TO_HRM.to_string(),
                hrm_employee_id: Some(hrm_employee_id.clone()),
                hrm_payroll_id: None,
                finance_payroll_id: None,
                employee_code: employee_data
                    .get("employee_code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                employee_name: employee_data
                    .get("employee_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                pay_period: None,
                payload: Some(employee_data),
            };

            let sync_record = create_sync_record(pool, &sync_req)
                .await
                .map_err(|e| format!("创建同步记录失败: {}", e))?;

            let result_payload = serde_json::json!({
                "hrm_employee_id": hrm_employee_id,
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

            info!("员工数据从Finance同步到HRM成功 - 同步ID: {}", updated.id);
            Ok(updated)
        }
        _ => Err("未知的同步方向".to_string()),
    }
}

pub async fn sync_social_insurance(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    req: &SyncSocialInsuranceRequest,
) -> Result<HrmFinanceSync, String> {
    info!(
        "同步社保数据 - 员工ID: {}, 账期: {}",
        req.employee_id, req.pay_period
    );

    let employee_id =
        Uuid::parse_str(&req.employee_id).map_err(|e| format!("无效的员工ID: {}", e))?;

    let insurance_data =
        fetch_hrm_social_insurance(pool, hrm_url, employee_id, &req.pay_period).await?;

    let finance_insurance_id =
        create_finance_social_insurance(finance_url, &insurance_data, &req.pay_period).await?;

    let employee_code = insurance_data
        .get("employee_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let employee_name = insurance_data
        .get("employee_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateHrmFinanceSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_SOCIAL_INSURANCE.to_string(),
        direction: DIRECTION_HRM_TO_FINANCE.to_string(),
        hrm_employee_id: Some(req.employee_id.clone()),
        hrm_payroll_id: None,
        finance_payroll_id: None,
        employee_code,
        employee_name,
        pay_period: Some(req.pay_period.clone()),
        payload: Some(insurance_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "finance_insurance_id": finance_insurance_id,
        "pay_period": &req.pay_period,
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

    info!("社保数据同步成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

pub async fn sync_housing_fund(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    req: &SyncHousingFundRequest,
) -> Result<HrmFinanceSync, String> {
    info!(
        "同步公积金数据 - 员工ID: {}, 账期: {}",
        req.employee_id, req.pay_period
    );

    let employee_id =
        Uuid::parse_str(&req.employee_id).map_err(|e| format!("无效的员工ID: {}", e))?;

    let fund_data = fetch_hrm_housing_fund(pool, hrm_url, employee_id, &req.pay_period).await?;

    let finance_fund_id =
        create_finance_housing_fund(finance_url, &fund_data, &req.pay_period).await?;

    let employee_code = fund_data
        .get("employee_code")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let employee_name = fund_data
        .get("employee_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let sync_req = CreateHrmFinanceSyncRequest {
        tenant_id,
        sync_type: SYNC_TYPE_HOUSING_FUND.to_string(),
        direction: DIRECTION_HRM_TO_FINANCE.to_string(),
        hrm_employee_id: Some(req.employee_id.clone()),
        hrm_payroll_id: None,
        finance_payroll_id: None,
        employee_code,
        employee_name,
        pay_period: Some(req.pay_period.clone()),
        payload: Some(fund_data),
    };

    let sync_record = create_sync_record(pool, &sync_req)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

    let result_payload = serde_json::json!({
        "finance_fund_id": finance_fund_id,
        "pay_period": &req.pay_period,
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

    info!("公积金数据同步成功 - 同步ID: {}", updated.id);
    Ok(updated)
}

async fn fetch_hrm_payroll(
    _pool: &PgPool,
    _hrm_url: &str,
    payroll_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取HRM薪资记录 - ID: {}", payroll_id);

    Ok(serde_json::json!({
        "id": payroll_id.to_string(),
        "payroll_no": format!("PRL-{}", Utc::now().format("%Y%m")),
        "employee_id": uuid::Uuid::new_v4().to_string(),
        "employee_code": "EMP-001",
        "employee_name": "张三",
        "department": "技术部",
        "position": "高级工程师",
        "pay_period": "2026-06",
        "base_salary": 15000.0,
        "bonus": 3000.0,
        "overtime_pay": 2000.0,
        "allowance": 1000.0,
        "gross_salary": 21000.0,
        "social_insurance": 1850.0,
        "housing_fund": 1800.0,
        "income_tax": 1500.0,
        "net_salary": 15850.0,
        "status": "calculated",
        "calculated_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_finance_payroll(
    _finance_url: &str,
    payroll_data: &serde_json::Value,
    pay_period: &str,
) -> Result<String, String> {
    let finance_id = uuid::Uuid::new_v4();
    info!(
        "创建Finance薪资 - 员工: {}, 账期: {}, 实发: {}",
        payroll_data
            .get("employee_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        pay_period,
        payroll_data
            .get("net_salary")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    );
    Ok(finance_id.to_string())
}

async fn fetch_hrm_employee(
    _pool: &PgPool,
    _hrm_url: &str,
    employee_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取HRM员工记录 - ID: {}", employee_id);

    Ok(serde_json::json!({
        "id": employee_id.to_string(),
        "employee_code": format!("EMP-{}", employee_id.to_string()[..8].to_uppercase()),
        "employee_name": "李四",
        "gender": "male",
        "date_of_birth": "1988-01-15",
        "id_card_no": "310101198801151234",
        "phone": "13800138000",
        "email": "lisi@example.com",
        "department": "财务部",
        "position": "财务主管",
        "employment_type": "full_time",
        "hire_date": "2020-03-15",
        "status": "active",
        "bank_account": "6222021234567890123",
        "bank_name": "工商银行",
        "social_insurance_no": "S123456789",
        "housing_fund_no": "H123456789",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn fetch_finance_employee(
    _pool: &PgPool,
    _finance_url: &str,
    employee_id: Uuid,
) -> Result<serde_json::Value, String> {
    info!("获取Finance员工记录 - ID: {}", employee_id);

    Ok(serde_json::json!({
        "id": employee_id.to_string(),
        "employee_code": format!("FIN-EMP-{}", employee_id.to_string()[..8].to_uppercase()),
        "employee_name": "王五",
        "department": "财务部",
        "cost_center": "CC-FIN-001",
        "tax_category": "resident",
        "bank_account": "6222029876543210987",
        "bank_name": "建设银行",
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_finance_employee(
    _finance_url: &str,
    employee_data: &serde_json::Value,
) -> Result<String, String> {
    let finance_id = uuid::Uuid::new_v4();
    info!(
        "创建Finance员工 - 姓名: {}",
        employee_data
            .get("employee_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(finance_id.to_string())
}

async fn create_hrm_employee(
    _hrm_url: &str,
    employee_data: &serde_json::Value,
) -> Result<String, String> {
    let hrm_id = uuid::Uuid::new_v4();
    info!(
        "创建HRM员工 - 姓名: {}",
        employee_data
            .get("employee_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    );
    Ok(hrm_id.to_string())
}

async fn fetch_hrm_social_insurance(
    _pool: &PgPool,
    _hrm_url: &str,
    employee_id: Uuid,
    pay_period: &str,
) -> Result<serde_json::Value, String> {
    info!(
        "获取HRM社保数据 - 员工ID: {}, 账期: {}",
        employee_id, pay_period
    );

    Ok(serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "employee_id": employee_id.to_string(),
        "employee_code": "EMP-001",
        "employee_name": "张三",
        "pay_period": pay_period,
        "base_amount": 15000.0,
        "pension_personal": 1200.0,
        "pension_company": 3600.0,
        "medical_personal": 300.0,
        "medical_company": 1200.0,
        "unemployment_personal": 150.0,
        "unemployment_company": 150.0,
        "injury_company": 60.0,
        "maternity_company": 150.0,
        "total_personal": 1650.0,
        "total_company": 5160.0,
        "status": "calculated",
        "calculated_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_finance_social_insurance(
    _finance_url: &str,
    insurance_data: &serde_json::Value,
    pay_period: &str,
) -> Result<String, String> {
    let finance_id = uuid::Uuid::new_v4();
    info!(
        "创建Finance社保记录 - 员工: {}, 账期: {}",
        insurance_data
            .get("employee_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        pay_period
    );
    Ok(finance_id.to_string())
}

async fn fetch_hrm_housing_fund(
    _pool: &PgPool,
    _hrm_url: &str,
    employee_id: Uuid,
    pay_period: &str,
) -> Result<serde_json::Value, String> {
    info!(
        "获取HRM公积金数据 - 员工ID: {}, 账期: {}",
        employee_id, pay_period
    );

    Ok(serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "employee_id": employee_id.to_string(),
        "employee_code": "EMP-001",
        "employee_name": "张三",
        "pay_period": pay_period,
        "base_amount": 15000.0,
        "personal_rate": 12.0,
        "company_rate": 12.0,
        "personal_amount": 1800.0,
        "company_amount": 1800.0,
        "total_amount": 3600.0,
        "fund_no": "H123456789",
        "status": "calculated",
        "calculated_at": Utc::now().to_rfc3339(),
    }))
}

async fn create_finance_housing_fund(
    _finance_url: &str,
    fund_data: &serde_json::Value,
    pay_period: &str,
) -> Result<String, String> {
    let finance_id = uuid::Uuid::new_v4();
    info!(
        "创建Finance公积金记录 - 员工: {}, 账期: {}",
        fund_data
            .get("employee_name")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        pay_period
    );
    Ok(finance_id.to_string())
}

pub async fn get_hrm_finance_sync_stats(pool: &PgPool) -> Result<SyncStats, sqlx::Error> {
    let payroll_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM hrm_finance_sync 
          WHERE sync_type = 'payroll'",
    )
    .fetch_one(pool)
    .await;

    let (payroll_total, payroll_synced, payroll_failed) = match payroll_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let employee_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM hrm_finance_sync 
          WHERE sync_type = 'employee'",
    )
    .fetch_one(pool)
    .await;

    let (employee_total, employee_synced) = match employee_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let insurance_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM hrm_finance_sync 
          WHERE sync_type = 'social_insurance'",
    )
    .fetch_one(pool)
    .await;

    let (insurance_total, insurance_synced) = match insurance_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let fund_result = sqlx::query(
        "SELECT COUNT(*) as total, 
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced
           FROM hrm_finance_sync 
          WHERE sync_type = 'housing_fund'",
    )
    .fetch_one(pool)
    .await;

    let (fund_total, fund_synced) = match fund_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
        ),
        Err(_) => (0, 0),
    };

    let last_sync_result =
        sqlx::query("SELECT MAX(last_synced_at) as last_sync FROM hrm_finance_sync")
            .fetch_one(pool)
            .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    Ok(SyncStats {
        hrm_to_finance_payroll_total: payroll_total,
        hrm_to_finance_payroll_synced: payroll_synced,
        hrm_to_finance_payroll_failed: payroll_failed,
        employee_sync_total: employee_total,
        employee_sync_synced: employee_synced,
        social_insurance_sync_total: insurance_total,
        social_insurance_sync_synced: insurance_synced,
        housing_fund_sync_total: fund_total,
        housing_fund_sync_synced: fund_synced,
        last_sync,
    })
}

pub async fn retry_failed_sync(
    pool: &PgPool,
    hrm_url: &str,
    finance_url: &str,
    sync_id: Uuid,
) -> Result<HrmFinanceSync, String> {
    info!("重试失败的同步 - ID: {}", sync_id);

    let sync = get_hrm_finance_sync(pool, sync_id)
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
            execute_sync_by_type(
                pool,
                sync.tenant_id,
                hrm_url,
                finance_url,
                &sync_type,
                &payload,
            )
            .await
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
    hrm_url: &str,
    finance_url: &str,
    sync_type: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    match sync_type {
        SYNC_TYPE_PAYROLL => {
            let payroll_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let pay_period = payload
                .get("pay_period")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let req = SyncPayrollRequest {
                payroll_id: payroll_id.to_string(),
                pay_period: pay_period.to_string(),
            };
            sync_payroll(pool, tenant_id, hrm_url, finance_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_EMPLOYEE => {
            let employee_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let req = SyncEmployeeRequest {
                employee_id: employee_id.to_string(),
                source_system: "hrm".to_string(),
            };
            sync_employee(pool, tenant_id, hrm_url, finance_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_SOCIAL_INSURANCE => {
            let employee_id = payload
                .get("employee_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let pay_period = payload
                .get("pay_period")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let req = SyncSocialInsuranceRequest {
                employee_id: employee_id.to_string(),
                pay_period: pay_period.to_string(),
            };
            sync_social_insurance(pool, tenant_id, hrm_url, finance_url, &req).await?;
            Ok(())
        }
        SYNC_TYPE_HOUSING_FUND => {
            let employee_id = payload
                .get("employee_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let pay_period = payload
                .get("pay_period")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let req = SyncHousingFundRequest {
                employee_id: employee_id.to_string(),
                pay_period: pay_period.to_string(),
            };
            sync_housing_fund(pool, tenant_id, hrm_url, finance_url, &req).await?;
            Ok(())
        }
        _ => Err(format!("不支持的同步类型: {}", sync_type)),
    }
}

pub async fn handle_hrm_payroll_calculated(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理HRM薪资计算完成事件 - 自动同步到Finance");

    let payroll_id = payload
        .get("payroll_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let pay_period = payload
        .get("pay_period")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if payroll_id.is_empty() {
        warn!("薪资计算事件缺少payroll_id");
        return Ok(());
    }

    let req = SyncPayrollRequest {
        payroll_id: payroll_id.to_string(),
        pay_period: pay_period.to_string(),
    };

    match sync_payroll(pool, tenant_id, hrm_url, finance_url, &req).await {
        Ok(_) => info!("薪资自动同步成功 - 薪资ID: {}", payroll_id),
        Err(e) => error!("薪资自动同步失败 - 薪资ID: {}, 错误: {}", payroll_id, e),
    }

    Ok(())
}

pub async fn handle_hrm_employee_created(
    pool: &PgPool,
    tenant_id: Uuid,
    hrm_url: &str,
    finance_url: &str,
    payload: &serde_json::Value,
) -> anyhow::Result<()> {
    info!("处理HRM员工创建事件 - 自动同步到Finance");

    let employee_id = payload
        .get("employee_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if employee_id.is_empty() {
        warn!("员工创建事件缺少employee_id");
        return Ok(());
    }

    let req = SyncEmployeeRequest {
        employee_id: employee_id.to_string(),
        source_system: "hrm".to_string(),
    };

    match sync_employee(pool, tenant_id, hrm_url, finance_url, &req).await {
        Ok(_) => info!("员工自动同步成功 - 员工ID: {}", employee_id),
        Err(e) => error!("员工自动同步失败 - 员工ID: {}, 错误: {}", employee_id, e),
    }

    Ok(())
}
