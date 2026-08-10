use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Extension, Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/bom-versions",
            get(list_bom_versions).post(create_bom_version),
        )
        .route(
            "/bom-versions/{id}",
            get(get_bom_version)
                .put(update_bom_version)
                .delete(delete_bom_version),
        )
        .route("/bom-versions/{id}/activate", post(activate_bom_version))
        .route("/bom-versions/{id}/archive", post(archive_bom_version))
        .route(
            "/bom-versions/{id}/items/batch",
            post(batch_create_bom_items),
        )
        .route("/bom-items", get(list_bom_items).post(create_bom_item))
        .route(
            "/bom-items/{id}",
            get(get_bom_item)
                .put(update_bom_item)
                .delete(delete_bom_item),
        )
        .route(
            "/bom-compare",
            get(list_bom_comparisons).post(compare_bom_versions),
        )
        .route("/bom-compare/{id}", get(get_bom_comparison))
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct BomVersion {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub bom_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: Option<String>,
    pub version: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct BomItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub bom_version_id: Uuid,
    pub material_id: Option<Uuid>,
    pub part_number: String,
    pub part_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: BigDecimal,
    pub loss_rate: Option<BigDecimal>,
    pub level: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BomVersionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BomItemQuery {
    pub bom_version_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBomVersionRequest {
    pub bom_no: String,
    pub name: String,
    pub product_id: Option<String>,
    pub version: String,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBomVersionRequest {
    pub bom_no: Option<String>,
    pub name: Option<String>,
    pub product_id: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBomItemRequest {
    pub bom_version_id: Uuid,
    pub level: Option<i32>,
    pub part_number: String,
    pub part_name: String,
    pub quantity: BigDecimal,
    pub unit: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBomItemRequest {
    pub level: Option<i32>,
    pub part_number: Option<String>,
    pub part_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCreateBomItemsRequest {
    pub items: Vec<CreateBomItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CompareBomVersionsRequest {
    pub bom_version_a_id: Uuid,
    pub bom_version_b_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct BomComparison {
    pub id: Uuid,
    pub name: String,
    pub bom_version_a_id: Uuid,
    pub bom_version_b_id: Uuid,
    pub differences: BomDifferences,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct BomDifferences {
    pub addeditems: Vec<BomItem>,
    pub removeditems: Vec<BomItem>,
    pub modifieditems: Vec<serde_json::Value>,
}

fn parse_optional_uuid(
    value: &Option<String>,
) -> Result<Option<Uuid>, Json<ApiResponse<serde_json::Value>>> {
    match value {
        Some(raw) if !raw.trim().is_empty() => Uuid::parse_str(raw)
            .map(Some)
            .map_err(|_| Json(ApiResponse::error(400, "product_id 不是有效 UUID"))),
        _ => Ok(None),
    }
}

fn json_value<T: Serialize>(
    value: T,
    success_msg: &str,
    error_msg: &str,
) -> Json<ApiResponse<serde_json::Value>> {
    match serde_json::to_value(value) {
        Ok(value) => Json(ApiResponse::success(value, success_msg)),
        Err(e) => {
            tracing::error!("PDM BOM 响应序列化失败: {}", e);
            Json(ApiResponse::error(500, error_msg))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-versions",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BomVersionQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        SELECT id, tenant_id, bom_no, product_name AS name, product_id, product_name,
               product_code, version, status, description, created_at, updated_at
        FROM pdm_boms
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR bom_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(items) => json_value(items, "获取 BOM 版本列表成功", "获取 BOM 版本列表失败"),
        Err(e) => {
            tracing::error!("获取 BOM 版本列表失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 版本列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        SELECT id, tenant_id, bom_no, product_name AS name, product_id, product_name,
               product_code, version, status, description, created_at, updated_at
        FROM pdm_boms
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "获取 BOM 版本成功", "获取 BOM 版本失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("获取 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-versions",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateBomVersionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let product_id = match parse_optional_uuid(&payload.product_id) {
        Ok(value) => value,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        INSERT INTO pdm_boms
            (tenant_id, bom_no, product_id, product_name, version, status, description)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft'), $7)
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&payload.bom_no)
    .bind(product_id)
    .bind(&payload.name)
    .bind(&payload.version)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(item) => json_value(item, "创建 BOM 版本成功", "创建 BOM 版本失败"),
        Err(e) => {
            tracing::error!("创建 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "创建 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateBomVersionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let product_id = match parse_optional_uuid(&payload.product_id) {
        Ok(value) => value,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        UPDATE pdm_boms
        SET bom_no = COALESCE($3, bom_no),
            product_name = COALESCE($4, product_name),
            product_id = COALESCE($5, product_id),
            version = COALESCE($6, version),
            status = COALESCE($7, status),
            description = COALESCE($8, description),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.bom_no)
    .bind(&payload.name)
    .bind(product_id)
    .bind(&payload.version)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "更新 BOM 版本成功", "更新 BOM 版本失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query("DELETE FROM pdm_boms WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => {
            json_value(true, "删除 BOM 版本成功", "删除 BOM 版本失败")
        }
        Ok(_) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("删除 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "删除 BOM 版本失败"))
        }
    }
}

async fn update_bom_status(
    state: AppState,
    claims: Claims,
    headers: axum::http::HeaderMap,
    id: Uuid,
    status: &'static str,
    message: &'static str,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        UPDATE pdm_boms
        SET status = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(status)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, message, "更新 BOM 状态失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 状态失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 状态失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-versions/{id}/activate",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn activate_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    update_bom_status(state, claims, headers, id, "active", "启用 BOM 版本成功").await
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-versions/{id}/archive",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn archive_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    update_bom_status(state, claims, headers, id, "archived", "归档 BOM 版本成功").await
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-items",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BomItemQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR bom_id = $2)
        ORDER BY sequence ASC, material_code ASC
        "#,
    )
    .bind(tenant_id)
    .bind(query.bom_version_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(items) => json_value(items, "获取 BOM 明细列表成功", "获取 BOM 明细列表失败"),
        Err(e) => {
            tracing::error!("获取 BOM 明细列表失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 明细列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "获取 BOM 明细成功", "获取 BOM 明细失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("获取 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-items",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateBomItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = insert_bom_item(&state, tenant_id, &payload).await;

    match result {
        Ok(item) => json_value(item, "创建 BOM 明细成功", "创建 BOM 明细失败"),
        Err(e) => {
            tracing::error!("创建 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "创建 BOM 明细失败"))
        }
    }
}

async fn insert_bom_item(
    state: &AppState,
    tenant_id: Uuid,
    payload: &CreateBomItemRequest,
) -> Result<BomItem, sqlx::Error> {
    sqlx::query_as::<_, BomItem>(
        r#"
        INSERT INTO pdm_bom_items
            (tenant_id, bom_id, material_code, material_name, unit, quantity, sequence, notes)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), $8)
        RETURNING id, tenant_id, bom_id AS bom_version_id, material_id,
                  material_code AS part_number, material_name AS part_name,
                  specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        "#,
    )
    .bind(tenant_id)
    .bind(payload.bom_version_id)
    .bind(&payload.part_number)
    .bind(&payload.part_name)
    .bind(&payload.unit)
    .bind(&payload.quantity)
    .bind(payload.level)
    .bind(&payload.remarks)
    .fetch_one(&state.pool)
    .await
}

#[utoipa::path(
    put,
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateBomItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        UPDATE pdm_bom_items
        SET material_code = COALESCE($3, material_code),
            material_name = COALESCE($4, material_name),
            unit = COALESCE($5, unit),
            quantity = COALESCE($6, quantity),
            sequence = COALESCE($7, sequence),
            notes = COALESCE($8, notes)
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_id AS bom_version_id, material_id,
                  material_code AS part_number, material_name AS part_name,
                  specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.part_number)
    .bind(&payload.part_name)
    .bind(&payload.unit)
    .bind(&payload.quantity)
    .bind(payload.level)
    .bind(&payload.remarks)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "更新 BOM 明细成功", "更新 BOM 明细失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query("DELETE FROM pdm_bom_items WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => {
            json_value(true, "删除 BOM 明细成功", "删除 BOM 明细失败")
        }
        Ok(_) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("删除 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "删除 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-versions/{bomVersionId}/items/batch",
    tag = "pdm",
    params(("bomVersionId" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn batch_create_bom_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<BatchCreateBomItemsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut created = Vec::new();

    for mut item in payload.items {
        item.bom_version_id = id;
        match insert_bom_item(&state, tenant_id, &item).await {
            Ok(row) => created.push(row),
            Err(e) => {
                tracing::error!("批量创建 BOM 明细失败: {}", e);
                return Json(ApiResponse::error(500, "批量创建 BOM 明细失败"));
            }
        }
    }

    json_value(created, "批量创建 BOM 明细成功", "批量创建 BOM 明细失败")
}

#[utoipa::path(
    post,
    path = "/api/pdm/bom-compare",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn compare_bom_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CompareBomVersionsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let items_a = fetch_items_by_bom(&state, tenant_id, payload.bom_version_a_id).await;
    let items_b = fetch_items_by_bom(&state, tenant_id, payload.bom_version_b_id).await;

    let (items_a, items_b) = match (items_a, items_b) {
        (Ok(a), Ok(b)) => (a, b),
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("BOM 对比读取明细失败: {}", e);
            return Json(ApiResponse::error(500, "BOM 对比失败"));
        }
    };

    let keys_a: HashSet<String> = items_a
        .iter()
        .map(|item| item.part_number.clone())
        .collect();
    let keys_b: HashSet<String> = items_b
        .iter()
        .map(|item| item.part_number.clone())
        .collect();
    let by_key_a: HashMap<String, BomItem> = items_a
        .into_iter()
        .map(|item| (item.part_number.clone(), item))
        .collect();
    let by_key_b: HashMap<String, BomItem> = items_b
        .into_iter()
        .map(|item| (item.part_number.clone(), item))
        .collect();

    let addeditems = keys_b
        .difference(&keys_a)
        .filter_map(|key| by_key_b.get(key).cloned())
        .collect::<Vec<_>>();
    let removeditems = keys_a
        .difference(&keys_b)
        .filter_map(|key| by_key_a.get(key).cloned())
        .collect::<Vec<_>>();
    let modifieditems = keys_a
        .intersection(&keys_b)
        .filter_map(|key| {
            let before = by_key_a.get(key)?;
            let after = by_key_b.get(key)?;
            if before.quantity != after.quantity
                || before.unit != after.unit
                || before.part_name != after.part_name
            {
                Some(serde_json::json!({
                    "part_number": key,
                    "before": before,
                    "after": after
                }))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    let comparison = BomComparison {
        id: Uuid::new_v4(),
        name: "BOM 版本对比".to_string(),
        bom_version_a_id: payload.bom_version_a_id,
        bom_version_b_id: payload.bom_version_b_id,
        differences: BomDifferences {
            addeditems,
            removeditems,
            modifieditems,
        },
        created_at: chrono::Utc::now(),
    };

    json_value(comparison, "BOM 对比成功", "BOM 对比失败")
}

async fn fetch_items_by_bom(
    state: &AppState,
    tenant_id: Uuid,
    bom_id: Uuid,
) -> Result<Vec<BomItem>, sqlx::Error> {
    sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE tenant_id = $1 AND bom_id = $2
        ORDER BY sequence ASC, material_code ASC
        "#,
    )
    .bind(tenant_id)
    .bind(bom_id)
    .fetch_all(&state.pool)
    .await
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-compare",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_comparisons() -> Json<ApiResponse<serde_json::Value>> {
    json_value(
        Vec::<BomComparison>::new(),
        "获取 BOM 对比列表成功",
        "获取 BOM 对比列表失败",
    )
}

#[utoipa::path(
    get,
    path = "/api/pdm/bom-compare/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 对比 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_comparison(Path(_id): Path<Uuid>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::error(
        404,
        "BOM 对比结果未持久化，请重新发起对比",
    ))
}
