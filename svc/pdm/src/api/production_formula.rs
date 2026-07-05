use axum::{
    extract::Path,
    extract::Query,
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/pdm/production-formulas",
            get(list_formulas).post(create_formula),
        )
        .route(
            "/api/pdm/production-formulas/{id}",
            get(get_formula).put(update_formula).delete(delete_formula),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionFormula {
    pub id: Uuid,
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

pub async fn list_formulas(
    State(state): State<AppState>,
    Query(query): Query<FormulaQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, formula_no, name, product_id, description, formula_items,
               status, created_at, updated_at
        FROM pdm_production_formulas
        WHERE ($1::text IS NULL OR formula_no ILIKE $1 OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR product_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
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
                WHERE ($1::text IS NULL OR formula_no ILIKE $1 OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR product_id = $3)
                "#,
            )
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

pub async fn create_formula(
    State(state): State<AppState>,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
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
            formula_no, name, product_id, description, formula_items, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, formula_no, name, product_id, description, formula_items,
                  status, created_at, updated_at
        "#,
    )
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

pub async fn get_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionFormula>> {
    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, formula_no, name, product_id, description, formula_items,
               status, created_at, updated_at
        FROM pdm_production_formulas WHERE id = $1
        "#,
    )
    .bind(id)
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

pub async fn update_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
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
        WHERE id = $1
        RETURNING id, formula_no, name, product_id, description, formula_items,
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

pub async fn delete_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pdm_production_formulas WHERE id = $1")
        .bind(id)
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
