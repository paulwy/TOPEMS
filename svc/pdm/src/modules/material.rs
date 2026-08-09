use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::services::mdm_event_service::MdmEventService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};
use topems_shared_event::event::{EventType, MasterDataAction, PdmMaterialCreatedPayload};

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
        .route("/materials", get(list_materials).post(create_material))
        .route(
            "/materials/{id}",
            get(get_material)
                .put(update_material)
                .delete(delete_material),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Material {
    pub id: Uuid,
    pub tenant_id: Uuid,
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

#[utoipa::path(
    get,
    path = "/api/pdm/materials",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_materials(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<MaterialQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR material_no ILIKE $2 OR name ILIKE $2)
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
        Ok(materials) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_materials
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR material_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
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

#[utoipa::path(
    post,
    path = "/api/pdm/materials",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_material(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let tenant_id = get_tenant_id(&claims, &headers);

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
            id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
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
        Ok(material) => {
            // 发布标准事件
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let mat_id = material.id;
                let mat_code = material.material_no.clone();
                let mat_name = material.name.clone();
                let mat_spec = material.spec.clone();
                tokio::spawn(async move {
                    let payload = PdmMaterialCreatedPayload {
                        material_id: mat_id,
                        material_code: mat_code,
                        material_name: mat_name,
                        material_type: None,
                        specification: mat_spec,
                        created_by: None,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::PdmMaterialCreated, payload)
                        .await
                    {
                        tracing::warn!(
                            "[pdm] PdmMaterialCreated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[pdm] PdmMaterialCreated 事件发布成功 - material_id={}",
                            mat_id
                        );
                    }
                });
            }

            // 发布 MDM 主数据事件
            let mdm_service = MdmEventService::new();
            let mat_id = material.id;
            let mat_no = material.material_no.clone();
            let mat_name = material.name.clone();
            let mat_spec = material.spec.clone();
            let mat_unit = material.unit.clone();
            let mat_status = material.status.clone();
            let tid = tenant_id;
            tokio::spawn(async move {
                mdm_service
                    .publish_material_event(
                        tid,
                        mat_id,
                        &mat_no,
                        &mat_name,
                        mat_spec.as_deref(),
                        mat_unit.as_deref(),
                        &mat_status,
                        MasterDataAction::Created,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success(material, "物料创建成功"))
        }
        Err(e) => {
            tracing::error!("创建物料失败: {}", e);
            Json(ApiResponse::error(500, "创建物料失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/materials/{id}",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_material(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Material>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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

#[utoipa::path(
    put,
    path = "/api/pdm/materials/{id}",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn update_material(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Material>(
        r#"
        SELECT id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        FROM pdm_materials WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, tenant_id, material_no, name, spec, unit, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&material_no)
    .bind(&name)
    .bind(&spec)
    .bind(&unit)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(material) => {
            // 发布 MDM 主数据事件
            let mdm_service = MdmEventService::new();
            let mat_id = material.id;
            let mat_no = material.material_no.clone();
            let mat_name = material.name.clone();
            let mat_spec = material.spec.clone();
            let mat_unit = material.unit.clone();
            let mat_status = material.status.clone();
            let tid = tenant_id;
            tokio::spawn(async move {
                mdm_service
                    .publish_material_event(
                        tid,
                        mat_id,
                        &mat_no,
                        &mat_name,
                        mat_spec.as_deref(),
                        mat_unit.as_deref(),
                        &mat_status,
                        MasterDataAction::Updated,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success(material, "物料更新成功"))
        }
        Err(e) => {
            tracing::error!("更新物料失败: {}", e);
            Json(ApiResponse::error(500, "更新物料失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pdm/materials/{id}",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_material(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE pdm_materials SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 发布 MDM 主数据事件
            let mdm_service = MdmEventService::new();
            let mat_id = id;
            let tid = tenant_id;
            tokio::spawn(async move {
                mdm_service
                    .publish_material_event(
                        tid,
                        mat_id,
                        "",
                        "",
                        None,
                        None,
                        "deleted",
                        MasterDataAction::Deleted,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success(true, "物料删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("删除物料失败: {}", e);
            Json(ApiResponse::error(500, "删除物料失败"))
        }
    }
}
