use axum::{
    extract::{Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::MobileApproval;
use topems_shared::{ApiResponse, AuthState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalListResponse {
    pub items: Vec<MobileApproval>,
    pub total: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub rejected_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalActionRequest {
    pub action: String,
    pub comment: Option<String>,
    pub target_user_id: Option<String>,
    pub target_user_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalActionResponse {
    pub approval_id: Uuid,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalHistoryResponse {
    pub items: Vec<MobileApproval>,
    pub total: i64,
}

pub async fn get_pending_approvals(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<ApprovalListQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    let approvals = match db_get_mobile_approvals(&pool, user_id, Some("pending")).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("获取待审批列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取待审批列表失败")),
            );
        }
    };

    let total = approvals.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(approvals.len());
    let items = approvals[start..end].to_vec();

    let pending_count = total;
    let approved_count = get_approval_count(&pool, user_id, "approved").await;
    let rejected_count = get_approval_count(&pool, user_id, "rejected").await;

    let response = ApprovalListResponse {
        items,
        total,
        pending_count,
        approved_count,
        rejected_count,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取待审批列表成功")),
    )
}

async fn get_approval_count(pool: &PgPool, user_id: Uuid, status: &str) -> i64 {
    match sqlx::query_scalar(
        "SELECT COUNT(*) FROM mobile_approvals WHERE assignee_id = $1 AND status = $2",
    )
    .bind(user_id)
    .bind(status)
    .fetch_one(pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalListQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
}

pub async fn get_approved_approvals(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<ApprovalListQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    let approvals = match db_get_mobile_approvals(&pool, user_id, Some("approved")).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("获取已审批列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取已审批列表失败")),
            );
        }
    };

    let total = approvals.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(approvals.len());
    let items = approvals[start..end].to_vec();

    let response = ApprovalHistoryResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取已审批列表成功")),
    )
}

pub async fn get_rejected_approvals(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<ApprovalListQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    let approvals = match db_get_mobile_approvals(&pool, user_id, Some("rejected")).await {
        Ok(a) => a,
        Err(e) => {
            tracing::error!("获取已拒绝列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取已拒绝列表失败")),
            );
        }
    };

    let total = approvals.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(approvals.len());
    let items = approvals[start..end].to_vec();

    let response = ApprovalHistoryResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取已拒绝列表成功")),
    )
}

pub async fn approve_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalActionRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let approval =
        match db_update_mobile_approval(&pool, id, "approve", payload.comment.as_deref()).await {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("审批操作失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "审批操作失败")),
                );
            }
        };

    if let Some(approval) = approval {
        let response = ApprovalActionResponse {
            approval_id: approval.id,
            status: approval.status,
            message: "审批通过".to_string(),
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(response, "审批通过")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "审批任务不存在")),
        )
    }
}

pub async fn reject_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalActionRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let approval =
        match db_update_mobile_approval(&pool, id, "reject", payload.comment.as_deref()).await {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("拒绝操作失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "拒绝操作失败")),
                );
            }
        };

    if let Some(approval) = approval {
        let response = ApprovalActionResponse {
            approval_id: approval.id,
            status: approval.status,
            message: "已拒绝".to_string(),
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(response, "已拒绝")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "审批任务不存在")),
        )
    }
}

pub async fn transfer_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalActionRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    if payload.target_user_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(400, "请指定转签用户")),
        );
    }

    let approval =
        match db_update_mobile_approval(&pool, id, "transfer", payload.comment.as_deref()).await {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("转签操作失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "转签操作失败")),
                );
            }
        };

    if let Some(approval) = approval {
        let response = ApprovalActionResponse {
            approval_id: approval.id,
            status: approval.status,
            message: format!("已转签给 {}", payload.target_user_name.unwrap_or_default()),
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(response, "转签成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "审批任务不存在")),
        )
    }
}

pub async fn get_approval_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query("SELECT * FROM mobile_approvals WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询审批详情失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询审批详情失败")),
            );
        }
    };

    if let Some(row) = row {
        let approval = match MobileApproval::from_row(&row) {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("解析审批详情失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "解析审批详情失败")),
                );
            }
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(approval, "获取审批详情成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "审批任务不存在")),
        )
    }
}

pub async fn get_approval_stats(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let pending_count = get_approval_count(&pool, user_id, "pending").await;
    let approved_count = get_approval_count(&pool, user_id, "approved").await;
    let rejected_count = get_approval_count(&pool, user_id, "rejected").await;
    let transferred_count = get_approval_count(&pool, user_id, "transferred").await;

    let stats = serde_json::json!({
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "transferred_count": transferred_count,
        "total_count": pending_count + approved_count + rejected_count + transferred_count,
    });

    (
        StatusCode::OK,
        Json(ApiResponse::success(stats, "获取审批统计成功")),
    )
}
