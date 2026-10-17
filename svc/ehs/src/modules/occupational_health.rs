//! Occupational health records - Physical exams, health plans, contraindications, and follow-up

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/occupational-health/contraindications",
            get(list_contraindications).post(create_contraindication),
        )
        .route(
            "/occupational-health/contraindications/{id}",
            get(get_contraindication)
                .put(update_contraindication)
                .delete(delete_contraindication),
        )
        .route(
            "/occupational-health/statistics",
            get(get_health_statistics),
        )
        .route(
            "/occupational-health/check-plans",
            get(list_exam_plans).post(create_exam_plan),
        )
        .route(
            "/occupational-health/check-plans/{id}",
            get(get_exam_plan)
                .put(update_exam_plan)
                .delete(delete_exam_plan),
        )
        .route(
            "/occupational-health/check-records",
            get(list_exam_records).post(create_exam_record),
        )
        .route(
            "/occupational-health/check-records/{id}",
            get(get_exam_record)
                .put(update_exam_record)
                .delete(delete_exam_record),
        )
        .route(
            "/occupational-health/records",
            get(list_health_records).post(create_health_record),
        )
        .route(
            "/occupational-health/records/{id}",
            get(get_health_record)
                .put(update_health_record)
                .delete(delete_health_record),
        )
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub status: Option<String>,
    pub employee_id: Option<String>,
    pub exam_type: Option<String>,
    pub year: Option<i32>,
}

/// 健康档案（对齐前端 apps/web/src/api/ehs/types/health.ts HealthRecord）
#[derive(Debug, Serialize)]
pub struct HealthRecord {
    pub id: String,
    pub record_no: String,
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub workplace: Option<String>,
    pub hazard_factors: Option<Vec<String>>,
    pub blood_type: Option<String>,
    pub allergy_history: Option<String>,
    pub medical_history: Option<String>,
    pub contact_info: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateHealthRecordRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub workplace: Option<String>,
    pub hazard_factors: Option<Vec<String>>,
    pub blood_type: Option<String>,
    pub allergy_history: Option<String>,
    pub medical_history: Option<String>,
    pub contact_info: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHealthRecordRequest {
    pub employee_name: Option<String>,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub workplace: Option<String>,
    pub hazard_factors: Option<Vec<String>>,
    pub blood_type: Option<String>,
    pub allergy_history: Option<String>,
    pub medical_history: Option<String>,
    pub contact_info: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthExamPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub exam_type: String,
    pub plan_date: Option<String>,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub hospital: Option<String>,
    pub participants_count: Option<i32>,
    pub status: String,
    pub organizer: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthExamRecord {
    pub id: String,
    pub record_no: String,
    pub plan_id: Option<String>,
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub exam_type: String,
    pub exam_date: Option<String>,
    pub hospital: Option<String>,
    pub overall_result: String,
    pub blood_pressure: Option<String>,
    pub heart_rate: Option<i32>,
    pub vision: Option<String>,
    pub hearing: Option<String>,
    pub lung_function: Option<String>,
    pub liver_function: Option<String>,
    pub kidney_function: Option<String>,
    pub blood_routine: Option<String>,
    pub urine_routine: Option<String>,
    pub chest_xray: Option<String>,
    pub ecg: Option<String>,
    pub abnormal_items: Option<Vec<String>>,
    pub diagnosis: Option<String>,
    pub doctor_advice: Option<String>,
    pub doctor: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct Contraindication {
    pub id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub contraindication_type: String,
    pub description: Option<String>,
    pub diagnosed_at: Option<String>,
    pub hospital: Option<String>,
    pub status: String,
    pub work_restriction: Option<String>,
    pub advised_position: Option<String>,
    pub follow_up_date: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthAbnormality {
    pub id: String,
    pub record_id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub item_name: String,
    pub item_result: Option<String>,
    pub reference_range: Option<String>,
    pub severity: Option<String>,
    pub status: String,
    pub follow_up_advice: Option<String>,
    pub follow_up_date: Option<String>,
    pub follow_up_result: Option<String>,
    pub responsible_person: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthArchive {
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub total_exams: i32,
    pub last_exam_date: Option<String>,
    pub last_exam_result: Option<String>,
    pub exam_records: Vec<HealthExamRecord>,
    pub contraindications: Vec<Contraindication>,
    pub abnormalities: Vec<HealthAbnormality>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthStatistics {
    pub total_employees: i32,
    pub exam_planned: i32,
    pub exam_completed: i32,
    pub normal_count: i32,
    pub abnormal_count: i32,
    pub contraindication_count: i32,
    pub by_department: Vec<serde_json::Value>,
    pub by_abnormality_type: Vec<serde_json::Value>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateExamPlanRequest {
    pub title: String,
    pub description: Option<String>,
    pub exam_type: String,
    pub plan_date: Option<String>,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub hospital: Option<String>,
    pub participants_count: Option<i32>,
    pub organizer: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExamPlanRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub exam_type: Option<String>,
    pub plan_date: Option<String>,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub hospital: Option<String>,
    pub participants_count: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExamRecordRequest {
    pub plan_id: Option<String>,
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub exam_type: String,
    pub exam_date: Option<String>,
    pub hospital: Option<String>,
    pub overall_result: String,
    pub blood_pressure: Option<String>,
    pub heart_rate: Option<i32>,
    pub vision: Option<String>,
    pub hearing: Option<String>,
    pub lung_function: Option<String>,
    pub liver_function: Option<String>,
    pub kidney_function: Option<String>,
    pub blood_routine: Option<String>,
    pub urine_routine: Option<String>,
    pub chest_xray: Option<String>,
    pub ecg: Option<String>,
    pub abnormal_items: Option<Vec<String>>,
    pub diagnosis: Option<String>,
    pub doctor_advice: Option<String>,
    pub doctor: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExamRecordRequest {
    pub overall_result: Option<String>,
    pub blood_pressure: Option<String>,
    pub heart_rate: Option<i32>,
    pub vision: Option<String>,
    pub hearing: Option<String>,
    pub lung_function: Option<String>,
    pub liver_function: Option<String>,
    pub kidney_function: Option<String>,
    pub blood_routine: Option<String>,
    pub urine_routine: Option<String>,
    pub chest_xray: Option<String>,
    pub ecg: Option<String>,
    pub abnormal_items: Option<Vec<String>>,
    pub diagnosis: Option<String>,
    pub doctor_advice: Option<String>,
    pub doctor: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContraindicationRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub contraindication_type: String,
    pub description: Option<String>,
    pub diagnosed_at: Option<String>,
    pub hospital: Option<String>,
    pub work_restriction: Option<String>,
    pub advised_position: Option<String>,
    pub follow_up_date: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContraindicationRequest {
    pub contraindication_type: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub work_restriction: Option<String>,
    pub advised_position: Option<String>,
    pub follow_up_date: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAbnormalityRequest {
    pub severity: Option<String>,
    pub status: Option<String>,
    pub follow_up_advice: Option<String>,
    pub follow_up_date: Option<String>,
    pub follow_up_result: Option<String>,
    pub responsible_person: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/occupational-health/exam-plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamPlan>>> {
    tracing::debug!("Listing health exam plans");
    Json(ApiResponse::success(
        Vec::<HealthExamPlan>::new(),
        "获取体检计划列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/occupational-health/exam-plans",
    request_body = CreateExamPlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating health exam plan: {:?}", req);
    Json(ApiResponse::success(
        HealthExamPlan {
            id: uuid::Uuid::new_v4().to_string(),
            plan_no: format!(
                "HEP-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            exam_type: req.exam_type,
            plan_date: req.plan_date,
            end_date: req.end_date,
            location: req.location,
            hospital: req.hospital,
            participants_count: req.participants_count,
            status: "planned".to_string(),
            organizer: req.organizer,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "体检计划创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting health exam plan: {}", id);
    Json(ApiResponse::success(
        HealthExamPlan {
            id,
            plan_no: "HEP-2024001".to_string(),
            title: "2024年度职业健康体检".to_string(),
            description: Some("全员职业健康体检".to_string()),
            exam_type: "annual".to_string(),
            plan_date: Some("2024-05-01".to_string()),
            end_date: Some("2024-05-31".to_string()),
            location: Some("市职业健康中心".to_string()),
            hospital: Some("市职业病防治院".to_string()),
            participants_count: Some(500),
            status: "in_progress".to_string(),
            organizer: Some("人力资源部".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取体检计划详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    request_body = UpdateExamPlanRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating health exam plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        HealthExamPlan {
            id,
            plan_no: "HEP-2024001".to_string(),
            title: req
                .title
                .unwrap_or_else(|| "2024年度职业健康体检".to_string()),
            description: req.description,
            exam_type: req.exam_type.unwrap_or_else(|| "annual".to_string()),
            plan_date: req.plan_date,
            end_date: req.end_date,
            location: req.location,
            hospital: req.hospital,
            participants_count: req.participants_count,
            status: req.status.unwrap_or_else(|| "planned".to_string()),
            organizer: Some("人力资源部".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "体检计划更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting health exam plan: {}", id);
    Json(ApiResponse::success((), "体检计划删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/exam-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamRecord>>> {
    tracing::debug!("Listing health exam records");
    Json(ApiResponse::success(
        Vec::<HealthExamRecord>::new(),
        "获取体检记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-health/exam-records",
    request_body = CreateExamRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating health exam record: {:?}", req);
    Json(ApiResponse::success(
        HealthExamRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "HER-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            plan_id: req.plan_id,
            employee_id: req.employee_id,
            employee_name: req.employee_name,
            department: req.department,
            position: req.position,
            exam_type: req.exam_type,
            exam_date: req.exam_date,
            hospital: req.hospital,
            overall_result: req.overall_result,
            blood_pressure: req.blood_pressure,
            heart_rate: req.heart_rate,
            vision: req.vision,
            hearing: req.hearing,
            lung_function: req.lung_function,
            liver_function: req.liver_function,
            kidney_function: req.kidney_function,
            blood_routine: req.blood_routine,
            urine_routine: req.urine_routine,
            chest_xray: req.chest_xray,
            ecg: req.ecg,
            abnormal_items: req.abnormal_items,
            diagnosis: req.diagnosis,
            doctor_advice: req.doctor_advice,
            doctor: req.doctor,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "体检记录创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/exam-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting health exam record: {}", id);
    Json(ApiResponse::success(
        HealthExamRecord {
            id,
            record_no: "HER-2024001".to_string(),
            plan_id: Some("plan-001".to_string()),
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("操作工".to_string()),
            exam_type: "annual".to_string(),
            exam_date: Some("2024-05-15".to_string()),
            hospital: Some("市职业病防治院".to_string()),
            overall_result: "abnormal".to_string(),
            blood_pressure: Some("135/85".to_string()),
            heart_rate: Some(78),
            vision: Some("5.0/5.0".to_string()),
            hearing: Some("正常".to_string()),
            lung_function: Some("正常".to_string()),
            liver_function: Some("ALT偏高".to_string()),
            kidney_function: Some("正常".to_string()),
            blood_routine: Some("正常".to_string()),
            urine_routine: Some("正常".to_string()),
            chest_xray: Some("正常".to_string()),
            ecg: Some("正常".to_string()),
            abnormal_items: Some(vec!["肝功能ALT偏高".to_string(), "血压偏高".to_string()]),
            diagnosis: Some("肝功能异常，建议复查".to_string()),
            doctor_advice: Some("注意休息，避免饮酒，一个月后复查肝功能".to_string()),
            doctor: Some("李医生".to_string()),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取体检记录详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/occupational-health/exam-records/{id}",
    request_body = UpdateExamRecordRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating health exam record {}: {:?}", id, req);
    Json(ApiResponse::success(
        HealthExamRecord {
            id,
            record_no: "HER-2024001".to_string(),
            plan_id: Some("plan-001".to_string()),
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("操作工".to_string()),
            exam_type: "annual".to_string(),
            exam_date: Some("2024-05-15".to_string()),
            hospital: Some("市职业病防治院".to_string()),
            overall_result: req.overall_result.unwrap_or_else(|| "normal".to_string()),
            blood_pressure: req.blood_pressure,
            heart_rate: req.heart_rate,
            vision: req.vision,
            hearing: req.hearing,
            lung_function: req.lung_function,
            liver_function: req.liver_function,
            kidney_function: req.kidney_function,
            blood_routine: req.blood_routine,
            urine_routine: req.urine_routine,
            chest_xray: req.chest_xray,
            ecg: req.ecg,
            abnormal_items: req.abnormal_items,
            diagnosis: req.diagnosis,
            doctor_advice: req.doctor_advice,
            doctor: req.doctor,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "体检记录更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/occupational-health/exam-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting health exam record: {}", id);
    Json(ApiResponse::success((), "体检记录删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/contraindications",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_contraindications(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<Contraindication>>> {
    tracing::debug!("Listing contraindications");
    Json(ApiResponse::success(
        Vec::<Contraindication>::new(),
        "获取职业禁忌症列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-health/contraindications",
    request_body = CreateContraindicationRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating contraindication: {:?}", req);
    Json(ApiResponse::success(
        Contraindication {
            id: uuid::Uuid::new_v4().to_string(),
            employee_id: req.employee_id,
            employee_name: req.employee_name,
            department: req.department,
            position: req.position,
            contraindication_type: req.contraindication_type,
            description: req.description,
            diagnosed_at: req.diagnosed_at,
            hospital: req.hospital,
            status: "active".to_string(),
            work_restriction: req.work_restriction,
            advised_position: req.advised_position,
            follow_up_date: req.follow_up_date,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "职业禁忌症创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/contraindications/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "禁忌症记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting contraindication: {}", id);
    Json(ApiResponse::success(
        Contraindication {
            id,
            employee_id: "EMP-001".to_string(),
            employee_name: "测试员工".to_string(),
            department: Some("生产部".to_string()),
            position: Some("操作工".to_string()),
            contraindication_type: "noise".to_string(),
            description: Some("职业禁忌症（内存桩数据）".to_string()),
            diagnosed_at: Some(chrono::Utc::now().to_rfc3339()),
            hospital: Some("职业病防治院".to_string()),
            status: "active".to_string(),
            work_restriction: Some("限制接触噪声岗位".to_string()),
            advised_position: Some("调岗至文员".to_string()),
            follow_up_date: None,
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "获取职业禁忌症成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-health/contraindications/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "禁忌症记录 ID")),
    request_body = CreateContraindicationRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating contraindication {}: {:?}", id, req);
    Json(ApiResponse::success(
        Contraindication {
            id,
            employee_id: req.employee_id,
            employee_name: req.employee_name,
            department: req.department,
            position: req.position,
            contraindication_type: req.contraindication_type,
            description: req.description,
            diagnosed_at: req.diagnosed_at,
            hospital: req.hospital,
            status: "active".to_string(),
            work_restriction: req.work_restriction,
            advised_position: req.advised_position,
            follow_up_date: req.follow_up_date,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "职业禁忌症更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-health/contraindications/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "禁忌症记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting contraindication: {}", id);
    Json(ApiResponse::success((), "职业禁忌症删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_health_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<HealthStatistics>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting health statistics");
    Json(ApiResponse::success(
        HealthStatistics {
            total_employees: 500,
            exam_planned: 500,
            exam_completed: 480,
            normal_count: 420,
            abnormal_count: 60,
            contraindication_count: 15,
            by_department: vec![
                serde_json::json!({ "department": "生产部", "total": 200, "examined": 195, "abnormal": 30 }),
                serde_json::json!({ "department": "技术部", "total": 80, "examined": 78, "abnormal": 8 }),
                serde_json::json!({ "department": "质量部", "total": 50, "examined": 48, "abnormal": 5 }),
            ],
            by_abnormality_type: vec![
                serde_json::json!({ "type": "肝功能异常", "count": 20 }),
                serde_json::json!({ "type": "血压偏高", "count": 18 }),
                serde_json::json!({ "type": "听力下降", "count": 12 }),
                serde_json::json!({ "type": "视力异常", "count": 10 }),
            ],

            tenant_id,
        },
        "获取健康统计成功",
    ))
}

// ---- health records（/occupational-health/records，接 ehs.health_records）----

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_health_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<HealthQuery>,
) -> Json<ApiResponse<Vec<HealthRecord>>> {
    let tenant_bind = resolve_health_tenant(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(d) = &q.department {
        where_clause.push_str(&format!(" AND department = ${}", params.len() + 1));
        params.push(d.clone());
    }
    if let Some(p) = &q.position {
        where_clause.push_str(&format!(" AND position = ${}", params.len() + 1));
        params.push(p.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR employee_id ILIKE ${} OR record_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2,
            params.len() + 3
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, employee_id, employee_name, gender,
               birth_date::text AS birthday, department, position, workplace,
               hazard_factors, blood_type,
               COALESCE(allergy_history, allergies::text) AS allergy_history,
               medical_history, contact_info, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.health_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list health records: {}", e);
            return Json(ApiResponse::error(500, "获取健康档案列表失败"));
        }
    };
    let list: Vec<HealthRecord> = rows.iter().map(health_record_from_row).collect();
    Json(ApiResponse::success(list, "获取健康档案列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-health/records",
    request_body = CreateHealthRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_health_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateHealthRecordRequest>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_id = resolve_health_tenant(&claims);
    let record_no = format!("HR-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let hazard_factors: serde_json::Value = req
        .hazard_factors
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let status = req.status.clone().unwrap_or_else(|| "active".to_string());

    let sql = r#"
        INSERT INTO ehs.health_records
            (record_no, employee_id, employee_name, gender, birth_date, department,
             position, workplace, hazard_factors, blood_type, allergy_history,
             medical_history, contact_info, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id::text AS id, record_no, employee_id, employee_name, gender,
                  birth_date::text AS birthday, department, position, workplace,
                  hazard_factors, blood_type, allergy_history, medical_history,
                  contact_info, status, created_at::text AS created_at,
                  updated_at::text AS updated_at, tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&record_no)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(&req.gender)
        .bind(&req.birthday)
        .bind(&req.department)
        .bind(&req.position)
        .bind(&req.workplace)
        .bind(hazard_factors)
        .bind(&req.blood_type)
        .bind(&req.allergy_history)
        .bind(&req.medical_history)
        .bind(&req.contact_info)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create health record: {}", e);
            return Json(ApiResponse::error(500, "健康档案创建失败"));
        }
    };
    let record = health_record_from_row(&row);
    Json(ApiResponse::success(record, "健康档案创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_health_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_bind = resolve_health_tenant(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, record_no, employee_id, employee_name, gender,
               birth_date::text AS birthday, department, position, workplace,
               hazard_factors, blood_type, allergy_history, medical_history,
               contact_info, status, created_at::text AS created_at,
               updated_at::text AS updated_at, tenant_id::text AS tenant_id
        FROM ehs.health_records
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "健康档案不存在")),
        Err(e) => {
            tracing::error!("Failed to get health record: {}", e);
            return Json(ApiResponse::error(500, "获取健康档案失败"));
        }
    };
    let record = health_record_from_row(&row);
    Json(ApiResponse::success(record, "获取健康档案成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/occupational-health/records/{id}",
    request_body = UpdateHealthRecordRequest,
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_health_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateHealthRecordRequest>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_bind = resolve_health_tenant(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.employee_name {
        sets.push(format!("employee_name = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.gender {
        sets.push(format!("gender = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.birthday {
        sets.push(format!("birth_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.department {
        sets.push(format!("department = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.position {
        sets.push(format!("position = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.workplace {
        sets.push(format!("workplace = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.hazard_factors {
        sets.push(format!("hazard_factors = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.blood_type {
        sets.push(format!("blood_type = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.allergy_history {
        sets.push(format!("allergy_history = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.medical_history {
        sets.push(format!("medical_history = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.contact_info {
        sets.push(format!("contact_info = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.health_records
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, record_no, employee_id, employee_name, gender,
                  birth_date::text AS birthday, department, position, workplace,
                  hazard_factors, blood_type, allergy_history, medical_history,
                  contact_info, status, created_at::text AS created_at,
                  updated_at::text AS updated_at, tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "健康档案不存在")),
        Err(e) => {
            tracing::error!("Failed to update health record: {}", e);
            return Json(ApiResponse::error(500, "健康档案更新失败"));
        }
    };
    let record = health_record_from_row(&row);
    Json(ApiResponse::success(record, "健康档案更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/occupational-health/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_health_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_health_tenant(&claims).to_string();
    let sql = r#"
        UPDATE ehs.health_records
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete health record: {}", e);
            return Json(ApiResponse::error(500, "健康档案删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "健康档案不存在"));
    }
    Json(ApiResponse::success((), "健康档案删除成功"))
}

/// 解析请求租户：超管 → nil UUID（全租户可见）；否则取 claims.tenant_id。
fn resolve_health_tenant(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// ehs.health_records 行 → HealthRecord
fn health_record_from_row(r: &sqlx::postgres::PgRow) -> HealthRecord {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let hazard_factors: Option<serde_json::Value> = r.try_get("hazard_factors").ok().flatten();
    let hazard_factors = hazard_factors.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    HealthRecord {
        id: r.try_get("id").unwrap_or_default(),
        record_no: r.try_get("record_no").unwrap_or_default(),
        employee_id: r.try_get("employee_id").unwrap_or_default(),
        employee_name: r.try_get("employee_name").unwrap_or_default(),
        gender: r.try_get("gender").ok().flatten(),
        birthday: r.try_get("birthday").ok().flatten(),
        department: r.try_get("department").ok().flatten(),
        position: r.try_get("position").ok().flatten(),
        workplace: r.try_get("workplace").ok().flatten(),
        hazard_factors,
        blood_type: r.try_get("blood_type").ok().flatten(),
        allergy_history: r.try_get("allergy_history").ok().flatten(),
        medical_history: r.try_get("medical_history").ok().flatten(),
        contact_info: r.try_get("contact_info").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "active".to_string()),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
