//! Emergency plan management - Plan CRUD, categories, versions, supplies, and approval workflow

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::{ApiResponse, Claims};

use uuid::Uuid;

use crate::shared::AppState;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
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
        .route("/emergency-plans", get(list_plans).post(create_plan))
        .route("/emergency-plans/categories", get(list_plan_categories))
        .route(
            "/emergency-plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route(
            "/emergency-plans/{id}/supplies",
            get(list_plan_supplies).post(add_plan_supply),
        )
        .route(
            "/emergency-plans/{id}/supplies/{supply_id}",
            delete(delete_plan_supply),
        )
        .route(
            "/emergency-plans/{id}/versions",
            get(list_plan_versions).post(create_new_version),
        )
        .route(
            "/emergency-plans/{id}/submit-approval",
            post(submit_plan_approval),
        )
        .route("/emergency-plans/{id}/approve", post(approve_plan))
        .route("/plans", get(list_plans).post(create_plan))
}

#[derive(Debug, Deserialize)]
pub struct PlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EmergencyPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub version: String,
    pub status: String,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    pub responsible_dept: Option<String>,
    pub responsible_person: Option<String>,
    pub contact_phone: Option<String>,
    pub content: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanSupply {
    pub id: String,
    pub plan_id: String,
    pub name: String,
    pub specification: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub storage_location: Option<String>,
    pub responsible_person: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanVersion {
    pub id: String,
    pub plan_id: String,
    pub version: String,
    pub change_description: Option<String>,
    pub changed_by: Option<String>,
    pub changed_at: Option<String>,
    pub content: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanApproval {
    pub id: String,
    pub plan_id: String,
    pub approver: Option<String>,
    pub approver_role: Option<String>,
    pub status: String,
    pub opinion: Option<String>,
    pub approved_at: Option<String>,
    pub order_num: i32,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct PlanDetail {
    pub plan: EmergencyPlan,
    pub supplies: Vec<PlanSupply>,
    pub versions: Vec<PlanVersion>,
    pub approvals: Vec<PlanApproval>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    pub responsible_dept: Option<String>,
    pub responsible_person: Option<String>,
    pub contact_phone: Option<String>,
    pub content: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlanRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub scope: Option<String>,
    pub emergency_level: Option<String>,
    pub responsible_dept: Option<String>,
    pub responsible_person: Option<String>,
    pub contact_phone: Option<String>,
    pub content: Option<String>,
    pub status: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSupplyRequest {
    pub name: String,
    pub specification: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub storage_location: Option<String>,
    pub responsible_person: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitApprovalRequest {
    pub approvers: Option<Vec<String>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub opinion: Option<String>,
    pub result: String,
}

pub async fn list_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<EmergencyPlan>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Listing emergency plans");
    Json(ApiResponse::success(
        Vec::<EmergencyPlan>::new(),
        "获取应急预案列表成功",
    ))
}

pub async fn create_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreatePlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Creating emergency plan: {:?}", req);
    Json(ApiResponse::success(
        EmergencyPlan {
            id: uuid::Uuid::new_v4().to_string(),
            plan_no: format!(
                "EP-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            category: req.category,
            version: "1.0".to_string(),
            status: "draft".to_string(),
            scope: req.scope,
            emergency_level: req.emergency_level,
            responsible_dept: req.responsible_dept,
            responsible_person: req.responsible_person,
            contact_phone: req.contact_phone,
            content: req.content,
            created_by: None,
            approved_by: None,
            approved_at: None,
            effective_date: req.effective_date,
            expiry_date: req.expiry_date,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "应急预案创建成功",
    ))
}

pub async fn get_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<PlanDetail>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Getting emergency plan: {}", id);
    Json(ApiResponse::success(
        PlanDetail {
            plan: EmergencyPlan {
                id: id.clone(),
                plan_no: "EP-2024001".to_string(),
                title: "火灾应急预案".to_string(),
                description: Some("生产车间火灾应急处置预案".to_string()),
                category: "fire".to_string(),
                version: "1.0".to_string(),
                status: "approved".to_string(),
                scope: Some("全厂范围".to_string()),
                emergency_level: Some("level2".to_string()),
                responsible_dept: Some("安全环保部".to_string()),
                responsible_person: Some("张安全".to_string()),
                contact_phone: Some("13800138000".to_string()),
                content: Some("火灾应急处置流程...".to_string()),
                created_by: Some("李主任".to_string()),
                approved_by: Some("王总".to_string()),
                approved_at: Some(chrono::Utc::now().to_rfc3339()),
                effective_date: Some("2024-01-01".to_string()),
                expiry_date: Some("2026-12-31".to_string()),
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            },
            supplies: vec![
                PlanSupply {
                    id: "supply-001".to_string(),
                    plan_id: id.clone(),
                    name: "灭火器".to_string(),
                    specification: Some("ABC干粉 4kg".to_string()),
                    quantity: 50,
                    unit: Some("具".to_string()),
                    storage_location: Some("各车间消防点".to_string()),
                    responsible_person: Some("张安全".to_string()),
                    remarks: None,
                    created_at: Some(chrono::Utc::now().to_rfc3339()),

                    tenant_id,
                },
                PlanSupply {
                    id: "supply-002".to_string(),
                    plan_id: id.clone(),
                    name: "消防栓".to_string(),
                    specification: Some("DN65".to_string()),
                    quantity: 20,
                    unit: Some("个".to_string()),
                    storage_location: Some("各楼层走廊".to_string()),
                    responsible_person: Some("张安全".to_string()),
                    remarks: None,
                    created_at: Some(chrono::Utc::now().to_rfc3339()),

                    tenant_id,
                },
            ],
            versions: vec![PlanVersion {
                id: "ver-001".to_string(),
                plan_id: id.clone(),
                version: "1.0".to_string(),
                change_description: Some("初始版本".to_string()),
                changed_by: Some("李主任".to_string()),
                changed_at: Some(chrono::Utc::now().to_rfc3339()),
                content: Some("初始版本内容...".to_string()),

                tenant_id,
            }],
            approvals: vec![
                PlanApproval {
                    id: "appr-001".to_string(),
                    plan_id: id.clone(),
                    approver: Some("安全主管".to_string()),
                    approver_role: Some("审核".to_string()),
                    status: "approved".to_string(),
                    opinion: Some("同意".to_string()),
                    approved_at: Some(chrono::Utc::now().to_rfc3339()),
                    order_num: 1,

                    tenant_id,
                },
                PlanApproval {
                    id: "appr-002".to_string(),
                    plan_id: id.clone(),
                    approver: Some("总经理".to_string()),
                    approver_role: Some("批准".to_string()),
                    status: "approved".to_string(),
                    opinion: Some("同意发布".to_string()),
                    approved_at: Some(chrono::Utc::now().to_rfc3339()),
                    order_num: 2,

                    tenant_id,
                },
            ],
            tenant_id,
        },
        "获取应急预案详情成功",
    ))
}

pub async fn update_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Updating emergency plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        EmergencyPlan {
            id,
            plan_no: "EP-2024001".to_string(),
            title: req.title.unwrap_or_else(|| "火灾应急预案".to_string()),
            description: req.description,
            category: req.category.unwrap_or_else(|| "fire".to_string()),
            version: "1.0".to_string(),
            status: req.status.unwrap_or_else(|| "draft".to_string()),
            scope: req.scope,
            emergency_level: req.emergency_level,
            responsible_dept: req.responsible_dept,
            responsible_person: req.responsible_person,
            contact_phone: req.contact_phone,
            content: req.content,
            created_by: Some("李主任".to_string()),
            approved_by: None,
            approved_at: None,
            effective_date: req.effective_date,
            expiry_date: req.expiry_date,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "应急预案更新成功",
    ))
}

pub async fn delete_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Deleting emergency plan: {}", id);
    Json(ApiResponse::success((), "应急预案删除成功"))
}

pub async fn list_plan_supplies(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PlanSupply>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Listing supplies for plan: {}", id);
    Json(ApiResponse::success(
        Vec::<PlanSupply>::new(),
        "获取应急物资清单成功",
    ))
}

pub async fn add_plan_supply(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateSupplyRequest>,
) -> Json<ApiResponse<PlanSupply>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Adding supply to plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        PlanSupply {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id: id,
            name: req.name,
            specification: req.specification,
            quantity: req.quantity,
            unit: req.unit,
            storage_location: req.storage_location,
            responsible_person: req.responsible_person,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "应急物资添加成功",
    ))
}

pub async fn delete_plan_supply(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path((_plan_id, supply_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Deleting supply: {}", supply_id);
    Json(ApiResponse::success((), "应急物资删除成功"))
}

pub async fn submit_plan_approval(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_req): Json<SubmitApprovalRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Submitting plan for approval: {}", id);
    Json(ApiResponse::success(
        EmergencyPlan {
            id,
            plan_no: "EP-2024001".to_string(),
            title: "火灾应急预案".to_string(),
            description: Some("生产车间火灾应急处置预案".to_string()),
            category: "fire".to_string(),
            version: "1.0".to_string(),
            status: "pending_approval".to_string(),
            scope: Some("全厂范围".to_string()),
            emergency_level: Some("level2".to_string()),
            responsible_dept: Some("安全环保部".to_string()),
            responsible_person: Some("张安全".to_string()),
            contact_phone: Some("13800138000".to_string()),
            content: Some("火灾应急处置流程...".to_string()),
            created_by: Some("李主任".to_string()),
            approved_by: None,
            approved_at: None,
            effective_date: Some("2024-01-01".to_string()),
            expiry_date: Some("2026-12-31".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "预案已提交审批",
    ))
}

pub async fn approve_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<PlanApproval>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Approving plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        PlanApproval {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id: id,
            approver: Some("审批人".to_string()),
            approver_role: Some("审核".to_string()),
            status: req.result,
            opinion: req.opinion,
            approved_at: Some(chrono::Utc::now().to_rfc3339()),
            order_num: 1,

            tenant_id,
        },
        "预案审批完成",
    ))
}

pub async fn list_plan_versions(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<PlanVersion>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Listing versions for plan: {}", id);
    Json(ApiResponse::success(
        Vec::<PlanVersion>::new(),
        "获取预案版本列表成功",
    ))
}

pub async fn create_new_version(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<PlanVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Creating new version for plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        PlanVersion {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id: id,
            version: "2.0".to_string(),
            change_description: Some("更新应急预案内容".to_string()),
            changed_by: Some("李主任".to_string()),
            changed_at: Some(chrono::Utc::now().to_rfc3339()),
            content: req
                .get("content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),

            tenant_id,
        },
        "新版本创建成功",
    ))
}

pub async fn list_plan_categories(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Listing plan categories");
    let categories = vec![
        serde_json::json!({ "code": "fire", "name": "火灾", "icon": "flame" }),
        serde_json::json!({ "code": "leak", "name": "泄漏", "icon": "droplet" }),
        serde_json::json!({ "code": "poisoning", "name": "中毒", "icon": "alert-triangle" }),
        serde_json::json!({ "code": "natural_disaster", "name": "自然灾害", "icon": "cloud-lightning" }),
        serde_json::json!({ "code": "injury", "name": "人员伤亡", "icon": "activity" }),
        serde_json::json!({ "code": "environmental", "name": "环境污染", "icon": "wind" }),
    ];
    Json(ApiResponse::success(categories, "获取预案分类成功"))
}
