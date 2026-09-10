//! RD 变更管理：变更请求（CR）/ 变更单（CO）
//!
//! 纯逻辑（可单测）：
//! - `change_request_can_transition`：CR 状态机合法性校验
//! - `assess_change_impact`：变更影响评分（优先级 + 关联文档数 + 关联阶段数）
//!
//! HTTP（挂载于 /api/rd）：
//! - POST/GET /change-requests、GET/PUT/DELETE /change-requests/{id}
//! - POST /change-requests/{id}/transition（状态流转，非法流转 400）
//! - POST /change-requests/{id}/change-orders（仅 Approved 可建变更单）、GET /change-orders

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use topems_shared_core::response::{ApiResponse, PaginatedResponse};

// ==================== 纯逻辑引擎 ====================

/// 变更请求合法状态流转表：
/// submitted → under_review / rejected（可重新提交）
/// under_review → approved / rejected
/// approved → closed（变更单执行完成后关闭）
/// rejected → submitted（修改后重新提交）
pub fn change_request_can_transition(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("submitted", "under_review")
            | ("submitted", "rejected")
            | ("under_review", "approved")
            | ("under_review", "rejected")
            | ("approved", "closed")
            | ("rejected", "submitted")
    )
}

/// 变更优先级权重
pub fn change_priority_weight(priority: &str) -> i32 {
    match priority {
        "critical" => 10,
        "high" => 6,
        "medium" => 3,
        "low" => 1,
        _ => 0,
    }
}

/// 变更影响评分 = 优先级权重 + 关联文档数×1 + 关联阶段数×2
pub fn assess_change_impact(priority: &str, scope_docs: u32, scope_phases: u32) -> i32 {
    change_priority_weight(priority) + scope_docs as i32 + (scope_phases as i32) * 2
}

/// 依据评分给出影响等级：>=10 高 / >=5 中 / 否则低
pub fn impact_level(score: i32) -> &'static str {
    if score >= 10 {
        "high"
    } else if score >= 5 {
        "medium"
    } else {
        "low"
    }
}

// ==================== 数据模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ChangeRequest {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub change_type: String,
    pub priority: String,
    pub status: String,
    pub impact_score: i32,
    pub scope_docs: i32,
    pub scope_phases: i32,
    pub proposed_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateChangeRequest {
    pub project_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub change_type: String,
    pub priority: Option<String>,
    pub scope_docs: Option<i32>,
    pub scope_phases: Option<i32>,
    pub proposed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateChangeRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub change_type: Option<String>,
    pub priority: Option<String>,
    pub scope_docs: Option<i32>,
    pub scope_phases: Option<i32>,
    pub proposed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TransitionRequest {
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ChangeOrder {
    pub id: Uuid,
    pub change_request_id: Uuid,
    pub title: String,
    pub execution_plan: Option<String>,
    pub status: String,
    pub executed_by: Option<String>,
    pub executed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateChangeOrder {
    pub title: String,
    pub execution_plan: Option<String>,
    pub executed_by: Option<String>,
    pub notes: Option<String>,
}

const CHANGE_REQUEST_RETURN: &str = r#"id, tenant_id, project_id, title, description, change_type,
    priority, status, impact_score, scope_docs, scope_phases, proposed_by, created_at, updated_at"#;
const CHANGE_ORDER_RETURN: &str = r#"id, change_request_id, title, execution_plan, status,
    executed_by, executed_at, notes, created_at, updated_at"#;

// ==================== Handlers ====================

pub async fn create_change_request(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateChangeRequest>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let tenant_id = Uuid::nil();
    let now = Utc::now();
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());
    let scope_docs = req.scope_docs.unwrap_or(0).max(0);
    let scope_phases = req.scope_phases.unwrap_or(0).max(0);
    let impact_score = assess_change_impact(&priority, scope_docs as u32, scope_phases as u32);

    let result: Result<ChangeRequest, sqlx::Error> = sqlx::query_as(&format!(
        r#"INSERT INTO rs.change_requests
            (id, tenant_id, project_id, title, description, change_type, priority, status,
             impact_score, scope_docs, scope_phases, proposed_by, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted',$8,$9,$10,$11,$12,$12)
            RETURNING {CHANGE_REQUEST_RETURN}"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(req.project_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.change_type)
    .bind(&priority)
    .bind(impact_score)
    .bind(scope_docs)
    .bind(scope_phases)
    .bind(&req.proposed_by)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(cr) => (
            StatusCode::CREATED,
            Json(ApiResponse::success(cr, "变更请求创建成功")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<ChangeRequest>::error(
                500,
                &format!("创建变更请求失败: {}", e),
            )),
        ),
    }
}

pub async fn list_change_requests(
    State(_state): State<ApiState>,
    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params
        .get("page")
        .and_then(|v| v.as_i64())
        .unwrap_or(1)
        .max(1);
    let page_size = params
        .get("page_size")
        .and_then(|v| v.as_i64())
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let status_filter = params
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let result: Result<Vec<ChangeRequest>, sqlx::Error> = sqlx::query_as(&format!(
        "SELECT {CHANGE_REQUEST_RETURN} FROM rs.change_requests
         WHERE ($1::text IS NULL OR status = $1)
         ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    ))
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    let total: Result<i64, sqlx::Error> =
        sqlx::query_scalar("SELECT COUNT(*) FROM rs.change_requests")
            .fetch_one(&mut **txn)
            .await;

    match (result, total) {
        (Ok(items), Ok(total_count)) => (
            StatusCode::OK,
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total_count, page, page_size),
                "变更请求列表获取成功",
            )),
        ),
        (_, Err(e)) | (Err(e), _) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<PaginatedResponse<ChangeRequest>>::error(
                500,
                &format!("获取变更请求列表失败: {}", e),
            )),
        ),
    }
}

pub async fn get_change_request(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result: Result<Option<ChangeRequest>, sqlx::Error> = sqlx::query_as(&format!(
        "SELECT {CHANGE_REQUEST_RETURN} FROM rs.change_requests WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(cr)) => (
            StatusCode::OK,
            Json(ApiResponse::success(cr, "变更请求获取成功")),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<ChangeRequest>::error(404, "变更请求不存在")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<ChangeRequest>::error(
                500,
                &format!("获取变更请求失败: {}", e),
            )),
        ),
    }
}

pub async fn update_change_request(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateChangeRequest>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();
    let result: Result<Option<ChangeRequest>, sqlx::Error> = sqlx::query_as(&format!(
        r#"UPDATE rs.change_requests SET
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           change_type = COALESCE($4, change_type),
           priority = COALESCE($5, priority),
           scope_docs = COALESCE($6, scope_docs),
           scope_phases = COALESCE($7, scope_phases),
           proposed_by = COALESCE($8, proposed_by),
           impact_score = (
             CASE COALESCE($5, priority)
               WHEN 'critical' THEN 10 WHEN 'high' THEN 6
               WHEN 'medium' THEN 3 WHEN 'low' THEN 1 ELSE 0 END
             + COALESCE($6, scope_docs) + 2 * COALESCE($7, scope_phases)
           ),
           updated_at = $9
           WHERE id = $1
           RETURNING {CHANGE_REQUEST_RETURN}"#
    ))
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.change_type)
    .bind(&req.priority)
    .bind(req.scope_docs)
    .bind(req.scope_phases)
    .bind(&req.proposed_by)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(cr)) => (
            StatusCode::OK,
            Json(ApiResponse::success(cr, "变更请求更新成功")),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<ChangeRequest>::error(404, "变更请求不存在")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<ChangeRequest>::error(
                500,
                &format!("更新变更请求失败: {}", e),
            )),
        ),
    }
}

pub async fn delete_change_request(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match sqlx::query("DELETE FROM rs.change_requests WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => (
            StatusCode::OK,
            Json(ApiResponse::success(
                serde_json::json!({"deleted": true}),
                "变更请求已删除",
            )),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<serde_json::Value>::error(
                404,
                "变更请求不存在",
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                &format!("删除变更请求失败: {}", e),
            )),
        ),
    }
}

pub async fn transition_change_request(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<TransitionRequest>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let current: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM rs.change_requests WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut **txn)
            .await;

    let current = match current {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<ChangeRequest>::error(404, "变更请求不存在")),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<ChangeRequest>::error(
                    500,
                    &format!("查询变更请求失败: {}", e),
                )),
            )
        }
    };

    if !change_request_can_transition(&current, &req.to) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<ChangeRequest>::error(
                400,
                &format!("非法状态流转: {current} -> {}", req.to),
            )),
        );
    }

    let now = Utc::now();
    let result: Result<Option<ChangeRequest>, sqlx::Error> = sqlx::query_as(&format!(
        "UPDATE rs.change_requests SET status = $2, updated_at = $3 WHERE id = $1
         RETURNING {CHANGE_REQUEST_RETURN}"
    ))
    .bind(id)
    .bind(&req.to)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(cr)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::error(500, "提交事务失败")),
                    );
                }
            }
            (
                StatusCode::OK,
                Json(ApiResponse::success(cr, "状态流转成功")),
            )
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<ChangeRequest>::error(404, "变更请求不存在")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<ChangeRequest>::error(
                500,
                &format!("状态流转失败: {}", e),
            )),
        ),
    }
}

pub async fn create_change_order(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateChangeOrder>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // 仅 Approved 状态可创建变更单
    let status: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM rs.change_requests WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut **txn)
            .await;

    let approved = match status {
        Ok(Some(s)) => s == "approved",
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<ChangeOrder>::error(404, "变更请求不存在")),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<ChangeOrder>::error(
                    500,
                    &format!("查询变更请求失败: {}", e),
                )),
            )
        }
    };
    if !approved {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<ChangeOrder>::error(
                400,
                "仅已批准的变更请求可创建变更单",
            )),
        );
    }

    let co_id = Uuid::new_v4();
    let now = Utc::now();
    let result: Result<ChangeOrder, sqlx::Error> = sqlx::query_as(&format!(
        r#"INSERT INTO rs.change_orders
        (id, change_request_id, title, execution_plan, status, executed_by, notes, created_at, updated_at)
        VALUES ($1,$2,$3,$4,'planned',$5,$6,$7,$7)
        RETURNING {CHANGE_ORDER_RETURN}"#
    ))
    .bind(co_id)
    .bind(id)
    .bind(&req.title)
    .bind(&req.execution_plan)
    .bind(&req.executed_by)
    .bind(&req.notes)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(co) => (
            StatusCode::CREATED,
            Json(ApiResponse::success(co, "变更单创建成功")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<ChangeOrder>::error(
                500,
                &format!("创建变更单失败: {}", e),
            )),
        ),
    }
}

pub async fn list_change_orders(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result: Result<Vec<ChangeOrder>, sqlx::Error> = sqlx::query_as(&format!(
        "SELECT {CHANGE_ORDER_RETURN} FROM rs.change_orders ORDER BY created_at DESC"
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => (
            StatusCode::OK,
            Json(ApiResponse::success(items, "变更单列表获取成功")),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<Vec<ChangeOrder>>::error(
                500,
                &format!("获取变更单列表失败: {}", e),
            )),
        ),
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/change-requests",
            get(list_change_requests).post(create_change_request),
        )
        .route(
            "/change-requests/{id}",
            get(get_change_request)
                .put(update_change_request)
                .delete(delete_change_request),
        )
        .route(
            "/change-requests/{id}/transition",
            post(transition_change_request),
        )
        .route(
            "/change-requests/{id}/change-orders",
            post(create_change_order),
        )
        .route("/change-orders", get(list_change_orders))
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transition_valid_paths() {
        assert!(change_request_can_transition("submitted", "under_review"));
        assert!(change_request_can_transition("submitted", "rejected"));
        assert!(change_request_can_transition("under_review", "approved"));
        assert!(change_request_can_transition("under_review", "rejected"));
        assert!(change_request_can_transition("approved", "closed"));
        assert!(change_request_can_transition("rejected", "submitted"));
    }

    #[test]
    fn transition_invalid_paths() {
        assert!(!change_request_can_transition("submitted", "approved"));
        assert!(!change_request_can_transition("submitted", "closed"));
        assert!(!change_request_can_transition("approved", "under_review"));
        assert!(!change_request_can_transition("closed", "submitted"));
        assert!(!change_request_can_transition("approved", "rejected"));
        assert!(!change_request_can_transition("rejected", "approved"));
    }

    #[test]
    fn impact_priority_weights() {
        assert_eq!(change_priority_weight("critical"), 10);
        assert_eq!(change_priority_weight("high"), 6);
        assert_eq!(change_priority_weight("medium"), 3);
        assert_eq!(change_priority_weight("low"), 1);
        assert_eq!(change_priority_weight("unknown"), 0);
    }

    #[test]
    fn impact_score_scales_with_scope() {
        let base = assess_change_impact("medium", 0, 0);
        assert_eq!(base, 3);
        let with_docs = assess_change_impact("medium", 2, 0);
        assert_eq!(with_docs, 5);
        let with_phases = assess_change_impact("medium", 0, 2);
        assert_eq!(with_phases, 7);
    }

    #[test]
    fn impact_score_critical_high() {
        let score = assess_change_impact("critical", 3, 2);
        assert_eq!(score, 17);
        assert_eq!(impact_level(score), "high");
    }

    #[test]
    fn impact_level_thresholds() {
        assert_eq!(impact_level(10), "high");
        assert_eq!(impact_level(9), "medium");
        assert_eq!(impact_level(5), "medium");
        assert_eq!(impact_level(4), "low");
    }

    #[test]
    fn impact_zero_scope_low() {
        let score = assess_change_impact("low", 0, 0);
        assert_eq!(score, 1);
        assert_eq!(impact_level(score), "low");
    }
}
