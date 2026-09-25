use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/samples", get(list_samples).post(register_sample))
        .route(
            "/samples/{id}",
            get(get_sample).put(update_sample).delete(delete_sample),
        )
        .route("/samples/{id}/lifecycle", get(get_sample_lifecycle))
        .route("/samples/lifecycle", post(record_lifecycle_event))
        .route(
            "/samples/{id}/stage/{to_stage}",
            post(transition_sample_stage),
        )
        .route("/samples/{id}/traceability", get(get_sample_traceability))
        .route("/lifecycle-stages", get(get_lifecycle_stages))
        .route("/lifecycle-stages/{code}", get(get_lifecycle_stage))
}

#[derive(Debug, Deserialize)]
pub struct SampleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub sample_no: Option<String>,
    pub sample_name: Option<String>,
}

/// 样品详情缓存 key（含 tenant_id）
fn sample_detail_key(tenant_id: &Option<Uuid>, id: &str) -> String {
    let tk = tenant_id
        .as_ref()
        .map(|t| t.to_string())
        .unwrap_or_else(|| "all".to_string());
    format!("lims:sample:{}:{}", tk, id)
}

/// 样品列表缓存 key（按查询参数归一化，含 tenant_id）
fn sample_list_key(tenant_id: &Option<Uuid>, query: &SampleQuery) -> String {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let status = query.status.as_deref().unwrap_or("all");
    let sample_no = query.sample_no.as_deref().unwrap_or("all");
    let sample_name = query.sample_name.as_deref().unwrap_or("all");
    let tenant_key = tenant_id
        .as_ref()
        .map(|t| t.to_string())
        .unwrap_or_else(|| "all".to_string());
    format!(
        "lims:sample:list:{}:p:{}:ps:{}:s:{}:no:{}:nm:{}",
        tenant_key, page, page_size, status, sample_no, sample_name
    )
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Sample {
    pub id: String,
    pub tenant_id: String,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
    pub received_at: Option<String>,
    pub expired_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateSampleRequest {
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSampleRequest {
    pub sample_name: Option<String>,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub expired_at: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lims/samples",
    tag = "sample",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("page_size" = Option<i64>, Query, description = "Items per page"),
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("sample_no" = Option<String>, Query, description = "Filter by sample number"),
        ("sample_name" = Option<String>, Query, description = "Filter by sample name"),
    ),
    responses(
        (status = 200, description = "List of samples", body = ApiResponse<Vec<Sample>>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_samples(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<SampleQuery>,
) -> Json<ApiResponse<Vec<Sample>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    // 缓存读取：先查多级缓存，miss 再回源数据库
    let list_key = sample_list_key(&tenant_id, &query);
    if let Some(cached) = state.sample_cache.get(&list_key).await {
        match serde_json::from_value::<Vec<Sample>>(cached) {
            Ok(data) => return Json(ApiResponse::success(data, "从缓存获取样品列表成功")),
            Err(e) => tracing::warn!("样品列表缓存反序列化失败，回源: {}", e),
        }
    }

    let sql = match (query.status.as_ref(), query.sample_no.as_ref(), query.sample_name.as_ref()) {
        (Some(_), Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND sample_no LIKE $3 AND sample_name LIKE $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6",
        (Some(_), Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND sample_no LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND sample_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None, None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND sample_no LIKE $2 AND sample_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (None, Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND sample_no LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND sample_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None, None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    };

    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    match (
        query.status.as_ref(),
        query.sample_no.as_ref(),
        query.sample_name.as_ref(),
    ) {
        (Some(st), Some(no), Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", no))
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), Some(no), None) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", no))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None, None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(no), Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", no))
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, Some(no), None) => {
            query_builder = query_builder
                .bind(format!("%{}%", no))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let samples = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| Sample {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                sample_no: row.get("sample_no"),
                sample_name: row.get("sample_name"),
                sample_type: row.get("sample_type"),
                source: row.get("source"),
                quantity: row.get("quantity"),
                unit: row.get("unit"),
                status: row.get("status"),
                received_at: row.get("received_at"),
                expired_at: row.get("expired_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match samples {
        Ok(data) => {
            // 回填多级缓存
            if let Ok(v) = serde_json::to_value(&data) {
                state.sample_cache.set(list_key, v).await;
            }
            Json(ApiResponse::success(data, "获取样品列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch samples: {}", e);
            Json(ApiResponse::error(500, "获取样品列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples",
    tag = "sample",
    request_body = CreateSampleRequest,
    responses(
        (status = 200, description = "Sample registered", body = ApiResponse<Sample>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn register_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let sample_no = format!(
        "SMP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "INSERT INTO public.qa_lab_samples (tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'received') RETURNING id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(sample_no)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let sample = Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 新样品入库，列表缓存失效（pattern 广播）
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:sample:list:{}:*", tenant),
                            "pattern",
                            Some("sample_registered"),
                        )
                        .await;
                });
            }
            Json(ApiResponse::success(sample, "样品登记成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create sample: {}", e);
            Json(ApiResponse::error(500, "样品登记失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lims/samples/{id}",
    tag = "sample",
    params(
        ("id" = String, Path, description = "Sample ID"),
    ),
    responses(
        (status = 200, description = "Sample detail", body = ApiResponse<Sample>),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Sample>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let cache_key = sample_detail_key(&tenant_id, &id.to_string());

    // 缓存读取
    if let Some(cached) = state.sample_cache.get(&cache_key).await {
        match serde_json::from_value::<Sample>(cached) {
            Ok(sample) => return Json(ApiResponse::success(sample, "从缓存获取样品成功")),
            Err(e) => tracing::warn!("样品详情缓存反序列化失败，回源: {}", e),
        }
    }

    let row = sqlx::query(
        "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let sample = Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 回填缓存
            if let Ok(v) = serde_json::to_value(&sample) {
                state.sample_cache.set(cache_key, v).await;
            }
            Json(ApiResponse::success(sample, "获取样品成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            Json(ApiResponse::error(500, "获取样品失败"))
        }
    }
}

pub async fn update_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let row = sqlx::query(
        "UPDATE public.qa_lab_samples SET sample_name = COALESCE($3, sample_name), sample_type = COALESCE($4, sample_type), source = COALESCE($5, source), quantity = COALESCE($6, quantity), unit = COALESCE($7, unit), status = COALESCE($8, status), expired_at = COALESCE($9, expired_at), updated_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) RETURNING id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit, status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(&req.expired_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let sample = Sample {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                sample_no: r.get("sample_no"),
                sample_name: r.get("sample_name"),
                sample_type: r.get("sample_type"),
                source: r.get("source"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                received_at: r.get("received_at"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            // 失效详情缓存并广播列表失效
            let detail_key = sample_detail_key(&tenant_id, &id.to_string());
            state.sample_cache.remove(&detail_key).await;
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let key = detail_key.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(&key, "specific", Some("sample_updated"))
                        .await;
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:sample:list:{}:*", tenant),
                            "pattern",
                            Some("sample_updated"),
                        )
                        .await;
                });
            }
            Json(ApiResponse::success(sample, "样品更新成功"))
        }
        Err(e) => {
            tracing::error!("Failed to update sample: {}", e);
            Json(ApiResponse::error(500, "样品更新失败"))
        }
    }
}

pub async fn delete_sample(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let result = sqlx::query(
        "UPDATE public.qa_lab_samples SET deleted_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            // 失效详情缓存并广播列表失效
            let detail_key = sample_detail_key(&tenant_id, &id.to_string());
            state.sample_cache.remove(&detail_key).await;
            if let Some(publisher) = &state.event_publisher {
                let publisher = publisher.clone();
                let key = detail_key.clone();
                let tenant = ctx.tenant_id.to_string();
                tokio::spawn(async move {
                    let _ = publisher
                        .publish_cache_invalidated(&key, "specific", Some("sample_deleted"))
                        .await;
                    let _ = publisher
                        .publish_cache_invalidated(
                            &format!("lims:sample:list:{}:*", tenant),
                            "pattern",
                            Some("sample_deleted"),
                        )
                        .await;
                });
            }
            Json(ApiResponse::success(true, "样品删除成功"))
        }
        Err(e) => {
            tracing::error!("Failed to delete sample: {}", e);
            Json(ApiResponse::error(500, "样品删除失败"))
        }
    }
}

// ========================================
// Sample Lifecycle Tracking
// ========================================

#[derive(Debug, Serialize)]
pub struct SampleLifecycleRecord {
    pub id: String,
    pub tenant_id: String,
    pub sample_id: String,
    pub sample_no: String,
    pub lifecycle_stage: String,
    pub stage_description: String,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub location: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLifecycleRecordRequest {
    pub sample_id: String,
    pub lifecycle_stage: String,
    pub stage_description: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LifecycleStageTransition {
    pub from_stage: String,
    pub to_stage: String,
    pub description: String,
}

const LIFECYCLE_STAGES: &[(&str, &str)] = &[
    ("received", "样品接收"),
    ("registered", "登记入库"),
    ("testing", "检测中"),
    ("completed", "检测完成"),
    ("stored", "留样存储"),
    ("retrieved", "样品领取"),
    ("disposed", "样品处置"),
    ("destroyed", "已销毁"),
];

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lims/samples/{id}/lifecycle",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn get_sample_lifecycle(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<SampleLifecycleRecord>>> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let rows = sqlx::query(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, sample_id::TEXT, sample_no, lifecycle_stage, stage_description,
               operator, notes, location, created_at::TEXT
        FROM public.qa_lab_sample_lifecycle
        WHERE sample_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<SampleLifecycleRecord> = rows
                .into_iter()
                .map(|row| SampleLifecycleRecord {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    sample_id: row.get("sample_id"),
                    sample_no: row.get("sample_no"),
                    lifecycle_stage: row.get("lifecycle_stage"),
                    stage_description: row.get("stage_description"),
                    operator: row.get("operator"),
                    notes: row.get("notes"),
                    location: row.get("location"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(records, "获取样品生命周期记录成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch lifecycle records: {}", e);
            Json(ApiResponse::error(500, "获取样品生命周期记录失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples/lifecycle",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn record_lifecycle_event(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateLifecycleRecordRequest>,
) -> Json<ApiResponse<SampleLifecycleRecord>> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let sample_row =
        sqlx::query("SELECT sample_no FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2")
            .bind(sample_id)
            .bind(tenant_id)
            .fetch_optional(&state.pool)
            .await;

    let sample_no = match sample_row {
        Ok(Some(row)) => row.get::<String, _>("sample_no"),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let valid_stage = LIFECYCLE_STAGES
        .iter()
        .any(|(stage, _)| *stage == req.lifecycle_stage);

    if !valid_stage {
        return Json(ApiResponse::error(400, "无效的生命周期阶段"));
    }

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO public.qa_lab_sample_lifecycle (
            id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
            operator, notes, location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id::TEXT, tenant_id::TEXT, sample_id::TEXT, sample_no, lifecycle_stage, stage_description,
                  operator, notes, location, created_at::TEXT
        "#,
    )
    .bind(record_id)
    .bind(ctx.tenant_id)
    .bind(sample_id)
    .bind(&sample_no)
    .bind(&req.lifecycle_stage)
    .bind(&req.stage_description)
    .bind(&req.operator)
    .bind(&req.notes)
    .bind(&req.location)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE public.qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1 AND ($3::uuid IS NULL OR tenant_id = $3)",
            )
            .bind(sample_id)
            .bind(&req.lifecycle_stage)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                SampleLifecycleRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    sample_id: r.get("sample_id"),
                    sample_no: r.get("sample_no"),
                    lifecycle_stage: r.get("lifecycle_stage"),
                    stage_description: r.get("stage_description"),
                    operator: r.get("operator"),
                    notes: r.get("notes"),
                    location: r.get("location"),
                    created_at: r.get("created_at"),
                },
                "生命周期事件记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to record lifecycle event: {}", e);
            Json(ApiResponse::error(500, "记录生命周期事件失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples/{id}/stage/{to_stage}",
    params(
("id" = String, Path, description = "id"),
("to_stage" = String, Path, description = "to_stage")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn transition_sample_stage(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path((sample_id, to_stage)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SampleLifecycleRecord>> {
    let sample_uuid = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let valid_stage = LIFECYCLE_STAGES.iter().any(|(stage, _)| *stage == to_stage);

    if !valid_stage {
        return Json(ApiResponse::error(400, "无效的目标阶段"));
    }

    let current_row = sqlx::query(
        "SELECT sample_no, status FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(sample_uuid)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let (sample_no, current_stage) = match current_row {
        Ok(Some(row)) => (
            row.get::<String, _>("sample_no"),
            row.get::<String, _>("status"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let operator = req.get("operator").and_then(|v| v.as_str());
    let notes = req.get("notes").and_then(|v| v.as_str());
    let location = req.get("location").and_then(|v| v.as_str());
    let description = format!(
        "样品从 [{}] 阶段转换到 [{}] 阶段",
        get_stage_name(&current_stage),
        get_stage_name(&to_stage)
    );

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO public.qa_lab_sample_lifecycle (
            id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
            operator, notes, location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id::TEXT, tenant_id::TEXT, sample_id::TEXT, sample_no, lifecycle_stage, stage_description,
                  operator, notes, location, created_at::TEXT
        "#,
    )
    .bind(record_id)
    .bind(ctx.tenant_id)
    .bind(sample_uuid)
    .bind(&sample_no)
    .bind(&to_stage)
    .bind(&description)
    .bind(operator)
    .bind(notes)
    .bind(location)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE public.qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1 AND ($3::uuid IS NULL OR tenant_id = $3)",
            )
            .bind(sample_uuid)
            .bind(&to_stage)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                SampleLifecycleRecord {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    sample_id: r.get("sample_id"),
                    sample_no: r.get("sample_no"),
                    lifecycle_stage: r.get("lifecycle_stage"),
                    stage_description: r.get("stage_description"),
                    operator: r.get("operator"),
                    notes: r.get("notes"),
                    location: r.get("location"),
                    created_at: r.get("created_at"),
                },
                "样品阶段转换成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to transition sample stage: {}", e);
            Json(ApiResponse::error(500, "样品阶段转换失败"))
        }
    }
}

pub fn get_stage_name(stage: &str) -> String {
    LIFECYCLE_STAGES
        .iter()
        .find(|(s, _)| *s == stage)
        .map(|(_, name)| name.to_string())
        .unwrap_or_else(|| stage.to_string())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lims/lifecycle-stages",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn get_lifecycle_stages() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let stages: Vec<serde_json::Value> = LIFECYCLE_STAGES
        .iter()
        .map(|(code, name)| {
            serde_json::json!({
                "code": code,
                "name": name
            })
        })
        .collect();

    Json(ApiResponse::success(stages, "获取生命周期阶段列表成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lifecycle-stages/{code}",
    params(
("code" = String, Path, description = "code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn get_lifecycle_stage(
    axum::extract::Path(code): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let found = LIFECYCLE_STAGES
        .iter()
        .find(|(c, _)| *c == code)
        .map(|(code, name)| serde_json::json!({ "code": code, "name": name }));
    match found {
        Some(v) => Json(ApiResponse::success(v, "获取生命周期阶段成功")),
        None => Json(ApiResponse::error(404, "生命周期阶段不存在")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:sample:read"])),
    path = "/lims/samples/{id}/traceability",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn get_sample_traceability(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let sample_row = sqlx::query(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity, unit,
               status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM public.qa_lab_samples WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let sample = match sample_row {
        Ok(Some(row)) => serde_json::json!({
            "id": row.get::<String, _>("id"),
            "tenant_id": row.get::<String, _>("tenant_id"),
            "sample_no": row.get::<String, _>("sample_no"),
            "sample_name": row.get::<String, _>("sample_name"),
            "sample_type": row.get::<Option<String>, _>("sample_type"),
            "source": row.get::<Option<String>, _>("source"),
            "quantity": row.get::<Option<f64>, _>("quantity"),
            "unit": row.get::<Option<String>, _>("unit"),
            "status": row.get::<String, _>("status"),
            "received_at": row.get::<Option<String>, _>("received_at"),
            "expired_at": row.get::<Option<String>, _>("expired_at"),
            "created_at": row.get::<Option<String>, _>("created_at"),
            "updated_at": row.get::<Option<String>, _>("updated_at"),
        }),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let lifecycle_rows = sqlx::query(
        r#"
        SELECT id::TEXT, lifecycle_stage, stage_description, operator, notes, location, created_at::TEXT
        FROM public.qa_lab_sample_lifecycle
        WHERE sample_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    let lifecycle_history: Vec<serde_json::Value> = match lifecycle_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|row| {
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "lifecycle_stage": row.get::<String, _>("lifecycle_stage"),
                    "stage_description": row.get::<Option<String>, _>("stage_description"),
                    "operator": row.get::<Option<String>, _>("operator"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "location": row.get::<Option<String>, _>("location"),
                    "created_at": row.get::<String, _>("created_at"),
                })
            })
            .collect(),
        Err(e) => {
            return Json(ApiResponse::error(
                500,
                &format!("查询生命周期记录失败: {}", e),
            ))
        }
    };

    let current_status = sample
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let is_expired = sample
        .get("expired_at")
        .and_then(|v| v.as_str())
        .map(|d| {
            chrono::DateTime::parse_from_rfc3339(d)
                .map(|dt| dt < chrono::Utc::now())
                .unwrap_or(false)
        })
        .unwrap_or(false);

    Json(ApiResponse::success(
        serde_json::json!({
            "sample": sample,
            "lifecycle_history": lifecycle_history,
            "lifecycle_statistics": {
                "total_stages": lifecycle_history.len(),
                "current_stage": current_status,
                "is_expired": is_expired,
                "stage_progress": calculate_stage_progress(current_status),
            }
        }),
        "获取样品追溯信息成功",
    ))
}

pub fn calculate_stage_progress(current_stage: &str) -> f64 {
    let stages_order = [
        "received",
        "registered",
        "testing",
        "completed",
        "stored",
        "retrieved",
        "disposed",
        "destroyed",
    ];
    let current_idx = stages_order
        .iter()
        .position(|s| *s == current_stage)
        .unwrap_or(0);
    (current_idx as f64 / (stages_order.len() - 1) as f64 * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_stage_name_known() {
        assert_eq!(get_stage_name("received"), "样品接收");
        assert_eq!(get_stage_name("testing"), "检测中");
        assert_eq!(get_stage_name("completed"), "检测完成");
        assert_eq!(get_stage_name("destroyed"), "已销毁");
    }

    #[test]
    fn test_get_stage_name_unknown_returns_input() {
        assert_eq!(get_stage_name("foo_bar"), "foo_bar");
        assert_eq!(get_stage_name(""), "");
    }

    #[test]
    fn test_calculate_stage_progress_first_and_last() {
        // stages_order.len() = 8, idx=0 → 0, idx=7 → 7/7 = 1.0
        assert!((calculate_stage_progress("received") - 0.0).abs() < 1e-9);
        assert!((calculate_stage_progress("destroyed") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_calculate_stage_progress_milestones() {
        // testing = idx 2 → 2/7 ≈ 0.29
        let p = calculate_stage_progress("testing");
        assert!((p - 0.29).abs() < 1e-2, "testing progress got {p}");
        // completed = idx 3 → 3/7 ≈ 0.43
        let p = calculate_stage_progress("completed");
        assert!((p - 0.43).abs() < 1e-2, "completed progress got {p}");
        // stored = idx 4 → 4/7 ≈ 0.57
        let p = calculate_stage_progress("stored");
        assert!((p - 0.57).abs() < 1e-2, "stored progress got {p}");
    }

    #[test]
    fn test_calculate_stage_progress_unknown_is_zero() {
        assert!((calculate_stage_progress("unknown_state") - 0.0).abs() < 1e-9);
    }

    // ---- get_stage_name / calculate_stage_progress ----
    #[test]
    fn stage_progress_received_is_zero() {
        assert_eq!(calculate_stage_progress("received"), 0.0);
    }

    #[test]
    fn stage_progress_destroyed_is_one() {
        assert_eq!(calculate_stage_progress("destroyed"), 1.0);
    }

    #[test]
    fn stage_progress_intermediate() {
        // completed idx=3 → 3/7*100=42.857 → round 43 → /100 = 0.43
        assert_eq!(calculate_stage_progress("completed"), 0.43);
    }

    #[test]
    fn stage_progress_unknown_stage_zero() {
        assert_eq!(calculate_stage_progress("unknown_stage"), 0.0);
    }

    #[test]
    fn stage_name_known() {
        assert_eq!(get_stage_name("received"), "样品接收");
    }

    #[test]
    fn stage_name_unknown_returns_input() {
        assert_eq!(get_stage_name("custom_stage"), "custom_stage");
    }
}
