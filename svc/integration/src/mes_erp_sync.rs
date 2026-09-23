//! MES-ERP 生产订单双向同步模块
//!
//! 功能：
//! - ERP 生产订单 → MES 同步（创建/更新/状态变更）
//! - MES 生产进度 → ERP 回传（完工数量、进度、状态）
//! - 同步日志记录
//! - 失败重试机制

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, PgPool};
use std::time::Duration;
use topems_shared_boundary::only_own_schema_query;

use crate::sync_retry::{RetryConfig, RetryExecutor, RetryResult};

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MesErpSyncRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_direction: String,
    pub mes_order_id: Option<Uuid>,
    pub erp_order_id: Option<Uuid>,
    pub order_number: String,
    pub sync_type: String,
    pub payload: Option<serde_json::Value>,
    pub sync_status: String,
    pub retry_count: i32,
    pub max_retries: i32,
    pub sync_error: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub order_id: Option<Uuid>,
    pub order_number: Option<String>,
    pub direction: String,
    pub sync_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub sync_id: Option<Uuid>,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpProductionOrderData {
    pub id: Option<Uuid>,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub status: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub workshop_name: Option<String>,
    pub priority: Option<i32>,
    pub notes: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MesProductionProgressData {
    pub mes_order_id: Uuid,
    pub erp_order_id: Option<Uuid>,
    pub completed_quantity: Option<f64>,
    pub status: Option<String>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_record_id: Uuid,
    pub sync_direction: String,
    pub sync_type: String,
    pub status: String,
    pub error_message: Option<String>,
    pub attempt: i32,
    pub created_at: DateTime<Utc>,
}

// ==================== 同步服务 ====================

pub struct MesErpSyncService {
    pool: PgPool,
    mes_url: String,
    erp_url: String,
    retry_executor: RetryExecutor,
}

impl MesErpSyncService {
    pub fn new(pool: PgPool, mes_url: String, erp_url: String) -> Self {
        let retry_config = RetryConfig {
            max_retries: 5,
            base_delay_ms: 1000,
            max_delay_ms: 30000,
            exponential_base: 2.0,
            retryable_errors: vec![
                "connection refused".to_string(),
                "timeout".to_string(),
                "temporary failure".to_string(),
                "rate limit".to_string(),
                "500".to_string(),
                "502".to_string(),
                "503".to_string(),
            ],
        };

        Self {
            pool,
            mes_url,
            erp_url,
            retry_executor: RetryExecutor::new(retry_config),
        }
    }

    // ==================== ERP → MES 同步 ====================

    pub async fn sync_erp_to_mes(
        &self,
        tenant_id: Uuid,
        erp_order_id: Uuid,
    ) -> Result<SyncResult, String> {
        let sync_id = Uuid::new_v4();
        let _now = Utc::now();

        tracing::info!(
            "[MES-ERP Sync] Starting ERP→MES sync for order: {}",
            erp_order_id
        );

        let erp_order = self.fetch_erp_order(tenant_id, erp_order_id).await?;

        let _sync_record = self
            .create_sync_record(
                sync_id,
                tenant_id,
                "erp_to_mes",
                None,
                Some(erp_order_id),
                &erp_order.order_no,
                "create",
                Some(serde_json::to_value(&erp_order).unwrap_or(serde_json::Value::Null)),
            )
            .await?;

        let result = self
            .retry_executor
            .execute(|| async { self.do_erp_to_mes_sync(&erp_order).await })
            .await;

        match result {
            RetryResult::Success(mes_order) => {
                self.update_sync_success(sync_id, Some(mes_order.id))
                    .await?;
                self.add_sync_log(sync_id, "erp_to_mes", "create", "success", None, 1)
                    .await?;

                Ok(SyncResult {
                    success: true,
                    sync_id: Some(sync_id),
                    message: "ERP→MES 同步成功".to_string(),
                    details: Some(
                        serde_json::to_value(&mes_order).unwrap_or(serde_json::Value::Null),
                    ),
                })
            }
            RetryResult::Failed { error, attempts }
            | RetryResult::MaxRetriesExceeded { error, attempts } => {
                self.update_sync_failed(sync_id, &error, attempts as i32)
                    .await?;
                self.add_sync_log(
                    sync_id,
                    "erp_to_mes",
                    "create",
                    "failed",
                    Some(&error),
                    attempts as i32,
                )
                .await?;

                Err(format!("ERP→MES 同步失败（尝试{}次）：{}", attempts, error))
            }
        }
    }

    async fn do_erp_to_mes_sync(
        &self,
        erp_order: &ErpProductionOrderData,
    ) -> Result<MesOrderInfo, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/mes/production-orders/from-erp", self.mes_url);

        let request_body = serde_json::json!({
            "erp_order": {
                "order_id": erp_order.id.unwrap_or_default(),
                "order_number": erp_order.order_no,
                "product_name": erp_order.product_name,
                "product_code": erp_order.product_code,
                "quantity": erp_order.quantity,
                "delivery_date": erp_order.planned_end_date,
                "priority": erp_order.priority,
            },
            "planned_start_date": erp_order.planned_start_date,
            "planned_completion_date": erp_order.planned_end_date,
            "workshop_id": erp_order.workshop_id,
            "notes": erp_order.notes,
        });

        let response = client
            .post(&url)
            .json(&request_body)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("请求MES服务失败: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("MES服务返回错误 {}: {}", status, error_text));
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("解析MES响应失败: {}", e))?;

        if result.get("code").and_then(|v| v.as_i64()) != Some(0)
            && result.get("success").and_then(|v| v.as_bool()) != Some(true)
        {
            let msg = result
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            return Err(format!("MES同步失败: {}", msg));
        }

        let data = result.get("data").unwrap_or(&result);

        Ok(MesOrderInfo {
            id: data
                .get("id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok())
                .unwrap_or_default(),
            order_no: data
                .get("order_no")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
        })
    }

    // ==================== MES → ERP 进度回传 ====================

    pub async fn sync_mes_progress_to_erp(
        &self,
        tenant_id: Uuid,
        mes_order_id: Uuid,
    ) -> Result<SyncResult, String> {
        let sync_id = Uuid::new_v4();

        tracing::info!(
            "[MES-ERP Sync] Starting MES→ERP progress sync for order: {}",
            mes_order_id
        );

        let mes_progress = self
            .fetch_mes_order_progress(tenant_id, mes_order_id)
            .await?;

        let erp_order_id = self
            .find_erp_order_by_mes_id(tenant_id, mes_order_id)
            .await?;

        self.create_sync_record(
            sync_id,
            tenant_id,
            "mes_to_erp",
            Some(mes_order_id),
            erp_order_id,
            &mes_progress.order_number.clone().unwrap_or_default(),
            "progress_update",
            Some(serde_json::to_value(&mes_progress).unwrap_or(serde_json::Value::Null)),
        )
        .await?;

        let progress_data = MesProductionProgressData {
            mes_order_id,
            erp_order_id,
            completed_quantity: mes_progress.completed_quantity,
            status: mes_progress.status.clone(),
            actual_start_date: mes_progress.actual_start_date,
            actual_end_date: mes_progress.actual_end_date,
        };

        let result = self
            .retry_executor
            .execute(|| async { self.do_mes_to_erp_sync(&progress_data).await })
            .await;

        match result {
            RetryResult::Success(_) => {
                self.update_sync_success(sync_id, None).await?;
                self.add_sync_log(sync_id, "mes_to_erp", "progress_update", "success", None, 1)
                    .await?;

                Ok(SyncResult {
                    success: true,
                    sync_id: Some(sync_id),
                    message: "MES→ERP 进度同步成功".to_string(),
                    details: None,
                })
            }
            RetryResult::Failed { error, attempts }
            | RetryResult::MaxRetriesExceeded { error, attempts } => {
                self.update_sync_failed(sync_id, &error, attempts as i32)
                    .await?;
                self.add_sync_log(
                    sync_id,
                    "mes_to_erp",
                    "progress_update",
                    "failed",
                    Some(&error),
                    attempts as i32,
                )
                .await?;

                Err(format!(
                    "MES→ERP 进度同步失败（尝试{}次）：{}",
                    attempts, error
                ))
            }
        }
    }

    async fn do_mes_to_erp_sync(&self, progress: &MesProductionProgressData) -> Result<(), String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/erp/production-orders/sync/mes-progress",
            self.erp_url
        );

        let response = client
            .post(&url)
            .json(progress)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("请求ERP服务失败: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("ERP服务返回错误 {}: {}", status, error_text));
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("解析ERP响应失败: {}", e))?;

        if result.get("code").and_then(|v| v.as_i64()) != Some(0)
            && result.get("success").and_then(|v| v.as_bool()) != Some(true)
        {
            let msg = result
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            return Err(format!("ERP进度同步失败: {}", msg));
        }

        Ok(())
    }

    // ==================== 辅助方法：获取外部数据 ====================

    async fn fetch_erp_order(
        &self,
        _tenant_id: Uuid,
        erp_order_id: Uuid,
    ) -> Result<ErpProductionOrderData, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/erp/production-orders/{}",
            self.erp_url, erp_order_id
        );

        let response = client
            .get(&url)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("获取ERP订单失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("获取ERP订单失败: HTTP {}", response.status()));
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("解析ERP订单响应失败: {}", e))?;

        let data = result.get("data").unwrap_or(&result);

        Ok(ErpProductionOrderData {
            id: Uuid::parse_str(data.get("id").and_then(|v| v.as_str()).unwrap_or_default()).ok(),
            order_no: data
                .get("order_no")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            product_id: data
                .get("product_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok()),
            product_name: data
                .get("product_name")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            product_code: data
                .get("product_code")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            quantity: data.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0),
            status: data
                .get("status")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            planned_start_date: data
                .get("planned_start_date")
                .and_then(|v| v.as_str())
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|d| d.with_timezone(&Utc)),
            planned_end_date: data
                .get("planned_end_date")
                .and_then(|v| v.as_str())
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|d| d.with_timezone(&Utc)),
            workshop_id: data
                .get("workshop_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok()),
            workshop_name: data
                .get("workshop_name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            priority: data
                .get("priority")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            notes: data
                .get("notes")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            source: data
                .get("source")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        })
    }

    async fn fetch_mes_order_progress(
        &self,
        _tenant_id: Uuid,
        mes_order_id: Uuid,
    ) -> Result<MesOrderProgress, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/mes/production-orders/{}",
            self.mes_url, mes_order_id
        );

        let response = client
            .get(&url)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("获取MES订单失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("获取MES订单失败: HTTP {}", response.status()));
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("解析MES订单响应失败: {}", e))?;

        let data = result.get("data").unwrap_or(&result);

        Ok(MesOrderProgress {
            id: mes_order_id,
            order_number: data
                .get("order_no")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            completed_quantity: data.get("completed_quantity").and_then(|v| v.as_f64()),
            status: data
                .get("status")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            actual_start_date: data
                .get("actual_start_date")
                .and_then(|v| v.as_str())
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|d| d.with_timezone(&Utc)),
            actual_end_date: data
                .get("actual_end_date")
                .and_then(|v| v.as_str())
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|d| d.with_timezone(&Utc)),
        })
    }

    async fn find_erp_order_by_mes_id(
        &self,
        tenant_id: Uuid,
        mes_order_id: Uuid,
    ) -> Result<Option<Uuid>, String> {
        let result = sqlx::query_scalar::<_, Option<Uuid>>(only_own_schema_query!(
            "integration",
            "SELECT erp_order_id FROM integration.mes_erp_sync 
             WHERE tenant_id = $1 AND mes_order_id = $2 AND erp_order_id IS NOT NULL
             ORDER BY created_at DESC LIMIT 1"
        ))
        .bind(tenant_id)
        .bind(mes_order_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("查询ERP订单ID失败: {}", e))?;

        Ok(result.flatten())
    }

    // ==================== 数据库操作 ====================

    async fn create_sync_record(
        &self,
        id: Uuid,
        tenant_id: Uuid,
        direction: &str,
        mes_order_id: Option<Uuid>,
        erp_order_id: Option<Uuid>,
        order_number: &str,
        sync_type: &str,
        payload: Option<serde_json::Value>,
    ) -> Result<(), String> {
        let now = Utc::now();

        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            INSERT INTO integration.mes_erp_sync (
                id, tenant_id, sync_direction, mes_order_id, erp_order_id, order_number,
                sync_type, payload, sync_status, retry_count, max_retries,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0, 5, $9, $9)
            "#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(direction)
        .bind(mes_order_id)
        .bind(erp_order_id)
        .bind(order_number)
        .bind(sync_type)
        .bind(payload)
        .bind(now.naive_utc())
        .execute(&self.pool)
        .await
        .map_err(|e| format!("创建同步记录失败: {}", e))?;

        Ok(())
    }

    async fn update_sync_success(
        &self,
        sync_id: Uuid,
        mes_order_id: Option<Uuid>,
    ) -> Result<(), String> {
        let now = Utc::now();

        if let Some(mes_id) = mes_order_id {
            sqlx::query(only_own_schema_query!(
                "integration",
                r#"
                UPDATE integration.mes_erp_sync SET
                    mes_order_id = COALESCE($2, mes_order_id),
                    sync_status = 'success',
                    sync_error = NULL,
                    last_synced_at = $3,
                    updated_at = $3
                WHERE id = $1
                "#
            ))
            .bind(sync_id)
            .bind(mes_id)
            .bind(now.naive_utc())
            .execute(&self.pool)
            .await
            .map_err(|e| format!("更新同步记录失败: {}", e))?;
        } else {
            sqlx::query(only_own_schema_query!(
                "integration",
                r#"
                UPDATE integration.mes_erp_sync SET
                    sync_status = 'success',
                    sync_error = NULL,
                    last_synced_at = $2,
                    updated_at = $2
                WHERE id = $1
                "#
            ))
            .bind(sync_id)
            .bind(now.naive_utc())
            .execute(&self.pool)
            .await
            .map_err(|e| format!("更新同步记录失败: {}", e))?;
        }

        Ok(())
    }

    async fn update_sync_failed(
        &self,
        sync_id: Uuid,
        error: &str,
        retry_count: i32,
    ) -> Result<(), String> {
        let now = Utc::now();

        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            UPDATE integration.mes_erp_sync SET
                sync_status = 'failed',
                sync_error = $2,
                retry_count = $3,
                updated_at = $4
            WHERE id = $1
            "#
        ))
        .bind(sync_id)
        .bind(error)
        .bind(retry_count)
        .bind(now.naive_utc())
        .execute(&self.pool)
        .await
        .map_err(|e| format!("更新同步记录失败: {}", e))?;

        Ok(())
    }

    async fn add_sync_log(
        &self,
        sync_record_id: Uuid,
        direction: &str,
        sync_type: &str,
        status: &str,
        error_message: Option<&str>,
        attempt: i32,
    ) -> Result<(), String> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            INSERT INTO integration.mes_erp_sync_logs (
                id, sync_record_id, sync_direction, sync_type,
                status, error_message, attempt, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#
        ))
        .bind(id)
        .bind(sync_record_id)
        .bind(direction)
        .bind(sync_type)
        .bind(status)
        .bind(error_message)
        .bind(attempt)
        .bind(now.naive_utc())
        .execute(&self.pool)
        .await
        .map_err(|e| format!("添加同步日志失败: {}", e))?;

        Ok(())
    }

    // ==================== 重试失败同步 ====================

    pub async fn retry_failed_sync(&self, sync_id: Uuid) -> Result<SyncResult, String> {
        let sync_record = sqlx::query_as::<_, MesErpSyncRecord>(only_own_schema_query!(
            "integration",
            r#"
            SELECT id, sync_direction, mes_order_id, erp_order_id, order_number,
                   sync_type, payload, sync_status, retry_count, max_retries,
                   sync_error, last_synced_at, created_at, updated_at
            FROM integration.mes_erp_sync
            WHERE id = $1
            "#
        ))
        .bind(sync_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("查询同步记录失败: {}", e))?;

        let sync_record = match sync_record {
            Some(r) => r,
            None => return Err("同步记录不存在".to_string()),
        };

        if sync_record.sync_status != "failed" {
            return Err("只有失败的同步记录才能重试".to_string());
        }

        match sync_record.sync_direction.as_str() {
            "erp_to_mes" => {
                if let Some(erp_order_id) = sync_record.erp_order_id {
                    self.sync_erp_to_mes(sync_record.tenant_id, erp_order_id)
                        .await
                } else {
                    Err("缺少ERP订单ID，无法重试".to_string())
                }
            }
            "mes_to_erp" => {
                if let Some(mes_order_id) = sync_record.mes_order_id {
                    self.sync_mes_progress_to_erp(sync_record.tenant_id, mes_order_id)
                        .await
                } else {
                    Err("缺少MES订单ID，无法重试".to_string())
                }
            }
            _ => Err(format!("未知的同步方向: {}", sync_record.sync_direction)),
        }
    }

    // ==================== 查询同步记录 ====================

    pub async fn list_sync_records(
        &self,
        direction: Option<&str>,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MesErpSyncRecord>, String> {
        sqlx::query_as::<_, MesErpSyncRecord>(only_own_schema_query!(
            "integration",
            r#"
            SELECT id, sync_direction, mes_order_id, erp_order_id, order_number,
                   sync_type, payload, sync_status, retry_count, max_retries,
                   sync_error, last_synced_at, created_at, updated_at
            FROM integration.mes_erp_sync
            WHERE ($1::VARCHAR IS NULL OR sync_direction = $1)
              AND ($2::VARCHAR IS NULL OR sync_status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#
        ))
        .bind(direction)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("查询同步记录失败: {}", e))
    }

    pub async fn get_sync_record(&self, sync_id: Uuid) -> Result<Option<MesErpSyncRecord>, String> {
        sqlx::query_as::<_, MesErpSyncRecord>(only_own_schema_query!(
            "integration",
            r#"
            SELECT id, sync_direction, mes_order_id, erp_order_id, order_number,
                   sync_type, payload, sync_status, retry_count, max_retries,
                   sync_error, last_synced_at, created_at, updated_at
            FROM integration.mes_erp_sync
            WHERE id = $1
            "#
        ))
        .bind(sync_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("查询同步记录失败: {}", e))
    }

    pub async fn get_sync_logs(&self, sync_id: Uuid) -> Result<Vec<SyncLog>, String> {
        sqlx::query_as::<_, SyncLog>(only_own_schema_query!(
            "integration",
            r#"
            SELECT id, sync_record_id, sync_direction, sync_type,
                   status, error_message, attempt, created_at
            FROM integration.mes_erp_sync_logs
            WHERE sync_record_id = $1
            ORDER BY created_at DESC
            "#
        ))
        .bind(sync_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("查询同步日志失败: {}", e))
    }
}

// ==================== 辅助结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MesOrderInfo {
    id: Uuid,
    order_no: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MesOrderProgress {
    id: Uuid,
    order_number: Option<String>,
    completed_quantity: Option<f64>,
    status: Option<String>,
    actual_start_date: Option<DateTime<Utc>>,
    actual_end_date: Option<DateTime<Utc>>,
}
