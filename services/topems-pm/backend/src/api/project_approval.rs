use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json,
    Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::project_approval::{ApprovalRequest, ProjectApproval};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/approval", get(get_approval).post(submit_approval))
        .route("/api/v1/projects/{project_id}/approval/action", post(handle_approval_action))
        .with_state(pool)
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/:project_id/approval",
    tag = "project_approval",
    responses(
        (status = 200, description = "获取项目审批信息成功", body = ApiResponse<ProjectApproval>),
        (status = 404, description = "项目审批信息不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_approval(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<ProjectApproval>> {
    let result = sqlx::query_as::<_, ProjectApproval>(
        "SELECT * FROM pm.project_approvals WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(project_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(approval)) => Json(ApiResponse::success(approval, "获取项目审批信息成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目审批信息不存在")),
        Err(e) => {
            tracing::error!("获取项目审批信息失败: {}", e);
            Json(ApiResponse::error(500, "获取项目审批信息失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/projects/:project_id/approval",
    tag = "project_approval",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "提交审批成功", body = ApiResponse<ProjectApproval>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn submit_approval(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<ProjectApproval>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let approval_steps = serde_json::json!({
        "steps": [
            {"step": 1, "role": "project_manager", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
            {"step": 2, "role": "department_head", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
            {"step": 3, "role": "finance", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
        ],
        "history": []
    });

    let result = sqlx::query_as::<_, ProjectApproval>(
        r#"
        INSERT INTO pm.project_approvals (
            id, project_id, status, current_step, total_steps,
            approvals, comments, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(project_id)
    .bind("pending")
    .bind(1)
    .bind(3)
    .bind(approval_steps)
    .bind(req.comment)
    .bind(&req.approver_id)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(approval) => {
            let _ = update_project_status(&pool, project_id, "pending_approval").await;
            Json(ApiResponse::success(approval, "提交审批成功"))
        }
        Err(e) => {
            tracing::error!("提交审批失败: {}", e);
            Json(ApiResponse::error(500, "提交审批失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/projects/:project_id/approval/action",
    tag = "project_approval",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "审批操作成功", body = ApiResponse<ProjectApproval>),
        (status = 400, description = "无效的审批操作"),
        (status = 404, description = "项目审批信息不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn handle_approval_action(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<ProjectApproval>> {
    let action = req.action.to_lowercase();
    if !["approve", "reject", "cancel"].contains(&action.as_str()) {
        return Json(ApiResponse::error(400, "无效的审批操作"));
    }

    let result = sqlx::query_as::<_, ProjectApproval>(
        "SELECT * FROM pm.project_approvals WHERE project_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE"
    )
    .bind(project_id)
    .fetch_optional(&pool)
    .await;

    let mut approval = match result {
        Ok(Some(a)) => a,
        Ok(None) => return Json(ApiResponse::error(404, "项目审批信息不存在")),
        Err(e) => {
            tracing::error!("获取审批信息失败: {}", e);
            return Json(ApiResponse::error(500, "获取审批信息失败"));
        }
    };

    let now = Utc::now();
    let mut approvals: serde_json::Value = approval.approvals.clone();
    
    if action == "reject" || action == "cancel" {
        let new_history = serde_json::json!({
            "step": approval.current_step,
            "action": action,
            "approver_id": req.approver_id,
            "comment": req.comment,
            "timestamp": now.to_rfc3339()
        });

        if let Some(history) = approvals.get_mut("history") {
            if let Some(history_array) = history.as_array_mut() {
                history_array.push(new_history);
            }
        }

        let update_result = sqlx::query_as::<_, ProjectApproval>(
            r#"
            UPDATE pm.project_approvals
            SET status = $1, approvals = $2, comments = $3, updated_at = $4
            WHERE id = $5
            RETURNING *
            "#,
        )
        .bind(if action == "reject" { "rejected" } else { "cancelled" })
        .bind(&approvals)
        .bind(req.comment)
        .bind(now)
        .bind(approval.id)
        .fetch_one(&pool)
        .await;

        match update_result {
            Ok(updated) => {
                let status = if action == "reject" { "rejected" } else { "draft" };
                let _ = update_project_status(&pool, project_id, status).await;
                Json(ApiResponse::success(updated, if action == "reject" { "审批已拒绝" } else { "审批已取消" }))
            }
            Err(e) => {
                tracing::error!("更新审批状态失败: {}", e);
                Json(ApiResponse::error(500, "更新审批状态失败"))
            }
        }
    } else {
        let current_step_index = (approval.current_step - 1) as usize;
        
        if let Some(steps) = approvals.get_mut("steps") {
            if let Some(steps_array) = steps.as_array_mut() {
                if current_step_index < steps_array.len() {
                    if let Some(step) = steps_array[current_step_index].as_object_mut() {
                        step.insert("approver_id".to_string(), serde_json::json!(req.approver_id));
                        step.insert("approved".to_string(), serde_json::json!(true));
                        step.insert("comment".to_string(), serde_json::json!(req.comment));
                        step.insert("approved_at".to_string(), serde_json::json!(now.to_rfc3339()));
                    }
                }
            }
        }

        let new_history = serde_json::json!({
            "step": approval.current_step,
            "action": "approve",
            "approver_id": req.approver_id,
            "comment": req.comment,
            "timestamp": now.to_rfc3339()
        });

        if let Some(history) = approvals.get_mut("history") {
            if let Some(history_array) = history.as_array_mut() {
                history_array.push(new_history);
            }
        }

        let is_final_step = approval.current_step >= approval.total_steps;
        let new_status = if is_final_step { "approved" } else { "pending" };
        let new_step = if is_final_step { approval.current_step } else { approval.current_step + 1 };

        let update_result = sqlx::query_as::<_, ProjectApproval>(
            r#"
            UPDATE pm.project_approvals
            SET status = $1, current_step = $2, approvals = $3, comments = $4, updated_at = $5
            WHERE id = $6
            RETURNING *
            "#,
        )
        .bind(new_status)
        .bind(new_step)
        .bind(&approvals)
        .bind(req.comment)
        .bind(now)
        .bind(approval.id)
        .fetch_one(&pool)
        .await;

        match update_result {
            Ok(updated) => {
                if is_final_step {
                    let _ = update_project_status(&pool, project_id, "approved").await;
                    Json(ApiResponse::success(updated, "审批已通过"))
                } else {
                    Json(ApiResponse::success(updated, "审批步骤已通过，等待下一步"))
                }
            }
            Err(e) => {
                tracing::error!("更新审批状态失败: {}", e);
                Json(ApiResponse::error(500, "更新审批状态失败"))
            }
        }
    }
}

async fn update_project_status(pool: &PgPool, project_id: Uuid, status: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE pm.projects SET status = $1, updated_at = $2 WHERE id = $3")
        .bind(status)
        .bind(Utc::now())
        .bind(project_id)
        .execute(pool)
        .await?;
    Ok(())
}
