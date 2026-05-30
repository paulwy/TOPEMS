
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateFormulaRequest, Formula, UpdateFormulaRequest};
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> topems_shared::Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/formulas", get(list_formulas).post(create_formula))
        .route(
            "/api/v1/formulas/{id}",
            get(get_formula).put(update_formula).delete(delete_formula),
        )
        .route(
            "/api/v1/formulas/{id}/versions",
            get(get_formula_versions),
        )
        .with_state(state);

    Ok(app)
}

async fn list_formulas(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, name, code, version, description, project_id, status,
               properties, created_by, created_at, updated_at
        FROM rs.formulas
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR project_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(params.project_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(formulas) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.formulas
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR project_id = $3)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .bind(params.project_id)
            .fetch_one(&state.db)
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

async fn create_formula(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Formula>(
        r#"
        INSERT INTO rs.formulas (
            id, name, code, version, description, project_id, status,
            ingredients, process_params, properties, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, name, code, version, description, project_id, status,
                  properties, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(1)
    .bind(&req.description)
    .bind(req.project_id)
    .bind("draft")
    .bind(serde_json::to_value(req.ingredients).unwrap_or(serde_json::json!([])))
    .bind(req.process_params)
    .bind(req.properties)
    .bind(&req.name)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(formula) => Json(ApiResponse::success(formula, "配方创建成功")),
        Err(e) => {
            tracing::error!("创建配方失败: {}", e);
            Json(ApiResponse::error(500, "配方创建失败"))
        }
    }
}

async fn get_formula(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Formula>> {
    let result = sqlx::query_as::<_, Formula>(
        r#"
        SELECT id, name, code, version, description, project_id, status,
               properties, created_by, created_at, updated_at
        FROM rs.formulas WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn update_formula(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    let existing = sqlx::query_as::<_, Formula>(
        "SELECT id, name, code, version, description, project_id, status, properties, created_by, created_at, updated_at FROM rs.formulas WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询配方失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let ingredients = req.ingredients.unwrap_or(vec![]);
    let process_params = req.process_params.unwrap_or(existing.properties.clone());
    let properties = req.properties.unwrap_or(existing.properties);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Formula>(
        r#"
        UPDATE rs.formulas SET
            name = $2, description = $3, status = $4,
            ingredients = $5, process_params = $6, properties = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, name, code, version, description, project_id, status,
                  properties, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(&status)
    .bind(serde_json::to_value(ingredients).unwrap())
    .bind(process_params)
    .bind(properties)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(formula) => Json(ApiResponse::success(formula, "配方更新成功")),
        Err(e) => {
            tracing::error!("更新配方失败: {}", e);
            Json(ApiResponse::error(500, "配方更新失败"))
        }
    }
}

async fn delete_formula(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM rs.formulas WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "配方删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("删除配方失败: {}", e);
            Json(ApiResponse::error(500, "配方删除失败"))
        }
    }
}

async fn get_formula_versions(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let result = sqlx::query_as::<_, (Option<serde_json::Value>,)>(
        r#"
        SELECT json_agg(
            json_build_object(
                'id', id,
                'version', version,
                'ingredients', ingredients,
                'process_params', process_params,
                'properties', properties,
                'change_reason', change_reason,
                'created_by', created_by,
                'created_at', created_at
            )
        ) as versions
        FROM rs.formula_versions
        WHERE formula_id = $1
        ORDER BY version DESC
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok((versions,)) => {
            let versions = versions.unwrap_or(serde_json::json!([]));
            Json(ApiResponse::success(versions.as_array().unwrap_or(&vec![]).clone(), "获取配方版本历史成功"))
        }
        Err(e) => {
            tracing::error!("获取配方版本历史失败: {}", e);
            Json(ApiResponse::error(500, "获取配方版本历史失败"))
        }
    }
}
