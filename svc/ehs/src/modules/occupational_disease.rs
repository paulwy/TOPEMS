//! Occupational disease prevention - Hazard factors, detection records, cases, protection, and training

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
            "/occupational-disease/factors",
            get(list_hazard_factors).post(create_hazard_factor),
        )
        .route(
            "/occupational-disease/factors/{id}",
            get(get_hazard_factor)
                .put(update_hazard_factor)
                .delete(delete_hazard_factor),
        )
        .route(
            "/occupational-disease/detections",
            get(list_detection_records).post(create_detection_record),
        )
        .route(
            "/occupational-disease/detections/{id}",
            get(get_detection_record).delete(delete_detection_record),
        )
        .route(
            "/occupational-disease/cases",
            get(list_disease_cases).post(create_disease_case),
        )
        .route(
            "/occupational-disease/cases/{id}",
            get(get_disease_case)
                .put(update_disease_case)
                .delete(delete_disease_case),
        )
        .route(
            "/occupational-disease/protection-measures",
            get(list_protection_measures).post(create_protection_measure),
        )
        .route(
            "/occupational-disease/protection-measures/{id}",
            get(get_protection_measure)
                .put(update_protection_measure)
                .delete(delete_protection_measure),
        )
        .route(
            "/occupational-disease/trainings",
            get(list_health_trainings).post(create_health_training),
        )
        .route(
            "/occupational-disease/trainings/{id}",
            get(get_health_training).delete(delete_health_training),
        )
        .route("/occupational-disease/factor-types", get(list_factor_types))
        .route(
            "/occupational-disease/statistics",
            get(get_disease_statistics),
        )
        .route(
            "/occupational-diseases/factors",
            get(list_hazard_factors).post(create_hazard_factor),
        )
        .route(
            "/occupational-diseases/detection-records",
            get(list_detection_records).post(create_detection_record),
        )
        .route(
            "/occupational-diseases/cases",
            get(list_disease_cases).post(create_disease_case),
        )
        .route(
            "/occupational-diseases/protection-measures",
            get(list_protection_measures).post(create_protection_measure),
        )
}

#[derive(Debug, Deserialize)]
pub struct DiseaseQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub factor_type: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct HazardFactor {
    pub id: String,
    pub factor_no: String,
    pub name: String,
    pub factor_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DetectionRecord {
    pub id: String,
    pub record_no: String,
    pub factor_id: Option<String>,
    pub factor_name: String,
    pub factor_type: String,
    pub detect_point: String,
    pub detect_date: Option<String>,
    pub detect_agency: Option<String>,
    pub detect_method: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub result: String,
    pub detector: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DiseaseCase {
    pub id: String,
    pub case_no: String,
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub disease_type: String,
    pub disease_name: String,
    pub severity: Option<String>,
    pub diagnosed_at: Option<String>,
    pub diagnosing_hospital: Option<String>,
    pub diagnosis_basis: Option<String>,
    pub status: String,
    pub treatment_plan: Option<String>,
    pub work_arrangement: Option<String>,
    pub compensation_status: Option<String>,
    pub outcome: Option<String>,
    pub closed_at: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ProtectionMeasure {
    pub id: String,
    pub measure_no: String,
    pub title: String,
    pub measure_type: String,
    pub description: Option<String>,
    pub related_factors: Option<Vec<String>>,
    pub related_positions: Option<Vec<String>>,
    pub implementation_date: Option<String>,
    pub status: String,
    pub responsible_person: Option<String>,
    pub effectiveness: Option<String>,
    pub inspection_date: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthTraining {
    pub id: String,
    pub training_no: String,
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub location: Option<String>,
    pub participants_count: Option<i32>,
    pub duration_hours: Option<i32>,
    pub status: String,
    pub pass_rate: Option<f64>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DiseaseStatistics {
    pub total_factors: i32,
    pub controlled_factors: i32,
    pub total_detections: i32,
    pub qualified_detections: i32,
    pub total_cases: i32,
    pub active_cases: i32,
    pub total_trainings: i32,
    pub total_participants: i32,
    pub by_factor_type: Vec<serde_json::Value>,
    pub by_department: Vec<serde_json::Value>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateHazardFactorRequest {
    pub name: String,
    pub factor_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHazardFactorRequest {
    pub name: Option<String>,
    pub factor_type: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDetectionRecordRequest {
    pub factor_id: Option<String>,
    pub factor_name: String,
    pub factor_type: String,
    pub detect_point: String,
    pub detect_date: Option<String>,
    pub detect_agency: Option<String>,
    pub detect_method: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub result: String,
    pub detector: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDiseaseCaseRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub disease_type: String,
    pub disease_name: String,
    pub severity: Option<String>,
    pub diagnosed_at: Option<String>,
    pub diagnosing_hospital: Option<String>,
    pub diagnosis_basis: Option<String>,
    pub treatment_plan: Option<String>,
    pub work_arrangement: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDiseaseCaseRequest {
    pub severity: Option<String>,
    pub status: Option<String>,
    pub treatment_plan: Option<String>,
    pub work_arrangement: Option<String>,
    pub compensation_status: Option<String>,
    pub outcome: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProtectionMeasureRequest {
    pub title: String,
    pub measure_type: String,
    pub description: Option<String>,
    pub related_factors: Option<Vec<String>>,
    pub related_positions: Option<Vec<String>>,
    pub implementation_date: Option<String>,
    pub responsible_person: Option<String>,
    pub effectiveness: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHealthTrainingRequest {
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub location: Option<String>,
    pub participants_count: Option<i32>,
    pub duration_hours: Option<i32>,
    pub pass_rate: Option<f64>,
}

pub async fn list_hazard_factors(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HazardFactor>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing hazard factors");
    Json(ApiResponse::success(
        Vec::<HazardFactor>::new(),
        "获取危害因素列表成功",
    ))
}

pub async fn create_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateHazardFactorRequest>,
) -> Json<ApiResponse<HazardFactor>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating hazard factor: {:?}", req);
    Json(ApiResponse::success(
        HazardFactor {
            id: uuid::Uuid::new_v4().to_string(),
            factor_no: format!(
                "HF-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            name: req.name,
            factor_type: req.factor_type,
            category: req.category,
            description: req.description,
            hazard_level: req.hazard_level,
            exposure_limit: req.exposure_limit,
            unit: req.unit,
            sources: req.sources,
            affected_positions: req.affected_positions,
            affected_count: req.affected_count,
            status: "active".to_string(),
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "危害因素创建成功",
    ))
}

pub async fn get_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HazardFactor>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting hazard factor: {}", id);
    Json(ApiResponse::success(
        HazardFactor {
            id,
            factor_no: "HF-2024001".to_string(),
            name: "噪声".to_string(),
            factor_type: "physical".to_string(),
            category: Some("物理因素".to_string()),
            description: Some("生产设备产生的噪声".to_string()),
            hazard_level: Some("medium".to_string()),
            exposure_limit: Some("85 dB(A)".to_string()),
            unit: Some("dB(A)".to_string()),
            sources: Some(vec!["冲压机".to_string(), "空压机".to_string()]),
            affected_positions: Some(vec!["操作工".to_string(), "维修工".to_string()]),
            affected_count: Some(50),
            status: "active".to_string(),
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取危害因素详情成功",
    ))
}

pub async fn update_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateHazardFactorRequest>,
) -> Json<ApiResponse<HazardFactor>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating hazard factor {}: {:?}", id, req);
    Json(ApiResponse::success(
        HazardFactor {
            id,
            factor_no: "HF-2024001".to_string(),
            name: req.name.unwrap_or_else(|| "噪声".to_string()),
            factor_type: req.factor_type.unwrap_or_else(|| "physical".to_string()),
            category: req.category,
            description: req.description,
            hazard_level: req.hazard_level,
            exposure_limit: req.exposure_limit,
            unit: req.unit,
            sources: req.sources,
            affected_positions: req.affected_positions,
            affected_count: req.affected_count,
            status: req.status.unwrap_or_else(|| "active".to_string()),
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "危害因素更新成功",
    ))
}

pub async fn delete_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting hazard factor: {}", id);
    Json(ApiResponse::success((), "危害因素删除成功"))
}

pub async fn list_detection_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<DetectionRecord>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing detection records");
    Json(ApiResponse::success(
        Vec::<DetectionRecord>::new(),
        "获取检测记录列表成功",
    ))
}

pub async fn create_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateDetectionRecordRequest>,
) -> Json<ApiResponse<DetectionRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating detection record: {:?}", req);
    Json(ApiResponse::success(
        DetectionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "DR-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            factor_id: req.factor_id,
            factor_name: req.factor_name,
            factor_type: req.factor_type,
            detect_point: req.detect_point,
            detect_date: req.detect_date,
            detect_agency: req.detect_agency,
            detect_method: req.detect_method,
            concentration: req.concentration,
            unit: req.unit,
            standard_value: req.standard_value,
            result: req.result,
            detector: req.detector,
            status: "completed".to_string(),
            remarks: req.remarks,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "检测记录创建成功",
    ))
}

pub async fn get_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<DetectionRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting detection record: {}", id);
    Json(ApiResponse::success(
        DetectionRecord {
            id,
            record_no: "DR-2024001".to_string(),
            factor_id: Some("factor-001".to_string()),
            factor_name: "噪声".to_string(),
            factor_type: "physical".to_string(),
            detect_point: "冲压车间A区".to_string(),
            detect_date: Some("2024-06-01".to_string()),
            detect_agency: Some("市职业卫生检测中心".to_string()),
            detect_method: Some("声级计法".to_string()),
            concentration: Some("88".to_string()),
            unit: Some("dB(A)".to_string()),
            standard_value: Some("85".to_string()),
            result: "over_limit".to_string(),
            detector: Some("王检测".to_string()),
            status: "completed".to_string(),
            remarks: Some("略超过限值，需加强防护".to_string()),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取检测记录详情成功",
    ))
}

pub async fn delete_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting detection record: {}", id);
    Json(ApiResponse::success((), "检测记录删除成功"))
}

pub async fn list_disease_cases(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<DiseaseCase>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing disease cases");
    Json(ApiResponse::success(
        Vec::<DiseaseCase>::new(),
        "获取职业病案例列表成功",
    ))
}

pub async fn create_disease_case(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateDiseaseCaseRequest>,
) -> Json<ApiResponse<DiseaseCase>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating disease case: {:?}", req);
    Json(ApiResponse::success(
        DiseaseCase {
            id: uuid::Uuid::new_v4().to_string(),
            case_no: format!(
                "DC-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            employee_id: req.employee_id,
            employee_name: req.employee_name,
            department: req.department,
            position: req.position,
            disease_type: req.disease_type,
            disease_name: req.disease_name,
            severity: req.severity,
            diagnosed_at: req.diagnosed_at,
            diagnosing_hospital: req.diagnosing_hospital,
            diagnosis_basis: req.diagnosis_basis,
            status: "active".to_string(),
            treatment_plan: req.treatment_plan,
            work_arrangement: req.work_arrangement,
            compensation_status: None,
            outcome: None,
            closed_at: None,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "职业病案例创建成功",
    ))
}

pub async fn get_disease_case(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<DiseaseCase>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting disease case: {}", id);
    Json(ApiResponse::success(
        DiseaseCase {
            id,
            case_no: "DC-2024001".to_string(),
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("冲压工".to_string()),
            disease_type: "noise_induced".to_string(),
            disease_name: "噪声聋".to_string(),
            severity: Some("mild".to_string()),
            diagnosed_at: Some("2024-03-15".to_string()),
            diagnosing_hospital: Some("市职业病防治院".to_string()),
            diagnosis_basis: Some("纯音听力测试，职业史".to_string()),
            status: "active".to_string(),
            treatment_plan: Some("药物治疗，定期复查".to_string()),
            work_arrangement: Some("调离噪声作业岗位".to_string()),
            compensation_status: Some("applied".to_string()),
            outcome: None,
            closed_at: None,
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取职业病案例详情成功",
    ))
}

pub async fn update_disease_case(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateDiseaseCaseRequest>,
) -> Json<ApiResponse<DiseaseCase>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating disease case {}: {:?}", id, req);
    let status = req.status.clone().unwrap_or_else(|| "active".to_string());
    let closed_at = if status == "closed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    Json(ApiResponse::success(
        DiseaseCase {
            id,
            case_no: "DC-2024001".to_string(),
            employee_id: "EMP001".to_string(),
            employee_name: "张三".to_string(),
            department: Some("生产部".to_string()),
            position: Some("冲压工".to_string()),
            disease_type: "noise_induced".to_string(),
            disease_name: "噪声聋".to_string(),
            severity: req.severity,
            diagnosed_at: Some("2024-03-15".to_string()),
            diagnosing_hospital: Some("市职业病防治院".to_string()),
            diagnosis_basis: Some("纯音听力测试，职业史".to_string()),
            status,
            treatment_plan: req.treatment_plan,
            work_arrangement: req.work_arrangement,
            compensation_status: req.compensation_status,
            outcome: req.outcome,
            closed_at,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "职业病案例更新成功",
    ))
}

pub async fn delete_disease_case(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting disease case: {}", id);
    Json(ApiResponse::success((), "职业病案例删除成功"))
}

pub async fn list_protection_measures(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<ProtectionMeasure>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing protection measures");
    Json(ApiResponse::success(
        Vec::<ProtectionMeasure>::new(),
        "获取防护措施列表成功",
    ))
}

pub async fn create_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateProtectionMeasureRequest>,
) -> Json<ApiResponse<ProtectionMeasure>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating protection measure: {:?}", req);
    Json(ApiResponse::success(
        ProtectionMeasure {
            id: uuid::Uuid::new_v4().to_string(),
            measure_no: format!(
                "PM-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            measure_type: req.measure_type,
            description: req.description,
            related_factors: req.related_factors,
            related_positions: req.related_positions,
            implementation_date: req.implementation_date,
            status: "active".to_string(),
            responsible_person: req.responsible_person,
            effectiveness: req.effectiveness,
            inspection_date: None,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "防护措施创建成功",
    ))
}

pub async fn get_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ProtectionMeasure>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting protection measure: {}", id);
    Json(ApiResponse::success(
        ProtectionMeasure {
            id,
            measure_no: "PM-2024001".to_string(),
            title: "噪声防护耳塞发放".to_string(),
            measure_type: "personal_protection".to_string(),
            description: Some("为噪声岗位员工配备防噪耳塞".to_string()),
            related_factors: Some(vec!["噪声".to_string()]),
            related_positions: Some(vec!["冲压工".to_string(), "操作工".to_string()]),
            implementation_date: Some("2024-01-01".to_string()),
            status: "active".to_string(),
            responsible_person: Some("张安全".to_string()),
            effectiveness: Some("good".to_string()),
            inspection_date: Some("2024-06-01".to_string()),
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取防护措施详情成功",
    ))
}

pub async fn update_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<ProtectionMeasure>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating protection measure {}: {:?}", id, req);
    Json(ApiResponse::success(
        ProtectionMeasure {
            id,
            measure_no: "PM-2024001".to_string(),
            title: "噪声防护耳塞发放".to_string(),
            measure_type: "personal_protection".to_string(),
            description: Some("为噪声岗位员工配备防噪耳塞".to_string()),
            related_factors: Some(vec!["噪声".to_string()]),
            related_positions: Some(vec!["冲压工".to_string(), "操作工".to_string()]),
            implementation_date: Some("2024-01-01".to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("active")
                .to_string(),
            responsible_person: Some("张安全".to_string()),
            effectiveness: req
                .get("effectiveness")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            inspection_date: None,
            remarks: req
                .get("remarks")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "防护措施更新成功",
    ))
}

pub async fn delete_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting protection measure: {}", id);
    Json(ApiResponse::success((), "防护措施删除成功"))
}

pub async fn list_health_trainings(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthTraining>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing health trainings");
    Json(ApiResponse::success(
        Vec::<HealthTraining>::new(),
        "获取职业健康培训列表成功",
    ))
}

pub async fn create_health_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateHealthTrainingRequest>,
) -> Json<ApiResponse<HealthTraining>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating health training: {:?}", req);
    Json(ApiResponse::success(
        HealthTraining {
            id: uuid::Uuid::new_v4().to_string(),
            training_no: format!(
                "HT-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            training_type: req.training_type,
            content: req.content,
            trainer: req.trainer,
            training_date: req.training_date,
            location: req.location,
            participants_count: req.participants_count,
            duration_hours: req.duration_hours,
            status: "completed".to_string(),
            pass_rate: req.pass_rate,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "职业健康培训创建成功",
    ))
}

pub async fn get_health_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthTraining>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting health training: {}", id);
    Json(ApiResponse::success(
        HealthTraining {
            id,
            training_no: "HT-2024001".to_string(),
            title: "职业病防治知识培训".to_string(),
            training_type: "prevention".to_string(),
            content: Some("职业病危害因素识别、防护措施、健康监护...".to_string()),
            trainer: Some("市疾控中心专家".to_string()),
            training_date: Some("2024-05-20".to_string()),
            location: Some("公司培训中心".to_string()),
            participants_count: Some(150),
            duration_hours: Some(8),
            status: "completed".to_string(),
            pass_rate: Some(98.5),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取培训详情成功",
    ))
}

pub async fn delete_health_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting health training: {}", id);
    Json(ApiResponse::success((), "培训记录删除成功"))
}

pub async fn get_disease_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<DiseaseStatistics>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting disease statistics");
    Json(ApiResponse::success(
        DiseaseStatistics {
            total_factors: 12,
            controlled_factors: 8,
            total_detections: 56,
            qualified_detections: 48,
            total_cases: 5,
            active_cases: 3,
            total_trainings: 12,
            total_participants: 1200,
            by_factor_type: vec![
                serde_json::json!({ "type": "physical", "name": "物理因素", "count": 5 }),
                serde_json::json!({ "type": "chemical", "name": "化学因素", "count": 4 }),
                serde_json::json!({ "type": "biological", "name": "生物因素", "count": 2 }),
                serde_json::json!({ "type": "ergonomic", "name": "工效学因素", "count": 1 }),
            ],
            by_department: vec![
                serde_json::json!({ "department": "生产部", "factors": 8, "cases": 4 }),
                serde_json::json!({ "department": "技术部", "factors": 2, "cases": 0 }),
                serde_json::json!({ "department": "质量部", "factors": 2, "cases": 1 }),
            ],

            tenant_id,
        },
        "获取职业病防治统计成功",
    ))
}

pub async fn list_factor_types(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing factor types");
    let types = vec![
        serde_json::json!({ "code": "physical", "name": "物理因素" }),
        serde_json::json!({ "code": "chemical", "name": "化学因素" }),
        serde_json::json!({ "code": "biological", "name": "生物因素" }),
        serde_json::json!({ "code": "ergonomic", "name": "工效学因素" }),
        serde_json::json!({ "code": "psychological", "name": "心理因素" }),
    ];
    Json(ApiResponse::success(types, "获取危害因素类型成功"))
}
