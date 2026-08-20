#![allow(dead_code)]

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use topems_shared::{ApiResponse, AuthState};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi, WorkflowTask};

#[derive(Debug, Deserialize)]
pub struct ApprovalListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub approval_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DelegateRequest {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub reason: Option<String>,
}

fn map_task(t: &WorkflowTask) -> serde_json::Value {
    json!({
        "id": t.id,
        "title": t.instance_title,
        "description": t.comment,
        "type": t.workflow_name,
        "status": t.status,
        "priority": t.priority,
        "assigneeId": t.assignee_id,
        "createdAt": t.created_at,
        "updatedAt": t.created_at,
        "dueDate": t.due_time,
        "completedAt": t.completed_at,
    })
}

fn unauthorized() -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(ApiResponse::error(401, "未授权")),
    )
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

pub async fn list_approval_tasks(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Query(params): Query<ApprovalListParams>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.get_my_pending_tasks(page, page_size).await {
        Ok(result) => {
            let items: Vec<serde_json::Value> = result.items.iter().map(map_task).collect();
            let body = json!({ "items": items, "total": result.total });
            (
                StatusCode::OK,
                Json(ApiResponse::success(body, "获取审批任务列表成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Workflow服务获取审批任务列表失败: {}", e);
            internal_error("获取审批任务列表失败")
        }
    }
}

pub async fn get_pending_approval_tasks(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.get_my_pending_tasks(1, 100).await {
        Ok(result) => {
            let items: Vec<serde_json::Value> = result.items.iter().map(map_task).collect();
            (
                StatusCode::OK,
                Json(ApiResponse::success(json!(items), "获取待审批任务成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Workflow服务获取待审批任务失败: {}", e);
            internal_error("获取待审批任务失败")
        }
    }
}

pub async fn get_approval_task(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.get_task(id).await {
        Ok(task) => (
            StatusCode::OK,
            Json(ApiResponse::success(
                map_task(&task),
                "获取审批任务详情成功",
            )),
        ),
        Err(e) => {
            tracing::error!("调用Workflow服务获取审批任务详情失败: {}", e);
            internal_error("获取审批任务详情失败")
        }
    }
}

pub async fn approve_approval_task(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    body: Option<Json<ApprovalActionRequest>>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let comment =
        body.and_then(|Json(b)| b.comment)
            .and_then(|c| if c.is_empty() { None } else { Some(c) });

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.approve_task(id, comment.as_deref()).await {
        Ok(true) => {
            let task = client.get_task(id).await.ok();
            let data = task
                .as_ref()
                .map(map_task)
                .unwrap_or_else(|| json!({ "id": id, "status": "approved" }));
            (
                StatusCode::OK,
                Json(ApiResponse::success(data, "审批通过成功")),
            )
        }
        Ok(false) => internal_error("审批通过操作未成功"),
        Err(e) => {
            tracing::error!("调用Workflow服务审批通过失败: {}", e);
            internal_error("审批通过失败")
        }
    }
}

pub async fn reject_approval_task(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    body: Option<Json<ApprovalActionRequest>>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let comment =
        body.and_then(|Json(b)| b.comment)
            .and_then(|c| if c.is_empty() { None } else { Some(c) });

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.reject_task(id, comment.as_deref()).await {
        Ok(true) => {
            let task = client.get_task(id).await.ok();
            let data = task
                .as_ref()
                .map(map_task)
                .unwrap_or_else(|| json!({ "id": id, "status": "rejected" }));
            (
                StatusCode::OK,
                Json(ApiResponse::success(data, "审批驳回成功")),
            )
        }
        Ok(false) => internal_error("审批驳回操作未成功"),
        Err(e) => {
            tracing::error!("调用Workflow服务审批驳回失败: {}", e);
            internal_error("审批驳回失败")
        }
    }
}

pub async fn delegate_approval_task(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<DelegateRequest>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let attorney_id = match Uuid::parse_str(&payload.user_id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let reason = payload
        .reason
        .and_then(|r| if r.is_empty() { None } else { Some(r) });

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client
        .delegate_task(id, attorney_id, reason.as_deref())
        .await
    {
        Ok(true) => {
            let task = client.get_task(id).await.ok();
            let data = task
                .as_ref()
                .map(map_task)
                .unwrap_or_else(|| json!({ "id": id, "status": "delegated" }));
            (
                StatusCode::OK,
                Json(ApiResponse::success(data, "审批委派成功")),
            )
        }
        Ok(false) => internal_error("审批委派操作未成功"),
        Err(e) => {
            tracing::error!("调用Workflow服务审批委派失败: {}", e);
            internal_error("审批委派失败")
        }
    }
}

pub async fn get_approval_history(
    State(auth_state): State<AuthState>,
    State(workflow_client): State<TypedServiceClient<WorkflowApi>>,
    headers: HeaderMap,
    Query(params): Query<ApprovalListParams>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);

    let bearer = extract_bearer_token(&headers);
    let mut client = workflow_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.get_my_completed_tasks(page, page_size).await {
        Ok(result) => {
            let items: Vec<serde_json::Value> = result.items.iter().map(map_task).collect();
            let body = json!({ "items": items, "total": result.total });
            (
                StatusCode::OK,
                Json(ApiResponse::success(body, "获取审批历史成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Workflow服务获取审批历史失败: {}", e);
            internal_error("获取审批历史失败")
        }
    }
}
