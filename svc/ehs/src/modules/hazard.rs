//! Hazard management handlers - Reporting, classification, rectification, verification, and closure

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::commit_retry;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
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
        .route(
            "/issues",
            get(list_safety_hazards).post(create_safety_hazard),
        )
        .route(
            "/issues/{id}",
            get(get_safety_hazard)
                .put(update_safety_hazard)
                .delete(delete_safety_hazard),
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
        .route("/hazards/{id}/assessments", get(list_risk_assessments_db))
        .route(
            "/hazards/{id}/controls",
            get(list_control_measures_db).post(create_control_measure_db),
        )
        .route(
            "/hazards/{id}/controls/{measure_id}",
            delete(delete_control_measure_db),
        )
}

#[derive(Debug, Deserialize)]
pub struct HazardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
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
    pub reported_at: Option<DateTime<Utc>>,
    pub status: String,
    pub inspection_id: Option<String>,
    pub approval_workflow_id: Option<String>,
    pub approval_status: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Verification {
    pub id: String,
    pub hazard_id: String,
    pub verifier: Option<String>,
    pub result: String,
    pub remarks: Option<String>,
    pub verified_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
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
) -> ApiResponse<Vec<Hazard>> {
    let tenant_scope = match dual_scope(&claims, "ehs.hazard.list_hazards", "ehs.qa_ehs_hazards") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let fetch_query = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause =
                String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL");
            if let Some(status) = &query.status {
                where_clause.push_str(&format!(" AND status = ${}", params.len() + 2));
                params.push(status.clone());
            }
            if let Some(level) = &query.level {
                where_clause.push_str(&format!(" AND level = ${}", params.len() + 2));
                params.push(level.clone());
            }
            if let Some(source) = &query.source {
                where_clause.push_str(&format!(" AND source = ${}", params.len() + 2));
                params.push(source.clone());
            }
            // 多语言：locale 绑定到 params 末尾，CASE 引用它（LIMIT/OFFSET 顺延）
            params.push(Locale::from_headers(&headers).as_sql().to_string());
            let locale_placeholder = params.len() + 1;
            let fetch_sql = format!(
                r#"
                SELECT
                    id::text AS id, hazard_no,
                    CASE WHEN ${locale} = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                    description, category, level, source, location, reported_by,
                    reported_at AS reported_at, status,
                    inspection_id::text AS inspection_id,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#,
                locale = locale_placeholder,
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(fetch_sql)).bind(tenant);
            for p in &params {
                q = q.bind(p);
            }
            q
        }
        None => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause = String::from(" WHERE deleted_at IS NULL");
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
            params.push(Locale::from_headers(&headers).as_sql().to_string());
            let locale_placeholder = params.len();
            let fetch_sql = format!(
                r#"
                SELECT
                    id::text AS id, hazard_no,
                    CASE WHEN ${locale} = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                    description, category, level, source, location, reported_by,
                    reported_at AS reported_at, status,
                    inspection_id::text AS inspection_id,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#,
                locale = locale_placeholder,
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
            for p in &params {
                q = q.bind(p);
            }
            q
        }
    };

    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list hazards: {}", e);
            return ApiResponse::server_error("获取隐患列表失败");
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
            reported_at: r
                .try_get::<Option<DateTime<Utc>>, _>("reported_at")
                .ok()
                .flatten(),
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
            created_at: r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten(),
            updated_at: r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten(),
            tenant_id: uuid::Uuid::nil(),
        })
        .collect();

    ApiResponse::success(hazards, "获取隐患列表成功")
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
) -> ApiResponse<Hazard> {
    // 生产端契约：隐患创建必须带租户；事件租户只来自请求上下文，超管也不允许回退 nil。
    let tenant_id = match topems_shared_auth::resolve_create_tenant(&claims) {
        Ok(Some(t)) => t,
        Ok(None) => return ApiResponse::bad_request("缺少租户上下文，拒绝创建隐患"),
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    tracing::debug!("Creating hazard: {:?}", req);

    let hazard_id = uuid::Uuid::new_v4();
    let hazard_no = format!("HZ-{}", hazard_id.to_string()[..8].to_uppercase());
    let now = chrono::Utc::now();

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
                tenant_id,
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

    ApiResponse::success(hazard, "隐患上报成功")
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
) -> ApiResponse<HazardDetail> {
    let tenant_scope = match dual_scope(&claims, "ehs.hazard.get_hazard", "ehs.qa_ehs_hazards") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = match tenant_scope.tenant_id() {
        // 租户通道：tenant_id = $3::uuid
        Some(tenant) => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, hazard_no,
                    CASE WHEN $2 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                    description, category, level, source, location, reported_by,
                    reported_at AS reported_at, status,
                    inspection_id::text AS inspection_id,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                WHERE id = $1::uuid AND tenant_id = $3::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(locale)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, hazard_no,
                    CASE WHEN $2 = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
                    description, category, level, source, location, reported_by,
                    reported_at AS reported_at, status,
                    inspection_id::text AS inspection_id,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                WHERE id = $1::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(locale)
            .fetch_optional(&mut scope)
            .await
        }
    };

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get hazard: {}", e);
            return ApiResponse::server_error("获取隐患详情失败");
        }
    };
    let row = match row {
        Some(r) => r,
        None => return ApiResponse::not_found("隐患不存在"),
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
            .try_get::<Option<DateTime<Utc>>, _>("reported_at")
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
            .try_get::<Option<DateTime<Utc>>, _>("created_at")
            .ok()
            .flatten(),
        updated_at: row
            .try_get::<Option<DateTime<Utc>>, _>("updated_at")
            .ok()
            .flatten(),
        tenant_id: uuid::Uuid::nil(),
    };

    ApiResponse::success(
        HazardDetail {
            hazard,
            rectification: None,
            verification: None,
            tenant_id: uuid::Uuid::nil(),
        },
        "获取隐患详情成功",
    )
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
) -> ApiResponse<Hazard> {
    let tenant_scope = match dual_scope(&claims, "ehs.hazard.update_hazard", "ehs.qa_ehs_hazards") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Updating hazard {}: {:?}", id, req);

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    macro_rules! set_str {
        ($col:expr, $key:expr) => {
            if let Some(v) = req.get($key).and_then(|x| x.as_str()) {
                sets.push(format!("{} = ${}", $col, params.len() + 1));
                params.push(v.to_string());
            }
        };
    }
    set_str!("title", "title");
    set_str!("description", "description");
    set_str!("category", "category");
    set_str!("level", "level");
    set_str!("source", "source");
    set_str!("location", "location");
    set_str!("status", "status");
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let row = match tenant_scope.tenant_id() {
        // 租户通道：tenant_id = $N::uuid
        Some(tenant) => {
            let id_idx = params.len() + 1;
            let tenant_idx = params.len() + 2;
            let sql = format!(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET {set_clause}
                WHERE id = ${id_idx}::uuid
                  AND tenant_id = ${tenant_idx}::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_no, title, description, category, level, source,
                          location, reported_by, reported_at AS reported_at, status,
                          inspection_id::text AS inspection_id,
                          created_at AS created_at, updated_at AS updated_at
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).bind(tenant).fetch_optional(&mut scope).await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let id_idx = params.len() + 1;
            let sql = format!(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET {set_clause}
                WHERE id = ${id_idx}::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_no, title, description, category, level, source,
                          location, reported_by, reported_at AS reported_at, status,
                          inspection_id::text AS inspection_id,
                          created_at AS created_at, updated_at AS updated_at
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).fetch_optional(&mut scope).await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("隐患不存在"),
        Err(e) => {
            tracing::error!("Failed to update hazard: {}", e);
            return ApiResponse::server_error("隐患更新失败");
        }
    };

    if let Some(tenant) = tenant_scope.tenant_id() {
        let cache_key = hazard_cache_key(tenant, &id);
        state.hazard_cache.remove(&cache_key).await;
        tracing::debug!("🗑️ 隐患缓存已失效: {}", cache_key);
    }
    state.hazard_cache.clear_l1();

    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_cache_invalidated(
                &format!("ehs:hazard:{}", id),
                "specific",
                Some("hazard_updated"),
            )
            .await;
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(hazard_from_row(&row), "隐患更新成功")
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
) -> ApiResponse<()> {
    let tenant_id = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    tracing::debug!("Deleting hazard: {}", id);

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope for hazard delete: {}", e);
            return ApiResponse::server_error("隐患删除失败");
        }
    };

    let result = sqlx::query(
        "UPDATE ehs.qa_ehs_hazards SET deleted_at = now(), updated_at = now() \
         WHERE id = $1::uuid AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete hazard: {}", e);
            return ApiResponse::server_error("隐患删除失败");
        }
    };

    if result.rows_affected() == 0 {
        return ApiResponse::not_found("隐患不存在");
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit hazard delete: {}", e);
        return ApiResponse::server_error("隐患删除失败");
    }

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

    ApiResponse::success((), "隐患删除成功")
}

#[derive(Debug, Deserialize, ToSchema)]
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
) -> ApiResponse<Hazard> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.start_approval",
        "ehs.qa_ehs_hazards",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::info!(
        "Starting approval for hazard {}: workflow_id={}",
        id,
        req.workflow_id
    );

    // 真实状态流转：identified/reported → pending_approval
    let upd = match tenant_scope.tenant_id() {
        Some(tenant) => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET status = 'pending_approval', updated_at = now()
                WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(tenant)
            .execute(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET status = 'pending_approval', updated_at = now()
                WHERE id = $1::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .execute(&mut scope)
            .await
        }
    };
    match upd {
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::not_found("隐患不存在");
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to start hazard approval: {}", e);
            return ApiResponse::server_error("启动隐患审批失败");
        }
    }

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

    match fetch_hazard_row(&mut scope, &id, tenant_scope.tenant_id()).await {
        Ok(Some(row)) => {
            let mut hazard = hazard_from_row(&row);
            hazard.approval_workflow_id = Some(req.workflow_id.to_string());
            hazard.approval_status = Some("pending".to_string());
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success(hazard, "隐患审批流程已启动")
        }
        Ok(None) => ApiResponse::not_found("隐患不存在"),
        Err((code, msg)) => ApiResponse::error(code, msg),
    }
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
) -> ApiResponse<Hazard> {
    let tenant_scope = match dual_scope(&claims, "ehs.hazard.close_hazard", "ehs.qa_ehs_hazards") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::info!("Closing hazard: {}", id);
    let upd = match tenant_scope.tenant_id() {
        Some(tenant) => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET status = 'closed', updated_at = now()
                WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(tenant)
            .execute(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazards
                SET status = 'closed', updated_at = now()
                WHERE id = $1::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .execute(&mut scope)
            .await
        }
    };
    match upd {
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::not_found("隐患不存在");
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to close hazard: {}", e);
            return ApiResponse::server_error("关闭隐患失败");
        }
    }
    if let Some(tenant) = tenant_scope.tenant_id() {
        let cache_key = hazard_cache_key(tenant, &id);
        state.hazard_cache.remove(&cache_key).await;
    }
    state.hazard_cache.clear_l1();
    match fetch_hazard_row(&mut scope, &id, tenant_scope.tenant_id()).await {
        Ok(Some(row)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success(hazard_from_row(&row), "隐患已关闭")
        }
        Ok(None) => ApiResponse::not_found("隐患不存在"),
        Err((code, msg)) => ApiResponse::error(code, msg),
    }
}

pub async fn create_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    tracing::debug!("Creating rectification for hazard {}: {:?}", id, req);

    // 兼容前端字段：description（或 measures）/ responsible / deadline
    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .or_else(|| req.get("measures").and_then(|v| v.as_str()))
        .unwrap_or("整改措施")
        .to_string();
    let responsible = req
        .get("responsible")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let deadline = req
        .get("deadline")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope for rectification: {}", e);
            return ApiResponse::server_error("整改方案创建失败");
        }
    };

    let row = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_hazard_rectifications
            (hazard_id, description, responsible, deadline, status, progress, tenant_id)
        VALUES ($1::uuid, $2, $3, $4::date, 'pending', 0, $5)
        RETURNING id::text AS id, hazard_id::text AS hazard_id, description, responsible,
                  deadline::text AS deadline, status, progress,
                  started_at AS started_at, completed_at AS completed_at,
                  created_at AS created_at, updated_at AS updated_at
        "#,
    )
    .bind(&id)
    .bind(&description)
    .bind(&responsible)
    .bind(&deadline)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    let row = match row {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create rectification: {}", e);
            if let sqlx::Error::Database(db) = &e {
                if db.code().as_deref() == Some("23503") {
                    return ApiResponse::not_found("危险源不存在");
                }
            }
            return ApiResponse::server_error("整改方案创建失败");
        }
    };

    // 隐患进入整改中（与整改方案插入同一事务，失败即整笔回滚）
    let updated = sqlx::query(
        "UPDATE ehs.qa_ehs_hazards SET status = 'rectifying', updated_at = now() \
         WHERE id = $1::uuid AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => return ApiResponse::not_found("隐患不存在"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to mark hazard rectifying: {}", e);
            return ApiResponse::server_error("整改方案创建失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit rectification: {}", e);
        return ApiResponse::server_error("整改方案创建失败");
    }

    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();

    ApiResponse::success(
        serde_json::json!({
            "id": row.try_get::<String, _>("id").unwrap_or_default(),
            "hazard_id": row.try_get::<String, _>("hazard_id").unwrap_or_default(),
            "description": row.try_get::<String, _>("description").unwrap_or_default(),
            "responsible": row.try_get::<Option<String>, _>("responsible").ok().flatten(),
            "deadline": row.try_get::<Option<String>, _>("deadline").ok().flatten(),
            "status": row.try_get::<String, _>("status").unwrap_or_else(|_| "pending".to_string()),
            "progress": row.try_get::<i32, _>("progress").unwrap_or(0),
            "started_at": row.try_get::<Option<DateTime<Utc>>, _>("started_at").ok().flatten(),
            "completed_at": row.try_get::<Option<DateTime<Utc>>, _>("completed_at").ok().flatten(),
            "created_at": row.try_get::<DateTime<Utc>, _>("created_at").unwrap_or_default(),
            "updated_at": row.try_get::<DateTime<Utc>, _>("updated_at").unwrap_or_default(),
            "tenant_id": tenant_id.to_string(),
        }),
        "整改方案创建成功",
    )
}

pub async fn update_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.update_rectification",
        "ehs.qa_ehs_hazard_rectifications",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Updating rectification for hazard {}: {:?}", id, req);

    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .or_else(|| req.get("measures").and_then(|v| v.as_str()));
    let responsible = req.get("responsible").and_then(|v| v.as_str());
    let deadline = req.get("deadline").and_then(|v| v.as_str());
    let progress = req.get("progress").and_then(|v| v.as_i64());
    let status = req.get("status").and_then(|v| v.as_str());

    let row = match tenant_scope.tenant_id() {
        // 租户通道：tenant_id = $7::uuid
        Some(tenant) => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazard_rectifications
                SET description = COALESCE($2, description),
                    responsible = COALESCE($3, responsible),
                    deadline = COALESCE($4::date, deadline),
                    progress = COALESCE($5, progress),
                    status = COALESCE($6, status),
                    started_at = COALESCE(started_at, now()),
                    updated_at = now()
                WHERE hazard_id = $1::uuid
                  AND tenant_id = $7::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_id::text AS hazard_id, description, responsible,
                          deadline::text AS deadline, status, progress,
                          started_at AS started_at, completed_at AS completed_at,
                          created_at AS created_at, updated_at AS updated_at
                "#,
            )
            .bind(&id)
            .bind(description)
            .bind(responsible)
            .bind(deadline)
            .bind(progress)
            .bind(status)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                UPDATE ehs.qa_ehs_hazard_rectifications
                SET description = COALESCE($2, description),
                    responsible = COALESCE($3, responsible),
                    deadline = COALESCE($4::date, deadline),
                    progress = COALESCE($5, progress),
                    status = COALESCE($6, status),
                    started_at = COALESCE(started_at, now()),
                    updated_at = now()
                WHERE hazard_id = $1::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_id::text AS hazard_id, description, responsible,
                          deadline::text AS deadline, status, progress,
                          started_at AS started_at, completed_at AS completed_at,
                          created_at AS created_at, updated_at AS updated_at
                "#,
            )
            .bind(&id)
            .bind(description)
            .bind(responsible)
            .bind(deadline)
            .bind(progress)
            .bind(status)
            .fetch_optional(&mut scope)
            .await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("整改方案不存在"),
        Err(e) => {
            tracing::error!("Failed to update rectification: {}", e);
            if let sqlx::Error::Database(db) = &e {
                if db.code().as_deref() == Some("23503") {
                    return ApiResponse::not_found("危险源不存在");
                }
            }
            return ApiResponse::server_error("整改方案更新失败");
        }
    };

    if let Some(tenant) = tenant_scope.tenant_id() {
        let cache_key = hazard_cache_key(tenant, &id);
        state.hazard_cache.remove(&cache_key).await;
    }
    state.hazard_cache.clear_l1();

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(
        serde_json::json!({
            "id": row.try_get::<String, _>("id").unwrap_or_default(),
            "hazard_id": row.try_get::<String, _>("hazard_id").unwrap_or_default(),
            "description": row.try_get::<String, _>("description").unwrap_or_default(),
            "responsible": row.try_get::<Option<String>, _>("responsible").ok().flatten(),
            "deadline": row.try_get::<Option<String>, _>("deadline").ok().flatten(),
            "status": row.try_get::<String, _>("status").unwrap_or_else(|_| "in_progress".to_string()),
            "progress": row.try_get::<i32, _>("progress").unwrap_or(0),
            "started_at": row.try_get::<Option<DateTime<Utc>>, _>("started_at").ok().flatten(),
            "completed_at": row.try_get::<Option<DateTime<Utc>>, _>("completed_at").ok().flatten(),
            "created_at": row.try_get::<DateTime<Utc>, _>("created_at").unwrap_or_default(),
            "updated_at": row.try_get::<DateTime<Utc>, _>("updated_at").unwrap_or_default(),
            "tenant_id": tenant_scope
                .tenant_id()
                .unwrap_or_default()
                .to_string(),
        }),
        "整改方案更新成功",
    )
}

pub async fn submit_rectification(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    tracing::info!("Submitting rectification for hazard: {}", id);

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope for submit: {}", e);
            return ApiResponse::server_error("整改提交失败");
        }
    };

    let upd = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_hazard_rectifications
        SET status = 'submitted', completed_at = now(), updated_at = now()
        WHERE hazard_id = $1::uuid
          AND tenant_id = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(&id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    match upd {
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::not_found("整改方案不存在");
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to submit rectification: {}", e);
            return ApiResponse::server_error("整改提交失败");
        }
    }

    // 隐患流转至待验收（同一事务；0 行说明并发下状态已变，回滚并报 409）
    let updated = sqlx::query(
        "UPDATE ehs.qa_ehs_hazards SET status = 'pending_verification', updated_at = now() \
         WHERE id = $1::uuid AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::error(409, "隐患状态已变化，请刷新后重试");
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to mark hazard pending_verification: {}", e);
            return ApiResponse::server_error("整改提交失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit rectification submit: {}", e);
        return ApiResponse::server_error("整改提交失败");
    }

    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();

    ApiResponse::success(
        serde_json::json!({
            "hazard_id": id,
            "status": "submitted",
            "submitted_at": chrono::Utc::now(),
            "tenant_id": tenant_id.to_string(),
        }),
        "整改已提交",
    )
}

pub async fn verify_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    tracing::debug!("Verifying hazard {}: {:?}", id, req);

    // 验收人优先取请求体，缺省取当前登录用户 claims.sub（不再硬编码 test_admin）
    let verifier = req
        .get("verifier")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| claims.sub.clone());
    let result = req
        .get("result")
        .and_then(|v| v.as_str())
        .unwrap_or("passed")
        .to_string();
    let remarks = req
        .get("remarks")
        .or_else(|| req.get("comment"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope for verify: {}", e);
            return ApiResponse::server_error("隐患验收失败");
        }
    };

    let row = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_hazard_verifications
            (hazard_id, verifier, result, remarks, verified_at, tenant_id)
        VALUES ($1::uuid, $2, $3, $4, now(), $5)
        RETURNING id::text AS id, hazard_id::text AS hazard_id, verifier, result, remarks,
                  verified_at AS verified_at, created_at AS created_at
        "#,
    )
    .bind(&id)
    .bind(&verifier)
    .bind(&result)
    .bind(&remarks)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    let row = match row {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to verify hazard: {}", e);
            if let sqlx::Error::Database(db) = &e {
                if db.code().as_deref() == Some("23503") {
                    return ApiResponse::not_found("危险源不存在");
                }
            }
            return ApiResponse::server_error("隐患验收失败");
        }
    };

    // 验收结论驱动隐患状态流转：passed→closed，否则退回 rectifying
    let next_status = if result == "passed" {
        "closed"
    } else {
        "rectifying"
    };
    let updated = sqlx::query(
        "UPDATE ehs.qa_ehs_hazards SET status = $3, updated_at = now() \
         WHERE id = $1::uuid AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&id)
    .bind(tenant_id)
    .bind(next_status)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            return ApiResponse::error(409, "隐患状态已变化，请刷新后重试");
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to update hazard status after verify: {}", e);
            return ApiResponse::server_error("隐患验收失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit hazard verify: {}", e);
        return ApiResponse::server_error("隐患验收失败");
    }

    let cache_key = hazard_cache_key(tenant_id, &id);
    state.hazard_cache.remove(&cache_key).await;
    state.hazard_cache.clear_l1();

    ApiResponse::success(
        serde_json::json!({
            "id": row.try_get::<String, _>("id").unwrap_or_default(),
            "hazard_id": row.try_get::<String, _>("hazard_id").unwrap_or_default(),
            "verifier": row.try_get::<Option<String>, _>("verifier").ok().flatten(),
            "result": row.try_get::<String, _>("result").unwrap_or_default(),
            "remarks": row.try_get::<Option<String>, _>("remarks").ok().flatten(),
            "verified_at": row.try_get::<DateTime<Utc>, _>("verified_at").unwrap_or_default(),
            "created_at": row.try_get::<DateTime<Utc>, _>("created_at").unwrap_or_default(),
            "tenant_id": tenant_id.to_string(),
        }),
        "隐患验证完成",
    )
}

// ---- /issues 主 CRUD（接 ehs.safety_hazards，对齐前端 SafetyHazard 契约）----

#[derive(Debug, Serialize)]
pub struct SafetyHazard {
    pub id: String,
    pub hazard_no: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: Option<Vec<String>>,
    pub status: String,
    pub severity: Option<String>,
    pub exposure: Option<String>,
    pub likelihood: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateSafetyHazardRequest {
    pub hazard_no: Option<String>,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: Option<Vec<String>>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub exposure: Option<String>,
    pub likelihood: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSafetyHazardRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: Option<Vec<String>>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub exposure: Option<String>,
    pub likelihood: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/issues",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_safety_hazards(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<HazardQuery>,
) -> ApiResponse<Vec<SafetyHazard>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.list_safety_hazards",
        "ehs.safety_hazards",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let query = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause =
                String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL");
            if let Some(s) = &q.status {
                where_clause.push_str(&format!(" AND status = ${}", params.len() + 2));
                params.push(s.clone());
            }
            if let Some(level) = &q.level {
                where_clause.push_str(&format!(" AND level = ${}", params.len() + 2));
                params.push(level.clone());
            }
            if let Some(search) = &q.search {
                where_clause.push_str(&format!(
                    " AND (name ILIKE ${} OR location ILIKE ${} OR hazard_no ILIKE ${})",
                    params.len() + 2,
                    params.len() + 3,
                    params.len() + 4
                ));
                let like = format!("%{search}%");
                params.push(like.clone());
                params.push(like.clone());
                params.push(like);
            }
            let sql = format!(
                r#"
                SELECT id::text AS id, hazard_no, name, category, level, description, location,
                       risk_assessment, control_measures, status, severity, exposure, likelihood,
                       created_by, created_at AS created_at, updated_at AS updated_at,
                       tenant_id::text AS tenant_id
                FROM ehs.safety_hazards
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant);
            for p in &params {
                q = q.bind(p);
            }
            q
        }
        None => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause = String::from(" WHERE deleted_at IS NULL");
            if let Some(s) = &q.status {
                where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
                params.push(s.clone());
            }
            if let Some(level) = &q.level {
                where_clause.push_str(&format!(" AND level = ${}", params.len() + 1));
                params.push(level.clone());
            }
            if let Some(search) = &q.search {
                where_clause.push_str(&format!(
                    " AND (name ILIKE ${} OR location ILIKE ${} OR hazard_no ILIKE ${})",
                    params.len() + 1,
                    params.len() + 2,
                    params.len() + 3
                ));
                let like = format!("%{search}%");
                params.push(like.clone());
                params.push(like.clone());
                params.push(like);
            }
            let sql = format!(
                r#"
                SELECT id::text AS id, hazard_no, name, category, level, description, location,
                       risk_assessment, control_measures, status, severity, exposure, likelihood,
                       created_by, created_at AS created_at, updated_at AS updated_at,
                       tenant_id::text AS tenant_id
                FROM ehs.safety_hazards
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q
        }
    };
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list safety hazards: {}", e);
            return ApiResponse::server_error("获取危险源列表失败");
        }
    };
    let list: Vec<SafetyHazard> = rows.iter().map(safety_hazard_from_row).collect();
    ApiResponse::success(list, "获取危险源列表成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:write"])),
    path = "/api/ehs/issues",
    request_body = CreateSafetyHazardRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_safety_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> ApiResponse<SafetyHazard> {
    // 生产端契约：危险源创建必须带租户；事件租户只来自请求上下文，超管也不允许回退 nil。
    let tenant_id = match topems_shared_auth::resolve_create_tenant(&claims) {
        Ok(Some(t)) => t,
        Ok(None) => return ApiResponse::bad_request("缺少租户上下文，拒绝创建危险源"),
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let hazard_no = req
        .hazard_no
        .clone()
        .unwrap_or_else(|| format!("HZ-{}", Uuid::new_v4().to_string()[..8].to_uppercase()));
    let control_measures: serde_json::Value = req
        .control_measures
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let status = req.status.clone().unwrap_or_else(|| "active".to_string());

    let sql = r#"
        INSERT INTO ehs.safety_hazards
            (hazard_no, name, category, level, description, location, risk_assessment,
             control_measures, status, severity, exposure, likelihood, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id::text AS id, hazard_no, name, category, level, description, location,
                  risk_assessment, control_measures, status, severity, exposure, likelihood,
                  created_by, created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&hazard_no)
        .bind(&req.name)
        .bind(&req.category)
        .bind(&req.level)
        .bind(&req.description)
        .bind(&req.location)
        .bind(&req.risk_assessment)
        .bind(control_measures)
        .bind(&status)
        .bind(&req.severity)
        .bind(&req.exposure)
        .bind(&req.likelihood)
        .bind(claims.sub.parse::<Uuid>().ok())
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create safety hazard: {}", e);
            return ApiResponse::server_error("危险源创建失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    let record = safety_hazard_from_row(&row);

    // 生产端：危险源创建成功后发布 EhsHazardReported，租户取请求上下文（上方已强校验非 nil）。
    if let Some(publisher) = &state.event_publisher {
        if let Ok(hazard_uuid) = Uuid::parse_str(&record.id) {
            let payload = topems_shared_event::event::EhsHazardReportedPayload {
                tenant_id,
                hazard_id: hazard_uuid,
                hazard_no: record.hazard_no.clone(),
                title: record.name.clone(),
                category: record.category.clone(),
                level: record.level.clone(),
                location: record.location.clone(),
                description: record.description.clone(),
                reported_by: record.created_by.clone(),
            };
            let et = topems_shared_event::event::EventType::EhsHazardReported;
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher.publish_event(et, &payload).await {
                    tracing::warn!(
                        "[ehs] EhsHazardReported 事件发布失败（graceful fallback）: {}，入重试队列",
                        e
                    );
                    commit_retry::push_retry_typed("ehs", et, &payload).await;
                } else {
                    tracing::info!(
                        "[ehs] EhsHazardReported 事件发布成功 - hazard_id={}",
                        hazard_uuid
                    );
                }
            });
        } else {
            tracing::error!(
                "[tenant_ctx] 危险源 id 非 UUID，无法发布 EhsHazardReported - id={}",
                record.id
            );
        }
    }

    ApiResponse::success(record, "危险源创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/issues/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_safety_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<SafetyHazard> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.get_safety_hazard",
        "ehs.safety_hazards",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let row = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                SELECT id::text AS id, hazard_no, name, category, level, description, location,
                       risk_assessment, control_measures, status, severity, exposure, likelihood,
                       created_by, created_at AS created_at, updated_at AS updated_at,
                       tenant_id::text AS tenant_id
                FROM ehs.safety_hazards
                WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .bind(tenant)
                .fetch_optional(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                SELECT id::text AS id, hazard_no, name, category, level, description, location,
                       risk_assessment, control_measures, status, severity, exposure, likelihood,
                       created_by, created_at AS created_at, updated_at AS updated_at,
                       tenant_id::text AS tenant_id
                FROM ehs.safety_hazards
                WHERE id::text = $1 AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .fetch_optional(&mut scope)
                .await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("危险源不存在"),
        Err(e) => {
            tracing::error!("Failed to get safety hazard: {}", e);
            return ApiResponse::server_error("获取危险源失败");
        }
    };
    let record = safety_hazard_from_row(&row);
    ApiResponse::success(record, "获取危险源成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:hazard:update"])),
    path = "/api/ehs/issues/{id}",
    request_body = UpdateSafetyHazardRequest,
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_safety_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateSafetyHazardRequest>,
) -> ApiResponse<SafetyHazard> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.update_safety_hazard",
        "ehs.safety_hazards",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.name {
        sets.push(format!("name = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.category {
        sets.push(format!("category = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.level {
        sets.push(format!("level = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.description {
        sets.push(format!("description = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.location {
        sets.push(format!("location = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.risk_assessment {
        sets.push(format!("risk_assessment = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.control_measures {
        sets.push(format!("control_measures = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.severity {
        sets.push(format!("severity = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.exposure {
        sets.push(format!("exposure = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.likelihood {
        sets.push(format!("likelihood = ${}", params.len() + 1));
        params.push(v);
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let row = match tenant_scope.tenant_id() {
        // 租户通道：tenant_id = $N::uuid
        Some(tenant) => {
            let id_idx = params.len() + 1;
            let tenant_idx = params.len() + 2;
            let sql = format!(
                r#"
                UPDATE ehs.safety_hazards
                SET {set_clause}
                WHERE id::text = ${id_idx}
                  AND tenant_id = ${tenant_idx}::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_no, name, category, level, description, location,
                          risk_assessment, control_measures, status, severity, exposure, likelihood,
                          created_by, created_at AS created_at, updated_at AS updated_at,
                          tenant_id::text AS tenant_id
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).bind(tenant).fetch_optional(&mut scope).await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let id_idx = params.len() + 1;
            let sql = format!(
                r#"
                UPDATE ehs.safety_hazards
                SET {set_clause}
                WHERE id::text = ${id_idx}
                  AND deleted_at IS NULL
                RETURNING id::text AS id, hazard_no, name, category, level, description, location,
                          risk_assessment, control_measures, status, severity, exposure, likelihood,
                          created_by, created_at AS created_at, updated_at AS updated_at,
                          tenant_id::text AS tenant_id
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).fetch_optional(&mut scope).await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("危险源不存在"),
        Err(e) => {
            tracing::error!("Failed to update safety hazard: {}", e);
            return ApiResponse::server_error("危险源更新失败");
        }
    };
    let record = safety_hazard_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "危险源更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:hazard:delete"])),
    path = "/api/ehs/issues/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_safety_hazard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.delete_safety_hazard",
        "ehs.safety_hazards",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let result = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                UPDATE ehs.safety_hazards
                SET deleted_at = now()
                WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .bind(tenant)
                .execute(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                UPDATE ehs.safety_hazards
                SET deleted_at = now()
                WHERE id::text = $1 AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .execute(&mut scope)
                .await
        }
    };
    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete safety hazard: {}", e);
            return ApiResponse::server_error("危险源删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("危险源不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "危险源删除成功")
}

/// ehs.safety_hazards 行 → SafetyHazard
fn safety_hazard_from_row(r: &sqlx::postgres::PgRow) -> SafetyHazard {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let control_measures: Option<serde_json::Value> = r.try_get("control_measures").ok().flatten();
    let control_measures = control_measures.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    SafetyHazard {
        id: r.try_get("id").unwrap_or_default(),
        hazard_no: r.try_get("hazard_no").unwrap_or_default(),
        name: r.try_get("name").unwrap_or_default(),
        category: r.try_get("category").unwrap_or_default(),
        level: r.try_get("level").unwrap_or_default(),
        description: r.try_get("description").ok().flatten(),
        location: r.try_get("location").ok().flatten(),
        risk_assessment: r.try_get("risk_assessment").ok().flatten(),
        control_measures,
        status: r.try_get("status").unwrap_or_else(|_| "active".to_string()),
        severity: r.try_get("severity").ok().flatten(),
        exposure: r.try_get("exposure").ok().flatten(),
        likelihood: r.try_get("likelihood").ok().flatten(),
        created_by: r.try_get("created_by").ok().flatten(),
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// ehs.qa_ehs_hazards 行 → Hazard（生命周期路由复用：审批/关闭/整改/验收回读）
fn hazard_from_row(row: &sqlx::postgres::PgRow) -> Hazard {
    Hazard {
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
            .try_get::<Option<DateTime<Utc>>, _>("reported_at")
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
            .try_get::<Option<DateTime<Utc>>, _>("created_at")
            .ok()
            .flatten(),
        updated_at: row
            .try_get::<Option<DateTime<Utc>>, _>("updated_at")
            .ok()
            .flatten(),
        tenant_id: uuid::Uuid::nil(),
    }
}

/// 回读单条隐患行（租户通道按 id + 租户，系统通道仅按 id），返回 None=不存在/软删。
async fn fetch_hazard_row(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    id: &str,
    tenant: Option<Uuid>,
) -> Result<Option<sqlx::postgres::PgRow>, (u16, &'static str)> {
    let row = match tenant {
        Some(t) => {
            sqlx::query(
                r#"
                SELECT id::text AS id, hazard_no, title, description, category, level, source,
                       location, reported_by, reported_at AS reported_at, status,
                       inspection_id::text AS inspection_id,
                       created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(id)
            .bind(t)
            .fetch_optional(&mut *scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                SELECT id::text AS id, hazard_no, title, description, category, level, source,
                       location, reported_by, reported_at AS reported_at, status,
                       inspection_id::text AS inspection_id,
                       created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazards
                WHERE id = $1::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(id)
            .fetch_optional(&mut *scope)
            .await
        }
    }
    .map_err(|e| {
        tracing::error!("Failed to fetch hazard {}: {}", id, e);
        (500, "获取隐患失败")
    })?;
    Ok(row)
}

// ---- hazard 详情子资源接真（/hazards/{hazardId}/assessments|controls）----

#[derive(Debug, Serialize)]
pub struct RiskAssessment {
    pub id: String,
    pub hazard_id: String,
    pub assessment_date: Option<String>,
    pub assessor: Option<String>,
    pub severity: String,
    pub likelihood: String,
    pub risklevel: Option<String>,
    pub recommendations: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct ControlMeasure {
    pub id: String,
    pub hazard_id: String,
    pub measure_type: String,
    pub description: Option<String>,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub effectiveness: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRiskAssessmentRequest {
    pub hazard_id: String,
    pub assessment_date: Option<String>,
    pub assessor: Option<String>,
    pub severity: Option<String>,
    pub likelihood: Option<String>,
    pub recommendations: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateControlMeasureRequest {
    pub measure_type: String,
    pub description: Option<String>,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazards/{id}/assessments",
    tag = "ehs",
    params(("hazard_id" = String, Path, description = "危险源 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn list_risk_assessments_db(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(hazard_id): axum::extract::Path<String>,
) -> ApiResponse<Vec<RiskAssessment>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.list_risk_assessments",
        "ehs.hazard_risk_assessments",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let rows = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                SELECT id::text AS id, hazard_id::text AS hazard_id,
                       assessment_date::text AS assessment_date, assessor, severity, likelihood,
                       risklevel, recommendations, created_at AS created_at
                FROM ehs.hazard_risk_assessments
                WHERE hazard_id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
                ORDER BY created_at DESC
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&hazard_id)
                .bind(tenant)
                .fetch_all(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                SELECT id::text AS id, hazard_id::text AS hazard_id,
                       assessment_date::text AS assessment_date, assessor, severity, likelihood,
                       risklevel, recommendations, created_at AS created_at
                FROM ehs.hazard_risk_assessments
                WHERE hazard_id::text = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&hazard_id)
                .fetch_all(&mut scope)
                .await
        }
    };
    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list hazard risk assessments: {}", e);
            return ApiResponse::server_error("获取风险评估列表失败");
        }
    };
    let list: Vec<RiskAssessment> = rows.iter().map(hazard_risk_assessment_from_row).collect();
    ApiResponse::success(list, "获取风险评估列表成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazards/{id}/controls",
    tag = "ehs",
    params(("hazard_id" = String, Path, description = "危险源 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn list_control_measures_db(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(hazard_id): axum::extract::Path<String>,
) -> ApiResponse<Vec<ControlMeasure>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.list_control_measures",
        "ehs.hazard_control_measures",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open hazard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let rows = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                SELECT id::text AS id, hazard_id::text AS hazard_id, measure_type, description,
                       responsible, deadline::text AS deadline, status, effectiveness,
                       created_at AS created_at
                FROM ehs.hazard_control_measures
                WHERE hazard_id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
                ORDER BY created_at DESC
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&hazard_id)
                .bind(tenant)
                .fetch_all(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                SELECT id::text AS id, hazard_id::text AS hazard_id, measure_type, description,
                       responsible, deadline::text AS deadline, status, effectiveness,
                       created_at AS created_at
                FROM ehs.hazard_control_measures
                WHERE hazard_id::text = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&hazard_id)
                .fetch_all(&mut scope)
                .await
        }
    };
    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list hazard control measures: {}", e);
            return ApiResponse::server_error("获取管控措施列表失败");
        }
    };
    let list: Vec<ControlMeasure> = rows.iter().map(hazard_control_measure_from_row).collect();
    ApiResponse::success(list, "获取管控措施列表成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/hazards/{id}/controls",
    request_body = CreateControlMeasureRequest,
    tag = "ehs",
    params(("hazard_id" = String, Path, description = "危险源 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn create_control_measure_db(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(hazard_id): axum::extract::Path<String>,
    Json(req): Json<CreateControlMeasureRequest>,
) -> ApiResponse<ControlMeasure> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let status = req.status.clone().unwrap_or_else(|| "pending".to_string());
    let sql = r#"
        INSERT INTO ehs.hazard_control_measures
            (hazard_id, measure_type, description, responsible, deadline, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id::text AS id, hazard_id::text AS hazard_id, measure_type, description,
                  responsible, deadline::text AS deadline, status, effectiveness,
                  created_at AS created_at
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&hazard_id)
        .bind(&req.measure_type)
        .bind(&req.description)
        .bind(&req.responsible)
        .bind(&req.deadline)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create hazard control measure: {}", e);
            return ApiResponse::server_error("管控措施创建失败");
        }
    };
    let record = hazard_control_measure_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "管控措施创建成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/hazards/{id}/controls/{measure_id}",
    tag = "ehs",
    params(
        ("hazard_id" = String, Path, description = "危险源 ID"),
        ("measure_id" = String, Path, description = "管控措施 ID")
    ),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_control_measure_db(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((_hazard_id, measure_id)): axum::extract::Path<(String, String)>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.hazard.delete_control_measure",
        "ehs.hazard_control_measures",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin hazard txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let result = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                UPDATE ehs.hazard_control_measures
                SET deleted_at = now()
                WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&measure_id)
                .bind(tenant)
                .execute(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                UPDATE ehs.hazard_control_measures
                SET deleted_at = now()
                WHERE id::text = $1 AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&measure_id)
                .execute(&mut scope)
                .await
        }
    };
    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete hazard control measure: {}", e);
            return ApiResponse::server_error("管控措施删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("管控措施不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "管控措施删除成功")
}

/// hazard_risk_assessments 行 → RiskAssessment
fn hazard_risk_assessment_from_row(r: &sqlx::postgres::PgRow) -> RiskAssessment {
    RiskAssessment {
        id: r.try_get("id").unwrap_or_default(),
        hazard_id: r.try_get("hazard_id").unwrap_or_default(),
        assessment_date: r.try_get("assessment_date").ok().flatten(),
        assessor: r.try_get("assessor").ok().flatten(),
        severity: r
            .try_get("severity")
            .unwrap_or_else(|_| "medium".to_string()),
        likelihood: r
            .try_get("likelihood")
            .unwrap_or_else(|_| "medium".to_string()),
        risklevel: r.try_get("risklevel").ok().flatten(),
        recommendations: r.try_get("recommendations").ok().flatten(),
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
    }
}

/// hazard_control_measures 行 → ControlMeasure
fn hazard_control_measure_from_row(r: &sqlx::postgres::PgRow) -> ControlMeasure {
    ControlMeasure {
        id: r.try_get("id").unwrap_or_default(),
        hazard_id: r.try_get("hazard_id").unwrap_or_default(),
        measure_type: r
            .try_get("measure_type")
            .unwrap_or_else(|_| "engineering".to_string()),
        description: r.try_get("description").ok().flatten(),
        responsible: r.try_get("responsible").ok().flatten(),
        deadline: r.try_get("deadline").ok().flatten(),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "pending".to_string()),
        effectiveness: r.try_get("effectiveness").ok().flatten(),
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
    }
}
