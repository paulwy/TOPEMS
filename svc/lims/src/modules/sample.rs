use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_core::{response::ApiResponse, TopemsError};
use utoipa::ToSchema;

use crate::modules::sample_status::LabSampleStatus;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/samples", get(list_samples).post(register_sample))
        .route(
            "/samples/batch",
            post(batch_create_samples).delete(batch_delete_samples),
        )
        .route("/samples/import", post(import_samples))
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
    pub received_at: Option<DateTime<Utc>>,
    pub expired_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<SampleQuery>,
) -> ApiResponse<Vec<Sample>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let status_filter: Option<String> = match query.status.as_deref() {
        None | Some("") | Some("all") => None,
        Some(raw) => match LabSampleStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的样品状态"),
        },
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    // 缓存读取：先查多级缓存，miss 再回源数据库
    let list_key = sample_list_key(&tenant_id, &query);
    if let Some(cached) = state.sample_cache.get(&list_key).await {
        match serde_json::from_value::<Vec<Sample>>(cached) {
            Ok(data) => return ApiResponse::success(data, "从缓存获取样品列表成功"),
            Err(e) => tracing::warn!("样品列表缓存反序列化失败，回源: {}", e),
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取样品列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取样品列表失败");
        }
    };

    let sql = match (status_filter.as_deref(), query.sample_no.as_ref(), query.sample_name.as_ref()) {
        (Some(_), Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND status = $1 AND sample_no LIKE $2 AND sample_name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND status = $1 AND sample_no LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND status = $1 AND sample_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (Some(_), None, None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND sample_no LIKE $1 AND sample_name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND sample_no LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND sample_name LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        (None, None, None) => "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    };

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql));
    match (
        status_filter.as_deref(),
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

    let samples = query_builder.fetch_all(&mut scope).await.map(|rows| {
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

    let _ = scope.commit().await;

    match samples {
        Ok(data) => {
            // 回填多级缓存
            if let Ok(v) = serde_json::to_value(&data) {
                state.sample_cache.set(list_key, v).await;
            }
            ApiResponse::success(data, "获取样品列表成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch samples: {}", e);
            ApiResponse::server_error("获取样品列表失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateSampleRequest>,
) -> ApiResponse<Sample> {
    let sample_no = format!(
        "SMP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = ctx.tenant_id;

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 样品登记写作用域创建失败: {}", e);
            return ApiResponse::server_error("样品登记失败");
        }
    };

    let row = sqlx::query(
        "INSERT INTO public.qa_lab_samples (tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at"
    )
    .bind(tenant_id)
    .bind(sample_no)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(LabSampleStatus::DEFAULT.as_db_str())
    .fetch_one(&mut scope)
    .await;

    let row = match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 样品登记事务提交失败: {}", e);
                return ApiResponse::server_error("样品登记失败");
            }
            r
        }
        Err(e) => {
            tracing::error!("Failed to create sample: {}", e);
            return ApiResponse::server_error("样品登记失败");
        }
    };

    {
        let sample = Sample {
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
        ApiResponse::success(sample, "样品登记成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Sample> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
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
            Ok(sample) => return ApiResponse::success(sample, "从缓存获取样品成功"),
            Err(e) => tracing::warn!("样品详情缓存反序列化失败，回源: {}", e),
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取样品读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取样品失败");
        }
    };

    let row = sqlx::query(
        "SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    let _ = scope.commit().await;

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
            ApiResponse::success(sample, "获取样品成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            ApiResponse::server_error("获取样品失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/samples/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn update_sample(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSampleRequest>,
) -> ApiResponse<Sample> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let status = match req.status.as_deref() {
        Some(raw) => match LabSampleStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => return ApiResponse::bad_request("无效的样品状态"),
        },
        None => None,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 样品更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("样品更新失败");
        }
    };

    let row = sqlx::query(
        "UPDATE public.qa_lab_samples SET sample_name = COALESCE($2, sample_name), sample_type = COALESCE($3, sample_type), source = COALESCE($4, source), quantity = COALESCE($5, quantity), unit = COALESCE($6, unit), status = COALESCE($7, status), expired_at = COALESCE($8::timestamp, expired_at), updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit, status, received_at, expired_at, created_at, updated_at"
    )
    .bind(id)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(status)
    .bind(&req.expired_at)
    .fetch_one(&mut scope)
    .await;

    let row = match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 样品更新事务提交失败: {}", e);
                return ApiResponse::server_error("样品更新失败");
            }
            r
        }
        Err(sqlx::Error::RowNotFound) => return ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to update sample: {}", e);
            return ApiResponse::server_error("样品更新失败");
        }
    };

    let sample = Sample {
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
    ApiResponse::success(sample, "样品更新成功")
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/samples/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_sample(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 样品删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("样品删除失败");
        }
    };

    let result = sqlx::query("UPDATE public.qa_lab_samples SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 样品删除事务提交失败: {}", e);
                return ApiResponse::server_error("样品删除失败");
            }
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
            ApiResponse::success(true, "样品删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete sample: {}", e);
            ApiResponse::server_error("样品删除失败")
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
    pub created_at: DateTime<Utc>,
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

/// 样品生命周期合法转移边（P2 制造域 B 审计补 FSM 边校验）：
/// 严格按 LIFECYCLE_STAGES 顺序逐阶前进——不允许跨阶跳转、回退或同阶空转。
// =============================================================================
// 批量登记 / 批量删除 / CSV 导入（前端 sampleApi.batchCreateSamples /
// batchDeleteSamples / importSamples 的真实契约）
// =============================================================================

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchCreateSamplesRequest {
    pub samples: Vec<CreateSampleRequest>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchDeleteSamplesRequest {
    pub ids: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BatchOperationResult {
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

async fn insert_sample_row(
    state: &crate::shared::AppState,
    txn_arc: &RlsTxnCell,
    tenant_id: Uuid,
    req: &CreateSampleRequest,
) -> Result<(), String> {
    let sample_no = format!("SMP-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Err("数据库事务上下文缺失".to_string());
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return Err(format!("写作用域创建失败: {}", e)),
    };
    let res = sqlx::query(
        "INSERT INTO public.qa_lab_samples (tenant_id, sample_no, sample_name, sample_type, source, quantity, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(tenant_id)
    .bind(sample_no)
    .bind(&req.sample_name)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(LabSampleStatus::DEFAULT.as_db_str())
    .execute(&mut scope)
    .await;
    match res {
        Ok(_) => match scope.commit().await {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("提交失败: {}", e)),
        },
        Err(e) => Err(e.to_string()),
    }
}

fn invalidate_sample_list(state: &crate::shared::AppState, tenant_id: Uuid, reason: &str) {
    if let Some(publisher) = &state.event_publisher {
        let publisher = publisher.clone();
        let tenant = tenant_id.to_string();
        let reason = reason.to_string();
        tokio::spawn(async move {
            let _ = publisher
                .publish_cache_invalidated(
                    &format!("lims:sample:list:{}:*", tenant),
                    "pattern",
                    Some(reason.as_str()),
                )
                .await;
        });
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples/batch",
    responses(
        (status = 200, description = "批量登记结果", body = ApiResponse<BatchOperationResult>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn batch_create_samples(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<BatchCreateSamplesRequest>,
) -> ApiResponse<BatchOperationResult> {
    let total = req.samples.len();
    if total == 0 {
        return ApiResponse::bad_request("samples 不能为空");
    }
    if total > 500 {
        return ApiResponse::bad_request("单次批量登记不得超过 500 条");
    }
    let mut success = 0usize;
    let mut errors: Vec<String> = Vec::new();
    for (idx, item) in req.samples.iter().enumerate() {
        match insert_sample_row(&state, &txn_arc, ctx.tenant_id, item).await {
            Ok(()) => success += 1,
            Err(e) => errors.push(format!("第{}条: {}", idx + 1, e)),
        }
    }
    if success > 0 {
        invalidate_sample_list(&state, ctx.tenant_id, "samples_batch_created");
    }
    ApiResponse::success(
        BatchOperationResult {
            total,
            success,
            failed: total - success,
            errors,
        },
        "批量登记完成",
    )
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples/batch",
    request_body = BatchDeleteSamplesRequest,
    responses(
        (status = 200, description = "批量删除结果", body = ApiResponse<BatchOperationResult>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn batch_delete_samples(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<BatchDeleteSamplesRequest>,
) -> ApiResponse<BatchOperationResult> {
    let total = req.ids.len();
    if total == 0 {
        return ApiResponse::bad_request("ids 不能为空");
    }
    let mut success = 0usize;
    let mut errors: Vec<String> = Vec::new();
    for (idx, raw) in req.ids.iter().enumerate() {
        let id = match Uuid::parse_str(raw) {
            Ok(u) => u,
            Err(_) => {
                errors.push(format!("第{}条: 无效的样品ID {}", idx + 1, raw));
                continue;
            }
        };
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            errors.push(format!("第{}条: 数据库事务上下文缺失", idx + 1));
            continue;
        };
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                errors.push(format!("第{}条: 写作用域创建失败: {}", idx + 1, e));
                continue;
            }
        };
        let res = sqlx::query(
            "UPDATE public.qa_lab_samples SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .execute(&mut scope)
        .await;
        match res {
            Ok(r) => {
                if r.rows_affected() == 0 {
                    errors.push(format!("第{}条: 样品不存在或已删除", idx + 1));
                    continue;
                }
                match scope.commit().await {
                    Ok(_) => success += 1,
                    Err(e) => errors.push(format!("第{}条: 提交失败: {}", idx + 1, e)),
                }
            }
            Err(e) => errors.push(format!("第{}条: {}", idx + 1, e)),
        }
    }
    if success > 0 {
        invalidate_sample_list(&state, ctx.tenant_id, "samples_batch_deleted");
    }
    ApiResponse::success(
        BatchOperationResult {
            total,
            success,
            failed: total - success,
            errors,
        },
        "批量删除完成",
    )
}

/// CSV 导入：首行可为表头 `sample_name,sample_type,source,quantity,unit`，
/// 逐行登记；返回逐行错误，整体保持 200（部分成功是正常业务结果）。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:sample:write"])),
    path = "/lims/samples/import",
    request_body(content = String, content_type = "text/csv"),
    responses(
        (status = 200, description = "导入结果", body = ApiResponse<BatchOperationResult>),
        (status = 400, description = "CSV 为空或格式错误"),
        (status = 500, description = "Internal server error")
    ),
    tag = "sample"
)]
pub async fn import_samples(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    body: String,
) -> ApiResponse<BatchOperationResult> {
    let mut lines = body.lines().filter(|l| !l.trim().is_empty());
    let first = match lines.next() {
        Some(f) => f,
        None => return ApiResponse::bad_request("CSV 内容为空"),
    };
    let has_header = first.to_lowercase().starts_with("sample_name");
    let mut rows: Vec<&str> = Vec::new();
    if !has_header {
        rows.push(first);
    }
    rows.extend(lines);
    if rows.is_empty() {
        return ApiResponse::bad_request("CSV 没有数据行");
    }
    let total = rows.len();
    let mut success = 0usize;
    let mut errors: Vec<String> = Vec::new();
    for (idx, line) in rows.iter().enumerate() {
        let cols: Vec<&str> = line.split(',').map(|c| c.trim()).collect();
        if cols.is_empty() || cols[0].is_empty() {
            errors.push(format!("第{}行: sample_name 为空", idx + 1));
            continue;
        }
        let req = CreateSampleRequest {
            sample_name: cols[0].to_string(),
            sample_type: cols.get(1).filter(|c| !c.is_empty()).map(|c| c.to_string()),
            source: cols.get(2).filter(|c| !c.is_empty()).map(|c| c.to_string()),
            quantity: cols.get(3).and_then(|c| c.parse::<f64>().ok()),
            unit: cols.get(4).filter(|c| !c.is_empty()).map(|c| c.to_string()),
        };
        match insert_sample_row(&state, &txn_arc, ctx.tenant_id, &req).await {
            Ok(()) => success += 1,
            Err(e) => errors.push(format!("第{}行: {}", idx + 1, e)),
        }
    }
    if success > 0 {
        invalidate_sample_list(&state, ctx.tenant_id, "samples_imported");
    }
    ApiResponse::success(
        BatchOperationResult {
            total,
            success,
            failed: total - success,
            errors,
        },
        "CSV 导入完成",
    )
}

#[cfg(test)]
const SAMPLE_STAGE_EDGES: &[(&str, &str)] = &[
    ("received", "registered"),
    ("registered", "testing"),
    ("testing", "completed"),
    ("completed", "stored"),
    ("stored", "retrieved"),
    ("retrieved", "disposed"),
    ("disposed", "destroyed"),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> ApiResponse<Vec<SampleLifecycleRecord>> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取样品生命周期记录读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取样品生命周期记录失败");
        }
    };

    let rows = sqlx::query(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, sample_id::TEXT, sample_no, lifecycle_stage, stage_description,
               operator, notes, location, created_at
        FROM public.qa_lab_sample_lifecycle
        WHERE sample_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await;

    let _ = scope.commit().await;

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
            ApiResponse::success(records, "获取样品生命周期记录成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch lifecycle records: {}", e);
            ApiResponse::server_error("获取样品生命周期记录失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateLifecycleRecordRequest>,
) -> ApiResponse<SampleLifecycleRecord> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 记录生命周期事件写作用域创建失败: {}", e);
            return ApiResponse::server_error("记录生命周期事件失败");
        }
    };

    let sample_row =
        sqlx::query("SELECT sample_no FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2")
            .bind(sample_id)
            .bind(tenant_id)
            .fetch_optional(&mut scope)
            .await;

    let sample_no = match sample_row {
        Ok(Some(row)) => row.get::<String, _>("sample_no"),
        Ok(None) => return ApiResponse::not_found("样品不存在"),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询样品失败", e)),
    };

    let lifecycle_stage = match LabSampleStatus::from_db_str(&req.lifecycle_stage) {
        Some(stage) => stage,
        None => return ApiResponse::bad_request("无效的生命周期阶段"),
    };

    let record_id = Uuid::new_v4();

    let row = sqlx::query(
        r#"
        INSERT INTO public.qa_lab_sample_lifecycle (
            id, tenant_id, sample_id, sample_no, lifecycle_stage, stage_description,
            operator, notes, location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id::TEXT, tenant_id::TEXT, sample_id::TEXT, sample_no, lifecycle_stage, stage_description,
                  operator, notes, location, created_at
        "#,
    )
    .bind(record_id)
    .bind(ctx.tenant_id)
    .bind(sample_id)
    .bind(&sample_no)
    .bind(lifecycle_stage.as_db_str())
    .bind(&req.stage_description)
    .bind(&req.operator)
    .bind(&req.notes)
    .bind(&req.location)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE public.qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1",
            )
            .bind(sample_id)
            .bind(lifecycle_stage.as_db_str())
            .execute(&mut scope)
            .await;

            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 记录生命周期事件事务提交失败: {}", e);
                return ApiResponse::server_error("记录生命周期事件失败");
            }

            ApiResponse::success(
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
            )
        }
        Err(e) => {
            tracing::error!("Failed to record lifecycle event: {}", e);
            ApiResponse::server_error("记录生命周期事件失败")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path((sample_id, to_stage)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<SampleLifecycleRecord> {
    let sample_uuid = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let target_stage = match LabSampleStatus::from_db_str(&to_stage) {
        Some(stage) => stage,
        None => return ApiResponse::bad_request("无效的目标阶段"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 样品阶段转换写作用域创建失败: {}", e);
            return ApiResponse::server_error("样品阶段转换失败");
        }
    };

    let current_row = sqlx::query(
        "SELECT sample_no, status FROM public.qa_lab_samples WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(sample_uuid)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let (sample_no, current_stage) = match current_row {
        Ok(Some(row)) => (
            row.get::<String, _>("sample_no"),
            row.get::<String, _>("status"),
        ),
        Ok(None) => return ApiResponse::not_found("样品不存在"),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询样品失败", e)),
    };

    let current_stage_enum = match LabSampleStatus::from_db_str(&current_stage) {
        Some(stage) => stage,
        None => {
            tracing::warn!(
                "样品 {} 当前阶段 [{}] 不在生命周期枚举内，拒绝流转",
                sample_no,
                current_stage
            );
            return ApiResponse::conflict("样品当前状态异常，请刷新后重试");
        }
    };

    if !current_stage_enum.can_transition_to(target_stage) {
        return ApiResponse::conflict(&format!(
            "样品阶段非法转移：不能从[{}]转到[{}]",
            get_stage_name(&current_stage),
            get_stage_name(target_stage.as_db_str())
        ));
    }

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
                  operator, notes, location, created_at
        "#,
    )
    .bind(record_id)
    .bind(ctx.tenant_id)
    .bind(sample_uuid)
    .bind(&sample_no)
    .bind(target_stage.as_db_str())
    .bind(&description)
    .bind(operator)
    .bind(notes)
    .bind(location)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            let _ = sqlx::query(
                "UPDATE public.qa_lab_samples SET status = $2, updated_at = NOW() WHERE id = $1",
            )
            .bind(sample_uuid)
            .bind(target_stage.as_db_str())
            .execute(&mut scope)
            .await;

            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 样品阶段转换事务提交失败: {}", e);
                return ApiResponse::server_error("样品阶段转换失败");
            }

            ApiResponse::success(
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
            )
        }
        Err(e) => {
            tracing::error!("Failed to transition sample stage: {}", e);
            ApiResponse::server_error("样品阶段转换失败")
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
pub async fn get_lifecycle_stages() -> ApiResponse<Vec<serde_json::Value>> {
    let stages: Vec<serde_json::Value> = LIFECYCLE_STAGES
        .iter()
        .map(|(code, name)| {
            serde_json::json!({
                "code": code,
                "name": name
            })
        })
        .collect();

    ApiResponse::success(stages, "获取生命周期阶段列表成功")
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
) -> ApiResponse<serde_json::Value> {
    let found = LIFECYCLE_STAGES
        .iter()
        .find(|(c, _)| *c == code)
        .map(|(code, name)| serde_json::json!({ "code": code, "name": name }));
    match found {
        Some(v) => ApiResponse::success(v, "获取生命周期阶段成功"),
        None => ApiResponse::not_found("生命周期阶段不存在"),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(sample_id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    let id = match Uuid::parse_str(&sample_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的样品ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取样品追溯信息读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取样品追溯信息失败");
        }
    };

    let sample_row = sqlx::query(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, sample_no, sample_name, sample_type, source, quantity::float8 AS quantity, unit,
               status, received_at::TEXT, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM public.qa_lab_samples WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
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
        Ok(None) => return ApiResponse::not_found("样品不存在"),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询样品失败", e)),
    };

    let lifecycle_rows = sqlx::query(
        r#"
        SELECT id::TEXT, lifecycle_stage, stage_description, operator, notes, location, created_at::TEXT
        FROM public.qa_lab_sample_lifecycle
        WHERE sample_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .fetch_all(&mut scope)
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
        Err(e) => return ApiResponse::from(TopemsError::internal("查询生命周期记录失败", e)),
    };

    let _ = scope.commit().await;

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

    ApiResponse::success(
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
    )
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
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
    fn test_sample_cache_keys_are_tenant_scoped() {
        use uuid::Uuid;
        let q = SampleQuery {
            page: None,
            page_size: None,
            status: None,
            sample_no: None,
            sample_name: None,
        };
        let a = Some(Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_default());
        let b = Some(Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap_or_default());

        let ka = sample_list_key(&a, &q);
        let kb = sample_list_key(&b, &q);
        assert_ne!(ka, kb);
        assert!(ka.contains("00000000-0000-0000-0000-000000000001"));
        assert!(kb.contains("00000000-0000-0000-0000-000000000002"));
        assert_ne!(sample_detail_key(&a, "x"), sample_detail_key(&b, "x"));
    }

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

    // ---- SAMPLE_STAGE_EDGES FSM 校验（P2 制造域 B）----
    #[test]
    fn fsm_legal_edges_all_forward_one_step() {
        for (from, to) in SAMPLE_STAGE_EDGES {
            assert!(
                SAMPLE_STAGE_EDGES.contains(&(*from, *to)),
                "合法边 {from}→{to} 应被接受"
            );
        }
        // 逐阶前进全覆盖：8 阶段恰有 7 条边
        assert_eq!(SAMPLE_STAGE_EDGES.len(), LIFECYCLE_STAGES.len() - 1);
    }

    #[test]
    fn fsm_rejects_same_stage_and_jumps() {
        // 同阶空转
        assert!(!SAMPLE_STAGE_EDGES.contains(&("testing", "testing")));
        // 跨阶跳转
        assert!(!SAMPLE_STAGE_EDGES.contains(&("received", "testing")));
        assert!(!SAMPLE_STAGE_EDGES.contains(&("received", "destroyed")));
        // 回退
        assert!(!SAMPLE_STAGE_EDGES.contains(&("completed", "testing")));
        // 终态后不可再转
        assert!(!SAMPLE_STAGE_EDGES.contains(&("destroyed", "disposed")));
    }
}
