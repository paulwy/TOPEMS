use axum::{extract::Path, extract::Query, extract::State, routing::get, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/pdm/materials",
            get(list_materials).post(create_material),
        )
        .route(
            "/api/pdm/materials/{id}",
            get(get_material)
                .put(update_material)
                .delete(delete_material),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Material {
    pub id: Uuid,
    pub material_no: String,
    pub name: String,
    pub spec: Option<String>,
    pub unit: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterialRequest {
    pub material_no: String,
    pub name: String,
    pub spec: Option<String>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialRequest {
    pub material_no: Option<String>,
    pub name: Option<String>,
    pub spec: Option<String>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MaterialQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn list_materials(
    State(state): State<AppState>,
    Query(query): Query<MaterialQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials
        WHERE ($1::text IS NULL OR material_no ILIKE $1 OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(materials) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_materials
                WHERE ($1::text IS NULL OR material_no ILIKE $1 OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "materials": materials,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取物料列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取物料列表失败: {}", e);
            Json(ApiResponse::error(500, "获取物料列表失败"))
        }
    }
}

pub async fn create_material(
    State(state): State<AppState>,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    if req.material_no.is_empty() {
        return Json(ApiResponse::error(400, "物料编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "物料名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());
    let now = Utc::now();

    let result = sqlx::query_as::<_, Material>(
        r#"
        INSERT INTO pdm_materials (
            id, material_no, name, spec, unit, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, material_no, name, spec, unit, status, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(&req.material_no)
    .bind(&req.name)
    .bind(&req.spec)
    .bind(&req.unit)
    .bind(&status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(material) => Json(ApiResponse::success(material, "物料创建成功")),
        Err(e) => {
            tracing::error!("创建物料失败: {}", e);
            Json(ApiResponse::error(500, "创建物料失败"))
        }
    }
}

pub async fn get_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Material>> {
    let result = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(material)) => Json(ApiResponse::success(material, "获取物料成功")),
        Ok(None) => Json(ApiResponse::error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("获取物料失败: {}", e);
            Json(ApiResponse::error(500, "获取物料失败"))
        }
    }
}

pub async fn update_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let existing = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("查询物料失败: {}", e);
            return Json(ApiResponse::error(500, "查询物料失败"));
        }
    };

    let material_no = req.material_no.unwrap_or(existing.material_no);
    let name = req.name.unwrap_or(existing.name);
    let spec = req.spec.or(existing.spec);
    let unit = req.unit.or(existing.unit);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Material>(
        r#"
        UPDATE pdm_materials SET
            material_no = $2, name = $3, spec = $4, unit = $5,
            status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, material_no, name, spec, unit, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&material_no)
    .bind(&name)
    .bind(&spec)
    .bind(&unit)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(material) => Json(ApiResponse::success(material, "物料更新成功")),
        Err(e) => {
            tracing::error!("更新物料失败: {}", e);
            Json(ApiResponse::error(500, "更新物料失败"))
        }
    }
}

pub async fn delete_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pdm_materials WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "物料删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("删除物料失败: {}", e);
            Json(ApiResponse::error(500, "删除物料失败"))
        }
    }
}
