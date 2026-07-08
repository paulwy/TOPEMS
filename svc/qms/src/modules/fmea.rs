//! FMEA (Failure Mode and Effects Analysis) handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use bigdecimal::ToPrimitive;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct FmeaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_id: Option<String>,
    pub process_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct FmeaAnalysis {
    pub id: String,
    pub fmea_no: String,
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFmeaRequest {
    pub title: String,
    pub fmea_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub scope: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFmeaRequest {
    pub title: Option<String>,
    pub fmea_type: Option<String>,
    pub scope: Option<String>,
    pub status: Option<String>,
    pub revision: Option<String>,
    pub team: Option<String>,
    pub leader: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct FmeaItem {
    pub id: String,
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub rpn: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub revised_rpn: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FmeaItemQuery {
    pub fmea_id: Option<String>,
    pub min_rpn: Option<i64>,
    pub action_status: Option<String>,
    pub sort_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFmeaItemRequest {
    pub fmea_id: String,
    pub component: String,
    pub function: Option<String>,
    pub failure_mode: String,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFmeaItemRequest {
    pub component: Option<String>,
    pub function: Option<String>,
    pub failure_mode: Option<String>,
    pub failure_effect: Option<String>,
    pub failure_cause: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub current_controls: Option<String>,
    pub recommended_actions: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
    pub action_status: Option<String>,
    pub revised_severity: Option<i32>,
    pub revised_occurrence: Option<i32>,
    pub revised_detection: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct FmeaStatistics {
    pub total_items: i64,
    pub high_risk_count: i64,
    pub medium_risk_count: i64,
    pub low_risk_count: i64,
    pub average_rpn: f64,
    pub max_rpn: i64,
    pub min_rpn: i64,
}

pub async fn list_fmea_analyses(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<FmeaQuery>,
) -> Json<ApiResponse<Vec<FmeaAnalysis>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let analyses = match (query.status.as_ref(), query.product_id.as_ref()) {
        (Some(st), Some(pid)) => sqlx::query_as::<_, FmeaAnalysis>(r#"SELECT id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_fmea_analyses WHERE status = $1 AND product_id::TEXT = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(st).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None) => sqlx::query_as::<_, FmeaAnalysis>(r#"SELECT id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_fmea_analyses WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(pid)) => sqlx::query_as::<_, FmeaAnalysis>(r#"SELECT id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_fmea_analyses WHERE product_id::TEXT = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(pid).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, FmeaAnalysis>(r#"SELECT id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_fmea_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match analyses {
        Ok(data) => Json(ApiResponse::success(data, "获取FMEA分析列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA analyses: {}", e);
            Json(ApiResponse::error(500, "获取FMEA分析列表失败"))
        }
    }
}

pub async fn create_fmea_analysis(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateFmeaRequest>,
) -> Json<ApiResponse<FmeaAnalysis>> {
    let fmea_no = format!(
        "FMEA-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let process_id = req
        .process_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(r#"INSERT INTO qa_fmea_analyses (fmea_no, title, fmea_type, product_id, product_name, process_id, process_name, scope, status, revision, team, leader, description, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13) RETURNING id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT"#).bind(fmea_no).bind(req.title).bind(req.fmea_type).bind(product_id).bind(req.product_name).bind(process_id).bind(req.process_name).bind(req.scope).bind(req.revision).bind(req.team).bind(req.leader).bind(req.description).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match fmea {
        Ok(data) => Json(ApiResponse::success(data, "FMEA分析创建成功")),
        Err(e) => {
            tracing::error!("Failed to create FMEA analysis: {}", e);
            Json(ApiResponse::error(500, "FMEA分析创建失败"))
        }
    }
}

pub async fn get_fmea_analysis(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<FmeaAnalysis>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
    };

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(r#"SELECT id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT FROM qa_fmea_analyses WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match fmea {
        Ok(data) => Json(ApiResponse::success(data, "获取FMEA分析成功")),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA analysis: {}", e);
            Json(ApiResponse::error(500, "获取FMEA分析失败"))
        }
    }
}

pub async fn update_fmea_analysis(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateFmeaRequest>,
) -> Json<ApiResponse<FmeaAnalysis>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
    };

    let fmea = sqlx::query_as::<_, FmeaAnalysis>(r#"UPDATE qa_fmea_analyses SET title = COALESCE($2, title), fmea_type = COALESCE($3, fmea_type), scope = COALESCE($4, scope), status = COALESCE($5, status), revision = COALESCE($6, revision), team = COALESCE($7, team), leader = COALESCE($8, leader), description = COALESCE($9, description), updated_at = NOW() WHERE id = $1 RETURNING id, fmea_no, title, fmea_type, product_id::TEXT, product_name, process_id::TEXT, process_name, scope, status, revision, team, leader, description, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.title).bind(req.fmea_type).bind(req.scope).bind(req.status).bind(req.revision).bind(req.team).bind(req.leader).bind(req.description)
    .fetch_one(&state.pool)
    .await;

    match fmea {
        Ok(data) => Json(ApiResponse::success(data, "FMEA分析更新成功")),
        Err(e) => {
            tracing::error!("Failed to update FMEA analysis: {}", e);
            Json(ApiResponse::error(500, "FMEA分析更新失败"))
        }
    }
}

pub async fn delete_fmea_analysis(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_fmea_analyses WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "FMEA分析删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete FMEA analysis: {}", e);
            Json(ApiResponse::error(500, "FMEA分析删除失败"))
        }
    }
}

pub async fn list_fmea_items(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<FmeaItemQuery>,
) -> Json<ApiResponse<Vec<FmeaItem>>> {
    let fmea_id = match query.fmea_id.as_ref() {
        Some(id) => match Uuid::parse_str(id) {
            Ok(u) => Some(u),
            Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
        },
        None => None,
    };

    let items = if let Some(fid) = fmea_id {
        sqlx::query_as::<_, FmeaItem>(r#"SELECT id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date::TEXT, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_fmea_items WHERE fmea_id = $1 ORDER BY rpn DESC"#).bind(fid)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query_as::<_, FmeaItem>(r#"SELECT id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date::TEXT, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_fmea_items ORDER BY rpn DESC LIMIT 100"#)
        .fetch_all(&state.pool)
        .await
    };

    match items {
        Ok(data) => Json(ApiResponse::success(data, "获取FMEA条目列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA items: {}", e);
            Json(ApiResponse::error(500, "获取FMEA条目列表失败"))
        }
    }
}

pub async fn create_fmea_item(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateFmeaItemRequest>,
) -> Json<ApiResponse<FmeaItem>> {
    let fmea_id = match Uuid::parse_str(&req.fmea_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
    };

    let rpn = req.severity * req.occurrence * req.detection;
    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let item = sqlx::query_as::<_, FmeaItem>(r#"INSERT INTO qa_fmea_items (fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date::TEXT, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at::TEXT, updated_at::TEXT"#).bind(fmea_id).bind(req.component).bind(req.function).bind(req.failure_mode).bind(req.failure_effect).bind(req.failure_cause).bind(req.severity).bind(req.occurrence).bind(req.detection).bind(rpn).bind(req.current_controls).bind(req.recommended_actions).bind(req.responsible).bind(target_dt).bind(req.sort_order)
    .fetch_one(&state.pool)
    .await;

    match item {
        Ok(data) => Json(ApiResponse::success(data, "FMEA条目创建成功")),
        Err(e) => {
            tracing::error!("Failed to create FMEA item: {}", e);
            Json(ApiResponse::error(500, "FMEA条目创建失败"))
        }
    }
}

pub async fn get_fmea_item(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<FmeaItem>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA条目ID")),
    };

    let item = sqlx::query_as::<_, FmeaItem>(r#"SELECT id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date::TEXT, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_fmea_items WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match item {
        Ok(data) => Json(ApiResponse::success(data, "获取FMEA条目成功")),
        Err(e) => {
            tracing::error!("Failed to fetch FMEA item: {}", e);
            Json(ApiResponse::error(500, "获取FMEA条目失败"))
        }
    }
}

pub async fn update_fmea_item(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateFmeaItemRequest>,
) -> Json<ApiResponse<FmeaItem>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA条目ID")),
    };

    let revised_rpn = match (
        req.revised_severity,
        req.revised_occurrence,
        req.revised_detection,
    ) {
        (Some(s), Some(o), Some(d)) => Some(s * o * d),
        _ => None,
    };

    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let item = sqlx::query_as::<_, FmeaItem>(r#"UPDATE qa_fmea_items SET component = COALESCE($2, component), function = COALESCE($3, function), failure_mode = COALESCE($4, failure_mode), failure_effect = COALESCE($5, failure_effect), failure_cause = COALESCE($6, failure_cause), severity = COALESCE($7, severity), occurrence = COALESCE($8, occurrence), detection = COALESCE($9, detection), rpn = COALESCE($7, severity) * COALESCE($8, occurrence) * COALESCE($9, detection), current_controls = COALESCE($10, current_controls), recommended_actions = COALESCE($11, recommended_actions), responsible = COALESCE($12, responsible), target_date = COALESCE($13, target_date), action_status = COALESCE($14, action_status), revised_severity = COALESCE($15, revised_severity), revised_occurrence = COALESCE($16, revised_occurrence), revised_detection = COALESCE($17, revised_detection), revised_rpn = COALESCE($18, revised_rpn), sort_order = COALESCE($19, sort_order), updated_at = NOW() WHERE id = $1 RETURNING id, fmea_id, component, function, failure_mode, failure_effect, failure_cause, severity, occurrence, detection, rpn, current_controls, recommended_actions, responsible, target_date::TEXT, action_status, revised_severity, revised_occurrence, revised_detection, revised_rpn, sort_order, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.component).bind(req.function).bind(req.failure_mode).bind(req.failure_effect).bind(req.failure_cause).bind(req.severity).bind(req.occurrence).bind(req.detection).bind(req.current_controls).bind(req.recommended_actions).bind(req.responsible).bind(target_dt).bind(req.action_status).bind(req.revised_severity).bind(req.revised_occurrence).bind(req.revised_detection).bind(revised_rpn).bind(req.sort_order)
    .fetch_one(&state.pool)
    .await;

    match item {
        Ok(data) => Json(ApiResponse::success(data, "FMEA条目更新成功")),
        Err(e) => {
            tracing::error!("Failed to update FMEA item: {}", e);
            Json(ApiResponse::error(500, "FMEA条目更新失败"))
        }
    }
}

pub async fn delete_fmea_item(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA条目ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_fmea_items WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "FMEA条目删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete FMEA item: {}", e);
            Json(ApiResponse::error(500, "FMEA条目删除失败"))
        }
    }
}

pub async fn get_fmea_statistics(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<FmeaStatistics>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的FMEA分析ID")),
    };

    let total: Option<i64> =
        sqlx::query_scalar::<_, _>(r#"SELECT COUNT(*) FROM qa_fmea_items WHERE fmea_id = $1"#)
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_items = total.unwrap_or(0);

    let high_risk: Option<i64> = sqlx::query_scalar::<_, _>(
        r#"SELECT COUNT(*) FROM qa_fmea_items WHERE fmea_id = $1 AND rpn >= 100"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let high_risk_count = high_risk.unwrap_or(0);

    let medium_risk: Option<i64> = sqlx::query_scalar::<_, _>(
        r#"SELECT COUNT(*) FROM qa_fmea_items WHERE fmea_id = $1 AND rpn >= 36 AND rpn < 100"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let medium_risk_count = medium_risk.unwrap_or(0);

    let low_risk: Option<i64> = sqlx::query_scalar::<_, _>(
        r#"SELECT COUNT(*) FROM qa_fmea_items WHERE fmea_id = $1 AND rpn < 36"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let low_risk_count = low_risk.unwrap_or(0);

    let avg_rpn: Option<bigdecimal::BigDecimal> = sqlx::query_scalar::<_, _>(
        r#"SELECT COALESCE(AVG(rpn), 0) FROM qa_fmea_items WHERE fmea_id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let average_rpn: f64 = avg_rpn.and_then(|v| v.to_f64()).unwrap_or(0.0);

    let max_rpn_val: Option<i32> = sqlx::query_scalar::<_, _>(
        r#"SELECT COALESCE(MAX(rpn), 0) FROM qa_fmea_items WHERE fmea_id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let max_rpn = max_rpn_val.unwrap_or(0) as i64;

    let min_rpn_val: Option<i32> = sqlx::query_scalar::<_, _>(
        r#"SELECT COALESCE(MIN(rpn), 0) FROM qa_fmea_items WHERE fmea_id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
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

    Json(ApiResponse::success(stats, "获取FMEA统计成功"))
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/api/qms/fmea", get(list_fmea_analyses))
        .route("/api/qms/fmea", post(create_fmea_analysis))
        .route("/api/qms/fmea/{id}", get(get_fmea_analysis))
        .route("/api/qms/fmea/{id}", put(update_fmea_analysis))
        .route("/api/qms/fmea/{id}", delete(delete_fmea_analysis))
        .route("/api/qms/fmea/{id}/statistics", get(get_fmea_statistics))
        .route("/api/qms/fmea-items", get(list_fmea_items))
        .route("/api/qms/fmea-items", post(create_fmea_item))
        .route("/api/qms/fmea-items/{id}", get(get_fmea_item))
        .route("/api/qms/fmea-items/{id}", put(update_fmea_item))
        .route("/api/qms/fmea-items/{id}", delete(delete_fmea_item))
}
