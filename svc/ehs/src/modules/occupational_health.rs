//! Occupational health records - Physical exams, health plans, contraindications, and follow-up

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
        .route(
            "/occupational-health/exam-plans",
            get(list_exam_plans).post(create_exam_plan),
        )
        .route(
            "/occupational-health/exam-plans/{id}",
            get(get_exam_plan)
                .put(update_exam_plan)
                .delete(delete_exam_plan),
        )
        .route(
            "/occupational-health/exam-records",
            get(list_exam_records).post(create_exam_record),
        )
        .route(
            "/occupational-health/exam-records/{id}",
            get(get_exam_record)
                .put(update_exam_record)
                .delete(delete_exam_record),
        )
        .route(
            "/occupational-health/archives/{employee_id}",
            get(get_health_archive),
        )
        .route(
            "/occupational-health/contraindications",
            get(list_contraindications).post(create_contraindication),
        )
        .route(
            "/occupational-health/contraindications/{id}",
            put(update_contraindication).delete(delete_contraindication),
        )
        .route(
            "/occupational-health/abnormalities",
            get(list_abnormalities),
        )
        .route(
            "/occupational-health/abnormalities/{id}",
            put(update_abnormality),
        )
        .route("/occupational-health/exam-types", get(list_exam_types))
        .route(
            "/occupational-health/statistics",
            get(get_health_statistics),
        )
        .route(
            "/occupational-health/check-plans",
            get(list_exam_plans).post(create_exam_plan),
        )
        .route(
            "/occupational-health/check-records",
            get(list_exam_records).post(create_exam_record),
        )
        .route(
            "/occupational-health/records",
            get(list_exam_records).post(create_exam_record),
        )
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub employee_id: Option<String>,
    pub exam_type: Option<String>,
    pub year: Option<i32>,
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
    path = "/api/ehs/occupational-health/exam-plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamPlan>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing health exam plans");
    Json(ApiResponse::success(
        Vec::<HealthExamPlan>::new(),
        "获取体检计划列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/exam-plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-plans/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_exam_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting health exam plan: {}", id);
    Json(ApiResponse::success((), "体检计划删除成功"))
}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/exam-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamRecord>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing health exam records");
    Json(ApiResponse::success(
        Vec::<HealthExamRecord>::new(),
        "获取体检记录列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/exam-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-records/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-records/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    path = "/api/ehs/occupational-health/exam-records/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_exam_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting health exam record: {}", id);
    Json(ApiResponse::success((), "体检记录删除成功"))
}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/archives/{employee_id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_health_archive(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(employee_id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthArchive>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting health archive for employee: {}", employee_id);
    Json(ApiResponse::success(
        HealthArchive {
            employee_id: employee_id.clone(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("操作工".to_string()),
            total_exams: 5,
            last_exam_date: Some("2024-05-15".to_string()),
            last_exam_result: Some("abnormal".to_string()),
            exam_records: vec![],
            contraindications: vec![],
            abnormalities: vec![],

            tenant_id,
        },
        "获取健康档案成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/contraindications",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_contraindications(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Contraindication>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing contraindications");
    Json(ApiResponse::success(
        Vec::<Contraindication>::new(),
        "获取职业禁忌症列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/contraindications",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
    put,
    path = "/api/ehs/occupational-health/contraindications/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating contraindication {}: {:?}", id, req);
    Json(ApiResponse::success(
        Contraindication {
            id,
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("操作工".to_string()),
            contraindication_type: req
                .contraindication_type
                .unwrap_or_else(|| "hearing".to_string()),
            description: req.description,
            diagnosed_at: Some("2024-01-15".to_string()),
            hospital: Some("市职业病防治院".to_string()),
            status: req.status.unwrap_or_else(|| "active".to_string()),
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
    path = "/api/ehs/occupational-health/contraindications/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_contraindication(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting contraindication: {}", id);
    Json(ApiResponse::success((), "职业禁忌症删除成功"))
}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/abnormalities",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_abnormalities(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthAbnormality>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing health abnormalities");
    Json(ApiResponse::success(
        Vec::<HealthAbnormality>::new(),
        "获取体检异常列表成功",
    ))
}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-health/abnormalities/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_abnormality(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateAbnormalityRequest>,
) -> Json<ApiResponse<HealthAbnormality>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating abnormality {}: {:?}", id, req);
    Json(ApiResponse::success(
        HealthAbnormality {
            id,
            record_id: "record-001".to_string(),
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            item_name: "肝功能ALT".to_string(),
            item_result: Some("65 U/L".to_string()),
            reference_range: Some("0-40 U/L".to_string()),
            severity: req.severity,
            status: req.status.unwrap_or_else(|| "pending".to_string()),
            follow_up_advice: req.follow_up_advice,
            follow_up_date: req.follow_up_date,
            follow_up_result: req.follow_up_result,
            responsible_person: req.responsible_person,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "异常项更新成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_health_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<HealthStatistics>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/exam-types",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_types(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing exam types");
    let types = vec![
        serde_json::json!({ "code": "pre_employment", "name": "上岗前体检" }),
        serde_json::json!({ "code": "annual", "name": "年度体检" }),
        serde_json::json!({ "code": "periodic", "name": "定期体检" }),
        serde_json::json!({ "code": "post_employment", "name": "离岗体检" }),
        serde_json::json!({ "code": "emergency", "name": "应急体检" }),
        serde_json::json!({ "code": "follow_up", "name": "复查体检" }),
    ];
    Json(ApiResponse::success(types, "获取体检类型成功"))
}
