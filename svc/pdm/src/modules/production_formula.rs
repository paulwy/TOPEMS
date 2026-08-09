use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
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
            "/production-formulas",
            get(list_formulas).post(create_formula),
        )
        .route(
            "/production-formulas/{id}",
            get(get_formula).put(update_formula).delete(delete_formula),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionFormula {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub formula_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: serde_json::Value,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFormulaRequest {
    pub formula_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFormulaRequest {
    pub formula_no: Option<String>,
    pub name: Option<String>,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FormulaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    path = "/api/pdm/production-formulas",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_formulas(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<FormulaQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, tenant_id, formula_no, name, product_id, description, formula_items,
               status, created_at, updated_at
        FROM pdm_production_formulas
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR formula_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR product_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.product_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(formulas) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_formulas
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR formula_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR product_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.product_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "formulas": formulas,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取配方列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取配方列表失败: {}", e);
            Json(ApiResponse::error(500, "获取配方列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/production-formulas",
    request_body = CreateFormulaRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.formula_no.is_empty() {
        return Json(ApiResponse::error(400, "配方编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "配方名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());
    let formula_items = req.formula_items.unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        INSERT INTO pdm_production_formulas (
            tenant_id, formula_no, name, product_id, description, formula_items, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, formula_no, name, product_id, description, formula_items,
                  status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.formula_no)
    .bind(&req.name)
    .bind(req.product_id)
    .bind(&req.description)
    .bind(&formula_items)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(formula) => Json(ApiResponse::success(formula, "配方创建成功")),
        Err(e) => {
            tracing::error!("创建配方失败: {}", e);
            Json(ApiResponse::error(500, "创建配方失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/production-formulas/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, tenant_id, formula_no, name, product_id, description, formula_items,
               status, created_at, updated_at
        FROM pdm_production_formulas WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "获取配方成功")),
        Ok(None) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("获取配方失败: {}", e);
            Json(ApiResponse::error(500, "获取配方失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pdm/production-formulas/{id}",
    request_body = UpdateFormulaRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        UPDATE pdm_production_formulas SET
            formula_no = COALESCE(NULLIF($2, ''), formula_no),
            name = COALESCE(NULLIF($3, ''), name),
            product_id = COALESCE($4, product_id),
            description = COALESCE($5, description),
            formula_items = COALESCE($6, formula_items),
            status = COALESCE(NULLIF($7, ''), status),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, tenant_id, formula_no, name, product_id, description, formula_items,
                  status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.formula_no)
    .bind(&req.name)
    .bind(req.product_id)
    .bind(&req.description)
    .bind(&req.formula_items)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "配方更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("更新配方失败: {}", e);
            Json(ApiResponse::error(500, "更新配方失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pdm/production-formulas/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE pdm_production_formulas SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "配方删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("删除配方失败: {}", e);
            Json(ApiResponse::error(500, "删除配方失败"))
        }
    }
}
