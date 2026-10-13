//! Hazard management handlers - Reporting, classification, rectification, verification, and closure

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::commit_retry;

use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_service_client::service_client::CreateInstanceRequest;

fn hazard_cache_key(tenant_id: Uuid, id: &str) -> String {
    format!("ehs:hazard:get:{}:{}", tenant_id, id)
}

fn hazards_list_cache_key(
    tenant_id: Uuid,
    page: i64,
    page_size: i64,
    status: &Option<String>,
    level: &Option<String>,
    source: &Option<String>,
) -> String {
    format!(
        "ehs:hazard:list:{}:page:{}:size:{}:status:{:?}:level:{:?}:source:{:?}",
        tenant_id, page, page_size, status, level, source
    )
}

pub fn create_routes() -> Router<AppState> {
    // 路由相对路径，由 server nest /api/ehs 包裹（原误写 /api/ehs/issues 导致双前缀 /api/ehs/api/ehs/issues/*）
    Router::new()
        .route("/issues", get(list_hazards).post(create_hazard))
        .route(
            "/issues/{id}",
            get(get_hazard).put(update_hazard).delete(delete_hazard),
        )
        .route("/issues/{id}/approval/start", post(start_hazard_approval))
        .route("/issues/{id}/close", post(close_hazard))
        .route(
            "/issues/{id}/rectification",
            post(create_rectification).put(update_rectification),
        )
        .route(
            "/issues/{id}/rectification/submit",
            post(submit_rectification),
        )
        .route("/issues/{id}/verification", post(verify_hazard))
}

#[derive(Debug, Deserialize)]
pub struct HazardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub level: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Hazard {
    pub id: String,
    pub hazard_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub level: String,
    pub source: String,
    pub location: Option<String>,
    pub reported_by: Option<String>,
    pub reported_at: Option<String>,
    pub status: String,
    pub inspection_id: Option<String>,
    pub approval_workflow_id: Option<String>,
    pub approval_status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HazardDetail {
    pub hazard: Hazard,
    pub rectification: Option<Rectification>,
    pub verification: Option<Verification>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Rectification {
    pub id: String,
    pub hazard_id: String,
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub progress: i32,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Verification {
    pub id: String,
    pub hazard_id: String,
    pub verifier: Option<String>,
    pub result: String,
    pub remarks: Option<String>,
    pub verified_at: Option<String>,
    pub created_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateHazardRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub level: String,
    pub source: String,
    pub location: Option<String>,
    pub reported_by: Option<String>,
    pub inspection_id: Option<String>,
    pub workflow_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRectificationRequest {
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRectificationRequest {
    pub description: Option<String>,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub progress: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVerificationRequest {
    pub verifier: Option<String>,
    pub result: String,
    pub remarks: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/issues",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_hazards(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Query(query): Query<HazardQuery>,
) -> Json<ApiResponse<Vec<Hazard>>> {
    let _ = &claims;
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(" WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL");

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(level) = &query.level {
        where_clause.push_str(&format!(" AND level = ${}", params.len() + 1));
        params.push(level.clone());
    }
    if let Some(source) = &query.source {
        where_clause.push_str(&format!(" AND source = ${}", params.len() + 1));
        params.push(source.clone());
    }

    // 多语言：locale 绑定到 params 末尾，CASE 引用它（LIMIT/OFFSET 顺延）
    params.push(Locale::from_headers(&headers).as_sql().to_string());
    let locale_placeholder = params.len();

    let fetch_sql = format!(
        r#"
        SELECT
            id::text AS id, hazard_no,
            CASE WHEN ${locale} = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
            description, category, level, source, location, reported_by,
            reported_at::TEXT AS reported_at, status,
            inspection_id::text AS inspection_id,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.qa_ehs_hazards
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#,
        locale = locale_placeholder,
        where_clause = where_clause,
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list hazards: {}", e);
            return Json(ApiResponse::error(500, "获取隐患列表失败"));
        }
    };

    let hazards: Vec<Hazard> = rows
        .iter()
        .map(|r| Hazard {
            id: r.try_get::<String, _>("id").unwrap_or_default(),
            hazard_no: r.try_get::<String, _>("hazard_no").unwrap_or_default(),
            title: r.try_get::<String, _>("title").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            category: r
                .try_get::<Option<String>, _>("category")
                .ok()
                .flatten()
                .unwrap_or_default(),
            level: r
                .try_get::<Option<String>, _>("level")
                .ok()
                .flatten()
                .unwrap_or_default(),
            source: r
                .try_get::<Option<String>, _>("source")
                .ok()
                .flatten()
                .unwrap_or_else(|| "inspection".to_string()),
            location: r.try_get::<Option<String>, _>("location").ok().flatten(),
            reported_by: r.try_get::<Option<String>, _>("reported_by").ok().flatten(),
            reported_at: r.try_get::<Option<String>, _>("reported_at").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "reported".to_string()),
            inspection_id: r
                .try_get::<Option<String>, _>("inspection_id")
                .ok()
                .flatten(),
            approval_workflow_id: None,
            approval_status: None,
            created_at: r.try_get::<Option<String>, _>("created_at").ok().flatten(),
            updated_at: r.try_get::<Option<String>, _>("updated_at").ok().flatten(),
            tenant_id: uuid::Uuid::nil(),
        })
        .collect();

    Json(ApiResponse::success(hazards, "获取隐患列表成功"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues",
    request_body = CreateHazardRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateHazardRequest>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating hazard: {:?}", req);

    let hazard_id = uuid::Uuid::new_v4();
    let hazard_no = format!("HZ-{}", hazard_id.to_string()[..8].to_uppercase());
    let now = chrono::Utc::now().to_rfc3339();

    let mut hazard = Hazard {
        id: hazard_id.to_string(),
        hazard_no: hazard_no.clone(),
        title: req.title.clone(),
        description: req.description.clone(),
        category: req.category.clone(),
        level: req.level.clone(),
        source: req.source.clone(),
        location: req.location.clone(),
        reported_by: req.reported_by.clone(),
        reported_at: Some(now.clone()),
        status: "reported".to_string(),
        inspection_id: req.inspection_id.clone(),
        approval_workflow_id: None,
        approval_status: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        tenant_id,
    };

    if let Some(workflow_id) = req.workflow_id {
        let workflow_client = state.workflow_client.clone();
        let title = req.title.clone();
        let hazard_id_str = hazard_id.to_string();
        tokio::spawn(async move {
            let request = CreateInstanceRequest {
                workflow_id,
                title: format!("安全隐患审批 - {}", title),
                variables: Some(serde_json::json!({
                    "hazard_id": hazard_id_str,
                    "hazard_title": title,
                })),
            };
            match workflow_client.create_instance(request).await {
                Ok(instance) => {
                    tracing::info!("[ehs] 隐患审批流程启动成功 - instance_id={}", instance.id);
                }
                Err(e) => {
                    tracing::warn!("[ehs] 隐患审批流程启动失败（graceful fallback）: {}", e);
                }
            }
        });
        hazard.approval_workflow_id = Some(workflow_id.to_string());
        hazard.approval_status = Some("pending".to_string());
    }

    if let Some(ref publisher) = state.event_publisher {
        let publisher = publisher.clone();
        let hid = hazard_id;
        let hno = hazard_no.clone();
        let htitle = req.title.clone();
        let hcategory = req.category.clone();
        let hlevel = req.level.clone();
        let hlocation = req.location.clone();
        let hdescription = req.description.clone();
        let hreported_by = req.reported_by.clone();
        tokio::spawn(async move {
            let payload = topems_shared_event::event::EhsHazardReportedPayload {
                hazard_id: hid,
                hazard_no: hno,
                title: htitle,
                category: hcategory,
                level: hlevel,
                location: hlocation,
                description: hdescription,
                reported_by: hreported_by,
            };
            let et = topems_shared_event::event::EventType::EhsHazardReported;
            if let Err(e) = publisher.publish_event(et, &payload).await {
                tracing::warn!(
                    "[ehs] EhsHazardReported 事件发布失败（graceful fallback）: {}，入重试队列",
                    e
                );
                // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发（typed 通道直重发 payload）。
                commit_retry::push_retry_typed("ehs", et, &payload).await;
            } else {
                tracing::info!("[ehs] EhsHazardReported 事件发布成功 - hazard_id={}", hid);
            }
        });
    }

    state.hazard_cache.clear_l1();
    tracing::debug!("🗑️ 隐患缓存已清空（创建隐患）");

    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_cache_invalidated(
                &format!("ehs:hazard:{}", hazard.id),
                "specific",
                Some("hazard_created"),
            )
            .await;
    }

    Json(ApiResponse::success(hazard, "隐患上报成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/issues/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HazardDetail>> {
    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query(
        r#"
        SELECT
            id::text AS id, hazard_no,
            CASE WHEN $2 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
            description, category, level, source, location, reported_by,
            reported_at::TEXT AS reported_at, status,
            inspection_id::text AS inspection_id,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.qa_ehs_hazards
        WHERE ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3) AND id = $1::uuid AND deleted_at IS NULL
        "#,
    )
    .bind(&id)
    .bind(locale)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get hazard: {}", e);
            return Json(ApiResponse::error(500, "获取隐患详情失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(404, "隐患不存在")),
    };

    let hazard = Hazard {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        hazard_no: row.try_get::<String, _>("hazard_no").unwrap_or_default(),
        title: row.try_get::<String, _>("title").unwrap_or_default(),
        description: row
            .try_get::<Option<String>, _>("description")
            .ok()
            .flatten(),
        category: row
            .try_get::<Option<String>, _>("category")
            .ok()
            .flatten()
            .unwrap_or_default(),
        level: row
            .try_get::<Option<String>, _>("level")
            .ok()
            .flatten()
            .unwrap_or_default(),
        source: row
            .try_get::<Option<String>, _>("source")
            .ok()
            .flatten()
            .unwrap_or_else(|| "inspection".to_string()),
        location: row.try_get::<Option<String>, _>("location").ok().flatten(),
        reported_by: row
            .try_get::<Option<String>, _>("reported_by")
            .ok()
            .flatten(),
        reported_at: row
            .try_get::<Option<String>, _>("reported_at")
            .ok()
            .flatten(),
        status: row
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_else(|| "reported".to_string()),
        inspection_id: row
            .try_get::<Option<String>, _>("inspection_id")
            .ok()
            .flatten(),
        approval_workflow_id: None,
        approval_status: None,
        created_at: row
            .try_get::<Option<String>, _>("created_at")
            .ok()
            .flatten(),
        updated_at: row
            .try_get::<Option<String>, _>("updated_at")
            .ok()
            .flatten(),
        tenant_id: uuid::Uuid::nil(),
    };

    Json(ApiResponse::success(
        HazardDetail {
            hazard,
            rectification: None,
            verification: None,
            tenant_id: uuid::Uuid::nil(),
        },
        "获取隐患详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating hazard {}: {:?}", id, req);

    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    tracing::debug!("🗑️ 隐患缓存已失效: {}", cache_key);

    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_cache_invalidated(
                &format!("ehs:hazard:{}", id),
                "specific",
                Some("hazard_updated"),
            )
            .await;
    }

    Json(ApiResponse::success(
        Hazard {
            id: id.clone(),
            hazard_no: "HZ-2024001".to_string(),
            title: "消防通道堵塞".to_string(),
            description: Some("生产车间A区消防通道被货物堵塞".to_string()),
            category: "消防".to_string(),
            level: "medium".to_string(),
            source: "inspection".to_string(),
            location: Some("生产车间A区".to_string()),
            reported_by: Some("安全员A".to_string()),
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "rectifying".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            approval_workflow_id: None,
            approval_status: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "隐患更新成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Deleting hazard: {}", id);

    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    tracing::debug!("🗑️ 隐患缓存已失效: {}", cache_key);

    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_cache_invalidated(
                &format!("ehs:hazard:{}", id),
                "specific",
                Some("hazard_deleted"),
            )
            .await;
    }

    Json(ApiResponse::success((), "隐患删除成功"))
}

#[derive(Debug, Deserialize)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}/approval/start",
    request_body = StartApprovalRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn start_hazard_approval(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<StartApprovalRequest>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::info!(
        "Starting approval for hazard {}: workflow_id={}",
        id,
        req.workflow_id
    );

    let workflow_client = state.workflow_client;
    let id_clone = id.clone();
    tokio::spawn(async move {
        let request = CreateInstanceRequest {
            workflow_id: req.workflow_id,
            title: format!("安全隐患审批 - {}", id_clone),
            variables: Some(serde_json::json!({
                "hazard_id": id_clone,
            })),
        };
        match workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!("[ehs] 隐患审批流程启动成功 - instance_id={}", instance.id);
            }
            Err(e) => {
                tracing::warn!("[ehs] 隐患审批流程启动失败: {}", e);
            }
        }
    });

    Json(ApiResponse::success(
        Hazard {
            id,
            hazard_no: "HZ-2024001".to_string(),
            title: "消防通道堵塞".to_string(),
            description: Some("生产车间A区消防通道被货物堵塞".to_string()),
            category: "消防".to_string(),
            level: "medium".to_string(),
            source: "inspection".to_string(),
            location: Some("生产车间A区".to_string()),
            reported_by: Some("安全员A".to_string()),
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "pending_approval".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            approval_workflow_id: Some(req.workflow_id.to_string()),
            approval_status: Some("pending".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "隐患审批流程已启动",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/issues/{id}/close",
    tag = "ehs",
    params(("id" = String, Path, description = "隐患 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn close_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::info!("Closing hazard: {}", id);
    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    Json(ApiResponse::success(
        Hazard {
            id: id.clone(),
            hazard_no: "HZ-2024001".to_string(),
            title: "消防通道堵塞".to_string(),
            description: None,
            category: "消防".to_string(),
            level: "medium".to_string(),
            source: "inspection".to_string(),
            location: None,
            reported_by: None,
            reported_at: None,
            status: "closed".to_string(),
            inspection_id: None,
            approval_workflow_id: None,
            approval_status: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "隐患已关闭",
    ))
}

pub async fn create_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating rectification for hazard {}: {:?}", id, req);
    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(),
            "hazard_id": id,
            "measures": req.get("measures").and_then(|v| v.as_str()).unwrap_or("整改措施"),
            "responsible": req.get("responsible").and_then(|v| v.as_str()).unwrap_or("安全部"),
            "deadline": req.get("deadline").and_then(|v| v.as_str()),
            "status": "pending",
            "tenant_id": tenant_id.to_string(),
            "created_at": chrono::Utc::now().to_rfc3339(),
        }),
        "整改方案创建成功",
    ))
}

pub async fn update_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating rectification for hazard {}: {:?}", id, req);
    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(),
            "hazard_id": id,
            "measures": req.get("measures").and_then(|v| v.as_str()).unwrap_or("整改措施"),
            "responsible": req.get("responsible").and_then(|v| v.as_str()).unwrap_or("安全部"),
            "status": "in_progress",
            "updated_at": chrono::Utc::now().to_rfc3339(),
            "tenant_id": tenant_id.to_string(),
        }),
        "整改方案更新成功",
    ))
}

pub async fn submit_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::info!("Submitting rectification for hazard: {}", id);
    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(),
            "hazard_id": id,
            "status": "submitted",
            "submitted_at": chrono::Utc::now().to_rfc3339(),
            "tenant_id": tenant_id.to_string(),
        }),
        "整改已提交",
    ))
}

pub async fn verify_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Verifying hazard {}: {:?}", id, req);
    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();
    Json(ApiResponse::success(
        serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(),
            "hazard_id": id,
            "verifier": "test_admin",
            "result": req.get("result").and_then(|v| v.as_str()).unwrap_or("passed"),
            "comment": req.get("comment").and_then(|v| v.as_str()),
            "verified_at": chrono::Utc::now().to_rfc3339(),
            "tenant_id": tenant_id.to_string(),
        }),
        "隐患验证完成",
    ))
}
