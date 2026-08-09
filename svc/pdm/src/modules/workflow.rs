use axum::{
    extract::Path,
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/workflows", get(list_workflows).post(create_workflow))
        .route(
            "/workflows/{id}",
            get(get_workflow)
                .put(update_workflow)
                .delete(delete_workflow),
        )
        .route("/workflows/start", post(start_workflow))
        .route("/workflow-instances", get(list_workflow_instances))
        .route("/workflow-instances/{id}", get(get_workflow_instance))
        .route("/workflow-instances/{id}/advance", post(advance_workflow))
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WorkflowDefinition {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub workflow_type: String,
    pub steps: serde_json::Value,
    pub conditions: serde_json::Value,
    pub status: String,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub current_step: String,
    pub status: String,
    pub assignees: serde_json::Value,
    pub history: serde_json::Value,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub workflow_type: String,
    pub steps: Vec<WorkflowStep>,
    pub conditions: Option<serde_json::Value>,
    pub created_by: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct WorkflowStep {
    pub step_name: String,
    pub step_type: String,
    pub assignee_type: String,
    pub assignees: Vec<String>,
    pub required_approval: Option<i32>,
    pub timeout_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct StartWorkflowRequest {
    pub workflow_id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub created_by: String,
}

#[utoipa::path(
    get,
    path = "/api/pdm/workflows",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_workflows(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, WorkflowDefinition>(
        r#"
        SELECT id, tenant_id, name, description, workflow_type, steps, conditions,
               status, created_by, created_at, updated_at
        FROM pdm_workflows
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(workflows) => Json(ApiResponse::success(
            serde_json::json!({
                "workflows": workflows,
                "total": workflows.len()
            }),
            "获取工作流列表成功",
        )),
        Err(e) => {
            tracing::error!("获取工作流列表失败: {}", e);
            Json(ApiResponse::error(500, "获取工作流列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/workflows",
    request_body = CreateWorkflowRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<WorkflowDefinition>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "工作流名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let steps_value = match serde_json::to_value(req.steps) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("序列化工作流步骤失败: {}", e);
            return Json(ApiResponse::error(500, "工作流步骤数据格式错误"));
        }
    };

    let result = sqlx::query_as::<_, WorkflowDefinition>(
        r#"
        INSERT INTO pdm_workflows (
            id, tenant_id, name, description, workflow_type, steps, conditions,
            status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, name, description, workflow_type, steps, conditions,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.workflow_type)
    .bind(steps_value)
    .bind(req.conditions.unwrap_or(serde_json::json!({})))
    .bind("active")
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(workflow) => Json(ApiResponse::success(workflow, "工作流创建成功")),
        Err(e) => {
            tracing::error!("创建工作流失败: {}", e);
            Json(ApiResponse::error(500, "创建工作流失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/workflows/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<WorkflowDefinition>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, WorkflowDefinition>(
        r#"
        SELECT id, tenant_id, name, description, workflow_type, steps, conditions,
               status, created_by, created_at, updated_at
        FROM pdm_workflows WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(workflow)) => Json(ApiResponse::success(workflow, "获取工作流成功")),
        Ok(None) => Json(ApiResponse::error(404, "工作流不存在")),
        Err(e) => {
            tracing::error!("获取工作流失败: {}", e);
            Json(ApiResponse::error(500, "获取工作流失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pdm/workflows/{id}",
    request_body = serde_json::Value,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<WorkflowDefinition>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let name = req.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let description = req.get("description").and_then(|v| v.as_str());
    let status = req.get("status").and_then(|v| v.as_str()).unwrap_or("");
    let now = Utc::now();

    let result = sqlx::query_as::<_, WorkflowDefinition>(
        r#"
        UPDATE pdm_workflows SET
            name = COALESCE(NULLIF($2, ''), name),
            description = COALESCE($3, description),
            status = COALESCE(NULLIF($4, ''), status),
            updated_at = $5
        WHERE id = $1 AND tenant_id = $6
        RETURNING id, tenant_id, name, description, workflow_type, steps, conditions,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(description)
    .bind(status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(workflow)) => Json(ApiResponse::success(workflow, "工作流更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "工作流不存在")),
        Err(e) => {
            tracing::error!("更新工作流失败: {}", e);
            Json(ApiResponse::error(500, "更新工作流失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pdm/workflows/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE pdm_workflows SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "工作流删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "工作流不存在")),
        Err(e) => {
            tracing::error!("删除工作流失败: {}", e);
            Json(ApiResponse::error(500, "删除工作流失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/workflows/start",
    request_body = StartWorkflowRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn start_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartWorkflowRequest>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let workflow_result = sqlx::query_as::<_, WorkflowDefinition>(
        "SELECT id, tenant_id, name, steps FROM pdm_workflows WHERE deleted_at IS NULL AND id = $1 AND status = 'active' AND tenant_id = $2",
    )
    .bind(req.workflow_id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let workflow = match workflow_result {
        Ok(Some(w)) => w,
        Ok(None) => return Json(ApiResponse::error(404, "工作流不存在或未激活")),
        Err(e) => {
            tracing::error!("查询工作流失败: {}", e);
            return Json(ApiResponse::error(500, "查询工作流失败"));
        }
    };

    let steps: Vec<WorkflowStep> = serde_json::from_value(workflow.steps).unwrap_or_default();
    let first_step = steps.first();
    let current_step = first_step
        .map(|s| s.step_name.clone())
        .unwrap_or("start".to_string());
    let assignees = first_step
        .map(|s| {
            serde_json::to_value(s.assignees.clone()).unwrap_or_else(|_| serde_json::Value::Null)
        })
        .unwrap_or(serde_json::json!([]));

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, WorkflowInstance>(
        r#"
        INSERT INTO pdm_workflow_instances (
            id, tenant_id, workflow_id, workflow_name, target_type, target_id,
            current_step, status, assignees, history, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, tenant_id, workflow_id, workflow_name, target_type, target_id,
                  current_step, status, assignees, history, created_by,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(req.workflow_id)
    .bind(workflow.name)
    .bind(&req.target_type)
    .bind(req.target_id)
    .bind(&current_step)
    .bind("running")
    .bind(assignees)
    .bind(serde_json::json!([{
        "step": current_step,
        "action": "started",
        "user": req.created_by,
        "timestamp": now.to_rfc3339()
    }]))
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(instance) => Json(ApiResponse::success(instance, "工作流已启动")),
        Err(e) => {
            tracing::error!("启动工作流失败: {}", e);
            Json(ApiResponse::error(500, "启动工作流失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/workflow-instances",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_workflow_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, WorkflowInstance>(
        r#"
        SELECT id, tenant_id, workflow_id, workflow_name, target_type, target_id,
               current_step, status, assignees, history, created_by,
               created_at, updated_at
        FROM pdm_workflow_instances
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(instances) => Json(ApiResponse::success(
            serde_json::json!({
                "instances": instances,
                "total": instances.len()
            }),
            "获取工作流实例列表成功",
        )),
        Err(e) => {
            tracing::error!("获取工作流实例列表失败: {}", e);
            Json(ApiResponse::error(500, "获取工作流实例列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pdm/workflow-instances/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_workflow_instance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<WorkflowInstance>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, WorkflowInstance>(
        r#"
        SELECT id, tenant_id, workflow_id, workflow_name, target_type, target_id,
               current_step, status, assignees, history, created_by,
               created_at, updated_at
        FROM pdm_workflow_instances WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(instance)) => Json(ApiResponse::success(instance, "获取工作流实例成功")),
        Ok(None) => Json(ApiResponse::error(404, "工作流实例不存在")),
        Err(e) => {
            tracing::error!("获取工作流实例失败: {}", e);
            Json(ApiResponse::error(500, "获取工作流实例失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pdm/workflow-instances/{id}/advance",
    request_body = serde_json::Value,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn advance_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let action = req
        .get("action")
        .and_then(|v| v.as_str())
        .unwrap_or("approve");
    let user = req.get("user").and_then(|v| v.as_str()).unwrap_or("system");
    let comment = req.get("comment").and_then(|v| v.as_str()).unwrap_or("");

    let instance_result = sqlx::query_as::<_, WorkflowInstance>(
        "SELECT id, tenant_id, workflow_id, current_step, status, history FROM pdm_workflow_instances WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let instance = match instance_result {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "工作流实例不存在")),
        Err(e) => {
            tracing::error!("查询工作流实例失败: {}", e);
            return Json(ApiResponse::error(500, "查询工作流实例失败"));
        }
    };

    if instance.status != "running" {
        return Json(ApiResponse::error(400, "工作流状态不正确"));
    }

    let workflow_result = sqlx::query_as::<_, WorkflowDefinition>(
        "SELECT steps FROM pdm_workflows WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(instance.workflow_id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let workflow = match workflow_result {
        Ok(Some(w)) => w,
        Ok(None) => return Json(ApiResponse::error(404, "工作流定义不存在")),
        Err(e) => {
            tracing::error!("查询工作流定义失败: {}", e);
            return Json(ApiResponse::error(500, "查询工作流定义失败"));
        }
    };

    let steps: Vec<WorkflowStep> = serde_json::from_value(workflow.steps).unwrap_or_default();
    let current_step_index = steps
        .iter()
        .position(|s| s.step_name == instance.current_step);

    let (new_step, new_status, new_assignees) = match action {
        "reject" => (
            instance.current_step.clone(),
            "rejected".to_string(),
            instance.assignees.clone(),
        ),
        _ => match current_step_index {
            Some(idx) if idx < steps.len() - 1 => {
                let next_step = &steps[idx + 1];
                (
                    next_step.step_name.clone(),
                    "running".to_string(),
                    serde_json::to_value(next_step.assignees.clone())
                        .unwrap_or_else(|_| serde_json::json!([])),
                )
            }
            Some(_) => (
                "end".to_string(),
                "completed".to_string(),
                serde_json::json!([]),
            ),
            None => (
                instance.current_step.clone(),
                "completed".to_string(),
                serde_json::json!([]),
            ),
        },
    };

    let mut history: Vec<serde_json::Value> =
        serde_json::from_value(instance.history).unwrap_or_default();
    history.push(serde_json::json!({
        "step": instance.current_step,
        "action": action,
        "user": user,
        "comment": comment,
        "timestamp": Utc::now().to_rfc3339()
    }));

    let now = Utc::now();
    let history_value = serde_json::to_value(history).unwrap_or_else(|_| serde_json::Value::Null);

    let result = sqlx::query_as::<_, WorkflowInstance>(
        r#"
        UPDATE pdm_workflow_instances SET
            current_step = $2, status = $3, assignees = $4, history = $5, updated_at = $6
        WHERE id = $1 AND tenant_id = $7
        RETURNING id, tenant_id, workflow_id, workflow_name, target_type, target_id,
                  current_step, status, assignees, history, created_by,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&new_step)
    .bind(&new_status)
    .bind(new_assignees)
    .bind(history_value)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(instance) => Json(ApiResponse::success(instance, "工作流已推进")),
        Err(e) => {
            tracing::error!("推进工作流失败: {}", e);
            Json(ApiResponse::error(500, "推进工作流失败"))
        }
    }
}
