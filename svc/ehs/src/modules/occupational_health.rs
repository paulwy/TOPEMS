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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamPlan>>> {
    let tenant_filter = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, plan_no, title, description, exam_type,
                  plan_date::text AS plan_date, end_date::text AS end_date,
                  location, hospital, participants_count, status, organizer,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_health_exam_plans WHERE {} ORDER BY plan_date DESC NULLS LAST"#,
        tenant_filter
    );
    let rows = match sqlx::query(&sql).fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list exam plans: {}", e);
            return Json(ApiResponse::server_error("体检计划列表获取失败"));
        }
    };
    let list: Vec<HealthExamPlan> = rows
        .iter()
        .map(|r| HealthExamPlan {
            id: r.try_get("id").unwrap_or_default(),
            plan_no: r.try_get("plan_no").unwrap_or_default(),
            title: r.try_get("title").unwrap_or_default(),
            description: r.try_get("description").ok().flatten(),
            exam_type: r.try_get("exam_type").unwrap_or_default(),
            plan_date: r.try_get("plan_date").ok().flatten(),
            end_date: r.try_get("end_date").ok().flatten(),
            location: r.try_get("location").ok().flatten(),
            hospital: r.try_get("hospital").ok().flatten(),
            participants_count: r.try_get("participants_count").ok().flatten(),
            status: r
                .try_get("status")
                .unwrap_or_else(|_| "planned".to_string()),
            organizer: r.try_get("organizer").ok().flatten(),
            created_at: None,
            updated_at: None,
            tenant_id: Uuid::parse_str(&r.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        })
        .collect();
    tracing::debug!("Listed {} exam plans (real DB)", list.len());
    Json(ApiResponse::success(list, "获取体检计划列表成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    // 真表 ehs.qa_ehs_health_exam_plans 当前空表，写接口假装成功会制造假数据。
    tracing::warn!("Exam plan create called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检计划数据源尚未启用，写入操作暂不可用",
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamPlan>> {
    let tenant_clause = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, plan_no, title, description, exam_type,
                  plan_date::text AS plan_date, end_date::text AS end_date,
                  location, hospital, participants_count, status, organizer,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_health_exam_plans WHERE id = $1::uuid AND {}"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("体检计划不存在")),
        Err(e) => {
            tracing::error!("Failed to get exam plan {}: {}", id, e);
            return Json(ApiResponse::server_error("体检计划获取失败"));
        }
    };
    let plan = HealthExamPlan {
        id: row.try_get("id").unwrap_or_default(),
        plan_no: row.try_get("plan_no").unwrap_or_default(),
        title: row.try_get("title").unwrap_or_default(),
        description: row.try_get("description").ok().flatten(),
        exam_type: row.try_get("exam_type").unwrap_or_default(),
        plan_date: row.try_get("plan_date").ok().flatten(),
        end_date: row.try_get("end_date").ok().flatten(),
        location: row.try_get("location").ok().flatten(),
        hospital: row.try_get("hospital").ok().flatten(),
        participants_count: row.try_get("participants_count").ok().flatten(),
        status: row
            .try_get("status")
            .unwrap_or_else(|_| "planned".to_string()),
        organizer: row.try_get("organizer").ok().flatten(),
        created_at: None,
        updated_at: None,
        tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
            .unwrap_or_default(),
    };
    tracing::debug!("Got exam plan from real DB: {}", id);
    Json(ApiResponse::success(plan, "获取体检计划详情成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<UpdateExamPlanRequest>,
) -> Json<ApiResponse<HealthExamPlan>> {
    tracing::warn!("Exam plan update called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检计划数据源尚未启用，更新操作暂不可用",
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
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("Exam plan delete called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检计划数据源尚未启用，删除操作暂不可用",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/exam-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_exam_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthExamRecord>>> {
    let tenant_filter = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, record_no, plan_id::text AS plan_id, employee_id, employee_name,
                  department, position, exam_type, exam_date::text AS exam_date,
                  hospital, overall_result, blood_pressure, heart_rate, vision, hearing,
                  lung_function, liver_function, kidney_function, blood_routine, urine_routine,
                  chest_xray, ecg, diagnosis, doctor_advice, doctor,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_health_exam_records WHERE {} ORDER BY exam_date DESC NULLS LAST"#,
        tenant_filter
    );
    let rows = match sqlx::query(&sql).fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list exam records: {}", e);
            return Json(ApiResponse::server_error("体检记录列表获取失败"));
        }
    };
    let list: Vec<HealthExamRecord> = rows
        .iter()
        .map(|r| HealthExamRecord {
            id: r.try_get("id").unwrap_or_default(),
            record_no: r.try_get("record_no").unwrap_or_default(),
            plan_id: r
                .try_get::<String, _>("plan_id")
                .ok()
                .filter(|s| !s.is_empty()),
            employee_id: r.try_get("employee_id").unwrap_or_default(),
            employee_name: r.try_get("employee_name").unwrap_or_default(),
            department: r.try_get("department").ok().flatten(),
            position: r.try_get("position").ok().flatten(),
            exam_type: r.try_get("exam_type").unwrap_or_default(),
            exam_date: r.try_get("exam_date").ok().flatten(),
            hospital: r.try_get("hospital").ok().flatten(),
            overall_result: r.try_get("overall_result").unwrap_or_default(),
            blood_pressure: r.try_get("blood_pressure").ok().flatten(),
            heart_rate: r.try_get("heart_rate").ok().flatten(),
            vision: r.try_get("vision").ok().flatten(),
            hearing: r.try_get("hearing").ok().flatten(),
            lung_function: r.try_get("lung_function").ok().flatten(),
            liver_function: r.try_get("liver_function").ok().flatten(),
            kidney_function: r.try_get("kidney_function").ok().flatten(),
            blood_routine: r.try_get("blood_routine").ok().flatten(),
            urine_routine: r.try_get("urine_routine").ok().flatten(),
            chest_xray: r.try_get("chest_xray").ok().flatten(),
            ecg: r.try_get("ecg").ok().flatten(),
            abnormal_items: None,
            diagnosis: r.try_get("diagnosis").ok().flatten(),
            doctor_advice: r.try_get("doctor_advice").ok().flatten(),
            doctor: r.try_get("doctor").ok().flatten(),
            attachments: None,
            created_at: None,
            updated_at: None,
            tenant_id: Uuid::parse_str(&r.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        })
        .collect();
    tracing::debug!("Listed {} exam records (real DB)", list.len());
    Json(ApiResponse::success(list, "获取体检记录列表成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    tracing::warn!("Exam record create called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检记录数据源尚未启用，写入操作暂不可用",
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthExamRecord>> {
    let tenant_clause = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, record_no, plan_id::text AS plan_id, employee_id, employee_name,
                  department, position, exam_type, exam_date::text AS exam_date,
                  hospital, overall_result, blood_pressure, heart_rate, vision, hearing,
                  lung_function, liver_function, kidney_function, blood_routine, urine_routine,
                  chest_xray, ecg, diagnosis, doctor_advice, doctor,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_health_exam_records WHERE id = $1::uuid AND {}"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("体检记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get exam record {}: {}", id, e);
            return Json(ApiResponse::server_error("体检记录获取失败"));
        }
    };
    let rec = HealthExamRecord {
        id: row.try_get("id").unwrap_or_default(),
        record_no: row.try_get("record_no").unwrap_or_default(),
        plan_id: row
            .try_get::<String, _>("plan_id")
            .ok()
            .filter(|s| !s.is_empty()),
        employee_id: row.try_get("employee_id").unwrap_or_default(),
        employee_name: row.try_get("employee_name").unwrap_or_default(),
        department: row.try_get("department").ok().flatten(),
        position: row.try_get("position").ok().flatten(),
        exam_type: row.try_get("exam_type").unwrap_or_default(),
        exam_date: row.try_get("exam_date").ok().flatten(),
        hospital: row.try_get("hospital").ok().flatten(),
        overall_result: row.try_get("overall_result").unwrap_or_default(),
        blood_pressure: row.try_get("blood_pressure").ok().flatten(),
        heart_rate: row.try_get("heart_rate").ok().flatten(),
        vision: row.try_get("vision").ok().flatten(),
        hearing: row.try_get("hearing").ok().flatten(),
        lung_function: row.try_get("lung_function").ok().flatten(),
        liver_function: row.try_get("liver_function").ok().flatten(),
        kidney_function: row.try_get("kidney_function").ok().flatten(),
        blood_routine: row.try_get("blood_routine").ok().flatten(),
        urine_routine: row.try_get("urine_routine").ok().flatten(),
        chest_xray: row.try_get("chest_xray").ok().flatten(),
        ecg: row.try_get("ecg").ok().flatten(),
        abnormal_items: None,
        diagnosis: row.try_get("diagnosis").ok().flatten(),
        doctor_advice: row.try_get("doctor_advice").ok().flatten(),
        doctor: row.try_get("doctor").ok().flatten(),
        attachments: None,
        created_at: None,
        updated_at: None,
        tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
            .unwrap_or_default(),
    };
    tracing::debug!("Got exam record from real DB: {}", id);
    Json(ApiResponse::success(rec, "获取体检记录详情成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<UpdateExamRecordRequest>,
) -> Json<ApiResponse<HealthExamRecord>> {
    tracing::warn!("Exam record update called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检记录数据源尚未启用，更新操作暂不可用",
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
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("Exam record delete called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "体检记录数据源尚未启用，删除操作暂不可用",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/contraindications",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_contraindications(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<Contraindication>>> {
    let tenant_filter = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, employee_id, employee_name, department, position,
                  contraindication_type, description, diagnosed_at::text AS diagnosed_at,
                  hospital, status, work_restriction, advised_position,
                  follow_up_date::text AS follow_up_date, remarks,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_contraindications WHERE {} ORDER BY diagnosed_at DESC NULLS LAST"#,
        tenant_filter
    );
    let rows = match sqlx::query(&sql).fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list contraindications: {}", e);
            return Json(ApiResponse::server_error("职业禁忌症列表获取失败"));
        }
    };
    let list: Vec<Contraindication> = rows
        .iter()
        .map(|r| Contraindication {
            id: r.try_get("id").unwrap_or_default(),
            employee_id: r.try_get("employee_id").unwrap_or_default(),
            employee_name: r.try_get("employee_name").unwrap_or_default(),
            department: r.try_get("department").ok().flatten(),
            position: r.try_get("position").ok().flatten(),
            contraindication_type: r.try_get("contraindication_type").unwrap_or_default(),
            description: r.try_get("description").ok().flatten(),
            diagnosed_at: r.try_get("diagnosed_at").ok().flatten(),
            hospital: r.try_get("hospital").ok().flatten(),
            status: r.try_get("status").unwrap_or_else(|_| "active".to_string()),
            work_restriction: r.try_get("work_restriction").ok().flatten(),
            advised_position: r.try_get("advised_position").ok().flatten(),
            follow_up_date: r.try_get("follow_up_date").ok().flatten(),
            remarks: r.try_get("remarks").ok().flatten(),
            created_at: None,
            updated_at: None,
            tenant_id: Uuid::parse_str(&r.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        })
        .collect();
    tracing::debug!("Listed {} contraindications (real DB)", list.len());
    Json(ApiResponse::success(list, "获取职业禁忌症列表成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    // ehs.qa_ehs_contraindications 为空表，写接口假装成功会制造假数据；诚实返回 501。
    tracing::warn!("Contraindication create called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "职业禁忌症数据源尚未启用，写入操作暂不可用",
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Contraindication>> {
    let tenant_clause = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, employee_id, employee_name, department, position,
                  contraindication_type, description, diagnosed_at::text AS diagnosed_at,
                  hospital, status, work_restriction, advised_position,
                  follow_up_date::text AS follow_up_date, remarks,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_contraindications WHERE id = $1::uuid AND {}"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("职业禁忌症不存在")),
        Err(e) => {
            tracing::error!("Failed to get contraindication {}: {}", id, e);
            return Json(ApiResponse::server_error("职业禁忌症获取失败"));
        }
    };
    let contra = Contraindication {
        id: row.try_get("id").unwrap_or_default(),
        employee_id: row.try_get("employee_id").unwrap_or_default(),
        employee_name: row.try_get("employee_name").unwrap_or_default(),
        department: row.try_get("department").ok().flatten(),
        position: row.try_get("position").ok().flatten(),
        contraindication_type: row.try_get("contraindication_type").unwrap_or_default(),
        description: row.try_get("description").ok().flatten(),
        diagnosed_at: row.try_get("diagnosed_at").ok().flatten(),
        hospital: row.try_get("hospital").ok().flatten(),
        status: row
            .try_get("status")
            .unwrap_or_else(|_| "active".to_string()),
        work_restriction: row.try_get("work_restriction").ok().flatten(),
        advised_position: row.try_get("advised_position").ok().flatten(),
        follow_up_date: row.try_get("follow_up_date").ok().flatten(),
        remarks: row.try_get("remarks").ok().flatten(),
        created_at: None,
        updated_at: None,
        tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
            .unwrap_or_default(),
    };
    tracing::debug!("Got contraindication from real DB: {}", id);
    Json(ApiResponse::success(contra, "获取职业禁忌症成功"))
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
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<CreateContraindicationRequest>,
) -> Json<ApiResponse<Contraindication>> {
    tracing::warn!("Contraindication update called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "职业禁忌症数据源尚未启用，更新操作暂不可用",
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
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("Contraindication delete called but data source not yet enabled");
    Json(ApiResponse::error(
        501,
        "职业禁忌症数据源尚未启用，删除操作暂不可用",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-health/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn get_health_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<HealthStatistics>> {
    let tenant_bind = resolve_health_tenant(&claims).to_string();
    let tc = "($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL";

    let total_employees: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_employees WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let exam_planned: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_health_exam_plans WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let exam_completed: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_health_exam_records WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let normal_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_health_exam_records WHERE {} AND overall_result = 'normal'",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let abnormal_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_health_exam_records WHERE {} AND overall_result != 'normal'",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let contraindication_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_contraindications WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    tracing::debug!(
        "Health stats (real DB): employees={}, planned={}, completed={}, normal={}, abnormal={}, contra={}",
        total_employees, exam_planned, exam_completed, normal_count, abnormal_count, contraindication_count
    );

    Json(ApiResponse::success(
        HealthStatistics {
            total_employees: total_employees as i32,
            exam_planned: exam_planned as i32,
            exam_completed: exam_completed as i32,
            normal_count: normal_count as i32,
            abnormal_count: abnormal_count as i32,
            contraindication_count: contraindication_count as i32,
            by_department: Vec::new(),
            by_abnormality_type: Vec::new(),

            tenant_id: resolve_health_tenant(&claims),
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
            return Json(ApiResponse::server_error("获取健康档案列表失败"));
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
            return Json(ApiResponse::server_error("健康档案创建失败"));
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
        Ok(None) => return Json(ApiResponse::not_found("健康档案不存在")),
        Err(e) => {
            tracing::error!("Failed to get health record: {}", e);
            return Json(ApiResponse::server_error("获取健康档案失败"));
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
        Ok(None) => return Json(ApiResponse::not_found("健康档案不存在")),
        Err(e) => {
            tracing::error!("Failed to update health record: {}", e);
            return Json(ApiResponse::server_error("健康档案更新失败"));
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
            return Json(ApiResponse::server_error("健康档案删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::not_found("健康档案不存在"));
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
