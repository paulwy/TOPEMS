//! 供应商类别字典（master_data.mdm_supplier_categories）—— 只读列表，供前端下拉/级联选用。
//!
//! 本表由 MDM 维护（种子 + 后续批次写入口），本模块**只提供只读 list**，
//! 不提供 create/update/delete；与 master_data.mdm_suppliers.category_code 形成弱引用。
//!
//! 租户隔离与同服务其它主数据域一致：读 x-tenant-id 头；nil/全零视为超管放行，
//! 其余按 tenant_id 过滤；RLS 在连接层兜底。

use axum::{extract::State, http::HeaderMap};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::types::Json as SqlJson;
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::shared::AppState;

fn req_tenant_id(headers: &HeaderMap) -> Uuid {
    headers
        .get("x-tenant-id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil)
}

/// 供应商类别字典行（只读）。
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SupplierCategory {
    pub id: String,
    pub code: String,
    pub name_zh: String,
    pub name_en: Option<String>,
    /// 上游系统原值映射，形如 `{"scm":"raw_material","srm":"原材料"}`。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_values: Option<SqlJson<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// GET /api/master-data/supplier-categories —— 只读列表（未软删、按 sort_order/code 排序）。
pub async fn list_supplier_categories(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResponse<Vec<SupplierCategory>> {
    let tenant = req_tenant_id(&headers);
    let rows: Result<Vec<SupplierCategory>, sqlx::Error> = sqlx::query_as(
        r#"SELECT id::text, code, name_zh, name_en, source_values, description,
                  sort_order, status, created_at, updated_at
           FROM master_data.mdm_supplier_categories
           WHERE deleted_at IS NULL
             AND ($1::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $1::uuid)
           ORDER BY sort_order NULLS LAST, code"#,
    )
    .bind(tenant)
    .fetch_all(&state.db)
    .await;
    match rows {
        Ok(v) => api_success(v),
        Err(e) => {
            tracing::error!("查询供应商类别字典失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询供应商类别字典失败".to_string()))
        }
    }
}
