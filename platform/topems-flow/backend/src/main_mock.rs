use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Query, Path, Json},
    http::StatusCode,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::net::SocketAddr;
use chrono::{Utc, Duration};
use uuid::Uuid;

#[derive(Clone, Serialize)]
struct MockWorkflow {
    id: Uuid,
    name: String,
    description: String,
    definition: Value,
    is_active: bool,
    created_by: Option<String>,
    created_at: chrono::DateTime<Utc>,
    updated_at: chrono::DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct MockInstance {
    id: Uuid,
    workflow_id: Uuid,
    status: String,
    current_node: String,
    created_by: String,
    created_at: chrono::DateTime<Utc>,
    updated_at: chrono::DateTime<Utc>,
}

#[derive(Clone, Serialize)]
struct MockApproval {
    id: Uuid,
    instance_id: Uuid,
    node_id: String,
    assignee: String,
    status: String,
    comment: Option<String>,
    created_at: chrono::DateTime<Utc>,
    updated_at: chrono::DateTime<Utc>,
}

#[derive(Clone)]
struct AppState {
    workflows: Arc<Mutex<HashMap<Uuid, MockWorkflow>>>,
    instances: Arc<Mutex<HashMap<Uuid, MockInstance>>>,
    approvals: Arc<Mutex<HashMap<Uuid, MockApproval>>>,
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    is_active: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CreateWorkflowRequest {
    name: String,
    description: Option<String>,
    definition: Option<Value>,
    is_active: Option<bool>,
    created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateWorkflowRequest {
    name: Option<String>,
    description: Option<String>,
    definition: Option<Value>,
    is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct CreateInstanceRequest {
    workflow_id: String,
    created_by: String,
}

#[derive(Debug, Deserialize)]
struct ProcessApprovalRequest {
    status: String,
    comment: Option<String>,
}

fn init_mock_data(state: &AppState) {
    let mut workflows = state.workflows.lock().unwrap();
    
    let mock_workflows = vec![
        MockWorkflow {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            name: "员工入职审批流程".to_string(),
            description: "新员工入职时需要完成的审批流程".to_string(),
            definition: serde_json::json!({
                "version": "1.0",
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "manager_approval", "type": "approval", "name": "部门经理审批"},
                    {"id": "hr_approval", "type": "approval", "name": "HR审批"},
                    {"id": "end", "type": "end", "name": "结束"},
                    {"id": "rejected", "type": "end", "name": "已拒绝"}
                ],
                "start_node": "start",
                "end_nodes": ["end", "rejected"],
                "transitions": [
                    {"from": "start", "to": "manager_approval"},
                    {"from": "manager_approval", "to": "hr_approval", "condition": "approved"},
                    {"from": "manager_approval", "to": "rejected", "condition": "rejected"},
                    {"from": "hr_approval", "to": "end", "condition": "approved"},
                    {"from": "hr_approval", "to": "rejected", "condition": "rejected"}
                ]
            }),
            is_active: true,
            created_by: Some("admin".to_string()),
            created_at: Utc::now() - Duration::days(7),
            updated_at: Utc::now() - Duration::days(1),
        },
        MockWorkflow {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap(),
            name: "采购申请流程".to_string(),
            description: "采购物品时需要完成的审批流程".to_string(),
            definition: serde_json::json!({
                "version": "1.0",
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "dept_head", "type": "approval", "name": "部门负责人审批"},
                    {"id": "finance", "type": "approval", "name": "财务审核"},
                    {"id": "end", "type": "end", "name": "结束"},
                    {"id": "rejected", "type": "end", "name": "已拒绝"}
                ],
                "start_node": "start",
                "end_nodes": ["end", "rejected"],
                "transitions": [
                    {"from": "start", "to": "dept_head"},
                    {"from": "dept_head", "to": "finance", "condition": "approved"},
                    {"from": "dept_head", "to": "rejected", "condition": "rejected"},
                    {"from": "finance", "to": "end", "condition": "approved"},
                    {"from": "finance", "to": "rejected", "condition": "rejected"}
                ]
            }),
            is_active: true,
            created_by: Some("admin".to_string()),
            created_at: Utc::now() - Duration::days(5),
            updated_at: Utc::now() - Duration::hours(2),
        },
        MockWorkflow {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440002").unwrap(),
            name: "请假申请流程".to_string(),
            description: "员工请假时需要完成的审批流程".to_string(),
            definition: serde_json::json!({
                "version": "1.0",
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "team_lead", "type": "approval", "name": "组长审批"},
                    {"id": "manager", "type": "approval", "name": "经理审批"},
                    {"id": "end", "type": "end", "name": "结束"},
                    {"id": "rejected", "type": "end", "name": "已拒绝"}
                ],
                "start_node": "start",
                "end_nodes": ["end", "rejected"],
                "transitions": [
                    {"from": "start", "to": "team_lead"},
                    {"from": "team_lead", "to": "manager", "condition": "approved"},
                    {"from": "team_lead", "to": "rejected", "condition": "rejected"},
                    {"from": "manager", "to": "end", "condition": "approved"},
                    {"from": "manager", "to": "rejected", "condition": "rejected"}
                ]
            }),
            is_active: false,
            created_by: Some("admin".to_string()),
            created_at: Utc::now() - Duration::days(10),
            updated_at: Utc::now() - Duration::days(3),
        },
        MockWorkflow {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap(),
            name: "报销申请流程".to_string(),
            description: "员工报销时需要完成的审批流程".to_string(),
            definition: serde_json::json!({
                "version": "1.0",
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "supervisor", "type": "approval", "name": "主管审批"},
                    {"id": "finance", "type": "approval", "name": "财务审核"},
                    {"id": "end", "type": "end", "name": "结束"},
                    {"id": "rejected", "type": "end", "name": "已拒绝"}
                ],
                "start_node": "start",
                "end_nodes": ["end", "rejected"],
                "transitions": [
                    {"from": "start", "to": "supervisor"},
                    {"from": "supervisor", "to": "finance", "condition": "approved"},
                    {"from": "supervisor", "to": "rejected", "condition": "rejected"},
                    {"from": "finance", "to": "end", "condition": "approved"},
                    {"from": "finance", "to": "rejected", "condition": "rejected"}
                ]
            }),
            is_active: true,
            created_by: Some("admin".to_string()),
            created_at: Utc::now() - Duration::days(3),
            updated_at: Utc::now(),
        },
        MockWorkflow {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440004").unwrap(),
            name: "离职申请流程".to_string(),
            description: "员工离职时需要完成的审批流程".to_string(),
            definition: serde_json::json!({
                "version": "1.0",
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "manager", "type": "approval", "name": "直属经理审批"},
                    {"id": "hr", "type": "approval", "name": "HR审批"},
                    {"id": "finance", "type": "approval", "name": "财务结算"},
                    {"id": "end", "type": "end", "name": "结束"},
                    {"id": "rejected", "type": "end", "name": "已拒绝"}
                ],
                "start_node": "start",
                "end_nodes": ["end", "rejected"],
                "transitions": [
                    {"from": "start", "to": "manager"},
                    {"from": "manager", "to": "hr", "condition": "approved"},
                    {"from": "manager", "to": "rejected", "condition": "rejected"},
                    {"from": "hr", "to": "finance", "condition": "approved"},
                    {"from": "hr", "to": "rejected", "condition": "rejected"},
                    {"from": "finance", "to": "end", "condition": "approved"},
                    {"from": "finance", "to": "rejected", "condition": "rejected"}
                ]
            }),
            is_active: true,
            created_by: Some("admin".to_string()),
            created_at: Utc::now() - Duration::days(2),
            updated_at: Utc::now(),
        },
    ];

    for wf in mock_workflows {
        workflows.insert(wf.id, wf);
    }

    let mut instances = state.instances.lock().unwrap();
    let mock_instances = vec![
        MockInstance {
            id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440001").unwrap(),
            workflow_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            status: "running".to_string(),
            current_node: "manager_approval".to_string(),
            created_by: "zhangsan".to_string(),
            created_at: Utc::now() - Duration::hours(5),
            updated_at: Utc::now() - Duration::hours(1),
        },
        MockInstance {
            id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440002").unwrap(),
            workflow_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap(),
            status: "completed".to_string(),
            current_node: "end".to_string(),
            created_by: "lisi".to_string(),
            created_at: Utc::now() - Duration::days(2),
            updated_at: Utc::now() - Duration::days(1),
        },
        MockInstance {
            id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440003").unwrap(),
            workflow_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap(),
            status: "rejected".to_string(),
            current_node: "rejected".to_string(),
            created_by: "wangwu".to_string(),
            created_at: Utc::now() - Duration::days(1),
            updated_at: Utc::now() - Duration::hours(3),
        },
        MockInstance {
            id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440004").unwrap(),
            workflow_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440002").unwrap(),
            status: "running".to_string(),
            current_node: "team_lead".to_string(),
            created_by: "zhaoliu".to_string(),
            created_at: Utc::now() - Duration::hours(2),
            updated_at: Utc::now(),
        },
    ];

    for inst in mock_instances {
        instances.insert(inst.id, inst);
    }

    let mut approvals = state.approvals.lock().unwrap();
    let mock_approvals = vec![
        MockApproval {
            id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440001").unwrap(),
            instance_id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440001").unwrap(),
            node_id: "manager_approval".to_string(),
            assignee: "manager001".to_string(),
            status: "pending".to_string(),
            comment: None,
            created_at: Utc::now() - Duration::hours(5),
            updated_at: Utc::now() - Duration::hours(5),
        },
        MockApproval {
            id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440002").unwrap(),
            instance_id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440002").unwrap(),
            node_id: "dept_head".to_string(),
            assignee: "manager002".to_string(),
            status: "approved".to_string(),
            comment: Some("同意采购".to_string()),
            created_at: Utc::now() - Duration::days(2),
            updated_at: Utc::now() - Duration::days(2),
        },
        MockApproval {
            id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440003").unwrap(),
            instance_id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440003").unwrap(),
            node_id: "supervisor".to_string(),
            assignee: "supervisor001".to_string(),
            status: "rejected".to_string(),
            comment: Some("报销金额超出预算，不予批准".to_string()),
            created_at: Utc::now() - Duration::days(1),
            updated_at: Utc::now() - Duration::hours(3),
        },
        MockApproval {
            id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440004").unwrap(),
            instance_id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440004").unwrap(),
            node_id: "team_lead".to_string(),
            assignee: "teamlead001".to_string(),
            status: "pending".to_string(),
            comment: None,
            created_at: Utc::now() - Duration::hours(2),
            updated_at: Utc::now() - Duration::hours(2),
        },
    ];

    for approval in mock_approvals {
        approvals.insert(approval.id, approval);
    }
}

async fn list_workflows(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Json<Value> {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0).max(0);
    
    let workflows: Vec<MockWorkflow> = state.workflows.lock().unwrap()
        .values()
        .filter(|w| query.is_active.map(|a| w.is_active == a).unwrap_or(true))
        .cloned()
        .collect();
    
    let total = workflows.len() as i64;
    let items: Vec<MockWorkflow> = workflows
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();
    
    Json(serde_json::json!({
        "success": true,
        "data": {
            "items": items,
            "total": total,
            "page": (offset / limit) + 1,
            "page_size": limit,
        },
        "message": "Success"
    }))
}

async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match state.workflows.lock().unwrap().get(&id).cloned() {
        Some(workflow) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "data": workflow,
                "message": "Success"
            }))
        ),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Workflow not found"
            }))
        ),
    }
}

async fn create_workflow(
    State(state): State<AppState>,
    Json(req): Json<CreateWorkflowRequest>,
) -> (StatusCode, Json<Value>) {
    if req.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Workflow name cannot be empty"
            }))
        );
    }
    
    let now = Utc::now();
    let definition = req.definition.unwrap_or(serde_json::json!({
        "version": "1.0",
        "nodes": [],
        "start_node": "",
        "end_nodes": []
    }));
    
    let workflow = MockWorkflow {
        id: Uuid::new_v4(),
        name: req.name,
        description: req.description.unwrap_or_default(),
        definition,
        is_active: req.is_active.unwrap_or(true),
        created_by: req.created_by,
        created_at: now,
        updated_at: now,
    };
    
    state.workflows.lock().unwrap().insert(workflow.id, workflow.clone());
    
    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "success": true,
            "data": workflow,
            "message": "Workflow created successfully"
        }))
    )
}

async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkflowRequest>,
) -> (StatusCode, Json<Value>) {
    let mut workflows = state.workflows.lock().unwrap();
    
    match workflows.get_mut(&id) {
        Some(workflow) => {
            if let Some(name) = req.name {
                workflow.name = name;
            }
            if let Some(description) = req.description {
                workflow.description = description;
            }
            if let Some(is_active) = req.is_active {
                workflow.is_active = is_active;
            }
            if let Some(definition) = req.definition {
                workflow.definition = definition;
            }
            workflow.updated_at = Utc::now();
            
            let updated = workflow.clone();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "data": updated,
                    "message": "Workflow updated successfully"
                }))
            )
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Workflow not found"
            }))
        ),
    }
}

async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    if state.workflows.lock().unwrap().remove(&id).is_some() {
        (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "data": (),
                "message": "Workflow deleted successfully"
            }))
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Workflow not found"
            }))
        )
    }
}

async fn list_instances(
    State(state): State<AppState>,
) -> Json<Value> {
    let instances: Vec<MockInstance> = state.instances.lock().unwrap()
        .values()
        .cloned()
        .collect();
    
    Json(serde_json::json!({
        "success": true,
        "data": {
            "items": instances,
            "total": instances.len() as i64,
            "page": 1,
            "page_size": 50,
        },
        "message": "Success"
    }))
}

async fn get_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match state.instances.lock().unwrap().get(&id).cloned() {
        Some(instance) => {
            let workflow = state.workflows.lock().unwrap().get(&instance.workflow_id).cloned();
            let approvals: Vec<MockApproval> = state.approvals.lock().unwrap()
                .values()
                .filter(|a| a.instance_id == id)
                .cloned()
                .collect();
            
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "data": {
                        "instance": instance,
                        "workflow": workflow,
                        "approvals": approvals,
                    },
                    "message": "Success"
                }))
            )
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Instance not found"
            }))
        ),
    }
}

async fn create_instance(
    State(state): State<AppState>,
    Json(req): Json<CreateInstanceRequest>,
) -> (StatusCode, Json<Value>) {
    match Uuid::parse_str(&req.workflow_id) {
        Ok(workflow_id) => {
            if !state.workflows.lock().unwrap().contains_key(&workflow_id) {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "data": (),
                        "message": "Workflow not found"
                    }))
                );
            }
            
            let now = Utc::now();
            let instance = MockInstance {
                id: Uuid::new_v4(),
                workflow_id,
                status: "running".to_string(),
                current_node: "start".to_string(),
                created_by: req.created_by,
                created_at: now,
                updated_at: now,
            };
            
            state.instances.lock().unwrap().insert(instance.id, instance.clone());
            
            (
                StatusCode::CREATED,
                Json(serde_json::json!({
                    "success": true,
                    "data": instance,
                    "message": "Instance created successfully"
                }))
            )
        },
        Err(_) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Invalid workflow ID format"
            }))
        ),
    }
}

async fn list_approvals(
    State(state): State<AppState>,
) -> Json<Value> {
    let approvals: Vec<MockApproval> = state.approvals.lock().unwrap()
        .values()
        .cloned()
        .collect();
    
    Json(serde_json::json!({
        "success": true,
        "data": {
            "items": approvals,
            "total": approvals.len() as i64,
            "page": 1,
            "page_size": 50,
        },
        "message": "Success"
    }))
}

async fn get_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match state.approvals.lock().unwrap().get(&id).cloned() {
        Some(approval) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "data": approval,
                "message": "Success"
            }))
        ),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Approval not found"
            }))
        ),
    }
}

async fn process_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ProcessApprovalRequest>,
) -> (StatusCode, Json<Value>) {
    let mut approvals = state.approvals.lock().unwrap();
    
    match approvals.get_mut(&id) {
        Some(approval) => {
            if !["approved", "rejected"].contains(&req.status.as_str()) {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "data": (),
                        "message": "Invalid status. Must be 'approved' or 'rejected'"
                    }))
                );
            }
            
            approval.status = req.status;
            approval.comment = req.comment;
            approval.updated_at = Utc::now();
            
            let mut instances = state.instances.lock().unwrap();
            if let Some(instance) = instances.get_mut(&approval.instance_id) {
                if approval.status == "rejected" {
                    instance.status = "rejected".to_string();
                    instance.current_node = "rejected".to_string();
                } else {
                    instance.current_node = "end".to_string();
                    instance.status = "completed".to_string();
                }
                instance.updated_at = Utc::now();
            }
            
            let processed = approval.clone();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "data": processed,
                    "message": "Approval processed successfully"
                }))
            )
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "data": (),
                "message": "Approval not found"
            }))
        ),
    }
}

async fn health() -> Json<Value> {
    Json(serde_json::json!({
        "success": true,
        "data": {
            "service": "topems-flow-mock",
            "version": "1.0.0",
            "status": "running",
            "database": "memory",
            "timestamp": Utc::now().to_rfc3339(),
            "mock_data": true,
            "endpoints": {
                "workflows": ["GET /api/v1/workflows", "POST /api/v1/workflows", "GET /api/v1/workflows/{id}", "PUT /api/v1/workflows/{id}", "DELETE /api/v1/workflows/{id}"],
                "instances": ["GET /api/v1/instances", "POST /api/v1/instances", "GET /api/v1/instances/{id}"],
                "approvals": ["GET /api/v1/approvals", "GET /api/v1/approvals/{id}", "POST /api/v1/approvals/{id}/process"]
            }
        },
        "message": "Health check"
    }))
}

async fn home() -> &'static str {
    "TOPEMS-FLOW Workflow Engine API (Mock Mode)\n\nHealth Check: GET /health\n\nAPI Endpoints:\n- Workflows: GET/POST /api/v1/workflows, GET/PUT/DELETE /api/v1/workflows/{id}\n- Instances: GET/POST /api/v1/instances, GET /api/v1/instances/{id}\n- Approvals: GET /api/v1/approvals, GET /api/v1/approvals/{id}, POST /api/v1/approvals/{id}/process"
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let state = AppState {
        workflows: Arc::new(Mutex::new(HashMap::new())),
        instances: Arc::new(Mutex::new(HashMap::new())),
        approvals: Arc::new(Mutex::new(HashMap::new())),
    };
    
    init_mock_data(&state);

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods(tower_http::cors::Any)
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
        ]);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/workflows", get(list_workflows).post(create_workflow))
        .route("/api/v1/workflows/{id}", get(get_workflow).put(update_workflow).delete(delete_workflow))
        .route("/api/v1/instances", get(list_instances).post(create_instance))
        .route("/api/v1/instances/{id}", get(get_instance))
        .route("/api/v1/approvals", get(list_approvals))
        .route("/api/v1/approvals/{id}", get(get_approval))
        .route("/api/v1/approvals/{id}/process", post(process_approval))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8004));
    println!("TOPEMS-FLOW Mock Server listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}
