use axum::{extract::State, http::HeaderMap, routing::get, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/reagents", get(list_reagents).post(create_reagent))
        .route(
            "/reagents/{id}",
            get(get_reagent).put(update_reagent).delete(delete_reagent),
        )
}

#[derive(Debug, Deserialize)]
pub struct ReagentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Reagent {
    pub id: String,
    pub tenant_id: String,
    pub reagent_no: String,
    pub name: String,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
    pub expired_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateReagentRequest {
    pub name: String,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub expired_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReagentRequest {
    pub name: Option<String>,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub expired_at: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:reagent:read"])),
    path = "/lims/reagents",
    tag = "reagent",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("page_size" = Option<i64>, Query, description = "Items per page"),
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("name" = Option<String>, Query, description = "Filter by name"),
    ),
    responses(
        (status = 200, description = "List of reagents", body = ApiResponse<Vec<Reagent>>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_reagents(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Query(query): axum::extract::Query<ReagentQuery>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let sql = match (query.status.as_ref(), query.name.as_ref()) {
        (Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, reagent_no, CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, reagent_no, CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, reagent_no, CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None) => "SELECT id::TEXT, tenant_id::TEXT, reagent_no, CASE WHEN $4 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    match (query.status.as_ref(), query.name.as_ref()) {
        (Some(st), Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset)
                .bind(locale);
        }
        (Some(st), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(page_size)
                .bind(offset)
                .bind(locale);
        }
        (None, Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset)
                .bind(locale);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset).bind(locale);
        }
    }

    let reagents = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| Reagent {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                reagent_no: row.get("reagent_no"),
                name: row.get("name"),
                specification: row.get("specification"),
                manufacturer: row.get("manufacturer"),
                batch_no: row.get("batch_no"),
                quantity: row.get("quantity"),
                unit: row.get("unit"),
                status: row.get("status"),
                expired_at: row.get("expired_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match reagents {
        Ok(data) => Json(ApiResponse::success(data, "获取试剂列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch reagents: {}", e);
            Json(ApiResponse::error(500, "获取试剂列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:reagent:write"])),
    path = "/lims/reagents",
    tag = "reagent",
    request_body = CreateReagentRequest,
    responses(
        (status = 200, description = "Reagent created", body = ApiResponse<Reagent>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_reagent(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let reagent_no = format!(
        "RGT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "INSERT INTO qa_lab_reagents (tenant_id, reagent_no, name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'normal', $9) RETURNING id::TEXT, tenant_id::TEXT, reagent_no, name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(reagent_no)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(&req.manufacturer)
    .bind(&req.batch_no)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(req.expired_at.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let reagent = Reagent {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            // 发布端补全：LimsReagentAlert（试剂已过期 → EHS 告警联动）
            if let Some(expired) = reagent.expired_at.as_deref() {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(expired) {
                    if dt.with_timezone(&chrono::Utc) < chrono::Utc::now() {
                        if let Some(ref publisher) = state.event_publisher {
                            let publisher = publisher.clone();
                            let rid = Uuid::parse_str(&reagent.id).unwrap_or_else(|_| Uuid::nil());
                            let rno = reagent.reagent_no.clone();
                            let rname = reagent.name.clone();
                            let stock = reagent.quantity.map(|q| q as i32);
                            let expiry = Some(expired.to_string());
                            tokio::spawn(async move {
                                let payload = topems_shared_event::event::LimsReagentAlertPayload {
                                    reagent_id: rid,
                                    reagent_no: rno,
                                    reagent_name: rname,
                                    alert_type: Some("expired".to_string()),
                                    severity: Some("high".to_string()),
                                    description: Some("试剂已过期".to_string()),
                                    current_stock: stock,
                                    min_stock: None,
                                    expiry_date: expiry,
                                };
                                if let Err(e) = publisher
                                    .publish_event(
                                        topems_shared_event::event::EventType::LimsReagentAlert,
                                        payload,
                                    )
                                    .await
                                {
                                    tracing::warn!("[lims] LimsReagentAlert 事件发布失败: {}", e);
                                }
                            });
                        }
                    }
                }
            }

            Json(ApiResponse::success(reagent, "试剂创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create reagent: {}", e);
            Json(ApiResponse::error(500, "试剂创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:reagent:read"])),
    path = "/lims/reagents/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "reagent"
)]
pub async fn get_reagent(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Reagent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let row = sqlx::query(
        "SELECT id::TEXT, tenant_id::TEXT, reagent_no, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Reagent {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取试剂成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch reagent: {}", e);
            Json(ApiResponse::error(500, "获取试剂失败"))
        }
    }
}

pub async fn update_reagent(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "UPDATE qa_lab_reagents SET name = COALESCE($3, name), specification = COALESCE($4, specification), manufacturer = COALESCE($5, manufacturer), batch_no = COALESCE($6, batch_no), quantity = COALESCE($7, quantity), unit = COALESCE($8, unit), status = COALESCE($9, status), expired_at = COALESCE($10, expired_at), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id::TEXT, tenant_id::TEXT, reagent_no, name, specification, manufacturer, batch_no, quantity::FLOAT8, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(&req.manufacturer)
    .bind(&req.batch_no)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(req.expired_at.as_deref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Reagent {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "试剂更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update reagent: {}", e);
            Json(ApiResponse::error(500, "试剂更新失败"))
        }
    }
}

pub async fn delete_reagent(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };
    let tenant_id = ctx.tenant_id;

    let result = sqlx::query(
        "UPDATE qa_lab_reagents SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "试剂删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete reagent: {}", e);
            Json(ApiResponse::error(500, "试剂删除失败"))
        }
    }
}
