use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use topems_shared_service_client::service_client::api::workflow_api::{
    CreateInstanceRequest, WorkflowApi, WorkflowInstance,
};
use topems_shared_service_client::TypedServiceClient;
use uuid::Uuid;

use crate::models::project_approval::{ApprovalRequest, ProjectApproval};

/// 项目审批状态：组合数据库连接池与 Flow 工作流客户端
#[derive(Clone)]
pub struct ApprovalState {
    pub pool: PgPool,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
}

pub fn create_routes(pool: PgPool, workflow_client: TypedServiceClient<WorkflowApi>) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/approval",
            get(get_approval).post(submit_approval),
        )
        .route(
            "/projects/{project_id}/approval/action",
            post(handle_approval_action),
        )
        .with_state(ApprovalState {
            pool,
            workflow_client,
        })
}

/// 从环境变量读取项目审批关联的 Flow 工作流定义 ID
fn get_approval_workflow_id() -> Option<Uuid> {
    std::env::var("PM_APPROVAL_WORKFLOW_ID")
        .ok()
        .and_then(|s| Uuid::parse_str(&s).ok())
}

#[utoipa::path(
    get,
    path = "/projects/{project_id}/approval",
    tag = "project_approval",
    responses(
        (status = 200, description = "获取项目审批信息成功", body = ApiResponse<ProjectApproval>),
        (status = 404, description = "项目审批信息不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_approval(
    State(state): State<ApprovalState>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<ProjectApproval>> {
    let result = sqlx::query_as::<_, ProjectApproval>(
        "SELECT * FROM pm.project_approvals WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(project_id)
    .fetch_optional(&state.pool)
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
    path = "/projects/{project_id}/approval",
    tag = "project_approval",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "提交审批成功", body = ApiResponse<ProjectApproval>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn submit_approval(
    State(state): State<ApprovalState>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<ProjectApproval>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 委托 Flow 引擎创建工作流实例（审批流程编排统一到 Flow）
    let mut workflow_instance_id: Option<Uuid> = None;
    if let Some(workflow_id) = get_approval_workflow_id() {
        let request = CreateInstanceRequest {
            workflow_id,
            title: format!("项目审批: {}", project_id),
            variables: Some(serde_json::json!({
                "project_id": project_id.to_string(),
                "approver_id": req.approver_id,
                "comment": req.comment,
            })),
        };

        match state.workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!(
                    "Flow 工作流实例创建成功, instance_id={}, project_id={}",
                    instance.id,
                    project_id
                );
                workflow_instance_id = Some(instance.id);
            }
            Err(e) => {
                tracing::warn!(
                    "Flow 工作流实例创建失败，回退到本地审批流程: project_id={}, error={}",
                    project_id,
                    e
                );
            }
        }
    } else {
        tracing::debug!(
            "未配置 PM_APPROVAL_WORKFLOW_ID，使用本地审批流程: project_id={}",
            project_id
        );
    }

    // 本地审批记录（保留业务数据跟踪）
    let approval_steps = serde_json::json!({
        "steps": [
            {"step": 1, "role": "project_manager", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
            {"step": 2, "role": "department_head", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
            {"step": 3, "role": "finance", "approver_id": null, "approved": false, "comment": null, "approved_at": null},
        ],
        "history": [],
        "workflow_instance_id": workflow_instance_id,
    });

    let result = sqlx::query_as::<_, ProjectApproval>(
        r#"
        INSERT INTO plugin_pm.project_approvals (
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
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(approval) => {
            // 业务逻辑：更新项目状态为待审批
            let _ = update_project_status(&state.pool, project_id, "pending_approval").await;
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
    path = "/projects/{project_id}/approval/action",
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
    State(state): State<ApprovalState>,
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
    .fetch_optional(&state.pool)
    .await;

    let approval = match result {
        Ok(Some(a)) => a,
        Ok(None) => return Json(ApiResponse::error(404, "项目审批信息不存在")),
        Err(e) => {
            tracing::error!("获取审批信息失败: {}", e);
            return Json(ApiResponse::error(500, "获取审批信息失败"));
        }
    };

    let now = Utc::now();
    let mut approvals: serde_json::Value = approval.approvals.clone();

    // 委托 Flow 引擎执行审批操作（审批流程编排统一到 Flow）
    let workflow_instance_id = approvals
        .get("workflow_instance_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    if let Some(instance_id) = workflow_instance_id {
        let flow_result = if action == "approve" {
            state
                .workflow_client
                .approve_instance(instance_id, req.comment.clone())
                .await
                .map(|inst| {
                    tracing::info!(
                        "Flow 审批操作完成, action=approve, instance_id={}, status={}",
                        instance_id,
                        inst.status
                    );
                })
        } else if action == "reject" {
            state
                .workflow_client
                .reject_instance(instance_id, req.comment.clone())
                .await
                .map(|inst| {
                    tracing::info!(
                        "Flow 审批操作完成, action=reject, instance_id={}, status={}",
                        instance_id,
                        inst.status
                    );
                })
        } else {
            // cancel: Flow 无直接取消接口，跳过
            Ok(())
        };

        if let Err(e) = &flow_result {
            tracing::warn!(
                "Flow 审批操作失败，回退到本地审批处理: action={}, instance_id={}, error={}",
                action,
                instance_id,
                e
            );
        }
    } else {
        tracing::debug!(
            "无关联 Flow 工作流实例，使用本地审批处理: project_id={}, action={}",
            project_id,
            action
        );
    }

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
            UPDATE plugin_pm.project_approvals
            SET status = $1, approvals = $2, comments = $3, updated_at = $4
            WHERE id = $5
            RETURNING *
            "#,
        )
        .bind(if action == "reject" {
            "rejected"
        } else {
            "cancelled"
        })
        .bind(&approvals)
        .bind(req.comment)
        .bind(now)
        .bind(approval.id)
        .fetch_one(&state.pool)
        .await;

        match update_result {
            Ok(updated) => {
                // 业务逻辑：更新项目状态
                let status = if action == "reject" {
                    "rejected"
                } else {
                    "draft"
                };
                let _ = update_project_status(&state.pool, project_id, status).await;
                Json(ApiResponse::success(
                    updated,
                    if action == "reject" {
                        "审批已拒绝"
                    } else {
                        "审批已取消"
                    },
                ))
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
                        step.insert(
                            "approver_id".to_string(),
                            serde_json::json!(req.approver_id),
                        );
                        step.insert("approved".to_string(), serde_json::json!(true));
                        step.insert("comment".to_string(), serde_json::json!(req.comment));
                        step.insert(
                            "approved_at".to_string(),
                            serde_json::json!(now.to_rfc3339()),
                        );
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
        let new_step = if is_final_step {
            approval.current_step
        } else {
            approval.current_step + 1
        };

        let update_result = sqlx::query_as::<_, ProjectApproval>(
            r#"
            UPDATE plugin_pm.project_approvals
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
        .fetch_one(&state.pool)
        .await;

        match update_result {
            Ok(updated) => {
                if is_final_step {
                    // 业务逻辑：审批通过，更新项目状态
                    let _ = update_project_status(&state.pool, project_id, "approved").await;
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

async fn update_project_status(
    pool: &PgPool,
    project_id: Uuid,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE plugin_pm.projects SET status = $1, updated_at = $2 WHERE id = $3")
        .bind(status)
        .bind(Utc::now())
        .bind(project_id)
        .execute(pool)
        .await?;
    Ok(())
}
