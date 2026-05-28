use anyhow::Result;
use axum::{
    extract::{Path, Query, State, HeaderMap},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateSupplierRequest, Supplier, UpdateSupplierRequest};
use crate::api::audit::log_audit_event;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/suppliers", get(list_suppliers).post(create_supplier))
        .route(
            "/api/v1/suppliers/{id}",
            get(get_supplier).put(update_supplier).delete(delete_supplier),
        )
        .with_state(state);

    Ok(app)
}

async fn list_suppliers(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        FROM suppliers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR contact_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(suppliers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM suppliers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR contact_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "suppliers": suppliers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商列表失败: {}", e);
            Json(ApiResponse::error(500, "获取供应商列表失败"))
        }
    }
}

async fn create_supplier(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        INSERT INTO suppliers (id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.short_name)
    .bind(&req.contact_name)
    .bind(&req.contact_phone)
    .bind(&req.email)
    .bind(&req.address)
    .bind(&req.bank_account)
    .bind(&req.tax_number)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(supplier) => (
            Json(ApiResponse::success(supplier.clone(), "供应商创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            (
                Json(ApiResponse::error(500, "供应商创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(supplier) = &result {
        serde_json::to_value(supplier).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "supplier".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        FROM suppliers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier, "获取供应商成功")),
        Ok(None) => Json(ApiResponse::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("获取供应商失败: {}", e);
            Json(ApiResponse::error(500, "获取供应商失败"))
        }
    }
}

async fn update_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at FROM suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::error(404, "供应商不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询供应商失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let short_name = req.short_name.or(existing.short_name);
    let contact_name = req.contact_name.or(existing.contact_name);
    let contact_phone = req.contact_phone.or(existing.contact_phone);
    let email = req.email.or(existing.email);
    let address = req.address.or(existing.address);
    let bank_account = req.bank_account.or(existing.bank_account);
    let tax_number = req.tax_number.or(existing.tax_number);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        UPDATE suppliers SET
            name = $2, short_name = $3, contact_name = $4, contact_phone = $5, email = $6, address = $7, bank_account = $8, tax_number = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&short_name)
    .bind(&contact_name)
    .bind(&contact_phone)
    .bind(&email)
    .bind(&address)
    .bind(&bank_account)
    .bind(&tax_number)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(supplier) => (
            Json(ApiResponse::success(supplier.clone(), "供应商更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            (
                Json(ApiResponse::error(500, "供应商更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(supplier) = &result {
        serde_json::to_value(supplier).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "supplier".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM suppliers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "供应商删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "供应商不存在")),
            "error",
            Some("供应商不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            (
                Json(ApiResponse::error(500, "供应商删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "supplier".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
