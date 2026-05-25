use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn ok(message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Workflow {
    id: Uuid,
    name: String,
    description: Option<String>,
    definition: Option<serde_json::Value>,
    is_active: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkflowInstance {
    id: Uuid,
    workflow_id: Uuid,
    status: String,
    initiator_id: Option<String>,
    data: Option<serde_json::Value>,
    started_at: Option<String>,
    completed_at: Option<String>,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Approval {
    id: Uuid,
    workflow_instance_id: Uuid,
    task_name: String,
    assignee_id: Option<String>,
    status: String,
    comment: Option<String>,
    approved_by: Option<String>,
    approved_at: Option<String>,
    created_at: String,
}

#[derive(Debug, Clone)]
struct AppState {
    workflows: Arc<Mutex<Vec<Workflow>>>,
    instances: Arc<Mutex<Vec<WorkflowInstance>>>,
    approvals: Arc<Mutex<Vec<Approval>>>,
}

#[derive(Debug, Deserialize)]
struct CreateWorkflowRequest {
    name: String,
    description: Option<String>,
    definition: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct CreateInstanceRequest {
    workflow_id: Uuid,
    initiator_id: Option<String>,
    data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct UpdateInstanceStatusRequest {
    status: String,
}

#[derive(Debug, Deserialize)]
struct CreateApprovalRequest {
    workflow_instance_id: Uuid,
    task_name: String,
    assignee_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProcessApprovalRequest {
    status: String,
    comment: Option<String>,
}

async fn home() -> &'static str {
    "TOPEMS-FLOW 工作流服务 API\n\n健康检查: GET /health\n\n工作流接口:\n- POST /api/v1/workflows - 创建工作流\n- GET /api/v1/workflows - 获取工作流列表\n- GET /api/v1/workflows/:id - 获取工作流详情\n- PUT /api/v1/workflows/:id - 更新工作流\n- DELETE /api/v1/workflows/:id - 删除工作流\n\n工作流实例接口:\n- POST /api/v1/instances - 创建实例\n- GET /api/v1/instances - 获取实例列表\n- GET /api/v1/instances/:id - 获取实例详情\n- PATCH /api/v1/instances/:id/status - 更新实例状态\n\n审批接口:\n- POST /api/v1/approvals - 创建审批\n- GET /api/v1/approvals - 获取审批列表\n- GET /api/v1/approvals/:id - 获取审批详情\n- POST /api/v1/approvals/:id/action - 处理审批\n"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "TOPEMS-FLOW is running!".to_string(),
        "OK",
    ))
}

async fn create_workflow(
    State(state): State<AppState>,
    Json(req): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<Workflow>> {
    let now = Utc::now().to_rfc3339();
    let workflow = Workflow {
        id: Uuid::new_v4(),
        name: req.name,
        description: req.description,
        definition: req.definition,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    };

    state.workflows.lock().unwrap().push(workflow.clone());

    Json(ApiResponse::success(
        workflow,
        "Workflow created successfully",
    ))
}

async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflows = state.workflows.lock().unwrap();
    if let Some(workflow) = workflows.iter().find(|w| w.id == id) {
        Json(ApiResponse::success(
            workflow.clone(),
            "Workflow retrieved successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Workflow not found"))
    }
}

async fn list_workflows(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Workflow>>> {
    let workflows = state.workflows.lock().unwrap().clone();
    Json(ApiResponse::success(
        workflows,
        "Workflows retrieved successfully",
    ))
}

async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<Workflow>> {
    let mut workflows = state.workflows.lock().unwrap();
    if let Some(workflow) = workflows.iter_mut().find(|w| w.id == id) {
        workflow.name = req.name;
        workflow.description = req.description;
        workflow.definition = req.definition;
        workflow.updated_at = Utc::now().to_rfc3339();
        Json(ApiResponse::success(
            workflow.clone(),
            "Workflow updated successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Workflow not found"))
    }
}

async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let mut workflows = state.workflows.lock().unwrap();
    if let Some(pos) = workflows.iter().position(|w| w.id == id) {
        workflows.remove(pos);
        Json(ApiResponse::ok("Workflow deleted successfully"))
    } else {
        Json(ApiResponse::error(404, "Workflow not found"))
    }
}

async fn create_instance(
    State(state): State<AppState>,
    Json(req): Json<CreateInstanceRequest>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let now = Utc::now().to_rfc3339();
    let instance = WorkflowInstance {
        id: Uuid::new_v4(),
        workflow_id: req.workflow_id,
        status: "pending".to_string(),
        initiator_id: req.initiator_id,
        data: req.data,
        started_at: None,
        completed_at: None,
        created_at: now,
    };

    state.instances.lock().unwrap().push(instance.clone());

    Json(ApiResponse::success(
        instance,
        "Workflow instance created successfully",
    ))
}

async fn get_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instances = state.instances.lock().unwrap();
    if let Some(instance) = instances.iter().find(|i| i.id == id) {
        Json(ApiResponse::success(
            instance.clone(),
            "Workflow instance retrieved successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Workflow instance not found"))
    }
}

async fn list_instances(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<WorkflowInstance>>> {
    let instances = state.instances.lock().unwrap().clone();
    Json(ApiResponse::success(
        instances,
        "Workflow instances retrieved successfully",
    ))
}

async fn update_instance_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInstanceStatusRequest>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let mut instances = state.instances.lock().unwrap();
    if let Some(instance) = instances.iter_mut().find(|i| i.id == id) {
        instance.status = req.status.clone();
        if req.status == "running" && instance.started_at.is_none() {
            instance.started_at = Some(Utc::now().to_rfc3339());
        }
        if req.status == "completed" {
            instance.completed_at = Some(Utc::now().to_rfc3339());
        }
        Json(ApiResponse::success(
            instance.clone(),
            "Workflow instance status updated successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Workflow instance not found"))
    }
}

async fn create_approval(
    State(state): State<AppState>,
    Json(req): Json<CreateApprovalRequest>,
) -> Json<ApiResponse<Approval>> {
    let now = Utc::now().to_rfc3339();
    let approval = Approval {
        id: Uuid::new_v4(),
        workflow_instance_id: req.workflow_instance_id,
        task_name: req.task_name,
        assignee_id: req.assignee_id,
        status: "pending".to_string(),
        comment: None,
        approved_by: None,
        approved_at: None,
        created_at: now,
    };

    state.approvals.lock().unwrap().push(approval.clone());

    Json(ApiResponse::success(
        approval,
        "Approval created successfully",
    ))
}

async fn get_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Approval>> {
    let approvals = state.approvals.lock().unwrap();
    if let Some(approval) = approvals.iter().find(|a| a.id == id) {
        Json(ApiResponse::success(
            approval.clone(),
            "Approval retrieved successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Approval not found"))
    }
}

async fn list_approvals(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Approval>>> {
    let approvals = state.approvals.lock().unwrap().clone();
    Json(ApiResponse::success(
        approvals,
        "Approvals retrieved successfully",
    ))
}

async fn process_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ProcessApprovalRequest>,
) -> Json<ApiResponse<Approval>> {
    let mut approvals = state.approvals.lock().unwrap();
    if let Some(approval) = approvals.iter_mut().find(|a| a.id == id) {
        approval.status = req.status;
        approval.comment = req.comment;
        approval.approved_by = Some("admin".to_string());
        approval.approved_at = Some(Utc::now().to_rfc3339());
        Json(ApiResponse::success(
            approval.clone(),
            "Approval processed successfully",
        ))
    } else {
        Json(ApiResponse::error(404, "Approval not found"))
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_flow=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-FLOW 工作流服务启动中...");
    dotenv::dotenv().ok();

    let now = Utc::now().to_rfc3339();
    let state = AppState {
        workflows: Arc::new(Mutex::new(vec![
            Workflow {
                id: Uuid::new_v4(),
                name: "文件上传审批".to_string(),
                description: Some("文件上传到特定目录需要审批".to_string()),
                definition: None,
                is_active: true,
                created_at: now.clone(),
                updated_at: now.clone(),
            },
            Workflow {
                id: Uuid::new_v4(),
                name: "请假流程".to_string(),
                description: Some("员工请假审批流程".to_string()),
                definition: None,
                is_active: true,
                created_at: now.clone(),
                updated_at: now,
            },
        ])),
        instances: Arc::new(Mutex::new(vec![])),
        approvals: Arc::new(Mutex::new(vec![])),
    };

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/workflows", post(create_workflow))
        .route("/api/v1/workflows/:id", get(get_workflow))
        .route("/api/v1/workflows", get(list_workflows))
        .route("/api/v1/workflows/:id", put(update_workflow))
        .route("/api/v1/workflows/:id", delete(delete_workflow))
        .route("/api/v1/instances", post(create_instance))
        .route("/api/v1/instances/:id", get(get_instance))
        .route("/api/v1/instances", get(list_instances))
        .route(
            "/api/v1/instances/:id/status",
            put(update_instance_status),
        )
        .route("/api/v1/approvals", post(create_approval))
        .route("/api/v1/approvals/:id", get(get_approval))
        .route("/api/v1/approvals", get(list_approvals))
        .route(
            "/api/v1/approvals/:id/action",
            post(process_approval),
        )
        .with_state(state);

    let host = std::env::var("SERVER_HOST").unwrap_or("0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or("8004".to_string())
        .parse()
        .unwrap_or(8004);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("✅ TOPEMS-FLOW 服务运行在 http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
