use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateOfficeSupplyRequest, OfficeSupply, UpdateOfficeSupplyRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::utils::validate_required_field;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct SupplyQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/office-supplies", get(list_supplies).post(create_supply))
        .route(
            "/office-supplies/{id}",
            get(get_supply).put(update_supply).delete(delete_supply),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/office-supplies",
    responses(
        (status = 200, description = "list_supplies OK")
    ),
    tag = "ERP/office-supplies"
)]
pub async fn list_supplies(
    State(_state): State<ApiState>,
    Query(params): Query<SupplyQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<OfficeSupply>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let result = sqlx::query_as::<_, OfficeSupply>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name, category, quantity, unit, price, location, status, created_at, updated_at
        FROM office_supplies
        WHERE ($1::text IS NULL OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&category_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(supplies) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM office_supplies
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&category_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(supplies, total, page, page_size),
                "获取办公用品列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取办公用品列表失败: {}", e);
            Json(api_error(500, "获取办公用品列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/office-supplies",
    request_body = CreateOfficeSupplyRequest,
    responses(
        (status = 200, description = "create_supply OK")
    ),
    tag = "ERP/office-supplies"
)]
pub async fn create_supply(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateOfficeSupplyRequest>,
) -> Json<ApiResponse<OfficeSupply>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = validate_required_field("用品名称", &req.name) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, OfficeSupply>(
        only_own_schema_query!("erp", r#"
        INSERT INTO office_supplies (id, name, category, quantity, unit, price, location, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_stock', $8, $9)
        RETURNING id, name, category, quantity, unit, price, location, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.category)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(req.price)
    .bind(&req.location)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(supply) => (
            Json(ApiResponse::success(supply.clone(), "办公用品创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建办公用品失败: {}", e);
            (
                Json(api_error(500, "办公用品创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(supply) = &result {
        serde_json::to_value(supply).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "office_supply".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/office-supplies/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_supply OK")
    ),
    tag = "ERP/office-supplies"
)]
pub async fn get_supply(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OfficeSupply>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, OfficeSupply>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name, category, quantity, unit, price, location, status, created_at, updated_at
        FROM office_supplies WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(supply)) => Json(ApiResponse::success(supply, "获取办公用品成功")),
        Ok(None) => Json(api_error(404, "办公用品不存在")),
        Err(e) => {
            tracing::error!("获取办公用品失败: {}", e);
            Json(api_error(500, "获取办公用品失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/office-supplies/{id}",
    request_body = UpdateOfficeSupplyRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "update_supply OK")
    ),
    tag = "ERP/office-supplies"
)]
pub async fn update_supply(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateOfficeSupplyRequest>,
) -> Json<ApiResponse<OfficeSupply>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, OfficeSupply>(
        only_own_schema_query!("erp", "SELECT id, name, category, quantity, unit, price, location, status, created_at, updated_at FROM office_supplies WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "办公用品不存在")),
        Err(e) => return Json(api_error(500, &format!("查询办公用品失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let quantity = req.quantity.or(Some(existing.quantity));
    let unit = req.unit.or(existing.unit);
    let price = req.price.or(existing.price);
    let location = req.location.or(existing.location);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, OfficeSupply>(
        only_own_schema_query!("erp", r#"
        UPDATE office_supplies SET
            name = $2, category = $3, quantity = $4, unit = $5, price = $6, location = $7, status = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, name, category, quantity, unit, price, location, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(quantity)
    .bind(&unit)
    .bind(price)
    .bind(&location)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(supply) => (
            Json(ApiResponse::success(supply.clone(), "办公用品更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新办公用品失败: {}", e);
            (
                Json(api_error(500, "办公用品更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(supply) = &result {
        serde_json::to_value(supply).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "office_supply".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/office-supplies/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "delete_supply OK")
    ),
    tag = "ERP/office-supplies"
)]
pub async fn delete_supply(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE office_supplies SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "办公用品删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "办公用品不存在")),
            "error".to_string(),
            Some("办公用品不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除办公用品失败: {}", e);
            (
                Json(api_error(500, "办公用品删除失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "office_supply".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supply_query_params_deserialize() {
        let query = "page=1&page_size=20&search=pen&status=active&category=stationery";
        let params: SupplyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.search.as_deref(), Some("pen"));
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.category.as_deref(), Some("stationery"));
    }

    #[test]
    fn test_supply_query_params_default() {
        let query = "";
        let params: SupplyQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.category.is_none());
    }
}
