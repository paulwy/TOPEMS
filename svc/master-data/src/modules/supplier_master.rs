//! 供应商权威只读查询（mdm_suppliers）—— 供 erp 全局搜索与前端选用。
//!
//! 数据源：`master_data.mdm_suppliers`（scm/srm 两来源已汇入的权威主数据，
//! 表内已按 supplier_no+tenant_id 去重，含唯一约束）。
//!
//! 本模块**只读**：仅 list / get，不提供 create/update/delete——
//! 写入侧由后续批次在权威表上收口，本批明令不动。
//!
//! 租户隔离：与同服务 master_data.rs 公共主数据域一致——直连 `state.db`，
//! 请求级从 `x-tenant-id` 头取租户；nil/全零视为超管放行，其余按 tenant_id 过滤。
//! RLS（FORCE + tenant_isolation_mdm_suppliers）在连接层兜底，与手动过滤双保险。

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::shared::AppState;

/// 请求级租户上下文（对齐 rls_middleware 同源：读 x-tenant-id 头；缺失/非法 → nil 全放行）
fn req_tenant_id(headers: &HeaderMap) -> Uuid {
    headers
        .get("x-tenant-id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil)
}

/// 供应商权威行（list/get 共用同一形状；uuid 列 ::text 化为字符串对外）。
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: String,
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub remarks: Option<String>,
    pub name_en: Option<String>,
    pub lead_time_days: Option<i32>,
    pub source_system: Option<String>,
    pub source_id: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, serde::Deserialize)]
pub struct SupplierQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    /// 关键词：模糊匹配 supplier_no / name / contact_person / phone / email
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SupplierListResponse {
    pub items: Vec<Supplier>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

const SUPPLIER_COLUMNS: &str = r#"id::text, supplier_no, name, legal_name, category, status,
       tax_id, address, contact_person, phone, email, website,
       credit_rating, risk_level, bank_name, bank_account, remarks,
       name_en, lead_time_days, source_system, source_id::text,
       created_at, updated_at"#;

const SUPPLIER_FILTER: &str = r#"deleted_at IS NULL
  AND ($1::text IS NULL OR status = $1)
  AND ($2::text IS NULL OR category = $2)
  AND ($3::text IS NULL OR supplier_no ILIKE '%' || $3 || '%'
       OR name ILIKE '%' || $3 || '%'
       OR contact_person ILIKE '%' || $3 || '%'
       OR COALESCE(phone, '') ILIKE '%' || $3 || '%'
       OR COALESCE(email, '') ILIKE '%' || $3 || '%')"#;

/// GET /api/master-data/suppliers —— 分页只读列表（可选 keyword/status/category 过滤）
pub async fn list_suppliers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<SupplierQuery>,
) -> ApiResponse<SupplierListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant = req_tenant_id(&headers);

    let count_sql = format!(
        r#"SELECT COUNT(*) FROM master_data.mdm_suppliers
           WHERE {}
             AND ($4::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $4::uuid)"#,
        SUPPLIER_FILTER
    );
    let total: i64 = match sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql))
        .bind(query.status.clone())
        .bind(query.category.clone())
        .bind(query.keyword.clone())
        .bind(tenant)
        .fetch_one(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商总数失败".to_string()));
        }
    };

    let list_sql = format!(
        r#"SELECT {} FROM master_data.mdm_suppliers
           WHERE {}
             AND ($6::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $6::uuid)
           ORDER BY updated_at DESC NULLS LAST, supplier_no
           LIMIT $4 OFFSET $5"#,
        SUPPLIER_COLUMNS, SUPPLIER_FILTER
    );
    let items: Vec<Supplier> = match sqlx::query_as(sqlx::AssertSqlSafe(list_sql))
        .bind(query.status)
        .bind(query.category)
        .bind(query.keyword)
        .bind(page_size)
        .bind(offset)
        .bind(tenant)
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商列表失败".to_string()));
        }
    };

    api_success(SupplierListResponse {
        items,
        total,
        page,
        page_size,
    })
}

/// GET /api/master-data/suppliers/:id —— 按主键读单条
pub async fn get_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<Supplier> {
    let tenant = req_tenant_id(&headers);
    let sql = format!(
        r#"SELECT {} FROM master_data.mdm_suppliers
           WHERE deleted_at IS NULL AND id = $1
             AND ($2::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $2::uuid)"#,
        SUPPLIER_COLUMNS
    );
    let row: Option<Supplier> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .bind(tenant)
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商详情失败".to_string()));
        }
    };
    match row {
        Some(s) => api_success(s),
        None => ApiResponse::from(TopemsError::NotFound("供应商不存在".to_string())),
    }
}
