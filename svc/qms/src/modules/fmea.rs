//! FMEA (Failure Mode and Effects Analysis) handlers

use crate::models::fmea::*;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::decimal::big_decimal_to_f64;

/// 请求体日期只有日期部分，统一按 UTC 零点落 `timestamptz`。
fn date_to_utc(d: chrono::NaiveDate) -> DateTime<Utc> {
    DateTime::<Utc>::from_naive_utc_and_offset(d.and_hms_opt(0, 0, 0).unwrap_or_default(), Utc)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:fmea:read"])),
    path = "/fmea",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn list_fmea_analyses(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<FmeaQuery>,
) -> ApiResponse<Vec<FmeaAnalysis>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取FMEA分析列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let analyses = match (query.status.as_ref(), query.product_id.as_ref()) {
        (Some(st), Some(pid)) => sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at FROM qms.qa_fmea_analyses WHERE deleted_at IS NULL AND status = $1 AND product_id::TEXT = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(st).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(st), None) => sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at FROM qms.qa_fmea_analyses WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(pid)) => sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at FROM qms.qa_fmea_analyses WHERE deleted_at IS NULL AND product_id::TEXT = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at FROM qms.qa_fmea_analyses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match analyses {
        Ok(data) => ApiResponse::success(data, "获取FMEA分析列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA analyses: {}", e);
            ApiResponse::server_error("获取FMEA分析列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn create_fmea_analysis(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateFmeaRequest>,
) -> ApiResponse<FmeaAnalysis> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let fmea_no = format!(
        "FMEA-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    // TODO(w-b6b): product_id / process_id 属跨域主数据（pdm/mdm），当前未校验属主。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let process_id = req
        .process_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA创建事务失败: {}", e);
            return ApiResponse::server_error("FMEA分析创建失败");
        }
    };

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_fmea_analyses (tenant_id, fmea_no, title, fmea_type, product_id, product_name, process_id, process_name, scope, status, revision, team, leader, description, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, $12, $13, $14) RETURNING id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at"#)).bind(tenant_id).bind(fmea_no).bind(req.title).bind(req.fmea_type).bind(product_id).bind(req.product_name).bind(process_id).bind(req.process_name).bind(req.scope).bind(req.revision).bind(req.team).bind(req.leader).bind(req.description).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    match fmea {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA创建事务失败: {}", e);
                return ApiResponse::server_error("FMEA分析创建失败");
            }
            ApiResponse::success(data, "FMEA分析创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create FMEA analysis: {}", e);
            ApiResponse::server_error("FMEA分析创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:fmea:read"])),
    path = "/fmea/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn get_fmea_analysis(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<FmeaAnalysis> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取FMEA分析失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
    };

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at FROM qms.qa_fmea_analyses WHERE deleted_at IS NULL AND id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match fmea {
        Ok(data) => ApiResponse::success(data, "获取FMEA分析成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch FMEA analysis: {}", e);
            ApiResponse::server_error("获取FMEA分析失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn update_fmea_analysis(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateFmeaRequest>,
) -> ApiResponse<FmeaAnalysis> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA更新事务失败: {}", e);
            return ApiResponse::server_error("FMEA分析更新失败");
        }
    };

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(only_own_schema_query!("qms", r#"UPDATE qms.qa_fmea_analyses SET title = COALESCE($2, title), fmea_type = COALESCE($3, fmea_type), scope = COALESCE($4, scope), status = COALESCE($5, status), revision = COALESCE($6, revision), team = COALESCE($7, team), leader = COALESCE($8, leader), description = COALESCE($9, description), updated_at = NOW() WHERE id = $1 AND tenant_id = $10 RETURNING id::TEXT, tenant_id::TEXT, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at, updated_at"#)).bind(id).bind(req.title).bind(req.fmea_type).bind(req.scope).bind(req.status).bind(req.revision).bind(req.team).bind(req.leader).bind(req.description).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match fmea {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA更新事务失败: {}", e);
                return ApiResponse::server_error("FMEA分析更新失败");
            }
            ApiResponse::success(data, "FMEA分析更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update FMEA analysis: {}", e);
            ApiResponse::server_error("FMEA分析更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn delete_fmea_analysis(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA删除事务失败: {}", e);
            return ApiResponse::server_error("FMEA分析删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_fmea_analyses SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("FMEA分析不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA删除事务失败: {}", e);
                return ApiResponse::server_error("FMEA分析删除失败");
            }
            ApiResponse::success(true, "FMEA分析删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete FMEA analysis: {}", e);
            ApiResponse::server_error("FMEA分析删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:fmea:read"])),
    path = "/fmea-items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn list_fmea_items(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<FmeaItemQuery>,
) -> ApiResponse<Vec<FmeaItem>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取FMEA条目列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let fmea_id = match query.fmea_id.as_ref() {
        Some(id) => match Uuid::parse_str(id) {
            Ok(u) => Some(u),
            Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
        },
        None => None,
    };

    let items = if let Some(fid) = fmea_id {
        sqlx::query_as::<_, FmeaItem>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_id::TEXT, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at, updated_at FROM qms.qa_fmea_items WHERE fmea_id = $1 ORDER BY rpn DESC"#)).bind(fid)
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query_as::<_, FmeaItem>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_id::TEXT, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at, updated_at FROM qms.qa_fmea_items ORDER BY rpn DESC LIMIT 100"#))
        .fetch_all(&mut scope)
        .await
    };

    match items {
        Ok(data) => ApiResponse::success(data, "获取FMEA条目列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA items: {}", e);
            ApiResponse::server_error("获取FMEA条目列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea-items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn create_fmea_item(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateFmeaItemRequest>,
) -> ApiResponse<FmeaItem> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let fmea_id = match Uuid::parse_str(&req.fmea_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
    };

    let rpn = req.severity * req.occurrence * req.detection;
    let target_dt = req.target_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA条目创建事务失败: {}", e);
            return ApiResponse::server_error("FMEA条目创建失败");
        }
    };

    // 同域引用校验：父分析必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_fmea_analyses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(fmea_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("FMEA分析不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate FMEA analysis: {}", e);
            return ApiResponse::server_error("FMEA条目创建失败");
        }
    }

    let item = sqlx::query_as::<_, FmeaItem>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_fmea_items (tenant_id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id::TEXT, tenant_id::TEXT, fmea_id::TEXT, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at, updated_at"#)).bind(tenant_id).bind(fmea_id).bind(req.component).bind(req.function).bind(req.failure_mode).bind(req.failure_effect).bind(req.failure_cause).bind(req.severity).bind(req.occurrence).bind(req.detection).bind(rpn).bind(req.current_controls).bind(req.recommended_actions).bind(req.responsible).bind(target_dt).bind(req.sort_order)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA条目创建事务失败: {}", e);
                return ApiResponse::server_error("FMEA条目创建失败");
            }
            ApiResponse::success(data, "FMEA条目创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create FMEA item: {}", e);
            ApiResponse::server_error("FMEA条目创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:fmea:read"])),
    path = "/fmea-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn get_fmea_item(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<FmeaItem> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取FMEA条目失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA条目ID"),
    };

    let item = sqlx::query_as::<_, FmeaItem>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, fmea_id::TEXT, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at, updated_at FROM qms.qa_fmea_items WHERE id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(data) => ApiResponse::success(data, "获取FMEA条目成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch FMEA item: {}", e);
            ApiResponse::server_error("获取FMEA条目失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn update_fmea_item(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateFmeaItemRequest>,
) -> ApiResponse<FmeaItem> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA条目ID"),
    };

    let revised_rpn = match (
        req.revised_severity,
        req.revised_occurrence,
        req.revised_detection,
    ) {
        (Some(s), Some(o), Some(d)) => Some(s * o * d),
        _ => None,
    };

    let target_dt = req.target_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA条目更新事务失败: {}", e);
            return ApiResponse::server_error("FMEA条目更新失败");
        }
    };

    let item = sqlx::query_as::<_, FmeaItem>(only_own_schema_query!("qms", r#"UPDATE qms.qa_fmea_items SET component = COALESCE($2, component), function = COALESCE($3, function), failure_mode = COALESCE($4, failure_mode), failure_effect = COALESCE($5, failure_effect), failure_cause = COALESCE($6, failure_cause), severity = COALESCE($7, severity), occurrence = COALESCE($8, occurrence), detection = COALESCE($9, detection), rpn = COALESCE($7, severity) * COALESCE($8, occurrence) * COALESCE($9, detection), current_controls = COALESCE($10, current_controls), recommended_actions = COALESCE($11, recommended_actions), responsible = COALESCE($12, responsible), target_date = COALESCE($13, target_date), action_status = COALESCE($14, action_status), revised_severity = COALESCE($15, revised_severity), revised_occurrence = COALESCE($16, revised_occurrence), revised_detection = COALESCE($17, revised_detection), revised_rpn = COALESCE($18, revised_rpn), sort_order = COALESCE($19, sort_order), updated_at = NOW() WHERE id = $1 AND tenant_id = $20 RETURNING id::TEXT, tenant_id::TEXT, fmea_id::TEXT, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at, updated_at"#)).bind(id).bind(req.component).bind(req.function).bind(req.failure_mode).bind(req.failure_effect).bind(req.failure_cause).bind(req.severity).bind(req.occurrence).bind(req.detection).bind(req.current_controls).bind(req.recommended_actions).bind(req.responsible).bind(target_dt).bind(req.action_status).bind(req.revised_severity).bind(req.revised_occurrence).bind(req.revised_detection).bind(revised_rpn).bind(req.sort_order).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA条目更新事务失败: {}", e);
                return ApiResponse::server_error("FMEA条目更新失败");
            }
            ApiResponse::success(data, "FMEA条目更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update FMEA item: {}", e);
            ApiResponse::server_error("FMEA条目更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:fmea:write"])),
    path = "/fmea-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
pub async fn delete_fmea_item(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA条目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启FMEA条目删除事务失败: {}", e);
            return ApiResponse::server_error("FMEA条目删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_fmea_items WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("FMEA条目不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交FMEA条目删除事务失败: {}", e);
                return ApiResponse::server_error("FMEA条目删除失败");
            }
            ApiResponse::success(true, "FMEA条目删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete FMEA item: {}", e);
            ApiResponse::server_error("FMEA条目删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:fmea:read"])),
    path = "/fmea/{id}/statistics",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "fmea"
)]
#[allow(clippy::as_conversions)]
pub async fn get_fmea_statistics(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<FmeaStatistics> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取FMEA统计失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的FMEA分析ID"),
    };

    let total: Option<i64> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_fmea_items WHERE fmea_id = $1"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let total_items = total.unwrap_or(0);

    let high_risk: Option<i64> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_fmea_items WHERE fmea_id = $1 AND rpn >= 100"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let high_risk_count = high_risk.unwrap_or(0);

    let medium_risk: Option<i64> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_fmea_items WHERE fmea_id = $1 AND rpn >= 36 AND rpn < 100"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let medium_risk_count = medium_risk.unwrap_or(0);

    let low_risk: Option<i64> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_fmea_items WHERE fmea_id = $1 AND rpn < 36"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let low_risk_count = low_risk.unwrap_or(0);

    let avg_rpn: Option<bigdecimal::BigDecimal> =
        sqlx::query_scalar::<_, _>(only_own_schema_query!(
            "qms",
            r#"SELECT COALESCE(AVG(rpn), 0) FROM qms.qa_fmea_items WHERE fmea_id = $1"#
        ))
        .bind(id)
        .fetch_one(&mut scope)
        .await
        .ok();
    let average_rpn: f64 = big_decimal_to_f64(avg_rpn);

    let max_rpn_val: Option<i32> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COALESCE(MAX(rpn), 0) FROM qms.qa_fmea_items WHERE fmea_id = $1"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let max_rpn = max_rpn_val.unwrap_or(0) as i64;

    let min_rpn_val: Option<i32> = sqlx::query_scalar::<_, _>(only_own_schema_query!(
        "qms",
        r#"SELECT COALESCE(MIN(rpn), 0) FROM qms.qa_fmea_items WHERE fmea_id = $1"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let min_rpn = min_rpn_val.unwrap_or(0) as i64;

    let stats = FmeaStatistics {
        total_items,
        high_risk_count,
        medium_risk_count,
        low_risk_count,
        average_rpn,
        max_rpn,
        min_rpn,
    };

    ApiResponse::success(stats, "获取FMEA统计成功")
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/fmea", get(list_fmea_analyses))
        .route("/fmea", post(create_fmea_analysis))
        .route("/fmea/{id}", get(get_fmea_analysis))
        .route("/fmea/{id}", put(update_fmea_analysis))
        .route("/fmea/{id}", delete(delete_fmea_analysis))
        .route("/fmea/{id}/statistics", get(get_fmea_statistics))
        .route("/fmea-items", get(list_fmea_items))
        .route("/fmea-items", post(create_fmea_item))
        .route("/fmea-items/{id}", get(get_fmea_item))
        .route("/fmea-items/{id}", put(update_fmea_item))
        .route("/fmea-items/{id}", delete(delete_fmea_item))
}
