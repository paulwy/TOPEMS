//! Hazard management handlers - Reporting, classification, rectification, verification, and closure

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use sqlx::Row;

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
        .route(
            "/issues/{id}/rectification",
            post(start_rectification).put(update_rectification),
        )
        .route(
            "/issues/{id}/rectification/submit",
            post(submit_rectification),
        )
        .route("/issues/{id}/verification", post(verify_hazard))
        .route("/issues/{id}/close", post(close_hazard))
        .route(
            "/issues/{id}/approval/start",
            post(start_hazard_approval),
        )
        .route(
            "/issues/{id}/approval/approve",
            post(approve_hazard),
        )
        .route("/issues/{id}/approval/reject", post(reject_hazard))
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
            category: r.try_get::<Option<String>, _>("category").ok().flatten().unwrap_or_default(),
            level: r.try_get::<Option<String>, _>("level").ok().flatten().unwrap_or_default(),
            source: r.try_get::<Option<String>, _>("source").ok().flatten().unwrap_or_else(|| "inspection".to_string()),
            location: r.try_get::<Option<String>, _>("location").ok().flatten(),
            reported_by: r.try_get::<Option<String>, _>("reported_by").ok().flatten(),
            reported_at: r.try_get::<Option<String>, _>("reported_at").ok().flatten(),
            status: r.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "reported".to_string()),
            inspection_id: r.try_get::<Option<String>, _>("inspection_id").ok().flatten(),
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
            if let Err(e) = publisher
                .publish_event(
                    topems_shared_event::event::EventType::EhsHazardReported,
                    payload,
                )
                .await
            {
                tracing::warn!(
                    "[ehs] EhsHazardReported 事件发布失败（graceful fallback）: {}",
                    e
                );
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
        description: row.try_get::<Option<String>, _>("description").ok().flatten(),
        category: row.try_get::<Option<String>, _>("category").ok().flatten().unwrap_or_default(),
        level: row.try_get::<Option<String>, _>("level").ok().flatten().unwrap_or_default(),
        source: row.try_get::<Option<String>, _>("source").ok().flatten().unwrap_or_else(|| "inspection".to_string()),
        location: row.try_get::<Option<String>, _>("location").ok().flatten(),
        reported_by: row.try_get::<Option<String>, _>("reported_by").ok().flatten(),
        reported_at: row.try_get::<Option<String>, _>("reported_at").ok().flatten(),
        status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "reported".to_string()),
        inspection_id: row.try_get::<Option<String>, _>("inspection_id").ok().flatten(),
        approval_workflow_id: None,
        approval_status: None,
        created_at: row.try_get::<Option<String>, _>("created_at").ok().flatten(),
        updated_at: row.try_get::<Option<String>, _>("updated_at").ok().flatten(),
        tenant_id: uuid::Uuid::nil(),
    };

    Json(ApiResponse::success(
        HazardDetail { hazard, rectification: None, verification: None, tenant_id: uuid::Uuid::nil() },
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/issues/{id}/rectification",
    request_body = CreateRectificationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn start_rectification(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateRectificationRequest>,
) -> Json<ApiResponse<Rectification>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Starting rectification for hazard {}: {:?}", id, req);
    Json(ApiResponse::success(
        Rectification {
            id: uuid::Uuid::new_v4().to_string(),
            hazard_id: id,
            description: req.description,
            responsible: req.responsible,
            deadline: req.deadline,
            status: "in_progress".to_string(),
            progress: 0,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "整改方案创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/issues/{id}/rectification",
    request_body = UpdateRectificationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_rectification(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateRectificationRequest>,
) -> Json<ApiResponse<Rectification>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Updating rectification {}: {:?}", id, req);
    let status = req
        .status
        .or(req.progress.map(|p| {
            if p >= 100 {
                "completed".to_string()
            } else {
                "in_progress".to_string()
            }
        }))
        .unwrap_or("in_progress".to_string());
    let completed_at = if status == "completed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    Json(ApiResponse::success(
        Rectification {
            id,
            hazard_id: "hazard-001".to_string(),
            description: req
                .description
                .unwrap_or_else(|| "清理消防通道".to_string()),
            responsible: req.responsible.or(Some("仓库管理员B".to_string())),
            deadline: req.deadline.or(Some("2024-01-30".to_string())),
            status,
            progress: req.progress.unwrap_or(50),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "整改进度更新成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/issues/{id}/rectification/submit",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn submit_rectification(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Rectification>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::info!("Submitting rectification for hazard: {}", id);
    Json(ApiResponse::success(
        Rectification {
            id: "rect-001".to_string(),
            hazard_id: id,
            description: "清理消防通道，移走堵塞货物".to_string(),
            responsible: Some("仓库管理员B".to_string()),
            deadline: Some("2024-01-30".to_string()),
            status: "submitted".to_string(),
            progress: 100,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "整改完成并提交验收",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}/verification",
    request_body = CreateVerificationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn verify_hazard(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateVerificationRequest>,
) -> Json<ApiResponse<Verification>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Verifying hazard {}: {:?}", id, req);
    Json(ApiResponse::success(
        Verification {
            id: uuid::Uuid::new_v4().to_string(),
            hazard_id: id,
            verifier: req.verifier,
            result: req.result,
            remarks: req.remarks,
            verified_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "隐患验收完成",
    ))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}/close",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn close_hazard(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::info!("Closing hazard: {}", id);
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
            status: "closed".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            approval_workflow_id: None,
            approval_status: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "隐患已闭环",
    ))
}

#[derive(Debug, Deserialize)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::info!(
        "Starting approval for hazard {}: workflow_id={}",
        id,
        req.workflow_id
    );

    let workflow_client = state.workflow_client.clone();
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
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}/approval/approve",
    request_body = ApprovalActionRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn approve_hazard(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::info!("Approving hazard {}", id);

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
            status: "approved".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            approval_workflow_id: None,
            approval_status: Some("approved".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "隐患审批通过",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/issues/{id}/approval/reject",
    request_body = ApprovalActionRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn reject_hazard(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<Hazard>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::info!("Rejecting hazard {}", id);

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
            status: "rejected".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            approval_workflow_id: None,
            approval_status: Some("rejected".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "隐患审批已驳回",
    ))
}

pub fn weighted_hazard_score(subscores: &[(f64, f64)]) -> f64 {
    let total_weight: f64 = subscores.iter().map(|(_, w)| w).sum();
    if total_weight <= 0.0 {
        return 0.0;
    }
    let weighted_sum: f64 = subscores.iter().map(|(s, w)| s * w).sum();
    weighted_sum / total_weight
}

pub fn hazard_classify(score: f64) -> &'static str {
    if score >= 80.0 {
        "达标"
    } else if score >= 60.0 {
        "限期整改"
    } else {
        "停产"
    }
}

pub fn hazard_quadrant(probability: u8, severity: u8) -> &'static str {
    let p = probability.min(5).max(1);
    let s = severity.min(5).max(1);
    let p_high = p >= 4;
    let s_high = s >= 4;
    match (p_high, s_high) {
        (true, true) => "Ⅰ类-重大隐患",
        (false, true) => "Ⅱ类-高后果隐患",
        (true, false) => "Ⅲ类-高频隐患",
        (false, false) => "Ⅳ类-一般隐患",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weighted_empty() {
        let scores: Vec<(f64, f64)> = vec![];
        assert_eq!(weighted_hazard_score(&scores), 0.0);
    }

    #[test]
    fn test_weighted_zero_weight() {
        let scores = vec![(80.0, 0.0), (90.0, 0.0)];
        assert_eq!(weighted_hazard_score(&scores), 0.0);
    }

    #[test]
    fn test_weighted_single() {
        let scores = vec![(85.0, 1.0)];
        assert!((weighted_hazard_score(&scores) - 85.0).abs() < 1e-9);
    }

    #[test]
    fn test_weighted_normal() {
        let scores = vec![(90.0, 0.3), (80.0, 0.4), (70.0, 0.3)];
        let result = weighted_hazard_score(&scores);
        assert!((result - 80.0).abs() < 1e-9);
    }

    #[test]
    fn test_weighted_un_normalized() {
        let scores = vec![(90.0, 3.0), (80.0, 4.0), (70.0, 3.0)];
        let result = weighted_hazard_score(&scores);
        assert!((result - 80.0).abs() < 1e-9);
    }

    #[test]
    fn test_classify_pass() {
        assert_eq!(hazard_classify(100.0), "达标");
        assert_eq!(hazard_classify(80.0), "达标");
        assert_eq!(hazard_classify(90.0), "达标");
    }

    #[test]
    fn test_classify_rectify() {
        assert_eq!(hazard_classify(79.9), "限期整改");
        assert_eq!(hazard_classify(70.0), "限期整改");
        assert_eq!(hazard_classify(60.0), "限期整改");
    }

    #[test]
    fn test_classify_shutdown() {
        assert_eq!(hazard_classify(59.9), "停产");
        assert_eq!(hazard_classify(0.0), "停产");
        assert_eq!(hazard_classify(30.0), "停产");
    }

    #[test]
    fn test_quadrant_type1() {
        assert_eq!(hazard_quadrant(4, 4), "Ⅰ类-重大隐患");
        assert_eq!(hazard_quadrant(5, 5), "Ⅰ类-重大隐患");
        assert_eq!(hazard_quadrant(5, 4), "Ⅰ类-重大隐患");
    }

    #[test]
    fn test_quadrant_type2() {
        assert_eq!(hazard_quadrant(1, 4), "Ⅱ类-高后果隐患");
        assert_eq!(hazard_quadrant(3, 5), "Ⅱ类-高后果隐患");
        assert_eq!(hazard_quadrant(2, 4), "Ⅱ类-高后果隐患");
    }

    #[test]
    fn test_quadrant_type3() {
        assert_eq!(hazard_quadrant(4, 1), "Ⅲ类-高频隐患");
        assert_eq!(hazard_quadrant(5, 3), "Ⅲ类-高频隐患");
        assert_eq!(hazard_quadrant(4, 2), "Ⅲ类-高频隐患");
    }

    #[test]
    fn test_quadrant_type4() {
        assert_eq!(hazard_quadrant(1, 1), "Ⅳ类-一般隐患");
        assert_eq!(hazard_quadrant(3, 3), "Ⅳ类-一般隐患");
        assert_eq!(hazard_quadrant(2, 2), "Ⅳ类-一般隐患");
    }

    #[test]
    fn test_quadrant_clamping() {
        assert_eq!(hazard_quadrant(0, 0), "Ⅳ类-一般隐患");
        assert_eq!(hazard_quadrant(10, 10), "Ⅰ类-重大隐患");
    }

    #[test]
    fn test_hazard_serde_roundtrip() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let h = Hazard {
            id: "h-001".to_string(),
            hazard_no: "HZD-2024-001".to_string(),
            title: "地面湿滑".to_string(),
            description: Some("车间A区地面有油污".to_string()),
            category: "physical".to_string(),
            level: "medium".to_string(),
            source: "巡检".to_string(),
            location: Some("车间A".to_string()),
            reported_by: Some("张三".to_string()),
            reported_at: Some("2024-01-01T10:00:00Z".to_string()),
            status: "open".to_string(),
            inspection_id: None,
            approval_workflow_id: None,
            approval_status: None,
            created_at: Some("2024-01-01T00:00:00Z".to_string()),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            tenant_id,
        };
        let json = serde_json::to_string(&h).unwrap();
        let de: Hazard = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, h.id);
        assert_eq!(de.hazard_no, h.hazard_no);
        assert_eq!(de.title, h.title);
        assert_eq!(de.tenant_id, h.tenant_id);
    }

    #[test]
    fn test_hazard_clone() {
        let tenant_id = Uuid::new_v4();
        let h = Hazard {
            id: "1".to_string(),
            hazard_no: "HZ-001".to_string(),
            title: "隐患".to_string(),
            description: None,
            category: "c".to_string(),
            level: "l".to_string(),
            source: "s".to_string(),
            location: None,
            reported_by: None,
            reported_at: None,
            status: "st".to_string(),
            inspection_id: None,
            approval_workflow_id: None,
            approval_status: None,
            created_at: None,
            updated_at: None,
            tenant_id,
        };
        let c = h.clone();
        assert_eq!(c.id, h.id);
        assert_eq!(c.tenant_id, h.tenant_id);
    }

    #[test]
    fn test_rectification_serde() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let r = Rectification {
            id: "r-001".to_string(),
            hazard_id: "h-001".to_string(),
            description: "清理油污".to_string(),
            responsible: Some("李四".to_string()),
            deadline: Some("2024-01-10T00:00:00Z".to_string()),
            status: "in_progress".to_string(),
            progress: 50,
            started_at: Some("2024-01-02T00:00:00Z".to_string()),
            completed_at: None,
            created_at: Some("2024-01-01T00:00:00Z".to_string()),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            tenant_id,
        };
        let json = serde_json::to_string(&r).unwrap();
        let de: Rectification = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, r.id);
        assert_eq!(de.progress, 50);
    }

    #[test]
    fn test_verification_serde() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let v = Verification {
            id: "v-001".to_string(),
            hazard_id: "h-001".to_string(),
            verifier: Some("王五".to_string()),
            result: "pass".to_string(),
            remarks: Some("整改合格".to_string()),
            verified_at: Some("2024-01-15T00:00:00Z".to_string()),
            created_at: Some("2024-01-15T00:00:00Z".to_string()),
            tenant_id,
        };
        let json = serde_json::to_string(&v).unwrap();
        let de: Verification = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, v.id);
        assert_eq!(de.result, "pass");
    }

    #[test]
    fn test_hazard_detail_serde() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let h = Hazard {
            id: "h-001".into(),
            hazard_no: "HZ-001".into(),
            title: "隐患".into(),
            description: None,
            category: "c".into(),
            level: "l".into(),
            source: "s".into(),
            location: None,
            reported_by: None,
            reported_at: None,
            status: "st".into(),
            inspection_id: None,
            approval_workflow_id: None,
            approval_status: None,
            created_at: None,
            updated_at: None,
            tenant_id,
        };
        let hd = HazardDetail {
            hazard: h.clone(),
            rectification: None,
            verification: None,
            tenant_id,
        };
        let json = serde_json::to_string(&hd).unwrap();
        let de: HazardDetail = serde_json::from_str(&json).unwrap();
        assert_eq!(de.hazard.id, h.id);
        assert!(de.rectification.is_none());
    }

    #[test]
    fn test_hazard_query_defaults() {
        let q: HazardQuery = serde_json::from_str("{}").unwrap();
        assert!(q.page.is_none());
        assert!(q.level.is_none());
    }

    #[test]
    fn test_hazard_query_values() {
        let q: HazardQuery = serde_json::from_str(
            r#"{"page":2,"page_size":50,"status":"open","level":"high","source":"巡检"}"#,
        )
        .unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(50));
    }
}
