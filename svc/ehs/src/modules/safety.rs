//! Safety handlers - Inspection plans, items, and records

use axum::{
    extract::State,
    http::HeaderMap,
    routing::{delete, get},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/checks/plans", get(list_plans).post(create_plan))
        .route(
            "/checks/plans/{id}",
            get(get_plan).put(update_plan).delete(delete_plan),
        )
        .route(
            "/checks/plans/{plan_id}/items",
            get(list_plan_items).post(create_plan_item),
        )
        .route(
            "/checks/plans/{plan_id}/items/{item_id}",
            delete(delete_plan_item),
        )
        .route("/checks/records", get(list_records).post(create_record))
        .route(
            "/checks/records/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/checks", get(list_plans))
}

#[derive(Debug, Deserialize)]
pub struct InspectionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub inspection_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InspectionPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InspectionPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub frequency: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub inspector: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionItem {
    pub id: String,
    pub plan_id: String,
    pub item_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub standard: Option<String>,
    pub order_num: i32,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecord {
    pub id: String,
    pub record_no: String,
    pub plan_id: Option<String>,
    pub title: String,
    pub inspection_type: String,
    pub location: Option<String>,
    pub inspector: Option<String>,
    pub inspected_at: Option<String>,
    pub result: Option<String>,
    pub issues: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecordDetail {
    pub record: InspectionRecord,
    pub items: Vec<RecordItem>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct RecordItem {
    pub id: String,
    pub record_id: String,
    pub item_id: Option<String>,
    pub item_title: String,
    pub item_category: String,
    pub result: String,
    pub remarks: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateInspectionPlanRequest {
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub frequency: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub inspector: Option<String>,
    pub items: Vec<CreateInspectionItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInspectionItemRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub standard: Option<String>,
    pub order_num: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateInspectionRecordRequest {
    pub plan_id: Option<String>,
    pub title: String,
    pub inspection_type: String,
    pub location: Option<String>,
    pub inspector: Option<String>,
    pub inspected_at: Option<String>,
    pub issues: Option<Vec<String>>,
    pub items: Vec<CreateRecordItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecordItemRequest {
    pub item_id: Option<String>,
    pub item_title: String,
    pub item_category: String,
    pub result: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInspectionRecordRequest {
    pub result: Option<String>,
    pub status: Option<String>,
    pub issues: Option<Vec<String>>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/checks/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<InspectionPlan>>> {
    tracing::debug!("Listing inspection plans");
    Json(ApiResponse::success(
        Vec::<InspectionPlan>::new(),
        "获取检查计划列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans",
    request_body = CreateInspectionPlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInspectionPlanRequest>,
) -> Json<ApiResponse<InspectionPlan>> {
    tracing::debug!("Creating inspection plan: {:?}", req);
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    Json(ApiResponse::success(
        InspectionPlan {
            id: uuid::Uuid::new_v4().to_string(),
            plan_no: format!(
                "IP-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            inspection_type: req.inspection_type,
            frequency: req.frequency,
            start_date: req.start_date,
            end_date: req.end_date,
            inspector: req.inspector,
            status: "active".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "检查计划创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/checks/plans/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Getting inspection plan: {}", id);
    Json(ApiResponse::success(
        InspectionPlan {
            id,
            plan_no: "IP-2024001".to_string(),
            title: "月度安全检查计划".to_string(),
            description: Some("每月对生产车间进行安全检查".to_string()),
            inspection_type: "定期检查".to_string(),
            frequency: "monthly".to_string(),
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-12-31".to_string()),
            inspector: Some("安全员A".to_string()),
            status: "active".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取检查计划成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<InspectionPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Updating inspection plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        InspectionPlan {
            id,
            plan_no: "IP-2024001".to_string(),
            title: "月度安全检查计划".to_string(),
            description: Some("每月对生产车间进行安全检查".to_string()),
            inspection_type: "定期检查".to_string(),
            frequency: "monthly".to_string(),
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-12-31".to_string()),
            inspector: Some("安全员A".to_string()),
            status: "active".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "检查计划更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting inspection plan: {}", id);
    Json(ApiResponse::success((), "检查计划删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/checks/plans/{plan_id}/items",
    tag = "ehs",
    params(
        ("plan_id" = String, Path, description = "plan_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn list_plan_items(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<InspectionItem>>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Listing inspection items for plan: {}", plan_id);
    Json(ApiResponse::success(
        vec![
            InspectionItem {
                id: "1".to_string(),
                plan_id: plan_id.clone(),
                item_no: "IT-001".to_string(),
                title: "消防设施检查".to_string(),
                description: Some("检查灭火器、消防栓等消防设施是否完好".to_string()),
                category: "消防".to_string(),
                standard: Some("灭火器压力正常，有效期内".to_string()),
                order_num: 1,

                tenant_id,
            },
            InspectionItem {
                id: "2".to_string(),
                plan_id: plan_id.clone(),
                item_no: "IT-002".to_string(),
                title: "电气安全检查".to_string(),
                description: Some("检查电路、开关、插座等电气设备".to_string()),
                category: "电气".to_string(),
                standard: Some("无裸露电线，接地良好".to_string()),
                order_num: 2,

                tenant_id,
            },
            InspectionItem {
                id: "3".to_string(),
                plan_id,
                item_no: "IT-003".to_string(),
                title: "设备防护检查".to_string(),
                description: Some("检查机械设备防护罩是否完好".to_string()),
                category: "机械".to_string(),
                standard: Some("防护罩完好，无损坏".to_string()),
                order_num: 3,

                tenant_id,
            },
        ],
        "获取检查项列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans/{plan_id}/items",
    request_body = CreateInspectionItemRequest,
    tag = "ehs",
    params(
        ("plan_id" = String, Path, description = "plan_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn create_plan_item(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
    Json(req): Json<CreateInspectionItemRequest>,
) -> Json<ApiResponse<InspectionItem>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Creating inspection item for plan {}: {:?}", plan_id, req);
    Json(ApiResponse::success(
        InspectionItem {
            id: uuid::Uuid::new_v4().to_string(),
            plan_id,
            item_no: format!(
                "IT-{}",
                uuid::Uuid::new_v4().to_string()[..6].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            category: req.category,
            standard: req.standard,
            order_num: req.order_num,

            tenant_id,
        },
        "检查项创建成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/checks/plans/{plan_id}/items/{item_id}",
    tag = "ehs",
    params(
        ("plan_id" = String, Path, description = "plan_id"),
        ("item_id" = String, Path, description = "item_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_plan_item(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((plan_id, item_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting inspection item {} from plan {}", item_id, plan_id);
    Json(ApiResponse::success((), "检查项删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<InspectionRecord>>> {
    tracing::debug!("Listing inspection records");
    Json(ApiResponse::success(
        Vec::<InspectionRecord>::new(),
        "获取检查记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/checks/records",
    request_body = CreateInspectionRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateInspectionRecordRequest>,
) -> Json<ApiResponse<InspectionRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Creating inspection record: {:?}", req);
    let result = if req.items.iter().all(|i| i.result == "pass") {
        "合格".to_string()
    } else {
        "不合格".to_string()
    };

    Json(ApiResponse::success(
        InspectionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "IR-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            plan_id: req.plan_id,
            title: req.title,
            inspection_type: req.inspection_type,
            location: req.location,
            inspector: req.inspector,
            inspected_at: req
                .inspected_at
                .or_else(|| Some(chrono::Utc::now().to_rfc3339())),
            result: Some(result),
            issues: req.issues,
            attachments: None,
            status: "completed".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "检查记录创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/checks/records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionRecordDetail>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Getting inspection record: {}", id);
    Json(ApiResponse::success(
        InspectionRecordDetail {
            record: InspectionRecord {
                id: id.clone(),
                record_no: "IR-2024001".to_string(),
                plan_id: Some("plan-001".to_string()),
                title: "2024年1月安全检查".to_string(),
                inspection_type: "定期检查".to_string(),
                location: Some("生产车间A".to_string()),
                inspector: Some("安全员A".to_string()),
                inspected_at: Some(chrono::Utc::now().to_rfc3339()),
                result: Some("合格".to_string()),
                issues: Some(vec![]),
                attachments: None,
                status: "completed".to_string(),
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            },
            items: vec![
                RecordItem {
                    id: "1".to_string(),
                    record_id: id.clone(),
                    item_id: Some("IT-001".to_string()),
                    item_title: "消防设施检查".to_string(),
                    item_category: "消防".to_string(),
                    result: "pass".to_string(),
                    remarks: None,

                    tenant_id,
                },
                RecordItem {
                    id: "2".to_string(),
                    record_id: id,
                    item_id: Some("IT-002".to_string()),
                    item_title: "电气安全检查".to_string(),
                    item_category: "电气".to_string(),
                    result: "pass".to_string(),
                    remarks: None,

                    tenant_id,
                },
            ],
            tenant_id,
        },
        "获取检查记录成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/checks/records/{id}",
    request_body = UpdateInspectionRecordRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInspectionRecordRequest>,
) -> Json<ApiResponse<InspectionRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    tracing::debug!("Updating inspection record {}: {:?}", id, req);
    Json(ApiResponse::success(
        InspectionRecord {
            id,
            record_no: "IR-2024001".to_string(),
            plan_id: Some("plan-001".to_string()),
            title: "2024年1月安全检查".to_string(),
            inspection_type: "定期检查".to_string(),
            location: Some("生产车间A".to_string()),
            inspector: Some("安全员A".to_string()),
            inspected_at: Some(chrono::Utc::now().to_rfc3339()),
            result: req.result.or(Some("合格".to_string())),
            issues: req.issues,
            attachments: None,
            status: req.status.unwrap_or("completed".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "检查记录更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/checks/records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting inspection record: {}", id);
    Json(ApiResponse::success((), "检查记录删除成功"))
}
